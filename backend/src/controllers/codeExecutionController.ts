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
 * Compares expected and actual output values
 * Handles different data types and formats
 * 
 * @param expected The expected output value
 * @param actual The actual output value
 * @returns boolean indicating if outputs match
 */
function compareOutputs(expected: any, actual: any): boolean {
  // Check for strict equality first
  if (expected === actual) {
    return true;
  }

  // If one is null/undefined but the other isn't, they don't match
  if ((expected === null || expected === undefined) !== (actual === null || actual === undefined)) {
    return false;
  }

  // Convert numbers to strings for comparison if types don't match
  if (typeof expected === 'number' && typeof actual === 'string') {
    return expected.toString() === actual.trim();
  }
  if (typeof actual === 'number' && typeof expected === 'string') {
    return actual.toString() === expected.trim();
  }

  // For arrays, compare each element
  if (Array.isArray(expected) && Array.isArray(actual)) {
    if (expected.length !== actual.length) {
      return false;
    }
    for (let i = 0; i < expected.length; i++) {
      if (!compareOutputs(expected[i], actual[i])) {
        return false;
      }
    }
    return true;
  }

  // For objects, compare stringified versions
  if (typeof expected === 'object' && typeof actual === 'object') {
    return JSON.stringify(expected) === JSON.stringify(actual);
  }

  // Convert to strings and trim for final comparison
  return String(expected).trim() === String(actual).trim();
}

/**
 * Execute a custom test case
 * Routes: POST /code/custom-test
 * 
 * Body:
 * - code: Source code to execute
 * - language: Programming language
 * - input: Custom input for the test
 * - problemId: ID of the problem (optional)
 * - functionName: Name of the function to test (optional)
 */
export async function executeCustomTest(req: Request, res: Response): Promise<void> {
  const { code, language, input, problemId, functionName: customFunctionName } = req.body;
  
  if (!code || !language) {
    res.status(400).json({ error: 'Missing required parameters' });
    return;
  }

  try {
    // If a problem ID is provided, load function name from there
    let functionName = customFunctionName;
    
    if (problemId && !functionName) {
      const problem = await prisma.problem.findUnique({
        where: { id: problemId },
        select: { testCases: true },
      });
      
      if (problem?.testCases) {
        const testCases = Array.isArray(problem.testCases)
          ? problem.testCases
          : JSON.parse(typeof problem.testCases === 'string'
              ? problem.testCases
              : JSON.stringify(problem.testCases));
              
        functionName = testCases[0]?.functionName;
      }
    }
    
    // Default function name if not found
    functionName = functionName || 'solution';
    
    // Format the code with the test driver
    const formattedCode = formatTestCode(code, language, input, functionName);
    
    // Submit to Judge0
    const result = await submitCode(formattedCode, language);
    
    // Return result to client
    res.status(200).json(result);
  } catch (error) {
    console.error('Custom test error:', error);
    
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error during test execution',
    });
  }
}

/**
 * Run tests without storing a submission
 * Routes: POST /code/run-tests
 * 
 * Body:
 * - code: Source code to execute
 * - language: Programming language
 * - problemId: ID of the problem to test against
 */
export async function runTests(req: Request, res: Response): Promise<void> {
  const { code, language, problemId } = req.body;

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
    
    // Use only the first 2 test cases for quick testing
    const limitedTestCases = testCases.slice(0, 2);

    // Extract function name
    const functionName = testCases[0]?.functionName || 'solution';

    // Process each test case (without creating a submission)
    const results = [];
    let allPassed = true;

    for (const testCase of limitedTestCases) {
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
    
    // Return results to client without creating a submission record
    res.status(200).json({
      results,
      allPassed,
      isQuickRun: true
    });
  } catch (error) {
    console.error('Test execution error:', error);
    
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Unknown error during test execution' 
    });
  }
} 