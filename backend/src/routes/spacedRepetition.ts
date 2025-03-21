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
      progressId: progress.id
    }));
    
    res.json(dueProblems);
  } catch (error) {
    console.error('Error fetching due reviews:', error);
    res.status(500).json({ error: 'Failed to fetch due reviews' });
  }
}) as RequestHandler);

/**
 * Record a problem review result
 * POST /api/spaced-repetition/review
 */
router.post('/review', authenticateToken, (async (req, res) => {
  try {
    const { problemId, wasSuccessful } = req.body;
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }
    
    if (typeof problemId !== 'string' || typeof wasSuccessful !== 'boolean') {
      return res.status(400).json({ error: 'Invalid request parameters' });
    }
    
    // Find current progress
    const progress = await prisma.progress.findFirst({
      where: {
        userId,
        problemId,
        status: 'COMPLETED'
      }
    });
    
    if (!progress) {
      return res.status(404).json({ error: 'Progress record not found' });
    }
    
    // Calculate new review level
    const newLevel = calculateNewReviewLevel(progress.reviewLevel, wasSuccessful);
    
    // Calculate next review date
    const nextReviewDate = calculateNextReviewDate(newLevel);
    
    // Create review history entry
    const reviewEntry = createReviewHistoryEntry(wasSuccessful, progress.reviewLevel);
    
    // Get current history or initialize empty array
    const currentHistory = progress.reviewHistory as any[] || [];
    
    // Update progress record
    const updatedProgress = await prisma.progress.update({
      where: { id: progress.id },
      data: {
        reviewLevel: newLevel,
        lastReviewedAt: new Date(),
        reviewScheduledAt: nextReviewDate,
        reviewHistory: [...currentHistory, reviewEntry]
      }
    });
    
    res.json({ 
      message: 'Review recorded',
      nextReviewDate,
      newLevel
    });
  } catch (error) {
    console.error('Error recording review:', error);
    res.status(500).json({ error: 'Failed to record review' });
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
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);
    
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
    
    const formattedLevelCounts = levelCounts.reduce((acc, item) => {
      const level = item.reviewLevel === null ? 0 : item.reviewLevel;
      acc[level] = item._count.id;
      return acc;
    }, {} as Record<number, number>);
    
    res.json({
      byLevel: formattedLevelCounts,
      dueNow: dueCount,
      dueThisWeek: upcomingCount
    });
  } catch (error) {
    console.error('Error fetching spaced repetition stats:', error);
    res.status(500).json({ error: 'Failed to fetch spaced repetition stats' });
  }
}) as RequestHandler);

export default router; 