import { Router } from 'express';
import type { RequestHandler } from 'express-serve-static-core';
import { prisma } from '../lib/prisma';
import { authenticateToken } from '../middleware/auth';
import { authorizeRoles } from '../middleware/authorize';
import { Role } from '@prisma/client';
import { calculateNextReviewDate, calculateNewReviewLevel, createReviewHistoryEntry } from '../lib/spacedRepetition';
import { resolveProblem, getProblemId, getProblemSlug, getProgressForProblem } from '../lib/problemResolver';

const router = Router();

/**
 * Get problems due for review
 * GET /api/v2/spaced-repetition/due
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
          gt: -1 // Use greater than -1 instead of not: null
        }
      },
      include: {
        problem: {
          select: {
            id: true,
            name: true,
            slug: true,
            difficulty: true,
            problemType: true,
            topic: {
              select: {
                id: true,
                name: true,
                slug: true
              }
            }
          }
        },
        reviews: {
          orderBy: {
            date: 'desc'
          }
        }
      },
      orderBy: {
        reviewScheduledAt: 'asc'
      }
    });
    
    const dueProblems = dueProgressRecords.map(progress => ({
      id: progress.problem?.id,
      slug: progress.problem?.slug,
      name: progress.problem?.name,
      difficulty: progress.problem?.difficulty,
      topic: progress.problem?.topic,
      problemType: progress.problem?.problemType,
      reviewLevel: progress.reviewLevel,
      lastReviewedAt: progress.lastReviewedAt,
      dueDate: progress.reviewScheduledAt,
      progressId: progress.id,
      reviewHistory: progress.reviews
    }));
    
    res.json(dueProblems);
  } catch (error) {
    console.error('[SpacedRepetition:Due] Error fetching due reviews:', error);
    res.status(500).json({ error: 'Failed to fetch due reviews' });
  }
}) as RequestHandler);

/**
 * Get all future review problems regardless of due date
 * GET /api/v2/spaced-repetition/all-scheduled
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
          gt: -1 // Use greater than -1 instead of not: null
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
            slug: true,
            difficulty: true,
            problemType: true,
            topic: {
              select: {
                id: true,
                name: true,
                slug: true
              }
            }
          }
        },
        reviews: {
          orderBy: {
            date: 'desc'
          }
        }
      },
      orderBy: {
        reviewScheduledAt: 'asc'
      }
    });
    
    const scheduledProblems = scheduledProgressRecords.map(progress => ({
      id: progress.problem?.id,
      slug: progress.problem?.slug,
      name: progress.problem?.name,
      difficulty: progress.problem?.difficulty,
      topic: progress.problem?.topic,
      problemType: progress.problem?.problemType,
      reviewLevel: progress.reviewLevel,
      lastReviewedAt: progress.lastReviewedAt,
      dueDate: progress.reviewScheduledAt,
      progressId: progress.id,
      reviewHistory: progress.reviews
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
    res.status(500).json({
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
 * POST /api/v2/spaced-repetition/review
 * Body: { problemId?: string, problemSlug?: string, wasSuccessful: boolean, reviewOption?: string }
 */
router.post('/review', authenticateToken, (async (req, res) => {
  try {
    const { problemId, problemSlug, wasSuccessful, reviewOption } = req.body;
    const userId = req.user?.id;
    
    console.log('[SpacedRepetition:Review] Recording review:', { 
      problemId, problemSlug, wasSuccessful, reviewOption, userId 
    });
    
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }
    
    // Ensure we have either problemId or problemSlug
    if (!problemId && !problemSlug) {
      return res.status(400).json({ error: 'Either problemId or problemSlug is required' });
    }
    
    if (typeof wasSuccessful !== 'boolean') {
      return res.status(400).json({ error: 'wasSuccessful must be a boolean' });
    }
    
    // Resolve problem regardless of whether ID or slug was provided
    const resolvedProblemId = await getProblemId({ id: problemId, slug: problemSlug });
    
    if (!resolvedProblemId) {
      return res.status(404).json({ error: 'Problem not found' });
    }
    
    // Get the full problem to find its topic
    const problem = await prisma.problem.findUnique({
      where: { id: resolvedProblemId },
      select: { id: true, slug: true, topicId: true }
    });
    
    if (!problem) {
      return res.status(404).json({ error: 'Problem not found' });
    }
    
    if (!problem.topicId) {
      return res.status(400).json({ 
        error: 'Problem is missing a topic',
        nextReviewDate: new Date(Date.now() + 24 * 60 * 60 * 1000), // Fallback date (tomorrow)
        newLevel: wasSuccessful ? 1 : 0,
        status: 'ERROR'
      });
    }
    
    try {
      // Find current progress record using the composite key
      const progress = await prisma.progress.findUnique({
        where: {
          userId_topicId_problemId: {
            userId,
            topicId: problem.topicId!,
            problemId: problem.id
          }
        }
      });
      
      console.log('[SpacedRepetition:Review] Found progress record:', progress ? {
        progressId: progress.id,
        userId: progress.userId,
        problemId: progress.problemId,
        currentLevel: progress.reviewLevel,
        reviewScheduledAt: progress.reviewScheduledAt
      } : 'No progress record found');
      
      // If no progress record exists, create one
      if (!progress) {
        try {
          // Create a new progress record with initial level 0
          const result = await prisma.$transaction(async (tx) => {
            // Ensure topic ID exists
            if (!problem.topicId) {
              throw new Error('Cannot create progress record: Problem is missing a topic ID');
            }
            
            // Create a new progress record with initial level 0
            const newProgress = await tx.progress.create({
              data: {
                userId,
                problemId: problem.id,
                topicId: problem.topicId,
                status: 'COMPLETED',
                reviewLevel: 0, // Always start at level 0
                lastReviewedAt: new Date(),
                reviewScheduledAt: calculateNextReviewDate(0),
              }
            });
            
            // Calculate new level using the same function as for subsequent reviews
            const newLevel = calculateNewReviewLevel(0, wasSuccessful);
            
            // Update the progress with the calculated level
            const updatedProgress = await tx.progress.update({
              where: { id: newProgress.id },
              data: {
                reviewLevel: newLevel,
                reviewScheduledAt: calculateNextReviewDate(newLevel)
              }
            });
            
            // Create review history entry within the same transaction
            const reviewHistory = await tx.reviewHistory.create({
              data: {
                progressId: newProgress.id,
                date: new Date(),
                wasSuccessful,
                reviewOption: reviewOption || 'standard-review',
                levelBefore: 0,
                levelAfter: newLevel
              }
            });
            
            // Connect the problem to the user's completed problems
            await tx.user.update({
              where: { id: userId },
              data: {
                completedProblems: {
                  connect: { id: problem.id }
                }
              }
            });
            
            return { 
              updatedProgress,
              reviewHistory,
              newLevel 
            };
          });
          
          return res.json({ 
            message: 'Review recorded with new progress record',
            nextReviewDate: calculateNextReviewDate(result.newLevel),
            newLevel: result.newLevel,
            status: 'COMPLETED',
            reviewOption,
            problemSlug: problem.slug
          });
        } catch (createError) {
          console.error('[SpacedRepetition:Review] Error creating progress record:', createError);
          return res.status(500).json({ 
            error: 'Failed to create progress record',
            nextReviewDate: new Date(Date.now() + 24 * 60 * 60 * 1000), // Fallback date (tomorrow)
            newLevel: wasSuccessful ? 1 : 0,
            status: 'ERROR',
            reviewOption
          });
        }
      }
      
      // If progress exists but is not completed, mark it as COMPLETED
      if (progress.status !== 'COMPLETED') {
        try {
          // Force connect to user's completed problems
          await prisma.user.update({
            where: { id: userId },
            data: {
              completedProblems: {
                connect: { id: problem.id }
              }
            }
          });
        } catch (connectError) {
          console.error('[SpacedRepetition:Review] Error connecting problem to completed list:', connectError);
          // Continue despite this error
        }
      }
      
      // Calculate new review level and next review date
      const currentLevel = progress.reviewLevel ?? 0; // Default to 0 if null (shouldn't happen with new schema)
      const newLevel = calculateNewReviewLevel(currentLevel, wasSuccessful);
      const nextReviewDate = calculateNextReviewDate(newLevel);
      
      console.log('[SpacedRepetition:Review] Calculating review level:', { 
        currentLevel, 
        newLevel, 
        wasSuccessful,
        progressId: progress.id,
        userId
      });
      
      try {
        // CHANGED: Update progress and create review history in a transaction for atomicity
        const result = await prisma.$transaction(async (tx) => {
          // Update progress record with the new review data
          const updatedProgress = await tx.progress.update({
            where: {
              id: progress.id,
            },
            data: {
              reviewLevel: newLevel,
              reviewScheduledAt: nextReviewDate,
              lastReviewedAt: new Date(),
              status: 'COMPLETED',
            },
          });

          console.log('[SpacedRepetition:Review] Progress updated successfully:', { 
            progressId: updatedProgress.id, 
            oldLevel: currentLevel, 
            newLevel: updatedProgress.reviewLevel,
            nextReviewDate: updatedProgress.reviewScheduledAt 
          });

          // Create review history entry in the same transaction
          const reviewHistory = await tx.reviewHistory.create({
            data: {
              progressId: progress.id,
              date: new Date(),
              wasSuccessful,
              reviewOption: reviewOption || 'standard-review',
              levelBefore: currentLevel,
              levelAfter: newLevel
            }
          });
          
          console.log('[SpacedRepetition:Review] Review history created:', {
            progressId: progress.id,
            reviewHistoryId: reviewHistory.id,
            levelBefore: currentLevel,
            levelAfter: newLevel,
            wasSuccessful
          });
          
          return { updatedProgress, reviewHistory };
        });
        
        res.json({ 
          message: 'Review recorded',
          nextReviewDate,
          newLevel,
          status: result.updatedProgress.status,
          reviewOption,
          problemSlug: problem.slug
        });
      } catch (updateError) {
        console.error('[SpacedRepetition:Review] Error updating progress:', updateError);
        
        res.status(500).json({ 
          error: 'Failed to update progress record',
          nextReviewDate,
          newLevel,
          status: 'ERROR',
          reviewOption
        });
      }
    } catch (error) {
      console.error('[SpacedRepetition:Review] Error processing review:', error);
      
      res.status(500).json({ 
        error: 'Server error processing review',
        nextReviewDate: new Date(Date.now() + 24 * 60 * 60 * 1000), // Fallback date (tomorrow)
        newLevel: 0,
        status: 'ERROR',
        reviewOption: reviewOption || 'unknown'
      });
    }
  } catch (error) {
    console.error('[SpacedRepetition:Review] Critical error:', error);
    
    res.status(500).json({ 
      error: 'Server error',
      message: 'Review failed'
    });
  }
}) as RequestHandler);

/**
 * Get spaced repetition stats for a user
 * GET /api/v2/spaced-repetition/stats
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
    
    try {
      // Count problems at each review level
      const levelCounts = await prisma.progress.groupBy({
        by: ['reviewLevel'],
        where: {
          userId,
          status: 'COMPLETED',
          reviewLevel: {
            gt: -1
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
            gt: -1
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
            gt: -1
          }
        }
      });
      
      // Fetch all progress records with their review history
      const allProgress = await prisma.progress.findMany({
        where: {
          userId,
          status: 'COMPLETED'
        },
        include: {
          reviews: true
        }
      });
      
      // Count total reviews
      let totalReviewed = 0;
      let completedToday = 0;
      let completedThisWeek = 0;
      let completedThisMonth = 0;
      
      // Process review history from all progress records
      allProgress.forEach(progress => {
        if (progress.reviews && progress.reviews.length > 0) {
          progress.reviews.forEach(review => {
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
      
      // Process level counts
      const formattedLevelCounts = levelCounts.reduce((acc, item) => {
        const level = item.reviewLevel === null ? 0 : item.reviewLevel;
        acc[level] = item._count?.id || 0;
        return acc;
      }, {} as Record<number, number>);
      
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
      res.status(500).json({
        byLevel: {},
        dueNow: 0,
        dueThisWeek: 0,
        totalReviewed: 0,
        completedToday: 0,
        completedThisWeek: 0,
        completedThisMonth: 0,
        error: 'Error fetching data'
      });
    }
  } catch (error) {
    console.error('[SpacedRepetition:Stats] Critical error:', error);
    res.status(500).json({
      error: 'Server error'
    });
  }
}) as RequestHandler);

/**
 * Remove a problem from the spaced repetition system
 * DELETE /api/v2/spaced-repetition/remove-problem/:identifier
 * identifier can be either a problem ID or slug
 */
router.delete('/remove-problem/:identifier', authenticateToken, (async (req, res) => {
  try {
    const { identifier } = req.params;
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }
    
    if (!identifier) {
      return res.status(400).json({ error: 'Problem identifier is required' });
    }
    
    console.log('[SpacedRepetition:RemoveProblem] Removing problem:', { userId, identifier });
    
    // Try resolving as either ID or slug
    const problemId = await getProblemId({ 
      id: identifier.length >= 20 ? identifier : undefined, // Simple heuristic for ID vs slug
      slug: identifier.length < 20 ? identifier : undefined
    });
    
    if (!problemId) {
      return res.status(404).json({ error: 'Problem not found' });
    }
    
    // Find the progress record for this problem and user
    const progress = await prisma.progress.findFirst({
      where: {
        userId,
        problemId
      },
      orderBy: {
        updatedAt: 'desc'
      }
    });
    
    if (!progress) {
      return res.status(404).json({ error: 'Progress record not found' });
    }
    
    // Update the progress record to remove it from spaced repetition
    // For reviewLevel, use 0 instead of null (since it can't be null in the database)
    // For reviewScheduledAt, we can still use null since it's optional
    const updatedProgress = await prisma.progress.update({
      where: {
        id: progress.id
      },
      data: {
        reviewLevel: 0, // Keep at 0 instead of null (can't be null in DB)
        reviewScheduledAt: null, // This is optional, so null is fine
        // Keep other fields like status and lastReviewedAt
      }
    });
    
    res.json({ 
      message: 'Problem removed from spaced repetition system',
      progress: updatedProgress
    });
  } catch (error) {
    console.error('[SpacedRepetition:RemoveProblem] Error removing problem:', error);
    res.status(500).json({ error: 'Failed to remove problem from spaced repetition' });
  }
}) as RequestHandler);

/**
 * Add a completed problem to the spaced repetition system
 * POST /api/v2/spaced-repetition/add-to-repetition
 * Body: { problemId?: string, problemSlug?: string }
 */
router.post('/add-to-repetition', authenticateToken, (async (req, res) => {
  try {
    const { problemId, problemSlug } = req.body;
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }
    
    if (!problemId && !problemSlug) {
      return res.status(400).json({ error: 'Either problemId or problemSlug is required' });
    }
    
    console.log('[SpacedRepetition:AddToRepetition] Adding problem to spaced repetition:', { 
      userId, problemId, problemSlug 
    });
    
    // Resolve problem regardless of whether ID or slug was provided
    const resolvedProblemId = await getProblemId({ id: problemId, slug: problemSlug });
    
    if (!resolvedProblemId) {
      return res.status(404).json({ error: 'Problem not found' });
    }
    
    // Check if the problem exists and if it's completed by the user
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        completedProblems: {
          where: { id: resolvedProblemId },
          select: { id: true, topicId: true, problemType: true, slug: true }
        }
      }
    });
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    if (user.completedProblems.length === 0) {
      return res.status(400).json({ 
        error: 'Problem has not been completed yet', 
        message: 'You need to complete this problem before adding it to spaced repetition'
      });
    }
    
    // Check if the problem is already in spaced repetition by checking reviewScheduledAt
    const existingProgress = await prisma.progress.findFirst({
      where: {
        userId,
        problemId: resolvedProblemId,
        reviewScheduledAt: { not: null }
      }
    });
    
    if (existingProgress) {
      return res.status(400).json({ 
        error: 'Problem already in spaced repetition', 
        message: 'This problem is already in your spaced repetition dashboard'
      });
    }
    
    const problem = user.completedProblems[0];
    
    // Only allow coding problems to be added to spaced repetition
    if (problem.problemType !== 'CODING') {
      return res.status(400).json({ 
        error: 'Only coding problems can be added to spaced repetition', 
        message: 'Only coding problems can be added to spaced repetition'
      });
    }
    
    // If there's no topicId, we can't create a progress record
    if (!problem.topicId) {
      return res.status(400).json({ 
        error: 'Problem is missing a topic', 
        message: 'Cannot add problem to spaced repetition: missing topic'
      });
    }
    
    // Get or create a progress record for this problem
    const existingProgressRecord = await prisma.progress.findFirst({
      where: {
        userId,
        problemId: resolvedProblemId
      }
    });
    
    let newProgress;
    
    if (existingProgressRecord) {
      // Update existing progress record using a transaction
      const result = await prisma.$transaction(async (tx) => {
        // Update existing progress record
        const updatedProgress = await tx.progress.update({
          where: {
            id: existingProgressRecord.id,
          },
          data: {
            reviewLevel: 0,
            reviewScheduledAt: calculateNextReviewDate(0),
            lastReviewedAt: new Date(),
            status: 'COMPLETED',
          },
        });
  
        // Create review history entry in the same transaction
        const reviewHistory = await tx.reviewHistory.create({
          data: {
            progressId: existingProgressRecord.id,
            date: new Date(),
            wasSuccessful: true,
            reviewOption: 'added-to-repetition',
            levelBefore: 0,
            levelAfter: 0
          }
        });
        
        return { updatedProgress, reviewHistory };
      });
      
      newProgress = result.updatedProgress;
    } else {
      // Create new progress record using a transaction
      const result = await prisma.$transaction(async (tx) => {
        // Ensure topic ID exists
        if (!problem.topicId) {
          throw new Error('Cannot create progress record: Problem is missing a topic ID');
        }
        
        // Create new progress record
        const newProgress = await tx.progress.create({
          data: {
            userId,
            problemId: resolvedProblemId,
            topicId: problem.topicId,
            reviewLevel: 0,
            reviewScheduledAt: calculateNextReviewDate(0),
            lastReviewedAt: new Date(),
            status: 'COMPLETED',
          },
        });
  
        // Create review history entry in the same transaction
        const reviewHistory = await tx.reviewHistory.create({
          data: {
            progressId: newProgress.id,
            date: new Date(),
            wasSuccessful: true,
            reviewOption: 'added-to-repetition',
            levelBefore: 0,
            levelAfter: 0
          }
        });
        
        return { newProgress, reviewHistory };
      });
      
      newProgress = result.newProgress;
    }
    
    res.json({ 
      message: 'Problem added to spaced repetition system',
      progress: newProgress,
      dueDate: newProgress.reviewScheduledAt,
      problemSlug: problem.slug
    });
  } catch (error) {
    console.error('[SpacedRepetition:AddToRepetition] Error adding problem:', error);
    res.status(500).json({ error: 'Failed to add problem to spaced repetition' });
  }
}) as RequestHandler);

/**
 * Get completed coding problems not already in spaced repetition
 * GET /api/v2/spaced-repetition/available-problems
 */
router.get('/available-problems', authenticateToken, (async (req, res) => {
  try {
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }
    
    // Find the user with their completed coding problems
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        completedProblems: {
          where: { problemType: 'CODING' },
          select: { 
            id: true, 
            name: true,
            slug: true,
            difficulty: true,
            topicId: true,
            topic: {
              select: {
                id: true,
                name: true,
                slug: true
              }
            }
          }
        }
      }
    });
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    console.log(`[SpacedRepetition:AvailableProblems] Found ${user.completedProblems.length} completed coding problems for user ${userId}`);
    
    // Get all problems already in spaced repetition
    // A problem is in spaced repetition if it has a reviewScheduledAt value
    // AND if the reviewLevel > 0 (since 0 is the default and is used to remove problems)
    const inSpacedRepetition = await prisma.progress.findMany({
      where: {
        userId,
        AND: [
          { reviewScheduledAt: { not: null } },
        ]
      },
      select: {
        problemId: true,
        reviewScheduledAt: true,
        reviewLevel: true
      }
    });
    
    console.log(`[SpacedRepetition:AvailableProblems] Found ${inSpacedRepetition.length} problems with reviewScheduledAt`);
    
    // Create a set of problem IDs already in spaced repetition for faster lookup
    // Only include problems that have a scheduled review date
    const spacedRepetitionProblemIds = new Set(
      inSpacedRepetition.map(p => p.problemId)
    );
    
    console.log(`[SpacedRepetition:AvailableProblems] ${spacedRepetitionProblemIds.size} problems are actually in spaced repetition`);
    
    // Filter completed problems to only include those not already in spaced repetition
    const availableProblems = user.completedProblems.filter(
      problem => !spacedRepetitionProblemIds.has(problem.id)
    );
    
    console.log(`[SpacedRepetition:AvailableProblems] Returning ${availableProblems.length} problems available to add to spaced repetition`);
    
    res.json(availableProblems);
  } catch (error) {
    console.error('[SpacedRepetition:AvailableProblems] Error:', error);
    res.status(500).json({ error: 'Failed to fetch available problems' });
  }
}) as RequestHandler);

export default router; 