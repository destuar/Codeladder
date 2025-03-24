/**
 * @file backend/src/routes/codeExecution.ts
 * 
 * Code Execution Routes
 * Defines routes for code execution and test case processing.
 */

import { Router, Request, Response } from 'express';
import { executeCode, executeCustomTest, runTests } from '../controllers/codeExecutionController';
import { authenticateToken } from '../middleware/auth';
import rateLimit from 'express-rate-limit';

const router = Router();

// Rate limit for code execution (30 submissions per 5 minutes)
const executionLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 30,
  message: 'Too many code submissions, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limit specifically for running tests (more permissive - 20 per minute)
const runTestsLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 20, // 20 runs per minute
  message: 'Too many test runs, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
});

// Authentication required for all code execution routes
router.use(authenticateToken);

// Code execution routes
router.post('/execute', executionLimiter, async (req: Request, res: Response) => {
  try {
    await executeCode(req, res);
  } catch (error) {
    console.error('Error in execute route:', error);
    if (!res.headersSent) {
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Unknown error during code execution'
      });
    }
  }
});

// Route for running tests without storing submissions
router.post('/run-tests', runTestsLimiter, async (req: Request, res: Response) => {
  try {
    await runTests(req, res);
  } catch (error) {
    console.error('Error in run-tests route:', error);
    if (!res.headersSent) {
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Unknown error during test execution'
      });
    }
  }
});

router.post('/custom-test', executionLimiter, async (req: Request, res: Response) => {
  try {
    await executeCustomTest(req, res);
  } catch (error) {
    console.error('Error in custom-test route:', error);
    if (!res.headersSent) {
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Unknown error during test execution'
      });
    }
  }
});

export default router; 