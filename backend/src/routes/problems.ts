import express from 'express';
import { prisma } from '../lib/prisma';
import { authenticateToken } from '../middleware/auth';
import { authorizeRoles } from '../middleware/authorize';
import { Prisma, Role, ProblemType } from '@prisma/client';
import type { RequestHandler } from 'express-serve-static-core';

// Define the request body types
interface CreateProblemBody {
  name: string;
  content: string;
  difficulty: Prisma.ProblemCreateInput['difficulty'];
  required?: boolean;
  reqOrder?: number;
  problemType?: ProblemType;
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
        }
      }
    });

    if (!problem) {
      return res.status(404).json({ error: 'Problem not found' });
    }

    // Transform the response to include isCompleted
    const response = {
      ...problem,
      isCompleted: problem.completedBy.length > 0 || problem.progress.some(p => p.status === 'COMPLETED'),
      completedBy: undefined, // Remove these from the response
      progress: undefined
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
        }
      },
      orderBy: [
        {
          problemType: 'desc'
        },
        { name: 'asc' }
      ]
    });

    // Transform the response to include completion status
    const transformedProblems = problems.map(problem => ({
      ...problem,
      completed: problem.completedBy.length > 0 || problem.progress.some(p => p.status === 'COMPLETED'),
      completedBy: undefined,
      progress: undefined
    }));

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
      codeTemplate,
      testCases,
      topicId,
      estimatedTime 
    } = req.body as CreateProblemBody;

    console.log('Creating problem with data:', {
      name,
      content,
      difficulty,
      required,
      reqOrder,
      problemType,
      codeTemplate,
      testCases,
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

    const problem = await prisma.problem.create({
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

    res.status(201).json(problem);
  } catch (error) {
    console.error('Detailed error creating problem:', error);
    res.status(500).json({ error: 'Failed to create problem', details: error instanceof Error ? error.message : 'Unknown error' });
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
      codeTemplate,
      testCases,
      estimatedTime
    } = req.body as UpdateProblemBody;

    // Get the current problem to check its topic
    const currentProblem = await prisma.problem.findUnique({
      where: { id: problemId }
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

    const problem = await prisma.problem.update({
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
      }
    });

    res.json(problem);
  } catch (error) {
    console.error('Error updating problem:', error);
    res.status(500).json({ error: 'Failed to update problem' });
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

// Mark a problem as completed
router.post('/:problemId/complete', authenticateToken, (async (req, res) => {
  try {
    const { problemId } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    // Get the problem to check if it exists and get its topic
    const problem = await prisma.problem.findUnique({
      where: { id: problemId },
      include: {
        topic: true
      }
    });

    if (!problem) {
      return res.status(404).json({ error: 'Problem not found' });
    }

    // Create or update progress for the problem
    await prisma.progress.upsert({
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
        status: 'COMPLETED'
      },
      update: {
        status: 'COMPLETED'
      }
    });

    // Add the problem to user's completed problems
    await prisma.user.update({
      where: { id: userId },
      data: {
        completedProblems: {
          connect: { id: problemId }
        }
      }
    });

    res.json({ message: 'Problem marked as completed' });
  } catch (error) {
    console.error('Error marking problem as completed:', error);
    res.status(500).json({ error: 'Failed to mark problem as completed' });
  }
}) as RequestHandler);

export default router; 