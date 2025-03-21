import express from 'express';
import { prisma } from '../lib/prisma';
import { authenticateToken } from '../middleware/auth';
import { authorizeRoles } from '../middleware/authorize';
import { Prisma, Role, ProblemType } from '@prisma/client';
import type { RequestHandler } from 'express-serve-static-core';
import { calculateNextReviewDate } from '../lib/spacedRepetition';

// Define the request body types
interface CreateProblemBody {
  name: string;
  content: string;
  difficulty: Prisma.ProblemCreateInput['difficulty'];
  required?: boolean;
  reqOrder?: number;
  problemType?: ProblemType;
  collectionIds?: string[];
  codeTemplate?: string;
  testCases?: string;
  topicId?: string;
  estimatedTime?: string | number;
}

interface UpdateProblemBody {
  name?: string;
  content?: string;
  difficulty?: Prisma.ProblemCreateInput['difficulty'];
  required?: boolean;
  reqOrder?: number;
  problemType?: ProblemType;
  collectionIds?: string[];
  codeTemplate?: string;
  testCases?: string;
  estimatedTime?: string | number;
}

const router = express.Router();

// Get a specific problem
router.get('/:problemId', authenticateToken, (async (req, res) => {
  try {
    const { problemId } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const problem = await prisma.problem.findUnique({
      where: { id: problemId },
      include: {
        completedBy: {
          where: { id: userId },
          select: { id: true }
        },
        progress: {
          where: { userId },
          select: { status: true }
        },
        topic: true, // Include the topic to get related problems
        collections: {
          select: {
            collection: {
              select: {
                id: true,
                name: true
              }
            }
          }
        }
      }
    });

    if (!problem) {
      return res.status(404).json({ error: 'Problem not found' });
    }

    // Extract collection IDs for the frontend
    const collectionIds = problem.collections.map(pc => pc.collection.id);

    // Find next and previous problems if this problem belongs to a topic
    let nextProblemId = null;
    let prevProblemId = null;

    if (problem.topicId) {
      // Get all problems in the same topic, ordered by reqOrder
      const topicProblems = await prisma.problem.findMany({
        where: { 
          topicId: problem.topicId 
        },
        orderBy: { 
          reqOrder: 'asc' 
        },
        select: { 
          id: true, 
          reqOrder: true 
        }
      });

      // Find the current problem's index in the ordered list
      const currentIndex = topicProblems.findIndex(p => p.id === problemId);
      
      if (currentIndex !== -1) {
        // Get previous problem if not the first
        if (currentIndex > 0) {
          prevProblemId = topicProblems[currentIndex - 1].id;
        }
        
        // Get next problem if not the last
        if (currentIndex < topicProblems.length - 1) {
          nextProblemId = topicProblems[currentIndex + 1].id;
        }
      }
    }

    // Transform the response to include isCompleted, navigation IDs, and collections
    const response = {
      ...problem,
      isCompleted: problem.completedBy.length > 0 || problem.progress.some(p => p.status === 'COMPLETED'),
      nextProblemId,
      prevProblemId,
      collectionIds,
      completedBy: undefined, // Remove these from the response
      progress: undefined,
      collections: undefined // Remove raw collections data
    };

    res.json(response);
  } catch (error) {
    console.error('Error fetching problem:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}) as RequestHandler);

// Get problems by type
router.get('/', authenticateToken, (async (req, res) => {
  try {
    const { type, search } = req.query;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const where: any = {};
    
    // Add type filter if provided
    if (type) {
      where.problemType = type as ProblemType;
    }

    // Add search filter if provided
    if (search) {
      where.name = { contains: search as string, mode: 'insensitive' };
    }

    const problems = await prisma.problem.findMany({
      where,
      select: {
        id: true,
        name: true,
        content: true,
        description: true,
        difficulty: true,
        required: true,
        reqOrder: true,
        problemType: true,
        codeTemplate: true,
        testCases: true,
        estimatedTime: true,
        createdAt: true,
        updatedAt: true,
        topic: true,
        topicId: true,
        completedBy: {
          where: { id: userId },
          select: { id: true }
        },
        progress: {
          where: { userId },
          select: { status: true }
        },
        collections: {
          select: {
            collection: {
              select: {
                id: true,
                name: true
              }
            }
          }
        }
      },
      orderBy: [
        {
          problemType: 'desc'
        },
        { name: 'asc' }
      ]
    });

    // Transform the response to include completion status and collection IDs
    const transformedProblems = problems.map(problem => {
      const collectionIds = problem.collections.map(pc => pc.collection.id);
      return {
        ...problem,
        completed: problem.completedBy.length > 0 || problem.progress.some(p => p.status === 'COMPLETED'),
        collectionIds,
        completedBy: undefined,
        progress: undefined,
        collections: undefined // Remove raw collections data
      };
    });

    res.json(transformedProblems);
  } catch (error) {
    console.error('Error fetching problems:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}) as RequestHandler);

// Create a new problem (admin only)
router.post('/', authenticateToken, authorizeRoles([Role.ADMIN, Role.DEVELOPER]), (async (req, res) => {
  try {
    const { 
      name, 
      content, 
      difficulty, 
      required = false,
      reqOrder,
      problemType = 'INFO' as const,
      collectionIds = [],
      codeTemplate,
      testCases,
      topicId,
      estimatedTime 
    } = req.body as CreateProblemBody;

    console.log('Creating problem with data:', {
      name,
      content: content ? `${content.substring(0, 20)}...` : undefined,
      difficulty,
      required,
      reqOrder,
      problemType,
      collectionIds,
      codeTemplate: codeTemplate ? 'Provided' : undefined,
      testCases: testCases ? 'Provided' : undefined,
      topicId,
      estimatedTime
    });

    // Only validate topic if topicId is provided
    if (topicId) {
      const topic = await prisma.topic.findUnique({
        where: { id: topicId }
      });

      if (!topic) {
        console.error('Topic not found:', topicId);
        return res.status(404).json({ error: 'Topic not found' });
      }

      // Check for duplicate order number if reqOrder is provided
      if (reqOrder) {
        const existingProblem = await prisma.problem.findFirst({
          where: {
            topicId,
            reqOrder,
          }
        });

        if (existingProblem) {
          return res.status(400).json({ 
            error: 'Order number already exists',
            details: `Problem "${existingProblem.name}" already has order number ${reqOrder}`
          });
        }
      }
    }

    // Convert estimatedTime to number if provided
    const parsedEstimatedTime = estimatedTime ? parseInt(estimatedTime.toString()) : null;
    if (estimatedTime && isNaN(parsedEstimatedTime!)) {
      return res.status(400).json({ error: 'Estimated time must be a valid number' });
    }

    // Use a transaction for the entire create process
    const prismaAny = prisma as any;
    
    const newProblem = await prisma.$transaction(async (tx) => {
      // Create the problem first (without collections)
      const problem = await tx.problem.create({
        data: {
          name,
          content,
          difficulty,
          required,
          reqOrder,
          problemType,
          codeTemplate,
          testCases: testCases ? JSON.parse(testCases) : undefined,
          estimatedTime: parsedEstimatedTime,
          ...(topicId && {
            topic: {
              connect: { id: topicId }
            }
          })
        }
      });

      // Then associate with collections if collectionIds is provided
      if (collectionIds.length > 0) {
        const collectionConnections = collectionIds.map(collectionId => ({
          problemId: problem.id,
          collectionId
        }));
        
        // Validate that all collections exist
        for (const { collectionId } of collectionConnections) {
          const collectionExists = await tx.collection.findUnique({
            where: { id: collectionId },
            select: { id: true }
          });
          
          if (!collectionExists) {
            console.error(`Collection ID ${collectionId} does not exist`);
            throw new Error(`Collection with ID ${collectionId} does not exist`);
          }
        }
        
        // Create the associations
        await tx.problemToCollection.createMany({
          data: collectionConnections,
          skipDuplicates: true
        });
        
        console.log(`Created ${collectionConnections.length} collection associations for new problem`);
      }
      
      // Return the problem with collections
      return await tx.problem.findUnique({
        where: { id: problem.id },
        include: {
          collections: {
            include: {
              collection: true
            }
          }
        }
      });
    });
    
    if (!newProblem) {
      throw new Error('Failed to retrieve created problem');
    }
    
    // Transform the response to include collection IDs for frontend
    const responseData = {
      ...newProblem,
      collectionIds: newProblem.collections.map((pc: any) => pc.collection.id),
      collections: undefined // Remove raw collections from response
    };

    res.status(201).json(responseData);
  } catch (error) {
    console.error('Detailed error creating problem:', error);
    res.status(500).json({ 
      error: 'Failed to create problem', 
      details: error instanceof Error ? error.message : 'Unknown error',
      stack: process.env.NODE_ENV !== 'production' ? (error as Error).stack : undefined
    });
  }
}) as RequestHandler);

// Update a problem (admin only)
router.put('/:problemId', authenticateToken, authorizeRoles([Role.ADMIN, Role.DEVELOPER]), (async (req, res) => {
  try {
    const { problemId } = req.params;
    const { 
      name, 
      content, 
      difficulty, 
      required = false,
      reqOrder,
      problemType,
      collectionIds, // Collection IDs for relationships
      codeTemplate,
      testCases,
      estimatedTime
    } = req.body as UpdateProblemBody;

    console.log('Updating problem with ID:', problemId);
    console.log('Request body:', {
      name,
      content: content ? `${content.substring(0, 20)}...` : undefined,
      difficulty,
      required,
      reqOrder,
      problemType,
      collectionIds,
      codeTemplate: codeTemplate ? 'Provided' : undefined,
      testCases: testCases ? 'Provided' : undefined,
      estimatedTime
    });

    // Get the current problem to check its topic
    const currentProblem = await prisma.problem.findUnique({
      where: { id: problemId },
      include: {
        collections: {
          include: {
            collection: true
          }
        }
      }
    });

    if (!currentProblem) {
      return res.status(404).json({ error: 'Problem not found' });
    }

    // Check for duplicate order number if reqOrder is provided and different from current
    if (reqOrder && reqOrder !== currentProblem.reqOrder) {
      const existingProblem = await prisma.problem.findFirst({
        where: {
          topicId: currentProblem.topicId,
          reqOrder,
          id: { not: problemId } // Exclude the current problem from the check
        }
      });

      if (existingProblem) {
        return res.status(400).json({ 
          error: 'Order number already exists',
          details: `Problem "${existingProblem.name}" already has order number ${reqOrder}`
        });
      }
    }

    // Parse testCases if it's a string
    let parsedTestCases = testCases;
    if (typeof testCases === 'string') {
      try {
        parsedTestCases = JSON.parse(testCases);
      } catch (e) {
        console.error('Error parsing testCases:', e);
        return res.status(400).json({ error: 'Invalid testCases JSON format' });
      }
    }

    // Convert estimatedTime to number if provided
    const parsedEstimatedTime = estimatedTime ? parseInt(estimatedTime.toString()) : null;
    if (estimatedTime && isNaN(parsedEstimatedTime!)) {
      return res.status(400).json({ error: 'Estimated time must be a valid number' });
    }

    // Use a transaction to ensure problem and collections are updated atomically
    const prismaAny = prisma as any;
    
    const updatedProblem = await prisma.$transaction(async (tx) => {
      // 1. Update the problem
      const problem = await tx.problem.update({
        where: { id: problemId },
        data: {
          name,
          content,
          difficulty,
          required,
          reqOrder,
          ...(problemType && { problemType: problemType }),
          ...(codeTemplate !== undefined && { codeTemplate }),
          ...(testCases !== undefined && { testCases: parsedTestCases }),
          ...(estimatedTime !== undefined && { estimatedTime: parsedEstimatedTime })
        },
        include: {
          collections: {
            include: {
              collection: true
            }
          }
        }
      });
      
      console.log(`Problem updated successfully. ID: ${problem.id}`);
      
      // 2. Update collections if collectionIds is explicitly provided
      if (collectionIds !== undefined) {
        console.log(`Updating collections for problem ${problemId}. Collection IDs:`, collectionIds);
        
        // Remove existing collection associations
        const deleteResult = await tx.problemToCollection.deleteMany({
          where: { problemId }
        });
        
        console.log(`Deleted ${deleteResult.count} existing collection associations`);
        
        // Create new associations if there are any collections
        if (collectionIds.length > 0) {
          const collectionConnections = collectionIds.map(collectionId => ({
            problemId,
            collectionId
          }));
          
          // Validate that all collections exist
          for (const { collectionId } of collectionConnections) {
            const collectionExists = await tx.collection.findUnique({
              where: { id: collectionId },
              select: { id: true }
            });
            
            if (!collectionExists) {
              console.error(`Collection ID ${collectionId} does not exist`);
              throw new Error(`Collection with ID ${collectionId} does not exist`);
            }
          }
          
          // Create the associations
          await tx.problemToCollection.createMany({
            data: collectionConnections,
            skipDuplicates: true
          });
          
          console.log(`Created ${collectionConnections.length} new collection associations`);
        }
      }
      
      // Always return the problem with updated collections
      return await tx.problem.findUnique({
        where: { id: problemId },
        include: {
          collections: {
            include: {
              collection: true
            }
          }
        }
      });
    });
    
    if (!updatedProblem) {
      throw new Error(`Failed to retrieve updated problem`);
    }
    
    // Transform the response to include collection IDs for frontend
    const responseData = {
      ...updatedProblem,
      collectionIds: updatedProblem.collections.map((pc: any) => pc.collection.id),
      collections: undefined // Remove raw collections from response
    };
    
    res.json(responseData);
  } catch (error) {
    console.error('Detailed error updating problem:', error);
    // Send a more helpful error message
    res.status(500).json({ 
      error: 'Failed to update problem', 
      details: error instanceof Error ? error.message : 'Unknown error',
      stack: process.env.NODE_ENV !== 'production' ? (error as Error).stack : undefined
    });
  }
}) as RequestHandler);

// Reorder problems endpoint
router.post('/reorder', authenticateToken, authorizeRoles([Role.ADMIN, Role.DEVELOPER]), (async (req, res) => {
  try {
    const { problemOrders } = req.body;
    // problemOrders should be an array of { id: string, reqOrder: number }

    // Validate input
    if (!Array.isArray(problemOrders)) {
      return res.status(400).json({ error: 'problemOrders must be an array' });
    }

    // Perform all updates in a transaction to ensure consistency
    const result = await prisma.$transaction(
      problemOrders.map(({ id, reqOrder }) =>
        prisma.problem.update({
          where: { id },
          data: { reqOrder }
        })
      )
    );

    res.json(result);
  } catch (error) {
    console.error('Error reordering problems:', error);
    res.status(500).json({ error: 'Failed to reorder problems' });
  }
}) as RequestHandler);

// Mark a problem as completed or uncompleted (toggle)
router.post('/:problemId/complete', authenticateToken, (async (req, res) => {
  try {
    const { problemId } = req.params;
    const userId = req.user?.id;
    const isAdmin = req.user?.role === Role.ADMIN || req.user?.role === Role.DEVELOPER;
    const { preserveReviewData, forceComplete } = req.body; // Added forceComplete parameter

    console.log('Problem completion request:', { 
      problemId, 
      userId, 
      isAdmin, 
      preserveReviewData,
      forceComplete
    });

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    // Get the problem to check if it exists and get its topic
    const problem = await prisma.problem.findUnique({
      where: { id: problemId },
      include: {
        topic: true,
        completedBy: {
          where: { id: userId },
          select: { id: true }
        },
        progress: {
          where: { userId },
          select: { 
            status: true,
            reviewLevel: true,
            reviewScheduledAt: true,
            lastReviewedAt: true,
            reviewHistory: true,
            id: true
          }
        }
      }
    });

    if (!problem) {
      return res.status(404).json({ error: 'Problem not found' });
    }

    // Check if problem is already completed
    const isCompleted = problem.completedBy.length > 0 || problem.progress.some(p => p.status === 'COMPLETED');
    
    // Get existing review data if present
    const existingProgress = problem.progress[0];

    console.log('Problem state before update:', {
      problemId,
      isCompleted,
      preserveReviewData,
      forceComplete,
      existingProgressId: existingProgress?.id,
      progressStatus: existingProgress?.status,
      reviewLevel: existingProgress?.reviewLevel,
      hasReviewHistory: existingProgress?.reviewHistory ? 
        Array.isArray(existingProgress.reviewHistory) && existingProgress.reviewHistory.length > 0 : false
    });

    // If problem is completed and we're not forcing completion, and not admin, return error
    // Otherwise, we either toggle off or force completion
    if (isCompleted && !forceComplete && !isAdmin) {
      return res.status(400).json({ error: 'Problem is already completed' });
    }

    let result;
    
    // Only uncomplete if explicitly toggling (not in force complete mode) and already completed
    if (isCompleted && !forceComplete) {
      // Remove completion status
      result = await prisma.$transaction(async (tx) => {
        await tx.progress.deleteMany({
          where: {
            userId,
            problemId,
            status: 'COMPLETED'
          }
        });
        
        return await tx.user.update({
          where: { id: userId },
          data: {
            completedProblems: {
              disconnect: { id: problemId }
            }
          }
        });
      });
      
      console.log('Problem marked as uncompleted:', {
        problemId,
        userId
      });
    } else {
      // Mark as completed (either newly or forced)
      result = await prisma.$transaction(async (tx) => {
        // First, get any existing progress to preserve review data if needed
        const currentProgress = preserveReviewData ? await tx.progress.findFirst({
          where: {
            userId,
            problemId
          }
        }) : null;
        
        console.log('Existing progress in transaction:', currentProgress ? {
          id: currentProgress.id,
          status: currentProgress.status,
          reviewLevel: currentProgress.reviewLevel,
          reviewScheduledAt: currentProgress.reviewScheduledAt
        } : 'No existing progress');
        
        // Determine what review data to use
        const reviewData = preserveReviewData && currentProgress && currentProgress.reviewLevel !== null ? {
          // Keep existing review data
          reviewLevel: currentProgress.reviewLevel,
          reviewScheduledAt: currentProgress.reviewScheduledAt,
          lastReviewedAt: currentProgress.lastReviewedAt,
          reviewHistory: currentProgress.reviewHistory as Prisma.InputJsonValue
        } : {
          // Initialize new review data
          reviewLevel: 0,
          reviewScheduledAt: calculateNextReviewDate(0),
          lastReviewedAt: new Date(),
          reviewHistory: [] as Prisma.InputJsonValue
        };
        
        console.log('Review data to be used:', reviewData);
        
        // Update or create progress
        const progressResult = await tx.progress.upsert({
          where: {
            userId_topicId_problemId: {
              userId,
              topicId: problem.topicId!,
              problemId
            }
          },
          create: {
            userId,
            topicId: problem.topicId!,
            problemId,
            status: 'COMPLETED',
            ...reviewData
          },
          update: {
            status: 'COMPLETED',
            // Only update review fields if we're not preserving existing data
            ...(!preserveReviewData && {
              reviewLevel: 0,
              reviewScheduledAt: calculateNextReviewDate(0),
              lastReviewedAt: new Date(),
              reviewHistory: [] as Prisma.InputJsonValue
            })
            // When preserveReviewData is true, we don't modify any review fields
          }
        });
        
        // Update user's completed problems
        const userResult = await tx.user.update({
          where: { id: userId },
          data: {
            completedProblems: {
              connect: { id: problemId }
            }
          }
        });
        
        return { progressResult, userResult };
      });
      
      console.log('Problem marked as completed:', {
        problemId,
        userId,
        progressId: result.progressResult.id,
        reviewLevel: result.progressResult.reviewLevel,
        reviewScheduledAt: result.progressResult.reviewScheduledAt
      });
    }

    res.json({ 
      message: isCompleted && !forceComplete ? 'Problem marked as uncompleted' : 'Problem marked as completed',
      preservedReviewData: preserveReviewData || false,
      wasForced: forceComplete || false
    });
  } catch (error) {
    console.error('Error toggling problem completion:', error);
    res.status(500).json({ error: 'Failed to toggle problem completion' });
  }
}) as RequestHandler);

// Add a route to remove a problem from its topic
router.put('/:problemId/remove-topic', authenticateToken, authorizeRoles([Role.ADMIN, Role.DEVELOPER]), (async (req, res) => {
  try {
    const { problemId } = req.params;
    
    // Check if problem exists
    const problem = await prisma.problem.findUnique({
      where: { id: problemId },
      include: { topic: true }
    });
    
    if (!problem) {
      return res.status(404).json({ error: 'Problem not found' });
    }
    
    // Update the problem to remove its topic association
    const updatedProblem = await prisma.problem.update({
      where: { id: problemId },
      data: { 
        topicId: null,
        reqOrder: null  // Reset reqOrder as it's only relevant within a topic
      }
    });
    
    res.json({
      ...updatedProblem,
      message: 'Problem removed from topic successfully'
    });
  } catch (error) {
    console.error('Error removing problem from topic:', error);
    res.status(500).json({ 
      error: 'Failed to remove problem from topic',
      details: error instanceof Error ? error.message : 'Unknown error',
      stack: process.env.NODE_ENV !== 'production' ? (error as Error).stack : undefined
    });
  }
}) as RequestHandler);

// Add a new comprehensive endpoint for admin dashboard use
router.get('/admin/dashboard', authenticateToken, authorizeRoles([Role.ADMIN, Role.DEVELOPER]), (async (req, res) => {
  try {
    const { collection, withTopics } = req.query;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    // Build the where clause based on query parameters
    const where: any = {};
    
    // Basic query params for filtering
    if (req.query.search) {
      where.name = { contains: req.query.search as string, mode: 'insensitive' };
    }
    
    if (req.query.type) {
      where.problemType = req.query.type as ProblemType;
    }
    
    // If requesting problems without topics
    if (req.query.noTopic === 'true') {
      where.topicId = null;
    }
    
    // Include detailed information needed for the dashboard
    const problems = await prisma.problem.findMany({
      where,
      select: {
        id: true,
        name: true,
        content: true,
        description: true,
        difficulty: true,
        required: true,
        reqOrder: true,
        problemType: true,
        codeTemplate: true,
        testCases: true,
        estimatedTime: true,
        createdAt: true,
        updatedAt: true,
        topic: true,
        topicId: true,
        completedBy: {
          where: { id: userId },
          select: { id: true }
        },
        progress: {
          where: { userId },
          select: { status: true }
        },
        collections: {
          select: {
            collection: {
              select: {
                id: true,
                name: true,
                description: true
              }
            }
          }
        }
      },
      orderBy: [{ name: 'asc' }]
    });

    // Transform the response for the frontend
    const transformedProblems = problems.map(problem => {
      // Extract collection details
      const collections = problem.collections.map(pc => pc.collection);
      const collectionIds = collections.map(c => c.id);
      
      // Format the response
      return {
        ...problem,
        completed: problem.completedBy.length > 0 || problem.progress.some(p => p.status === 'COMPLETED'),
        collectionIds,
        collections, // Include full collection objects for the admin dashboard
        completedBy: undefined,
        progress: undefined
      };
    });

    // If we're filtering by collection
    if (collection && collection !== 'no-collection') {
      const filteredProblems = transformedProblems.filter(problem => 
        problem.collectionIds.includes(collection as string)
      );
      
      // Further filter by topic status if requested
      if (withTopics === 'false') {
        return res.json(filteredProblems.filter(p => !p.topic));
      }
      
      return res.json(filteredProblems);
    } 
    // If we're getting "no collection" problems
    else if (collection === 'no-collection') {
      const problemsWithoutCollections = transformedProblems.filter(
        problem => !problem.collectionIds.length
      );
      
      // Further filter by topic status if requested
      if (withTopics === 'false') {
        return res.json(problemsWithoutCollections.filter(p => !p.topic));
      }
      
      return res.json(problemsWithoutCollections);
    }

    // Return all problems
    res.json(transformedProblems);
  } catch (error) {
    console.error('Error fetching admin dashboard problems:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}) as RequestHandler);

export default router; 