import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { authenticateToken } from '../middleware/auth';
import type { RequestHandler } from 'express-serve-static-core';
import { calculateNextReviewDate } from '../lib/spacedRepetition';

const router = Router();

/**
 * Debug endpoint to check progress records for a specific problem
 * GET /api/debug/progress/:problemSlug
 */
router.get('/progress/:problemSlug', authenticateToken, (async (req, res) => {
  try {
    const { problemSlug } = req.params;
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }
    
    // First, get the problem by slug
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
      return res.status(404).json({ error: 'Problem not found' });
    }
    
    // Then, find all progress records for this user and problem
    const progressRecords = await prisma.progress.findMany({
      where: {
        userId,
        problemId: problem.id
      },
      include: {
        reviews: {
          orderBy: {
            date: 'desc'
          }
        }
      }
    });
    
    // Also get all raw review history records
    const reviewHistoryRecords = await prisma.reviewHistory.findMany({
      where: {
        progress: {
          userId,
          problemId: problem.id
        }
      },
      orderBy: {
        date: 'desc'
      }
    });
    
    // Return all data
    res.json({
      problem,
      progressRecords,
      reviewHistoryRecords,
      debugInfo: {
        problem_id: problem.id,
        topic_id: problem.topicId,
        user_id: userId,
        total_progress_records: progressRecords.length,
        total_review_history_records: reviewHistoryRecords.length
      }
    });
  } catch (error) {
    console.error('Debug error:', error);
    res.status(500).json({ error: 'Debug query failed' });
  }
}) as RequestHandler);

// Add a new endpoint to clean up duplicate progress records
router.post('/cleanup-progress/:problemSlug', authenticateToken, (async (req, res) => {
  try {
    const { problemSlug } = req.params;
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }
    
    // First, get the problem by slug
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
      return res.status(404).json({ error: 'Problem not found' });
    }
    
    if (!problem.topicId) {
      return res.status(400).json({ error: 'Problem has no topic' });
    }
    
    // Find all progress records for this user, problem, and topic
    const progressRecords = await prisma.progress.findMany({
      where: {
        userId,
        problemId: problem.id,
        topicId: problem.topicId
      },
      include: {
        reviews: true
      },
      orderBy: {
        reviewLevel: 'desc' // Keep the highest level record
      }
    });
    
    if (progressRecords.length <= 1) {
      return res.json({
        message: 'No duplicate records found',
        recordCount: progressRecords.length
      });
    }
    
    // Keep the first record (highest level) and collect all others for deletion
    const [keepRecord, ...duplicateRecords] = progressRecords;
    const duplicateIds = duplicateRecords.map(record => record.id);
    
    // Get all review history entries from the duplicates
    const reviewHistoryEntries = duplicateRecords.flatMap(record => record.reviews);
    
    // Use a transaction to:
    // 1. Move all review history entries to the record we're keeping
    // 2. Delete duplicate records
    const result = await prisma.$transaction(async (tx) => {
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
      const deleteResult = await tx.progress.deleteMany({
        where: {
          id: {
            in: duplicateIds
          }
        }
      });
      
      return {
        keptRecord: keepRecord.id,
        deletedCount: deleteResult.count,
        reviewsTransferred: reviewHistoryEntries.length
      };
    });
    
    res.json({
      message: 'Successfully consolidated progress records',
      result,
      problem: {
        id: problem.id,
        name: problem.name,
        slug: problem.slug
      }
    });
  } catch (error) {
    console.error('Debug cleanup error:', error);
    res.status(500).json({ error: 'Debug cleanup failed' });
  }
}) as RequestHandler);

// Add a simple endpoint to check if a progress record exists
router.get('/check-progress/:problemSlug/:userId', (async (req, res) => {
  try {
    const { problemSlug, userId } = req.params;
    
    if (!userId) {
      return res.status(400).json({ error: 'User ID required' });
    }
    
    // First, get the problem by slug
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
      return res.status(404).json({ error: 'Problem not found' });
    }

    // Log the exact values we'll be checking for
    console.log('Checking for progress with exact values:', {
      userId,
      topicId: problem.topicId,
      problemId: problem.id
    });
    
    // Try findUnique with the composite key
    const exactMatch = await prisma.progress.findUnique({
      where: {
        userId_topicId_problemId: {
          userId,
          topicId: problem.topicId!,
          problemId: problem.id
        }
      },
      include: {
        reviews: true
      }
    });
    
    // Also try findFirst as a comparison
    const firstMatch = await prisma.progress.findFirst({
      where: {
        userId,
        problemId: problem.id
      }
    });
    
    // Find all potential matches for debugging
    const allPotentialMatches = await prisma.progress.findMany({
      where: {
        userId,
        problemId: problem.id
      }
    });
    
    res.json({
      problem: {
        id: problem.id,
        slug: problem.slug,
        name: problem.name,
        topicId: problem.topicId
      },
      match: {
        exactMatch: exactMatch ? {
          id: exactMatch.id,
          reviewLevel: exactMatch.reviewLevel,
          reviewCount: exactMatch.reviews?.length || 0
        } : null,
        firstMatch: firstMatch ? {
          id: firstMatch.id,
          topicId: firstMatch.topicId,
          reviewLevel: firstMatch.reviewLevel
        } : null,
        allMatches: allPotentialMatches.map(m => ({
          id: m.id,
          topicId: m.topicId,
          exactMatch: m.topicId === problem.topicId && m.problemId === problem.id
        })),
        totalPotentialMatches: allPotentialMatches.length
      }
    });
  } catch (error) {
    console.error('Debug check error:', error);
    res.status(500).json({ error: 'Debug check failed' });
  }
}) as RequestHandler);

// Add a manual update endpoint to update review history (supports both GET and POST for easier testing)
router.get('/update-progress/:problemSlug/:userId/:reviewLevel', (async (req, res) => {
  try {
    const { problemSlug, userId, reviewLevel } = req.params;
    
    // First, get the problem by slug
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
      return res.status(404).json({ error: 'Problem not found' });
    }

    // Find the progress record using the composite key
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
      return res.status(404).json({ error: 'Progress record not found' });
    }
    
    // Update the progress record with new review level and next review date
    const updatedRecord = await prisma.progress.update({
      where: { id: progressRecord.id },
      data: {
        reviewLevel: Number(reviewLevel),
        reviewScheduledAt: calculateNextReviewDate(Number(reviewLevel)),
        lastReviewedAt: new Date()
      }
    });
    
    // Create a new review history entry
    const newReviewHistory = await prisma.reviewHistory.create({
      data: {
        progressId: progressRecord.id,
        date: new Date(),
        wasSuccessful: true,
        reviewOption: 'manual-update',
        levelBefore: progressRecord.reviewLevel,
        levelAfter: Number(reviewLevel)
      }
    });
    
    res.json({
      message: 'Progress record updated successfully',
      updatedRecord,
      newReviewHistory
    });
  } catch (error) {
    console.error('Debug update error:', error);
    res.status(500).json({ error: 'Failed to update progress record' });
  }
}) as RequestHandler);

// Log review request to help debug
router.post('/trace-review', (req, res) => {
  const requestData = {
    body: req.body,
    headers: {
      'content-type': req.headers['content-type'],
      'authorization': req.headers['authorization'] ? 'Present (redacted)' : 'Missing'
    },
    query: req.query,
    params: req.params,
    path: req.path,
    method: req.method,
    url: req.url
  };
  
  console.log('TRACE REVIEW REQUEST:', JSON.stringify(requestData, null, 2));
  res.json({ message: 'Request traced', data: requestData });
});

// Simple test endpoint to verify routes are working
router.get('/ping', (req, res) => {
  res.json({ status: 'success', message: 'Debug routes are working!' });
});

// Add a simple direct review endpoint that works exactly like our manual update
router.post('/direct-review', authenticateToken, (async (req, res) => {
  try {
    const { problemSlug, wasSuccessful, reviewOption } = req.body;
    const userId = req.user?.id;
    
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
    
    console.log('DIRECT-REVIEW: Processing review for:', { 
      userId, 
      problemSlug, 
      wasSuccessful, 
      reviewOption 
    });
    
    // First, get the problem by slug
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
    
    console.log('DIRECT-REVIEW: Found problem:', { 
      id: problem.id, 
      slug: problem.slug, 
      topicId: problem.topicId 
    });

    // Find the progress record using the composite key
    const progressRecord = await prisma.progress.findUnique({
      where: {
        userId_topicId_problemId: {
          userId,
          topicId: problem.topicId!,
          problemId: problem.id
        }
      }
    });
    
    const reviewDate = new Date();
    
    // If no progress record exists, create one
    if (!progressRecord) {
      console.log('DIRECT-REVIEW: No existing progress record, creating new one');
      
      // Process inside a transaction
      const result = await prisma.$transaction(async (tx) => {
        // Create new progress record
        const newProgress = await tx.progress.create({
          data: {
            userId,
            problemId: problem.id,
            topicId: problem.topicId!,
            status: 'COMPLETED',
            reviewLevel: wasSuccessful ? 1 : 0,
            lastReviewedAt: reviewDate,
            reviewScheduledAt: calculateNextReviewDate(wasSuccessful ? 1 : 0)
          }
        });
        
        // Add the problem to user's completed problems (if this is first time)
        await tx.user.update({
          where: { id: userId },
          data: {
            completedProblems: {
              connect: { id: problem.id }
            }
          }
        });
        
        // Create review history entry
        const newReviewHistory = await tx.reviewHistory.create({
          data: {
            progressId: newProgress.id,
            date: reviewDate,
            wasSuccessful,
            reviewOption,
            levelBefore: null,
            levelAfter: wasSuccessful ? 1 : 0
          }
        });
        
        return {
          progressRecord: newProgress,
          reviewHistory: newReviewHistory,
          isFirstReview: true
        };
      });
      
      res.json({
        message: 'New progress record created',
        isFirstReview: true,
        progressRecord: result.progressRecord,
        reviewHistory: result.reviewHistory
      });
      return;
    }
    
    // Otherwise, update the existing progress record
    console.log('DIRECT-REVIEW: Found existing progress record:', { 
      id: progressRecord.id, 
      currentLevel: progressRecord.reviewLevel 
    });
    
    // Process inside a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Calculate new review level based on current level and success
      const currentLevel = progressRecord.reviewLevel ?? 0;
      const { calculateNewReviewLevel } = await import('../lib/spacedRepetition');
      const newLevel = calculateNewReviewLevel(currentLevel, wasSuccessful);
      
      // Update progress record
      const updatedProgress = await tx.progress.update({
        where: { id: progressRecord.id },
        data: {
          reviewLevel: newLevel,
          lastReviewedAt: reviewDate,
          reviewScheduledAt: calculateNextReviewDate(newLevel)
        }
      });
      
      // Create review history entry
      const newReviewHistory = await tx.reviewHistory.create({
        data: {
          progressId: progressRecord.id,
          date: reviewDate,
          wasSuccessful,
          reviewOption,
          levelBefore: currentLevel,
          levelAfter: newLevel
        }
      });
      
      return {
        progressRecord: updatedProgress,
        reviewHistory: newReviewHistory,
        isFirstReview: false
      };
    });
    
    res.json({
      message: 'Progress record updated successfully',
      isFirstReview: false,
      progressRecord: result.progressRecord,
      reviewHistory: result.reviewHistory
    });
  } catch (error) {
    console.error('DIRECT-REVIEW ERROR:', error);
    res.status(500).json({ 
      error: 'Failed to process review',
      details: error instanceof Error ? error.message : String(error)
    });
  }
}) as RequestHandler);

// Check database schema to verify composite key
router.get('/check-schema', async (req, res) => {
  try {
    // Direct query to check the Progress table constraints
    const schema = await prisma.$queryRaw`
      SELECT
        tc.constraint_name,
        tc.constraint_type,
        kcu.column_name,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name
      FROM
        information_schema.table_constraints AS tc
        JOIN information_schema.key_column_usage AS kcu
          ON tc.constraint_name = kcu.constraint_name
          AND tc.table_schema = kcu.table_schema
        LEFT JOIN information_schema.constraint_column_usage AS ccu
          ON ccu.constraint_name = tc.constraint_name
          AND ccu.table_schema = tc.table_schema
      WHERE
        tc.table_name = 'progress'
        AND tc.constraint_type IN ('PRIMARY KEY', 'UNIQUE')
      ORDER BY
        tc.constraint_name,
        kcu.ordinal_position;
    `;
    
    res.json({
      message: 'Schema check completed',
      constraints: schema,
      help: 'Look for a UNIQUE constraint that includes userId, topicId, and problemId columns'
    });
  } catch (error) {
    console.error('Error checking schema:', error);
    res.status(500).json({ error: 'Failed to check schema' });
  }
});

// Check column names in the progress table
router.get('/check-columns', async (req, res) => {
  try {
    // Direct query to get column names from the progress table
    const columns = await prisma.$queryRaw`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'progress';
    `;
    
    res.json({
      message: 'Column check completed',
      columns
    });
  } catch (error) {
    console.error('Error checking columns:', error);
    res.status(500).json({ error: 'Failed to check columns' });
  }
});

// Check table structure
router.get('/check-table', async (req, res) => {
  try {
    // Try to directly examine a record
    const sampleRecord = await prisma.progress.findFirst({
      select: {
        id: true,
        userId: true,
        topicId: true,
        problemId: true
      }
    });
    
    // Get full table definition
    const tableInfo = await prisma.$queryRaw`
      SELECT *
      FROM information_schema.tables
      WHERE table_name = 'progress';
    `;
    
    // Try a direct SQL query to get sample data
    const directQuery = await prisma.$queryRaw`
      SELECT id, "userId", "topicId", "problemId"
      FROM "progress"
      LIMIT 5;
    `;
    
    res.json({
      message: 'Table check completed',
      sampleRecord,
      tableInfo,
      directQuery,
      prismaModelName: 'Progress is mapped to "progress" table'
    });
  } catch (error) {
    console.error('Error checking table:', error);
    res.status(500).json({ 
      error: 'Failed to check table',
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

// Direct SQL query using hard-coded values we know work
router.get('/direct-query/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const problemId = 'cm87ti0me0003pzqqazc0rlpu';
    const topicId = 'cm7a5qgoc0008aooebxyajkll';
    
    // First try with Prisma's findUnique using the composite key
    const prismaResult = await prisma.progress.findUnique({
      where: {
        userId_topicId_problemId: {
          userId,
          topicId,
          problemId
        }
      }
    });
    
    // Then try with direct SQL
    const sqlResult = await prisma.$queryRaw`
      SELECT * FROM "progress" 
      WHERE "userId" = ${userId}
      AND "topicId" = ${topicId}
      AND "problemId" = ${problemId}
      LIMIT 1;
    `;
    
    // Also try a broader search
    const broadSearch = await prisma.progress.findMany({
      where: {
        userId,
        problemId
      }
    });
    
    res.json({
      message: 'Direct query test',
      prismaFindUnique: prismaResult ? 'FOUND' : 'NOT FOUND',
      sqlQuery: sqlResult && (sqlResult as any).length > 0 ? 'FOUND' : 'NOT FOUND',
      broadSearch: {
        count: broadSearch.length,
        records: broadSearch.map(r => ({
          id: r.id,
          topicId: r.topicId,
          problemId: r.problemId,
          exactMatch: r.topicId === topicId && r.problemId === problemId
        }))
      }
    });
  } catch (error) {
    console.error('Error in direct query:', error);
    res.status(500).json({ 
      error: 'Failed to execute direct query',
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

// Nuclear option - fix duplicates with direct SQL
router.post('/fix-duplicates-direct', authenticateToken, (async (req, res) => {
  try {
    // This requires admin authorization
    const userId = req.user?.id;
    if (!userId || !req.user?.role || !['ADMIN', 'DEVELOPER'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Admin access required' });
    }
    
    // Get the specific problem
    const { problemSlug } = req.body;
    
    let problem: { id: string } | null = null;
    if (problemSlug) {
      const foundProblem = await prisma.problem.findUnique({
        where: { slug: problemSlug }
      });
      
      if (!foundProblem) {
        return res.status(404).json({ error: 'Problem not found' });
      }
      
      problem = { id: foundProblem.id };
    }
    
    // Execute a nuclear fix: for each user/topic/problem combination, 
    // delete duplicates and keep only the one with highest review level
    const result = await prisma.$transaction(async (tx) => {
      // First find the duplicate combinations
      const rawQuery = problem 
        ? `
          WITH duplicates AS (
            SELECT "userId", "topicId", "problemId", COUNT(*) as count
            FROM progress
            WHERE "problemId" = '${problem.id}'
            GROUP BY "userId", "topicId", "problemId"
            HAVING COUNT(*) > 1
          )
          SELECT * FROM duplicates;
        `
        : `
          WITH duplicates AS (
            SELECT "userId", "topicId", "problemId", COUNT(*) as count
            FROM progress
            GROUP BY "userId", "topicId", "problemId"
            HAVING COUNT(*) > 1
          )
          SELECT * FROM duplicates;
        `;
      
      const duplicates = await tx.$queryRawUnsafe(rawQuery);
      
      console.log('[Fix Duplicates] Found duplicate sets:', duplicates);
      
      let fixedCount = 0;
      
      // For each duplicate set
      for (const dup of duplicates as Array<{ userId: string; topicId: string; problemId: string }>) {
        // Find all progress records for this combination
        const records = await tx.progress.findMany({
          where: {
            userId: dup.userId,
            topicId: dup.topicId,
            problemId: dup.problemId
          },
          include: {
            reviews: true
          },
          orderBy: {
            reviewLevel: 'desc' // Keep the one with highest level
          }
        });
        
        if (records.length <= 1) continue;
        
        // Keep the first one (highest level)
        const keeper = records[0];
        const duplicatesToRemove = records.slice(1);
        
        console.log(`[Fix Duplicates] For ${dup.userId}/${dup.topicId}/${dup.problemId}: Keeping ${keeper.id}, removing ${duplicatesToRemove.map(d => d.id).join(', ')}`);
        
        // Move all review history to the keeper
        for (const dupe of duplicatesToRemove) {
          if (dupe.reviews.length > 0) {
            // Update review history to point to the keeper
            await tx.$executeRawUnsafe(`
              UPDATE "review_history" 
              SET "progress_id" = '${keeper.id}' 
              WHERE "progress_id" = '${dupe.id}'
            `);
          }
        }
        
        // Delete the duplicates
        for (const dupe of duplicatesToRemove) {
          await tx.progress.delete({
            where: { id: dupe.id }
          });
        }
        
        fixedCount++;
      }
      
      return {
        duplicateSets: (duplicates as unknown[]).length,
        fixedSets: fixedCount
      };
    });
    
    res.json({
      message: 'Fixed duplicate progress records with direct SQL',
      result
    });
  } catch (error) {
    console.error('Error fixing duplicates:', error);
    res.status(500).json({ error: 'Failed to fix duplicates' });
  }
}) as RequestHandler);

// Check review history entries for a specific progress record
router.get('/check-review-history/:progressId', (async (req, res) => {
  try {
    const { progressId } = req.params;
    
    // Get the progress record
    const progress = await prisma.progress.findUnique({
      where: { id: progressId },
      include: {
        reviews: true,
        user: {
          select: { id: true, email: true }
        },
        problem: {
          select: { id: true, slug: true }
        }
      }
    });
    
    if (!progress) {
      return res.status(404).json({ error: 'Progress record not found' });
    }
    
    // Try to create a test review history entry
    let testReviewResult = null;
    let testError = null;
    
    try {
      const testReview = await prisma.reviewHistory.create({
        data: {
          progressId,
          wasSuccessful: true,
          reviewOption: 'test',
          levelBefore: progress.reviewLevel,
          levelAfter: progress.reviewLevel
        }
      });
      testReviewResult = { success: true, id: testReview.id };
    } catch (error) {
      testError = error instanceof Error ? error.message : String(error);
    }
    
    res.json({
      progress,
      reviewCount: progress.reviews.length,
      reviewHistory: progress.reviews,
      testCreateResult: testReviewResult,
      testCreateError: testError,
      help: 'If testCreateResult is null, check testCreateError for details'
    });
  } catch (error) {
    console.error('Error checking review history:', error);
    res.status(500).json({ error: 'Failed to check review history' });
  }
}) as RequestHandler);

export default router; 