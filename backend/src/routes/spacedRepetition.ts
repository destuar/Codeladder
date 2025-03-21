import { Router } from 'express';
import type { RequestHandler } from 'express-serve-static-core';
import { prisma } from '../lib/prisma';
import { authenticateToken } from '../middleware/auth';
import { calculateNextReviewDate, calculateNewReviewLevel, createReviewHistoryEntry } from '../lib/spacedRepetition';

const router = Router();

/**
 * Get problems due for review
 * GET /api/spaced-repetition/due
 */
router.get('/due', authenticateToken, (async (req, res) => {
  try {
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }
    
    const now = new Date();
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);
    
    // Get all problems due from now through the next 7 days
    const dueProgressRecords = await prisma.progress.findMany({
      where: {
        userId,
        status: 'COMPLETED',
        reviewScheduledAt: {
          lte: nextWeek // Include all problems due in the next 7 days
        },
        reviewLevel: {
          not: null
        }
      },
      include: {
        problem: {
          select: {
            id: true,
            name: true,
            difficulty: true,
            problemType: true,
            topic: {
              select: {
                id: true,
                name: true
              }
            }
          }
        }
      },
      orderBy: {
        reviewScheduledAt: 'asc'
      }
    });
    
    const dueProblems = dueProgressRecords.map(progress => ({
      id: progress.problem?.id,
      name: progress.problem?.name,
      difficulty: progress.problem?.difficulty,
      topic: progress.problem?.topic,
      problemType: progress.problem?.problemType,
      reviewLevel: progress.reviewLevel,
      lastReviewedAt: progress.lastReviewedAt,
      dueDate: progress.reviewScheduledAt,
      progressId: progress.id,
      reviewHistory: progress.reviewHistory
    }));
    
    res.json(dueProblems);
  } catch (error) {
    console.error('Error fetching due reviews:', error);
    res.status(500).json({ error: 'Failed to fetch due reviews' });
  }
}) as RequestHandler);

/**
 * Get all future review problems regardless of due date
 * GET /api/spaced-repetition/all-scheduled
 */
router.get('/all-scheduled', authenticateToken, (async (req, res) => {
  try {
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }
    
    const now = new Date();
    
    // Get all scheduled reviews regardless of due date
    const scheduledProgressRecords = await prisma.progress.findMany({
      where: {
        userId,
        status: 'COMPLETED',
        reviewLevel: {
          not: null
        },
        reviewScheduledAt: {
          not: null
        }
      },
      include: {
        problem: {
          select: {
            id: true,
            name: true,
            difficulty: true,
            problemType: true,
            topic: {
              select: {
                id: true,
                name: true
              }
            }
          }
        }
      },
      orderBy: {
        reviewScheduledAt: 'asc'
      }
    });
    
    const scheduledProblems = scheduledProgressRecords.map(progress => ({
      id: progress.problem?.id,
      name: progress.problem?.name,
      difficulty: progress.problem?.difficulty,
      topic: progress.problem?.topic,
      problemType: progress.problem?.problemType,
      reviewLevel: progress.reviewLevel,
      lastReviewedAt: progress.lastReviewedAt,
      dueDate: progress.reviewScheduledAt,
      progressId: progress.id,
      reviewHistory: progress.reviewHistory
    }));
    
    // Group problems by their due date timeframe
    const now7Days = new Date(now);
    now7Days.setDate(now7Days.getDate() + 7);
    const now30Days = new Date(now);
    now30Days.setDate(now30Days.getDate() + 30);
    
    const categorizedProblems = {
      dueToday: scheduledProblems.filter(p => 
        p.dueDate && new Date(p.dueDate) <= now
      ),
      dueThisWeek: scheduledProblems.filter(p => 
        p.dueDate && 
        new Date(p.dueDate) > now && 
        new Date(p.dueDate) <= now7Days
      ),
      dueThisMonth: scheduledProblems.filter(p => 
        p.dueDate && 
        new Date(p.dueDate) > now7Days && 
        new Date(p.dueDate) <= now30Days
      ),
      dueLater: scheduledProblems.filter(p => 
        p.dueDate && 
        new Date(p.dueDate) > now30Days
      ),
      all: scheduledProblems
    };
    
    res.json(categorizedProblems);
  } catch (error) {
    console.error('[SpacedRepetition:AllScheduled] Error fetching scheduled reviews:', error);
    res.json({
      dueToday: [],
      dueThisWeek: [],
      dueThisMonth: [],
      dueLater: [],
      all: []
    });
  }
}) as RequestHandler);

/**
 * Record a problem review result
 * POST /api/spaced-repetition/review
 */
router.post('/review', authenticateToken, (async (req, res) => {
  try {
    const { problemId, wasSuccessful, reviewOption } = req.body;
    const userId = req.user?.id;
    
    console.log('[SpacedRepetition:Review] Recording review:', { problemId, wasSuccessful, reviewOption, userId });
    
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }
    
    if (typeof problemId !== 'string' || typeof wasSuccessful !== 'boolean') {
      return res.status(400).json({ error: 'Invalid request parameters' });
    }
    
    try {
      // Find current progress - make sure we're getting the latest record
      const progress = await prisma.progress.findFirst({
        where: {
          userId,
          problemId
        },
        orderBy: {
          updatedAt: 'desc'
        }
      });
      
      console.log('[SpacedRepetition:Review] Found progress record:', progress ? { 
        id: progress.id, 
        status: progress.status,
        reviewLevel: progress.reviewLevel,
        lastReviewedAt: progress.lastReviewedAt,
        reviewScheduledAt: progress.reviewScheduledAt,
        hasHistory: Array.isArray(progress.reviewHistory) && progress.reviewHistory.length > 0
      } : 'No progress record found');
      
      if (!progress) {
        console.log('[SpacedRepetition:Review] Progress record not found - creating a new one');
        
        // Get the problem to find its topic
        const problem = await prisma.problem.findUnique({
          where: { id: problemId },
          select: { topicId: true }
        });
        
        if (!problem || !problem.topicId) {
          console.error('[SpacedRepetition:Review] Problem or topic not found:', { problemId });
          return res.status(404).json({ 
            error: 'Problem or topic not found',
            nextReviewDate: new Date(Date.now() + 24 * 60 * 60 * 1000), // Fallback date (tomorrow)
            newLevel: wasSuccessful ? 1 : 0,
            status: 'ERROR',
            reviewOption,
            message: 'Error creating progress record, but review considered'
          });
        }
        
        try {
          // Create a new progress record since none exists
          const newProgress = await prisma.progress.create({
            data: {
              userId,
              problemId,
              topicId: problem.topicId,
              status: 'COMPLETED', // Always set to COMPLETED
              reviewLevel: wasSuccessful ? 1 : 0,
              lastReviewedAt: new Date(),
              reviewScheduledAt: calculateNextReviewDate(wasSuccessful ? 1 : 0),
              reviewHistory: [{
                date: new Date(),
                wasSuccessful,
                reviewOption
              }]
            }
          });
          
          // Connect the problem to the user's completed problems
          await prisma.user.update({
            where: { id: userId },
            data: {
              completedProblems: {
                connect: { id: problemId }
              }
            }
          });
          
          console.log('[SpacedRepetition:Review] Created new progress record:', { 
            id: newProgress.id,
            status: newProgress.status,
            reviewLevel: newProgress.reviewLevel
          });
          
          return res.json({ 
            message: 'Review recorded with new progress record',
            nextReviewDate: newProgress.reviewScheduledAt,
            newLevel: newProgress.reviewLevel,
            status: newProgress.status,
            reviewOption
          });
        } catch (createError) {
          console.error('[SpacedRepetition:Review] Error creating progress record:', createError);
          return res.json({ 
            error: 'Failed to create progress record',
            nextReviewDate: new Date(Date.now() + 24 * 60 * 60 * 1000), // Fallback date (tomorrow)
            newLevel: wasSuccessful ? 1 : 0,
            status: 'ERROR',
            reviewOption,
            message: 'Error creating progress record, but review considered'
          });
        }
      }
      
      // If progress exists but is not completed, mark it as COMPLETED
      const progressStatus = progress.status || 'NOT_STARTED';
      if (progressStatus !== 'COMPLETED') {
        console.log('[SpacedRepetition:Review] Progress record exists but not completed, marking as COMPLETED');
        
        try {
          // Force connect to user's completed problems
          await prisma.user.update({
            where: { id: userId },
            data: {
              completedProblems: {
                connect: { id: problemId }
              }
            }
          });
        } catch (connectError) {
          console.error('[SpacedRepetition:Review] Error connecting problem to completed list:', connectError);
          // Continue despite this error
        }
      }
      
      // Calculate new review level
      const newLevel = calculateNewReviewLevel(progress.reviewLevel, wasSuccessful);
      
      // Calculate next review date
      const nextReviewDate = calculateNextReviewDate(newLevel);
      
      // Create review history entry with the additional reviewOption field
      const reviewEntry = {
        ...createReviewHistoryEntry(wasSuccessful, progress.reviewLevel),
        reviewOption // Add the review option to the history entry
      };
      
      // Get current history or initialize empty array
      const currentHistory = progress.reviewHistory as any[] || [];
      
      console.log('[SpacedRepetition:Review] Updating progress with new review data:', {
        id: progress.id,
        currentStatus: progress.status,
        currentLevel: progress.reviewLevel,
        newLevel,
        nextReviewDate,
        historyCount: currentHistory.length,
        newHistoryCount: currentHistory.length + 1,
        reviewOption
      });
      
      try {
        // Use a transaction to ensure all operations succeed or fail together
        const updatedProgress = await prisma.$transaction(async (tx) => {
          // First, ensure the progress record still exists
          const currentProgress = await tx.progress.findUnique({
            where: { id: progress.id }
          });
          
          if (!currentProgress) {
            console.error('[SpacedRepetition:Review] Progress record no longer exists');
            throw new Error('Progress record no longer exists');
          }
          
          // Update progress record with the new review data and ensure it stays COMPLETED
          return await tx.progress.update({
            where: { id: progress.id },
            data: {
              reviewLevel: newLevel,
              lastReviewedAt: new Date(),
              reviewScheduledAt: nextReviewDate,
              reviewHistory: [...currentHistory, reviewEntry],
              status: 'COMPLETED' // Force the status to be COMPLETED
            }
          });
        });
        
        console.log('[SpacedRepetition:Review] Successfully updated progress:', { 
          id: updatedProgress.id,
          newStatus: updatedProgress.status,
          newReviewLevel: updatedProgress.reviewLevel,
          newReviewDate: updatedProgress.reviewScheduledAt,
          reviewOption
        });
        
        res.json({ 
          message: 'Review recorded',
          nextReviewDate,
          newLevel,
          status: updatedProgress.status,
          reviewOption
        });
      } catch (transactionError) {
        console.error('[SpacedRepetition:Review] Transaction error:', transactionError);
        
        // Still return a useful response to the client
        res.json({ 
          message: 'Review partially recorded (transaction error)',
          error: 'Transaction failed',
          nextReviewDate,
          newLevel,
          status: 'ERROR',
          reviewOption
        });
      }
    } catch (innerError) {
      console.error('[SpacedRepetition:Review] Inner processing error:', innerError);
      
      // Return a response even in case of errors
      res.json({ 
        message: 'Review failed but processed',
        error: 'Processing error',
        nextReviewDate: new Date(Date.now() + 24 * 60 * 60 * 1000), // Fallback date (tomorrow)
        newLevel: wasSuccessful ? 1 : 0,
        status: 'ERROR',
        reviewOption
      });
    }
  } catch (error) {
    console.error('[SpacedRepetition:Review] Critical error recording review:', error);
    
    // Return a consistent response structure
    res.json({ 
      message: 'Review failed',
      error: 'Server error',
      nextReviewDate: new Date(Date.now() + 24 * 60 * 60 * 1000), // Fallback date (tomorrow)
      newLevel: 0,
      status: 'ERROR',
      reviewOption: 'unknown'
    });
  }
}) as RequestHandler);

/**
 * Get spaced repetition stats for a user
 * GET /api/spaced-repetition/stats
 */
router.get('/stats', authenticateToken, (async (req, res) => {
  try {
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }
    
    const now = new Date();
    const startOfToday = new Date(now);
    startOfToday.setHours(0, 0, 0, 0);
    
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay()); // Start of current week (Sunday)
    startOfWeek.setHours(0, 0, 0, 0);
    
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1); // Start of current month
    
    const nextWeek = new Date(now);
    nextWeek.setDate(nextWeek.getDate() + 7);
    
    console.log('[SpacedRepetition:Stats] Fetching stats for user:', userId);
    
    try {
      // Count problems at each review level
      const levelCounts = await prisma.progress.groupBy({
        by: ['reviewLevel'],
        where: {
          userId,
          status: 'COMPLETED',
          reviewLevel: {
            not: null
          }
        },
        _count: {
          id: true
        }
      });
      
      // Count problems due for review
      const dueCount = await prisma.progress.count({
        where: {
          userId,
          status: 'COMPLETED',
          reviewScheduledAt: {
            lte: now
          },
          reviewLevel: {
            not: null
          }
        }
      });
      
      // Count problems coming up for review in the next 7 days
      const upcomingCount = await prisma.progress.count({
        where: {
          userId,
          status: 'COMPLETED',
          reviewScheduledAt: {
            gt: now,
            lte: nextWeek
          },
          reviewLevel: {
            not: null
          }
        }
      });
      
      // Fetch all progress records 
      const allProgress = await prisma.progress.findMany({
        where: {
          userId,
          status: 'COMPLETED'
        },
        select: {
          reviewHistory: true
        }
      });
      
      // Count total reviews
      let totalReviewed = 0;
      let completedToday = 0;
      let completedThisWeek = 0;
      let completedThisMonth = 0;
      
      // Process review history from all progress records
      allProgress.forEach(progress => {
        if (progress.reviewHistory && Array.isArray(progress.reviewHistory)) {
          const history = progress.reviewHistory as Array<{date: string, wasSuccessful: boolean}>;
          
          history.forEach(review => {
            const reviewDate = new Date(review.date);
            totalReviewed++;
            
            if (reviewDate >= startOfToday) {
              completedToday++;
            }
            
            if (reviewDate >= startOfWeek) {
              completedThisWeek++;
            }
            
            if (reviewDate >= startOfMonth) {
              completedThisMonth++;
            }
          });
        }
      });
      
      console.log('[SpacedRepetition:Stats] Retrieved counts:', {
        levelCounts: levelCounts.length,
        dueCount,
        upcomingCount,
        totalReviewed,
        completedToday,
        completedThisWeek,
        completedThisMonth
      });
      
      // Process level counts with error handling
      let formattedLevelCounts = {};
      try {
        formattedLevelCounts = levelCounts.reduce((acc, item) => {
          const level = item.reviewLevel === null ? 0 : item.reviewLevel;
          acc[level] = item._count.id;
          return acc;
        }, {} as Record<number, number>);
      } catch (error) {
        console.error('[SpacedRepetition:Stats] Error formatting level counts:', error);
        formattedLevelCounts = {}; // Fallback to empty object
      }
      
      res.json({
        byLevel: formattedLevelCounts,
        dueNow: dueCount || 0,
        dueThisWeek: upcomingCount || 0,
        totalReviewed: totalReviewed || 0,
        completedToday: completedToday || 0,
        completedThisWeek: completedThisWeek || 0,
        completedThisMonth: completedThisMonth || 0
      });
    } catch (error) {
      console.error('[SpacedRepetition:Stats] Error in database queries:', error);
      // Send a simple response with zeros instead of throwing a 500 error
      res.json({
        byLevel: {},
        dueNow: 0,
        dueThisWeek: 0,
        totalReviewed: 0,
        completedToday: 0,
        completedThisWeek: 0,
        completedThisMonth: 0,
        error: 'Error fetching data, default values returned'
      });
    }
  } catch (error) {
    console.error('[SpacedRepetition:Stats] Critical error in endpoint:', error);
    // Send a simple response with zeros instead of throwing a 500 error
    res.json({
      byLevel: {},
      dueNow: 0,
      dueThisWeek: 0,
      totalReviewed: 0,
      completedToday: 0,
      completedThisWeek: 0,
      completedThisMonth: 0,
      error: 'Critical error, default values returned'
    });
  }
}) as RequestHandler);

export default router; 