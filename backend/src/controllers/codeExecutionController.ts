/**
 * @file backend/src/controllers/codeExecutionController.ts
 * 
 * Code Execution Controller
 * Handles code execution requests and interfaces with the Judge0 service.
 * Manages problem submissions, test case execution, and result processing.
 */

import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { submitCode, formatTestCode, ProcessedResult } from '../services/judge0Service';
import { Prisma } from '@prisma/client';

/**
 * Execute user code with all test cases for a specific problem
 * Routes: POST /code/execute
 * 
 * Body:
 * - code: Source code to execute
 * - language: Programming language
 * - problemId: ID of the problem to test against
 */
export async function executeCode(req: Request, res: Response): Promise<void> {
  const { code, language, problemId } = req.body;
  const userId = req.user?.id;

  if (!code || !language || !problemId) {
    res.status(400).json({ error: 'Missing required parameters' });
    return;
  }

  try {
    // Fetch problem and test cases
    const problem = await prisma.problem.findUnique({
      where: { id: problemId },
      select: {
        id: true,
        name: true,
        testCases: true,
      },
    });

    if (!problem) {
      res.status(404).json({ error: 'Problem not found' });
      return;
    }

    // Check if testCases is valid
    if (!problem.testCases) {
      res.status(400).json({ error: 'No test cases available for this problem' });
      return;
    }

    // Parse test cases
    const testCases = Array.isArray(problem.testCases) 
      ? problem.testCases 
      : JSON.parse(typeof problem.testCases === 'string' 
          ? problem.testCases 
          : JSON.stringify(problem.testCases));

    // Extract function name from the first test case (assumes consistent function name across all test cases)
    // If not available, use a default function name
    const functionName = testCases[0]?.functionName || 'solution';

    // Create a submission record
    const submission = await prisma.submission.create({
      data: {
        code,
        language,
        status: 'PROCESSING',
        user: { connect: { id: userId } },
        problem: { connect: { id: problemId } },
      },
    });

    // Process each test case
    const results = [];
    let allPassed = true;

    for (const testCase of testCases) {
      const { input, expected } = testCase;
      
      // Format code with test driver
      const formattedCode = formatTestCode(code, language, input, functionName);
      
      // Submit to Judge0
      const result = await submitCode(formattedCode, language);
      
      // Normalize the output
      let expectedOutput = expected;
      let actualOutput = result.output.trim();
      
      // Try to parse JSON if outputs look like JSON
      try {
        if (typeof expectedOutput === 'string' && 
            (expectedOutput.startsWith('{') || expectedOutput.startsWith('['))) {
          expectedOutput = JSON.parse(expectedOutput);
        }
        
        if (actualOutput && 
            (actualOutput.startsWith('{') || actualOutput.startsWith('['))) {
          actualOutput = JSON.parse(actualOutput);
        }
      } catch (e) {
        console.warn('Error parsing result output as JSON:', e);
      }
      
      // Compare expected vs actual
      const outputMatches = compareOutputs(expectedOutput, actualOutput);
      
      // Prepare test result
      const testResult = {
        ...result,
        input,
        expected: expectedOutput,
        output: actualOutput,
        passed: result.passed && outputMatches,
      };
      
      if (!testResult.passed) {
        allPassed = false;
      }
      
      results.push(testResult);
    }
    
    // Update submission with results
    await prisma.submission.update({
      where: { id: submission.id },
      data: {
        results: results as unknown as Prisma.JsonArray,
        passed: allPassed,
        status: 'COMPLETED',
        executionTime: results.reduce((sum, r) => sum + (r.executionTime || 0), 0),
        memory: results.reduce((max, r) => Math.max(max, r.memory || 0), 0),
      },
    });

    // Return results to client
    res.status(200).json({
      results,
      allPassed,
      submissionId: submission.id,
    });
  } catch (error) {
    console.error('Code execution error:', error);
    
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Unknown error during code execution' 
    });
  }
}

/**
 * Execute custom test case for user experimentation
 * Routes: POST /code/custom-test
 * 
 * Body:
 * - code: Source code to execute
 * - language: Programming language
 * - input: Array of inputs for the test case
 * - functionName: Name of the function to test
 */
export async function executeCustomTest(req: Request, res: Response): Promise<void> {
  const { code, language, input, functionName } = req.body;
  
  if (!code || !language || !input || !functionName) {
    res.status(400).json({ error: 'Missing required parameters' });
    return;
  }
  
  try {
    // Format the code with test driver
    const inputArray = Array.isArray(input) ? input : [input];
    const formattedCode = formatTestCode(code, language, inputArray, functionName);
    
    // Submit to Judge0
    const result = await submitCode(formattedCode, language);
    
    // Format result for the client
    const formattedResult = {
      ...result,
      input: inputArray,
    };
    
    res.status(200).json(formattedResult);
  } catch (error) {
    console.error('Custom test execution error:', error);
    
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Unknown error during test execution' 
    });
  }
}

/**
 * Helper function to compare expected and actual outputs
 */
function compareOutputs(expected: any, actual: any): boolean {
  // For JSON values or objects, we need to compare the stringified version for consistency
  const stringifyIfPossible = (val: any) => {
    try {
      return typeof val === 'object' 
        ? JSON.stringify(val) 
        : String(val).trim();
    } catch (e) {
      return String(val).trim();
    }
  };

  const expectedStr = stringifyIfPossible(expected);
  const actualStr = stringifyIfPossible(actual);
  
  return expectedStr === actualStr;
} 