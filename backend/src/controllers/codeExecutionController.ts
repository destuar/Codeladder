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

// Define the expected payload structure from Prisma
type ProblemWithCodeDetailsPayload = Prisma.ProblemGetPayload<{
  select: {
    id: true,
    name: true,
    codeProblem: {
      select: {
        questionId: true, // Correct identifier
        functionName: true,
        testCases: {
          select: {
            id: true,
            input: true,
            expectedOutput: true,
            isHidden: true,
            orderNum: true,
          },
          orderBy: {
            orderNum: 'asc',
          },
        },
        timeLimit: true,
        memoryLimit: true,
      }
    }
  }
}>;

/**
 * Safely parses a JSON string, handling errors gracefully
 * @param value The string to parse
 * @returns The parsed object or array, or the original value if parsing fails
 */
const safelyParseJson = (value: string): any => {
  if (!value || typeof value !== 'string') return value;
  
  try {
    return JSON.parse(value);
  } catch (e) {
    console.warn(`Failed to parse JSON value: ${value}`);
    return value;
  }
};

// Helper type for parsed test cases
type ParsedTestCase = {
  id: string;
  input: any; // Input can be any type after parsing
  expectedOutput: string; // Keep as string for now, parse later
  isHidden: boolean;
  orderNum?: number | null;
};

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
    // Fetch problem and its associated code problem details
    const problem: ProblemWithCodeDetailsPayload | null = await prisma.problem.findUnique({
      where: { id: problemId },
      select: {
        id: true,
        name: true,
        // Include the CodeProblem relation
        codeProblem: {
          select: {
            questionId: true, // Use correct field 'questionId'
            functionName: true,
            testCases: {
              select: {
                id: true,
                input: true, // Input stored as string
                expectedOutput: true,
                isHidden: true,
                orderNum: true,
              },
              orderBy: {
                orderNum: 'asc', // Optional: order test cases if needed
              },
            },
            // Include other CodeProblem fields if needed
            timeLimit: true,
            memoryLimit: true,
          },
        },
      },
    });

    if (!problem) {
      res.status(404).json({ error: 'Problem not found' });
      return;
    }

    // Check if it's a code problem and has necessary details
    if (!problem.codeProblem || !problem.codeProblem.testCases || problem.codeProblem.testCases.length === 0) {
      res.status(400).json({ error: 'No valid code problem details or test cases found for this problem' });
      return;
    }

    // Use data from CodeProblem
    const codeProblemDetails = problem.codeProblem;
    // Explicitly type 'tc' and define ParsedTestCase helper type
    const testCases: ParsedTestCase[] = codeProblemDetails.testCases.map((tc: typeof codeProblemDetails.testCases[0]): ParsedTestCase => ({
      id: tc.id,
      input: safelyParseJson(tc.input),
      expectedOutput: tc.expectedOutput,
      isHidden: tc.isHidden,
      orderNum: tc.orderNum,
    }));

    const functionName = codeProblemDetails.functionName || 'solution'; // Use function name from CodeProblem

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
      const { input, expectedOutput } = testCase;
      
      // Ensure input passed to formatTestCode is an array
      const formattedInput = Array.isArray(input) ? input : [input];
      
      // Format code with test driver
      const formattedCode = formatTestCode(code, language, formattedInput, functionName);
      
      // Submit to Judge0 (Reverted signature - no time/memory limits here)
      const result = await submitCode(
        formattedCode,
        language
        // stdin and expectedOutput are not needed here as judge0Service handles basic execution
        // Problem-specific limits would require judge0Service modification
      );
      
      // Normalize the output
      let expectedOutputParsed: any = expectedOutput; // Keep original string/parsed version
      let actualOutputParsed: any = result.output.trim();
      
      // Try to parse JSON if outputs look like JSON strings
      try {
        if (typeof expectedOutputParsed === 'string' && (expectedOutputParsed.startsWith('{') || expectedOutputParsed.startsWith('['))) {
          expectedOutputParsed = JSON.parse(expectedOutputParsed);
        }
        if (typeof actualOutputParsed === 'string' && (actualOutputParsed.startsWith('{') || actualOutputParsed.startsWith('['))) {
          actualOutputParsed = JSON.parse(actualOutputParsed);
        }
      } catch (e) {
        console.warn('Error parsing result/expected output as JSON:', e);
      }
      
      // Compare expected vs actual
      const outputMatches = compareOutputs(expectedOutputParsed, actualOutputParsed);
      
      // Prepare test result
      const testResult = {
        ...result,
        input,
        expected: expectedOutputParsed,
        output: actualOutputParsed,
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
  // If expected is a string (likely from DB), try parsing it first for comparison
  let parsedExpected = expected;
  if (typeof expected === 'string') {
    try {
       if (expected.startsWith('{') || expected.startsWith('[')) {
           parsedExpected = JSON.parse(expected);
       }
       // If not JSON-like, keep as string
    } catch (e) {
      // Ignore parsing error, compare as strings
      console.warn("Could not parse expected output string for comparison:", expected);
    }
  }


  // Check for strict equality first (works for primitives and object references)
  if (parsedExpected === actual) {
    return true;
  }

  // Deep comparison for arrays and objects if strict equality fails
   if (typeof parsedExpected === 'object' && parsedExpected !== null && typeof actual === 'object' && actual !== null) {
       try {
           // Use JSON stringify for a simple deep comparison
           // Note: This has limitations (key order, undefined values) but often sufficient
           return JSON.stringify(parsedExpected) === JSON.stringify(actual);
       } catch (e) {
           // Fallback or log error if stringify fails
           console.error("Error stringifying objects for comparison", e);
           return false;
       }
   }


  // If one is null/undefined but the other isn't, they don't match
  if ((parsedExpected === null || parsedExpected === undefined) !== (actual === null || actual === undefined)) {
    return false;
  }

  // Convert numbers to strings for comparison if types don't match
  if (typeof parsedExpected === 'number' && typeof actual === 'string') {
    return parsedExpected.toString() === actual.trim();
  }
  if (typeof actual === 'number' && typeof parsedExpected === 'string') {
    return actual.toString() === parsedExpected.trim();
  }

  // For arrays, compare each element
  if (Array.isArray(parsedExpected) && Array.isArray(actual)) {
    if (parsedExpected.length !== actual.length) {
      return false;
    }
    for (let i = 0; i < parsedExpected.length; i++) {
      if (!compareOutputs(parsedExpected[i], actual[i])) {
        return false;
      }
    }
    return true;
  }

  // For objects, compare stringified versions
  if (typeof parsedExpected === 'object' && typeof actual === 'object') {
    return JSON.stringify(parsedExpected) === JSON.stringify(actual);
  }

  // Convert to strings and trim for final comparison
  return String(parsedExpected).trim() === String(actual).trim();
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
        select: { 
          // Include codeProblem and necessary fields
          codeProblem: {
            select: {
              functionName: true,
               // Optionally include testCases if needed elsewhere, but not needed just for functionName
            }
          }
        },
      });
      
      // Get function name from the related CodeProblem
      if (problem?.codeProblem?.functionName) {
        functionName = problem.codeProblem.functionName;
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

// Define the expected payload structure for runTests
type ProblemWithLimitedCodeDetailsPayload = Prisma.ProblemGetPayload<{
  select: {
    id: true,
    name: true,
    codeProblem: {
      select: {
        questionId: true,
        functionName: true,
        testCases: {
          select: {
            id: true,
            input: true,
            expectedOutput: true,
            isHidden: true,
            orderNum: true,
          },
          orderBy: {
            orderNum: 'asc',
          },
          take: 2, // Limit applied here
        },
        timeLimit: true,
        memoryLimit: true,
      }
    }
  }
}>;

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
    // Fetch problem and its associated code problem details
    // Apply explicit type
    const problem: ProblemWithLimitedCodeDetailsPayload | null = await prisma.problem.findUnique({
      where: { id: problemId },
      select: {
        id: true,
        name: true,
        // Include the CodeProblem relation
        codeProblem: {
          select: {
            questionId: true, // Correct field
            functionName: true,
            testCases: {
              select: {
                id: true,
                input: true,
                expectedOutput: true,
                isHidden: true,
                orderNum: true,
              },
              orderBy: {
                orderNum: 'asc',
              },
              take: 2, // Limit to first 2 for runTests
            },
             timeLimit: true,
             memoryLimit: true,
          },
        },
      },
    });

    if (!problem) {
      res.status(404).json({ error: 'Problem not found' });
      return;
    }

     // Check if it's a code problem and has necessary details
    if (!problem.codeProblem || !problem.codeProblem.testCases || problem.codeProblem.testCases.length === 0) {
      res.status(400).json({ error: 'No valid code problem details or test cases found for this problem' });
      return;
    }

    // Use data from CodeProblem
    const codeProblemDetails = problem.codeProblem;
    // Apply type fixes here too
    const testCases: ParsedTestCase[] = codeProblemDetails.testCases.map((tc: typeof codeProblemDetails.testCases[0]): ParsedTestCase => ({
      id: tc.id,
      input: safelyParseJson(tc.input),
      expectedOutput: tc.expectedOutput,
      isHidden: tc.isHidden,
      orderNum: tc.orderNum,
    }));
    
    // Use only the fetched (already limited) test cases
    const limitedTestCases = testCases; 

    // Extract function name from CodeProblem
    const functionName = codeProblemDetails.functionName || 'solution';

    // Process each limited test case
    const results = [];
    let allPassed = true;

    for (const testCase of limitedTestCases) { // Use the limitedTestCases from CodeProblem
      const { input, expectedOutput } = testCase;

      // Ensure input passed to formatTestCode is an array
      const formattedInput = Array.isArray(input) ? input : [input];

      // Format code with test driver
      const formattedCode = formatTestCode(code, language, formattedInput, functionName); // Pass formattedInput

      // Submit to Judge0 (Reverted signature)
      const result = await submitCode(
          formattedCode,
          language
          // No extra args
        );

      // Normalize the output
      let expectedOutputParsed: any = expectedOutput;
      let actualOutputParsed: any = result.output.trim();
      
      // Try to parse JSON if outputs look like JSON strings
      try {
        if (typeof expectedOutputParsed === 'string' && (expectedOutputParsed.startsWith('{') || expectedOutputParsed.startsWith('['))) {
            expectedOutputParsed = JSON.parse(expectedOutputParsed);
        }
        if (typeof actualOutputParsed === 'string' && (actualOutputParsed.startsWith('{') || actualOutputParsed.startsWith('['))) {
            actualOutputParsed = JSON.parse(actualOutputParsed);
        }
      } catch (e) {
        console.warn('Error parsing runTests output as JSON:', e);
      }

      // Compare expected vs actual
      const outputMatches = compareOutputs(expectedOutputParsed, actualOutputParsed);

      // Prepare test result
      const testResult = {
        ...result,
        input,
        expected: expectedOutputParsed,
        output: actualOutputParsed,
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