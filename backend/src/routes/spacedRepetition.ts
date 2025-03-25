import { Router } from 'express';
import type { RequestHandler } from 'express-serve-static-core';
import { prisma } from '../lib/prisma';
import { authenticateToken } from '../middleware/auth';
import { calculateNextReviewDate, calculateNewReviewLevel } from '../lib/spacedRepetition';
import { resolveProblem, getProblemId, getProblemSlug, getProgressForProblem } from '../lib/problemResolver';
import type { Prisma } from '@prisma/client';

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
          not: null
        }
      },
      include: {
        problem: {
          include: {
            topic: true
          }
        }
      } as Prisma.ProgressInclude,
      orderBy: {
        reviewScheduledAt: 'asc'
      }
    });
    
    const dueProblems = dueProgressRecords
      .filter(progress => progress.problem !== null)
      .map(progress => {
        const problem = progress.problem!;
        const topicId = problem.topicId;
        
        // Build a simpler object
        return {
          id: problem.id,
          slug: problem.slug,
          name: problem.name,
          difficulty: problem.difficulty,
          topicId: topicId,
          // Include a simple topic object with just the ID
          topic: { id: topicId || '' },
          problemType: problem.problemType,
          reviewLevel: progress.reviewLevel,
          lastReviewedAt: progress.lastReviewedAt,
          dueDate: progress.reviewScheduledAt,
          progressId: progress.id,
          reviews: progress.reviews || []
        };
      });
    
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
          not: null
        },
        reviewScheduledAt: {
          not: null
        }
      },
      include: {
        problem: {
          include: {
            topic: true
          }
        }
      } as Prisma.ProgressInclude,
      orderBy: {
        reviewScheduledAt: 'asc'
      }
    });
    
    const scheduledProblems = scheduledProgressRecords
      .filter(progress => progress.problem !== null)
      .map(progress => {
        const problem = progress.problem!;
        const topicId = problem.topicId;
        
        // Build a simpler object
        return {
          id: problem.id,
          slug: problem.slug,
          name: problem.name,
          difficulty: problem.difficulty,
          topicId: topicId,
          // Include a simple topic object with just the ID
          topic: { id: topicId || '' },
          problemType: problem.problemType,
          reviewLevel: progress.reviewLevel,
          lastReviewedAt: progress.lastReviewedAt,
          dueDate: progress.reviewScheduledAt,
          progressId: progress.id,
          reviews: progress.reviews || []
        };
      });
    
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
 * POST /api/spaced-repetition/review
 * Body: { problemSlug: string, wasSuccessful: boolean, reviewOption?: string }
 */
router.post('/review', authenticateToken, (async (req, res) => {
  try {
    const { problemSlug, wasSuccessful, reviewOption } = req.body;
    const userId = req.user?.id;
    
    console.log('[SpacedRepetition:Review] Processing review for:', { 
      userId, 
      problemSlug, 
      wasSuccessful, 
      reviewOption 
    });
    
    if (!userId) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }
    
    if (!problemSlug) {
      res.status(400).json({ error: 'Problem slug is required' });
      return;
    }
    
    if (typeof wasSuccessful !== 'boolean') {
      res.status(400).json({ error: 'wasSuccessful must be a boolean' });
      return;
    }
    
    // First, get the problem by slug - EXACTLY like the working debug endpoint
    const problem = await prisma.problem.findUnique({
      where: { slug: problemSlug },
      select: {
        id: true,
        name: true,
        slug: true,
        topicId: true
      }
    });
    
    if (!problem) {
      res.status(404).json({ error: 'Problem not found' });
      return;
    }
    
    if (!problem.topicId) {
      res.status(400).json({ error: 'Problem has no topic' });
      return;
    }
    
    console.log('[SpacedRepetition:Review] Found problem:', { 
      id: problem.id, 
      slug: problem.slug, 
      topicId: problem.topicId 
    });

    // TRANSACTION FIX: Use a fully serializable transaction to prevent race conditions
    // This ensures that we have the most up-to-date data and prevents concurrent operations
    try {
      const result = await prisma.$transaction(async (tx) => {
        // First check if record exists within transaction
        const existingRecord = await tx.progress.findUnique({
          where: {
            userId_topicId_problemId: {
              userId,
              topicId: problem.topicId!,
              problemId: problem.id
            }
          }
        });
        
        console.log(`[SpacedRepetition:Review] TRANSACTION: ${existingRecord ? 'Found' : 'Did not find'} existing record inside transaction`);
        
        // Calculate new review level
        let newReviewLevel = 1; // Default for first review
        
        if (existingRecord?.reviewLevel !== undefined && existingRecord.reviewLevel !== null) {
          if (wasSuccessful) {
            // Successful review increases the level (more with "easy")
            newReviewLevel = existingRecord.reviewLevel + (reviewOption === 'easy' ? 2 : 1);
          } else {
            // Unsuccessful review resets the level or decreases it
            newReviewLevel = reviewOption === 'forgot' ? 0 : Math.max(0, existingRecord.reviewLevel - 1);
          }
        }
        
        const reviewDate = new Date();
        const nextReviewDate = calculateNextReviewDate(newReviewLevel);

        // Either update existing record or create new one
        let progressRecord;
        if (existingRecord) {
          // Update existing
          progressRecord = await tx.progress.update({
            where: { id: existingRecord.id },
            data: {
              status: 'COMPLETED',
              reviewLevel: newReviewLevel,
              lastReviewedAt: reviewDate,
              reviewScheduledAt: nextReviewDate
            }
          });
        } else {
          // Create new
          progressRecord = await tx.progress.create({
            data: {
              userId,
              topicId: problem.topicId!,
              problemId: problem.id,
              status: 'COMPLETED',
              reviewLevel: newReviewLevel,
              lastReviewedAt: reviewDate,
              reviewScheduledAt: nextReviewDate
            }
          });
          
          // If this is a new record, connect the problem to completed problems
          await tx.user.update({
            where: { id: userId },
            data: {
              completedProblems: {
                connect: { id: problem.id }
              }
            }
          });
        }
        
        // Create review history
        const reviewHistory = await tx.reviewHistory.create({
          data: {
            progressId: progressRecord.id,
            date: reviewDate,
            wasSuccessful,
            reviewOption,
            levelBefore: existingRecord?.reviewLevel ?? null,
            levelAfter: newReviewLevel
          }
        });
        
        return {
          progressRecord,
          reviewHistory,
          isFirstReview: !existingRecord
        };
      }, {
        isolationLevel: 'Serializable' // Use serializable isolation to prevent race conditions
      });
      
      return res.json({
        message: result.isFirstReview ? 'New progress record created' : 'Progress record updated',
        isFirstReview: result.isFirstReview,
        progressRecord: result.progressRecord,
        reviewHistory: result.reviewHistory
      });
    } catch (error) {
      console.error('[SpacedRepetition:Review] Transaction error:', error);
      return res.status(500).json({ error: 'Failed to process review' });
    }
  } catch (error) {
    console.error('[SpacedRepetition:Review] Error:', error);
    res.status(500).json({ 
      error: 'Failed to process review',
      details: error instanceof Error ? error.message : String(error)
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
      // Get review statistics directly from the ReviewHistory table
      const reviewStats = await prisma.$transaction(async (tx) => {
        // Count total reviews
        const totalReviews = await prisma.reviewHistory.count({
          where: {
            progress: {
              userId
            }
          }
        });
        
        // Count reviews completed today
        const todayReviews = await prisma.reviewHistory.count({
          where: {
            progress: {
              userId
            },
            date: {
              gte: startOfToday
            }
          }
        });
        
        // Count reviews completed this week
        const weekReviews = await prisma.reviewHistory.count({
          where: {
            progress: {
              userId
            },
            date: {
              gte: startOfWeek
            }
          }
        });
        
        // Count reviews completed this month
        const monthReviews = await prisma.reviewHistory.count({
          where: {
            progress: {
              userId
            },
            date: {
              gte: startOfMonth
            }
          }
        });
        
        return {
          totalReviewed: totalReviews,
          completedToday: todayReviews,
          completedThisWeek: weekReviews,
          completedThisMonth: monthReviews
        };
      });
      
      // Process level counts
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
      
      res.json({
        byLevel: levelCounts.reduce((acc, item) => {
          const level = item.reviewLevel === null ? 0 : item.reviewLevel;
          acc[level] = item._count.id;
          return acc;
        }, {} as Record<number, number>),
        dueNow: dueCount || 0,
        dueThisWeek: upcomingCount || 0,
        totalReviewed: reviewStats.totalReviewed,
        completedToday: reviewStats.completedToday,
        completedThisWeek: reviewStats.completedThisWeek,
        completedThisMonth: reviewStats.completedThisMonth
      });
    } catch (error) {
      console.error('[SpacedRepetition:Stats] Error in database queries:', error);
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
 * Remove a problem from spaced repetition
 * DELETE /api/spaced-repetition/remove-problem/:identifier
 */
router.delete('/remove-problem/:identifier', authenticateToken, (async (req, res) => {
  try {
    const userId = req.user?.id;
    const { identifier } = req.params;
    
    if (!userId) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }
    
    if (!identifier) {
      res.status(400).json({ error: 'Problem identifier is required' });
      return;
    }
    
    // Resolve problem from identifier (could be ID or slug)
    const problem = await resolveProblem({ 
      id: identifier.includes('-') ? undefined : identifier,
      slug: identifier.includes('-') ? identifier : undefined
    });
    
    if (!problem) {
      res.status(404).json({ error: 'Problem not found' });
      return;
    }
    
    // Find progress record for this user and problem
    const progressRecord = await prisma.progress.findUnique({
      where: {
        userId_topicId_problemId: {
          userId,
          topicId: problem.topicId!,
          problemId: problem.id
        }
      }
    });
    
    if (!progressRecord) {
      res.status(404).json({ error: 'Progress record not found' });
      return;
    }
    
    // Update the progress record to remove it from spaced repetition
    const updatedProgress = await prisma.progress.update({
      where: { id: progressRecord.id },
      data: {
        reviewLevel: null,
        reviewScheduledAt: null,
        lastReviewedAt: null
      }
    });
    
    res.json({
      message: 'Problem removed from spaced repetition',
      problem: {
        id: problem.id,
        name: problem.name,
        slug: problem.slug
      },
      progress: {
        id: updatedProgress.id,
        updatedAt: updatedProgress.updatedAt
      }
    });
    return;
  } catch (error) {
    console.error('[SpacedRepetition:RemoveProblem] Error:', error);
    res.status(500).json({
      error: 'Failed to remove problem from spaced repetition',
      details: error instanceof Error ? error.message : String(error)
    });
    return;
  }
}) as RequestHandler);

/**
 * Add a problem to spaced repetition
 * POST /api/spaced-repetition/add-to-repetition
 */
router.post('/add-to-repetition', authenticateToken, (async (req, res) => {
  try {
    const { problemId, problemSlug, initialLevel = 1 } = req.body;
    const userId = req.user?.id;
    
    if (!userId) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }
    
    if (!problemId && !problemSlug) {
      res.status(400).json({ error: 'Either problemId or problemSlug is required' });
      return;
    }
    
    // Extract the success status and review option from query parameters or use defaults
    const wasSuccessful = true; // Initial add is always successful
    const reviewOption = req.body.reviewOption || 'added-to-repetition'; // Use a specific option for adds to distinguish them
    
    // Helper function to add problem to spaced repetition
    const addProblemToSpacedRepetition = async () => {
      // Resolve problem ID/slug to a full problem
      const problem = await resolveProblem({ id: problemId, slug: problemSlug });
      
      if (!problem) {
        res.status(404).json({
          error: 'Problem not found',
          message: 'The specified problem does not exist'
        });
        return false;
      }
      
      if (!problem.topicId) {
        res.status(400).json({
          error: 'Problem has no topic',
          message: 'Cannot create progress for a problem without a topic'
        });
        return false;
      }
      
      // Find the user and check if they've completed this problem
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
          completedProblems: {
            where: { id: problem.id },
            select: { id: true }
          }
        }
      });
      
      if (!user) {
        res.status(404).json({ error: 'User not found' });
        return false;
      }
      
      // Check if the problem is already completed
      const hasCompletedProblem = user.completedProblems.length > 0;
      
      // Calculate next review date based on initial level
      const reviewLevel = Number(initialLevel);
      if (reviewLevel < 0 || reviewLevel > 8 || isNaN(reviewLevel)) {
        res.status(400).json({
          error: 'Invalid initial level',
          message: 'Initial level must be between 0 and 8'
        });
        return false;
      }
      
      const nextReviewDate = calculateNextReviewDate(reviewLevel);
      
      // Find existing progress
      const existingProgress = await getProgressForProblem(userId, { id: problem.id });
      
      try {
        // If progress exists, update it
        if (existingProgress) {
          if (existingProgress.reviewLevel !== null) {
            res.status(400).json({
              error: 'Problem already in spaced repetition',
              message: 'This problem is already in your spaced repetition queue'
            });
            return false;
          }
          
          // Update existing progress
          const updatedProgress = await prisma.progress.update({
            where: { id: existingProgress.id },
            data: {
              reviewLevel,
              lastReviewedAt: new Date(),
              reviewScheduledAt: nextReviewDate,
              status: 'COMPLETED'
            } as Prisma.ProgressUpdateInput
          });
          
          // If problem isn't marked as completed yet, add it
          if (!hasCompletedProblem) {
            await prisma.user.update({
              where: { id: userId },
              data: {
                completedProblems: {
                  connect: { id: problem.id }
                }
              }
            });
          }
          
          // For the first ReviewHistory creation in /add-to-repetition endpoint:
          console.log('Creating ReviewHistory for existing progress:', {
            progressId: updatedProgress.id,
            reviewLevel,
            wasSuccessful
          });

          try {
            // For updating existing progress  
            await prisma.reviewHistory.create({
              data: {
                progressId: updatedProgress.id,
                date: new Date(),
                wasSuccessful: wasSuccessful,
                reviewOption: reviewOption,
                levelBefore: existingProgress.reviewLevel,
                levelAfter: reviewLevel
              }
            });
            console.log('Successfully created ReviewHistory for existing progress');
          } catch (error) {
            console.error('Error creating ReviewHistory for existing progress:', error);
            // Don't throw here as we want to continue with the response
          }
          
          res.json({
            message: 'Problem added to spaced repetition',
            progress: updatedProgress,
            problem: {
              id: problem.id,
              name: problem.name,
              slug: problem.slug
            }
          });
          return true;
        } else {
          // Create new progress
          const newProgress = await prisma.progress.create({
            data: {
              user: { connect: { id: userId } },
              problem: { connect: { id: problem.id } },
              topic: { connect: { id: problem.topicId! } },
              status: 'COMPLETED',
              reviewLevel,
              lastReviewedAt: new Date(),
              reviewScheduledAt: nextReviewDate
            } as Prisma.ProgressCreateInput
          });
          
          // If problem isn't marked as completed yet, add it
          if (!hasCompletedProblem) {
            await prisma.user.update({
              where: { id: userId },
              data: {
                completedProblems: {
                  connect: { id: problem.id }
                }
              }
            });
          }
          
          // For the second ReviewHistory creation in /add-to-repetition endpoint:
          console.log('Creating ReviewHistory for new progress:', {
            progressId: newProgress.id,
            reviewLevel,
            wasSuccessful
          });

          try {
            // For creating new progress
            await prisma.reviewHistory.create({
              data: {
                progressId: newProgress.id,
                date: new Date(),
                wasSuccessful: wasSuccessful,
                reviewOption: reviewOption,
                levelBefore: null, // Initial add has no previous level
                levelAfter: reviewLevel
              }
            });
            console.log('Successfully created ReviewHistory for new progress');
          } catch (error) {
            console.error('Error creating ReviewHistory for new progress:', error);
            // Don't throw here as we want to continue with the response
          }
          
          res.json({
            message: 'Problem added to spaced repetition',
            progress: newProgress,
            problem: {
              id: problem.id,
              name: problem.name,
              slug: problem.slug
            }
          });
          return true;
        }
      } catch (error) {
        console.error('[SpacedRepetition:AddToRepetition] Database error:', error);
        res.status(500).json({
          error: 'Failed to add problem to spaced repetition',
          details: error instanceof Error ? error.message : String(error)
        });
        return false;
      }
    };
    
    // Execute the function
    const success = await addProblemToSpacedRepetition();
    
    // If the function already sent a response, we're done
    if (!success) {
      // The function should have already set an appropriate error response
      return;
    }
  } catch (error) {
    console.error('[SpacedRepetition:AddToRepetition] General error:', error);
    res.status(500).json({ error: 'Failed to add problem to spaced repetition' });
    return;
  }
}) as RequestHandler);

/**
 * Get all problems available for spaced repetition
 * GET /api/spaced-repetition/available-problems
 */
router.get('/available-problems', authenticateToken, (async (req, res) => {
  try {
    const userId = req.user?.id;
    
    if (!userId) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }
    
    // 1. Get all completed problems from the "completedProblems" relation
    const userWithProblems = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        completedProblems: {
          select: {
            id: true,
            name: true,
            slug: true,
            topicId: true,
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
        }
      }
    });
    
    if (!userWithProblems) {
      res.status(404).json({ error: 'User not found' });
      return;
    }
    
    // 2. Get all problems that have progress records marked as COMPLETED
    const progressWithProblems = await prisma.progress.findMany({
      where: {
        userId,
        status: 'COMPLETED',
        problem: {
          isNot: null
        }
      },
      include: {
        problem: {
          select: {
            id: true,
            name: true,
            slug: true,
            topicId: true, 
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
        }
      }
    });
    
    // 3. Get all problems already in spaced repetition
    const spacedRepetitionProblems = await prisma.progress.findMany({
      where: {
        userId,
        reviewLevel: { not: null }
      },
      select: {
        problemId: true,
        reviewLevel: true,
        lastReviewedAt: true,
        reviewScheduledAt: true
      }
    });
    
    const spacedRepProblemIds = new Set(
      spacedRepetitionProblems
        .filter(p => p.problemId !== null)
        .map(p => p.problemId!)
    );
    
    console.log(`[AvailableProblems] Found ${spacedRepProblemIds.size} problems already in spaced repetition`);
    
    // 4. Build a map of all completed problems
    const problemMap = new Map();
    
    // Add problems from completedProblems relation
    userWithProblems.completedProblems.forEach(problem => {
      if (problem && !problemMap.has(problem.id)) {
        problemMap.set(problem.id, {
          ...problem,
          source: 'completedProblems'
        });
      }
    });
    
    // Add problems from progress records
    progressWithProblems.forEach(record => {
      if (record.problem && !problemMap.has(record.problem.id)) {
        problemMap.set(record.problem.id, {
          ...record.problem,
          source: 'progress'
        });
      }
    });
    
    console.log(`[AvailableProblems] Found ${problemMap.size} total completed problems`);
    
    // 5. Filter out problems already in spaced repetition
    const availableProblems = Array.from(problemMap.values())
      .filter(problem => !spacedRepProblemIds.has(problem.id));
    
    console.log(`[AvailableProblems] ${availableProblems.length} problems available to add`);
    
    // 6. Group problems by topic
    const problemsByTopic = availableProblems.reduce((acc, problem) => {
      const topicId = problem.topic?.id || 'unknown';
      const topicName = problem.topic?.name || 'Unknown';
      
      if (!acc[topicId]) {
        acc[topicId] = {
          topic: {
            id: topicId,
            name: topicName,
            slug: problem.topic?.slug || ''
          },
          problems: []
        };
      }
      
      acc[topicId].problems.push({
        id: problem.id,
        name: problem.name,
        slug: problem.slug,
        difficulty: problem.difficulty,
        problemType: problem.problemType,
        topic: problem.topic,
        source: problem.source,
        isInSpacedRepetition: false
      });
      
      return acc;
    }, {} as Record<string, { topic: any, problems: any[] }>);
    
    // Define a type for topic objects
    interface TopicWithProblems {
      topic: {
        id: string;
        name: string;
        slug: string;
      };
      problems: Array<{
        id: string;
        name: string;
        slug: string;
        difficulty: any;
        problemType: any;
        topic: any;
        source: string;
        isInSpacedRepetition: boolean;
      }>;
    }
    
    // 7. Remove empty topics and sort problems within each topic
    type TopicType = { topic: any; problems: Array<{ name: string }> };
    
    const nonEmptyTopics = Object.values(problemsByTopic)
      // Type-cast the topic to avoid TypeScript errors
      .filter((topic) => {
        const t = topic as TopicType;
        return t && t.problems && Array.isArray(t.problems) && t.problems.length > 0;
      })
      .map((topic) => {
        const t = topic as TopicType;
        return {
          ...t,
          problems: [...t.problems].sort((a, b) => 
            (a.name || '').localeCompare(b.name || '')
          )
        };
      });
    
    // 8. Return the response
    res.json({
      topics: nonEmptyTopics,
      totalProblems: problemMap.size,
      inSpacedRepetition: spacedRepProblemIds.size,
      availableToAdd: availableProblems.length,
      debug: {
        completedCount: userWithProblems.completedProblems.length,
        progressCount: progressWithProblems.length,
        combinedCount: problemMap.size
      }
    });
  } catch (error) {
    console.error('[SpacedRepetition:AvailableProblems] Error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch available problems',
      details: error instanceof Error ? error.message : String(error)
    });
  }
}) as RequestHandler);

/**
 * Admin endpoint to clean up and fix any duplicate progress records
 * POST /api/spaced-repetition/admin/cleanup
 */
router.post('/admin/cleanup', authenticateToken, (async (req, res) => {
  try {
    const userId = req.user?.id;
    const userRole = req.user?.role;
    
    // This endpoint is admin only
    if (userRole !== 'ADMIN' && userRole !== 'DEVELOPER') {
      res.status(403).json({ error: 'Not authorized to use admin endpoints' });
      return;
    }
    
    if (!userId) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }
    
    // Delete all progress records that don't have a valid problem attached
    const deleteResult = await prisma.progress.deleteMany({
      where: {
        OR: [
          { problemId: null },
          { problem: null }
        ]
      }
    });
    
    res.json({
      message: 'Cleanup completed successfully',
      deletedRecords: deleteResult.count
    });
    return;
  } catch (error) {
    console.error('[SpacedRepetition:AdminCleanup] Error:', error);
    res.status(500).json({ error: 'Failed to clean up progress records' });
    return;
  }
}) as RequestHandler);

/**
 * Admin endpoint to fix duplicate progress records
 * POST /api/spaced-repetition/admin/fix-duplicates
 */
router.post('/admin/fix-duplicates', authenticateToken, (async (req, res) => {
  try {
    const userRole = req.user?.role;
    
    // This endpoint is admin only
    if (userRole !== 'ADMIN' && userRole !== 'DEVELOPER') {
      res.status(403).json({ error: 'Not authorized to use admin endpoints' });
      return;
    }
    
    // 1. Find all unique combinations of userId, topicId, problemId that have duplicates
    const duplicates = await prisma.$queryRaw`
      SELECT "userId", "topicId", "problemId", COUNT(*) as count
      FROM progress 
      WHERE "problemId" IS NOT NULL AND "topicId" IS NOT NULL
      GROUP BY "userId", "topicId", "problemId"
      HAVING COUNT(*) > 1
    `;
    
    console.log(`Found ${(duplicates as any[]).length} sets of duplicate progress records`);
    
    // 2. Process each set of duplicates
    let totalFixed = 0;
    let totalReviewsMigrated = 0;
    const errors: any[] = [];
    
    for (const duplicate of duplicates as any[]) {
      try {
        // Get all progress records for this combination
        const records = await prisma.progress.findMany({
          where: {
            userId: duplicate.userId,
            topicId: duplicate.topicId,
            problemId: duplicate.problemId
          },
          include: {
            reviews: true
          },
          orderBy: {
            reviewLevel: 'desc' // Keep the highest level record
          }
        });
        
        // Keep the first record (highest level) and collect all others for deletion
        const [keepRecord, ...duplicateRecords] = records;
        const duplicateIds = duplicateRecords.map(record => record.id);
        
        // Get all review history entries from the duplicates
        const reviewHistoryEntries = duplicateRecords.flatMap(record => record.reviews);
        
        // Use a transaction to consolidate
        await prisma.$transaction(async (tx) => {
          // For each review history entry, create a new one linked to the kept record
          for (const entry of reviewHistoryEntries) {
            await tx.reviewHistory.create({
              data: {
                progressId: keepRecord.id,
                date: entry.date,
                wasSuccessful: entry.wasSuccessful,
                reviewOption: entry.reviewOption || undefined,
                levelBefore: entry.levelBefore,
                levelAfter: entry.levelAfter,
                createdAt: entry.createdAt
              }
            });
          }
          
          // Delete all review history entries from duplicates
          await tx.reviewHistory.deleteMany({
            where: {
              progressId: {
                in: duplicateIds
              }
            }
          });
          
          // Delete duplicate progress records
          await tx.progress.deleteMany({
            where: {
              id: {
                in: duplicateIds
              }
            }
          });
        });
        
        totalFixed++;
        totalReviewsMigrated += reviewHistoryEntries.length;
      } catch (error) {
        console.error('Error fixing duplicate:', error);
        errors.push({
          userId: duplicate.userId,
          topicId: duplicate.topicId,
          problemId: duplicate.problemId,
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }
    
    res.json({
      totalDuplicateSets: (duplicates as any[]).length,
      totalFixed,
      totalReviewsMigrated,
      errors
    });
  } catch (error) {
    console.error('Error fixing duplicates:', error);
    res.status(500).json({
      error: 'Failed to fix duplicate progress records',
      details: error instanceof Error ? error.message : String(error)
    });
  }
}) as RequestHandler);

export default router; 