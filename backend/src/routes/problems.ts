import express from 'express';
import { prisma } from '../lib/prisma';
import { authenticateToken } from '../middleware/auth';
import { authorizeRoles } from '../middleware/authorize';
import { Role } from '@prisma/client';
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
      problemType = 'INFO',
      codeTemplate,
      testCases,
      topicId 
    } = req.body;

    const problem = await prisma.problem.create({
      data: {
        name,
        content,
        difficulty,
        required,
        reqOrder,
        problemType,
        codeTemplate,
        testCases,
        topic: {
          connect: { id: topicId }
        }
      }
    });

    res.status(201).json(problem);
  } catch (error) {
    console.error('Error creating problem:', error);
    res.status(500).json({ error: 'Failed to create problem' });
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

export default router; 