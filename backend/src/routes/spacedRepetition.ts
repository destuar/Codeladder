import { Router } from 'express';
import type { RequestHandler } from 'express-serve-static-core';
import { prisma } from '../lib/prisma';
import { authenticateToken } from '../middleware/auth';
import { authorizeRoles } from '../middleware/authorize';
import { Role, SpacedRepetitionItem, Problem, Topic } from '@prisma/client';
import { calculateNextReviewDate, calculateNewReviewLevel, createReviewHistoryEntry, ReviewOutcomeType } from '../lib/spacedRepetition';
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
    nextWeek.setDate(now.getDate() + 7);
    
    // Define the expected type for items fetched from SpacedRepetitionItem with included relations
    type SpacedRepetitionItemWithDetails = SpacedRepetitionItem & {
      problem: (Problem & {
        topic: Topic | null;
      }) | null;
    };

    const dueSpacedRepetitionItems: SpacedRepetitionItemWithDetails[] = await prisma.spacedRepetitionItem.findMany({
      where: {
        userId,
        isActive: true,
        reviewScheduledAt: {
          lte: nextWeek
        }
      },
      include: {
        problem: {        // Include the full Problem object
          include: {      // Within Problem, include its related Topic fully
            topic: true   // This will fetch all fields of Topic
          }
        }
        // Note: ReviewHistory is tied to the Progress model.
        // A separate solution for review history per SpacedRepetitionItem is needed.
        // For now, we omit direct review history here.
      },
      orderBy: {
        reviewScheduledAt: 'asc'
      }
    });
    
    const dueProblems = dueSpacedRepetitionItems.map((item: SpacedRepetitionItemWithDetails) => ({
      id: item.problem?.id,
      slug: item.problem?.slug,
      name: item.problem?.name,
      difficulty: item.problem?.difficulty,
      topic: item.problem?.topic,
      problemType: item.problem?.problemType,
      reviewLevel: item.reviewLevel,
      lastReviewedAt: item.lastReviewedAt,
      dueDate: item.reviewScheduledAt,
      spacedRepetitionItemId: item.id,
      progressId: null, 
      reviewHistory: []
    }));
    
    res.json(dueProblems);
  } catch (error) {
    const err = error as Error;
    console.error('[SpacedRepetition:DueV2] Error fetching due review items:', {
        message: err.message,
        stack: err.stack
    });
    res.status(500).json({ error: 'Failed to fetch due review items', details: err.message });
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

    // Define the expected type for items fetched from SpacedRepetitionItem with included relations
    // This type can be reused from the /due route or defined locally if preferred
    type SpacedRepetitionItemWithDetails = SpacedRepetitionItem & {
      problem: (Problem & {
        topic: Topic | null;
      }) | null;
    };

    // Get all active scheduled review items from SpacedRepetitionItem
    const allActiveItems: SpacedRepetitionItemWithDetails[] = await prisma.spacedRepetitionItem.findMany({
      where: {
        userId,
        isActive: true // Only fetch active items
        // No filter on reviewScheduledAt to get all scheduled items
      },
      include: {
        problem: {        // Include the full Problem object
          include: {      // Within Problem, include its related Topic fully
            topic: true
          }
        }
        // ReviewHistory is not included here as it needs adaptation for SpacedRepetitionItem
      },
      orderBy: {
        reviewScheduledAt: 'asc'
      }
    });

    const scheduledProblems = allActiveItems
      .filter(item => item.problem !== null) // Ensure problem data exists
      .map((item: SpacedRepetitionItemWithDetails) => ({
        id: item.problem!.id,
        slug: item.problem!.slug,
        name: item.problem!.name,
        difficulty: item.problem!.difficulty,
        topic: item.problem!.topic, // Will be null if problem has no topic
        problemType: item.problem!.problemType,
        reviewLevel: item.reviewLevel,
        lastReviewedAt: item.lastReviewedAt,
        dueDate: item.reviewScheduledAt,
        spacedRepetitionItemId: item.id, // Identifier for the new system
        progressId: null, // Explicitly null for items from the new system
        reviewHistory: [] // Placeholder, as ReviewHistory is not yet adapted
      }));      

    // Group problems by their due date timeframe
    const now = new Date();
    now.setHours(0,0,0,0); // Normalize now to the start of the day for consistent comparisons

    const now7Days = new Date(now);
    now7Days.setDate(now.getDate() + 7);
    const now30Days = new Date(now);
    now30Days.setDate(now.getDate() + 30);

    const categorizedProblems = {
      dueToday: scheduledProblems.filter(p => 
        p.dueDate && new Date(p.dueDate) <= now
      ),
      dueThisWeek: scheduledProblems.filter(p => 
        p.dueDate && 
        new Date(p.dueDate) > now && 
        new Date(p.dueDate) < now7Days // Use < now7Days so it doesn't overlap with dueThisMonth start
      ),
      dueThisMonth: scheduledProblems.filter(p => 
        p.dueDate && 
        new Date(p.dueDate) >= now7Days && // Use >= now7Days
        new Date(p.dueDate) < now30Days  // Use < now30Days
      ),
      dueLater: scheduledProblems.filter(p => 
        p.dueDate && 
        new Date(p.dueDate) >= now30Days // Use >= now30Days
      ),
      all: scheduledProblems
    };

    res.json(categorizedProblems);
  } catch (error) {
    const err = error as Error;
    console.error('[SpacedRepetition:AllScheduledV2] Error fetching all scheduled review items:', { 
        message: err.message, 
        stack: err.stack 
    });
    res.status(500).json({
      dueToday: [],
      dueThisWeek: [],
      dueThisMonth: [],
      dueLater: [],
      all: [],
      error: 'Failed to fetch all scheduled items',
      details: err.message
    });
  }
}) as RequestHandler);

/**
 * Record a problem review result
 * POST /api/v2/spaced-repetition/review
 * Body: { spacedRepetitionItemId: string, reviewOption: string }
 */
router.post('/review', authenticateToken, (async (req, res) => {
  try {
    const { spacedRepetitionItemId, reviewOption } = req.body as { spacedRepetitionItemId: string, reviewOption: ReviewOutcomeType };
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    if (!spacedRepetitionItemId || !reviewOption) {
      return res.status(400).json({ error: 'spacedRepetitionItemId and reviewOption are required' });
    }

    const item = await prisma.spacedRepetitionItem.findUnique({
      where: {
        id: spacedRepetitionItemId,
        userId: userId
      },
      include: {
        problem: {
          select: { slug: true, name: true }
        }
      }
    });

    if (!item) {
      return res.status(404).json({ error: 'Spaced repetition item not found or access denied' });
    }

    if (!item.isActive) {
      return res.status(400).json({ error: 'Cannot review an inactive item. Please add it again.' });
    }

    let wasSuccessful: boolean;
    switch (reviewOption) {
      case 'difficult':
      case 'again':
      case 'forgot':
        wasSuccessful = false;
        break;
      case 'easy':
      case 'good':
      case 'standard-review':
      default:
        wasSuccessful = true;
        break;
    }

    const currentLevel = item.reviewLevel;
    const newLevel = calculateNewReviewLevel(currentLevel, wasSuccessful, reviewOption);
    const nextReviewDate = calculateNextReviewDate(newLevel, item.reviewScheduledAt);
    const lastReviewedAt = new Date();

    const updatedItem = await prisma.spacedRepetitionItem.update({
      where: {
        id: spacedRepetitionItemId
      },
      data: {
        reviewLevel: newLevel,
        reviewScheduledAt: nextReviewDate,
        lastReviewedAt: lastReviewedAt,
        // isActive remains true unless explicitly set otherwise
      }
    });
    
    // TODO: Implement ReviewHistory for SpacedRepetitionItem
    // For now, we are not creating a ReviewHistory entry as it's tied to the Progress model.
    // This would require schema changes to ReviewHistory or a new SpacedRepetitionItemReviewHistory model.

    res.json({
      message: 'Review processed successfully',
      updatedItem: {
        id: updatedItem.id,
        problemId: updatedItem.problemId,
        problemName: item.problem?.name, // Include problem name for context
        problemSlug: item.problem?.slug,
        reviewLevel: updatedItem.reviewLevel,
        dueDate: updatedItem.reviewScheduledAt,
        lastReviewed: updatedItem.lastReviewedAt
      }
    });

  } catch (error) {
    const err = error as Error;
    console.error('[SpacedRepetition:ReviewV2] Error processing review:', { 
        message: err.message, 
        stack: err.stack 
    });
    res.status(500).json({ error: 'Failed to process review', details: err.message });
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
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfWeek = new Date(startOfToday);
    startOfWeek.setDate(startOfToday.getDate() - startOfToday.getDay() + (startOfToday.getDay() === 0 ? -6 : 1)); // Adjust to Monday as start of week
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const nextWeekDate = new Date(now);
    nextWeekDate.setDate(now.getDate() + 7);

    // Count problems at each review level from SpacedRepetitionItem
    const levelCountsResults = await prisma.spacedRepetitionItem.groupBy({
      by: ['reviewLevel'],
      where: {
        userId,
        isActive: true
      },
      _count: {
        id: true
      }
    });
    const byLevel = levelCountsResults.reduce((acc: Record<number, number>, item: { reviewLevel: number; _count: { id: number } }) => {
      acc[item.reviewLevel] = item._count.id;
      return acc;
    }, {} as Record<number, number>);

    // Count problems due for review now from SpacedRepetitionItem
    const dueNowCount = await prisma.spacedRepetitionItem.count({
      where: {
        userId,
        isActive: true,
        reviewScheduledAt: {
          lte: now
        }
      }
    });

    // Count problems upcoming for review in the next 7 days from SpacedRepetitionItem
    const dueThisWeekCount = await prisma.spacedRepetitionItem.count({
      where: {
        userId,
        isActive: true,
        reviewScheduledAt: {
          gt: now,
          lte: nextWeekDate
        }
      }
    });

    // Simplified review counts based on lastReviewedAt from SpacedRepetitionItem
    const itemsReviewedToday = await prisma.spacedRepetitionItem.count({
      where: {
        userId,
        isActive: true, // Consider if inactive items reviewed today should count
        lastReviewedAt: {
          gte: startOfToday
        }
      }
    });

    const itemsReviewedThisWeek = await prisma.spacedRepetitionItem.count({
      where: {
        userId,
        isActive: true,
        lastReviewedAt: {
          gte: startOfWeek
        }
      }
    });

    const itemsReviewedThisMonth = await prisma.spacedRepetitionItem.count({
      where: {
        userId,
        isActive: true,
        lastReviewedAt: {
          gte: startOfMonth
        }
      }
    });

    const totalItemsEverReviewed = await prisma.spacedRepetitionItem.count({
        where: {
            userId,
            lastReviewedAt: {
                not: null
            }
            // isActive: true, // Optional: Decide if only currently active items count towards this
        }
    });

    res.json({
      byLevel,
      dueNow: dueNowCount,
      dueThisWeek: dueThisWeekCount,
      // Using simplified interaction counts based on lastReviewedAt
      totalReviewed: totalItemsEverReviewed, // Total items that have been reviewed at least once
      completedToday: itemsReviewedToday,    // Items interacted with today
      completedThisWeek: itemsReviewedThisWeek,  // Items interacted with this week
      completedThisMonth: itemsReviewedThisMonth // Items interacted with this month
    });

  } catch (error) {
    const err = error as Error;
    console.error('[SpacedRepetition:StatsV2] Error fetching stats:', {
        message: err.message,
        stack: err.stack
    });
    // Send a simple response with zeros instead of throwing a 500 error
    res.status(500).json({
      byLevel: {},
      dueNow: 0,
      dueThisWeek: 0,
      totalReviewed: 0,
      completedToday: 0,
      completedThisWeek: 0,
      completedThisMonth: 0,
      error: 'Error fetching stats', 
      details: err.message
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

    console.log('[SpacedRepetition:RemoveProblemV2] Request to remove problem:', { userId, identifier });

    // Resolve problemId using either ID or slug
    // A simple heuristic: if it looks like a CUID/UUID, treat as ID, else as slug.
    // For more robustness, you might try querying by ID first, then by slug if not found.
    const isLikelyId = identifier.length >= 20 && (identifier.startsWith('c') || identifier.includes('-')); // Basic CUID/UUID check
    const problemId = await getProblemId({
      id: isLikelyId ? identifier : undefined,
      slug: !isLikelyId ? identifier : undefined
    });

    if (!problemId) {
      console.log('[SpacedRepetition:RemoveProblemV2] Problem not found for identifier:', identifier);
      return res.status(404).json({ error: 'Problem not found based on the provided identifier' });
    }

    console.log('[SpacedRepetition:RemoveProblemV2] Resolved problemId:', problemId);

    // Find the SpacedRepetitionItem for this user and problem
    const spacedRepetitionItem = await prisma.spacedRepetitionItem.findUnique({
      where: {
        userId_problemId: {
          userId,
          problemId
        }
      }
    });

    if (!spacedRepetitionItem) {
      console.log('[SpacedRepetition:RemoveProblemV2] SpacedRepetitionItem not found for user and problem.');
      return res.status(404).json({ error: 'Problem not found in your spaced repetition list.' });
    }

    if (!spacedRepetitionItem.isActive) {
      console.log('[SpacedRepetition:RemoveProblemV2] Item already inactive.');
      return res.status(200).json({ message: 'Problem was already inactive in spaced repetition.', item: spacedRepetitionItem });
    }

    // Set isActive to false to "remove" it from active spaced repetition
    const updatedItem = await prisma.spacedRepetitionItem.update({
      where: {
        id: spacedRepetitionItem.id
      },
      data: {
        isActive: false,
        // Optionally reset other fields if desired, but isActive is key
        // reviewLevel: 0, 
        // reviewScheduledAt: null,
        updatedAt: new Date() // Explicitly set updatedAt if not handled by DB trigger
      }
    });

    console.log('[SpacedRepetition:RemoveProblemV2] Item deactivated:', updatedItem.id);
    res.json({
      message: 'Problem removed from active spaced repetition system',
      item: updatedItem
    });

  } catch (error) {
    const err = error as Error;
    console.error('[SpacedRepetition:RemoveProblemV2] Error removing problem:', {
        message: err.message,
        stack: err.stack
    });
    res.status(500).json({ error: 'Failed to remove problem from spaced repetition', details: err.message });
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
    
    console.log('[SpacedRepetition:AddToRepetitionV2] Adding problem to spaced repetition items:', { 
      userId, problemId, problemSlug 
    });
    
    const resolvedProblemId = await getProblemId({ id: problemId, slug: problemSlug });
    
    if (!resolvedProblemId) {
      return res.status(404).json({ error: 'Problem not found' });
    }
    
    // Fetch the problem details, including its type
    const problemData = await prisma.problem.findUnique({
      where: { id: resolvedProblemId },
      select: { id: true, problemType: true, slug: true } // Ensure slug is selected for response
    });

    if (!problemData) {
      return res.status(404).json({ error: 'Problem not found' });
    }

    // Only allow coding problems to be added to spaced repetition (existing logic)
    if (problemData.problemType !== 'CODING') {
      return res.status(400).json({ 
        error: 'Only coding problems can be added to spaced repetition', 
        message: 'Only coding problems can be added to spaced repetition'
      });
    }

    // Check if the user has marked this problem as completed in the general sense
    // This uses the User.completedProblems relation, which is independent of topics
    const userCompletedProblem = await prisma.user.findFirst({
      where: {
        id: userId,
        completedProblems: {
          some: { id: resolvedProblemId }
        }
      }
    });

    if (!userCompletedProblem) {
      return res.status(400).json({ 
        error: 'Problem has not been completed yet', 
        message: 'You need to complete this problem before adding it to spaced repetition'
      });
    }
    
    // Check if the problem is already actively in the new spaced_repetition_items table
    const existingSpacedRepetitionItem = await prisma.spacedRepetitionItem.findUnique({
      where: {
        userId_problemId: {
          userId,
          problemId: resolvedProblemId,
        }
      }
    });
    
    if (existingSpacedRepetitionItem && existingSpacedRepetitionItem.isActive) {
      return res.status(400).json({ 
        error: 'Problem already in spaced repetition', 
        message: 'This problem is already in your spaced repetition dashboard'
      });
    }

    // If it exists but is inactive, re-activate. Otherwise, create new.
    const initialReviewLevel = 0;
    const now = new Date();
    const initialScheduledDate = calculateNextReviewDate(initialReviewLevel, now); // Base next review on now

    let newItem;
    if (existingSpacedRepetitionItem) { // Exists but was inactive
      newItem = await prisma.spacedRepetitionItem.update({
        where: {
          id: existingSpacedRepetitionItem.id
        },
        data: {
          isActive: true,
          reviewLevel: initialReviewLevel,
          lastReviewedAt: now,
          reviewScheduledAt: initialScheduledDate,
          updatedAt: now // Manually set updatedAt if no global trigger
        }
      });
      console.log('[SpacedRepetition:AddToRepetitionV2] Reactivated item:', newItem.id);
    } else {
      newItem = await prisma.spacedRepetitionItem.create({
        data: {
          userId,
          problemId: resolvedProblemId,
          reviewLevel: initialReviewLevel,
          lastReviewedAt: now,
          reviewScheduledAt: initialScheduledDate,
          isActive: true,
          // createdAt will be default, updatedAt will be set by Prisma or trigger
        }
      });
      console.log('[SpacedRepetition:AddToRepetitionV2] Created new item:', newItem.id);
    }
    
    res.json({ 
      message: 'Problem added to spaced repetition system',
      item: {
        id: newItem.id,
        problemId: newItem.problemId,
        problemSlug: problemData.slug, // Include slug in response
        reviewLevel: newItem.reviewLevel,
        dueDate: newItem.reviewScheduledAt,
        isActive: newItem.isActive
      }
    });

  } catch (error) {
    const err = error as Error;
    console.error('[SpacedRepetition:AddToRepetitionV2] Error adding problem:', {
      message: err.message,
      stack: err.stack
    });
    res.status(500).json({ error: 'Failed to add problem to spaced repetition', details: err.message });
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
    const userWithCompletedProblems = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        completedProblems: {
          where: { problemType: 'CODING' },
          select: {
            id: true,
            name: true,
            slug: true,
            difficulty: true,
            // topicId and topic can be included if useful for display, but not core to logic
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

    if (!userWithCompletedProblems) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const completedCodingProblems = userWithCompletedProblems.completedProblems;
    console.log(`[SpacedRepetition:AvailableProblemsV2] Found ${completedCodingProblems.length} completed coding problems for user ${userId}`);

    // Get all problem IDs already actively in the new SpacedRepetitionItem table for the user
    const activeSpacedRepetitionItems = await prisma.spacedRepetitionItem.findMany({
      where: {
        userId,
        isActive: true
      },
      select: {
        problemId: true
      }
    });

    const activeSpacedRepetitionProblemIds = new Set(
      activeSpacedRepetitionItems.map(item => item.problemId)
    );
    console.log(`[SpacedRepetition:AvailableProblemsV2] ${activeSpacedRepetitionProblemIds.size} problems are actively in spaced repetition items.`);

    // Filter completed problems to only include those not already in active spaced repetition items
    const availableProblems = completedCodingProblems.filter(
      problem => !activeSpacedRepetitionProblemIds.has(problem.id)
    );

    console.log(`[SpacedRepetition:AvailableProblemsV2] Returning ${availableProblems.length} problems available to add.`);
    res.json(availableProblems);

  } catch (error) {
    const err = error as Error;
    console.error('[SpacedRepetition:AvailableProblemsV2] Error:', {
        message: err.message,
        stack: err.stack
    });
    res.status(500).json({ error: 'Failed to fetch available problems', details: err.message });
  }
}) as RequestHandler);

export default router; 