import express from 'express';
import { prisma } from '../lib/prisma';
import { authenticateToken } from '../middleware/auth';
import { authorizeRoles } from '../middleware/authorize';
import { Prisma, Role } from '@prisma/client';
import type { RequestHandler } from 'express-serve-static-core';


const router = express.Router();

// Get a specific problem
router.get('/:problemId', authenticateToken, (async (req, res) => {
  try {
    const { problemId } = req.params;

    const problem = await prisma.problem.findUnique({
      where: { id: problemId }
    });

    if (!problem) {
      return res.status(404).json({ error: 'Problem not found' });
    }

    res.json(problem);
  } catch (error) {
    console.error('Error fetching problem:', error);
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
      topicId 
    } = req.body;

    console.log('Creating problem with data:', {
      name,
      content,
      difficulty,
      required,
      reqOrder,
      problemType,
      codeTemplate,
      testCases,
      topicId
    });

    // Validate topic exists
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
        topic: {
          connect: { id: topicId }
        }
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
      testCases
    } = req.body;

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
        ...(testCases !== undefined && { testCases: parsedTestCases })
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

export default router; 