/**
 * @file backend/src/controllers/codeExecutionController.ts
 * 
 * Code Execution Controller
 * Handles code execution requests and interfaces with the Judge0 service.
 * Manages problem submissions, test case execution, and result processing.
 */

import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import {
  submitCode,
  submitCodeBatch,
  formatTestCode,
  ProcessedResult,
} from '../services/judge0Service';
import { LANGUAGE_IDS } from '../shared/languageIds';
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

// Type for what the frontend expects as a single test result in the results array
interface TestResultForResponse {
  input: any[];
  output: any;
  expected: any;
  passed: boolean;
  runtime?: number;
  memory?: number;
  error?: string;
  compilationOutput?: string;
  statusDescription?: string;
  statusId?: number;
  exitCode?: number;
  isCustom?: boolean; 
}

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

// Helper type for parsed test cases from DB
type ParsedTestCaseFromDB = {
  id: string;
  input: any; 
  expectedOutput: string; 
  isHidden: boolean;
  orderNum?: number | null;
};

// Type for user-provided custom test cases
interface UserCustomTestCase {
  input: any; // Can be a single value or array, needs to be handled for formatTestCode
  expected?: any; // User-defined expected output
  // isHidden is part of TestCaseType but likely always false/irrelevant for custom user tests
}

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
  const { code, language, problemId, userCustomTestCases } = req.body as {
    code: string;
    language: string;
    problemId: string;
    userCustomTestCases?: UserCustomTestCase[];
  };
  const userId = req.user?.id;

  if (!code || !language || !problemId) {
    res.status(400).json({ error: 'Missing required parameters' });
    return;
  }

  try {
    const problemData = await prisma.problem.findUnique({
      where: { id: problemId },
      select: {
        id: true,
        name: true,
        codeProblem: {
          select: {
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
    });

    if (!problemData || !problemData.codeProblem || problemData.codeProblem.testCases.length === 0) {
      res.status(400).json({ error: 'No valid code problem details or official test cases found.' });
      return;
    }

    const { codeProblem } = problemData;
    const officialTestCases: ParsedTestCaseFromDB[] = codeProblem.testCases.map(tc => ({
      id: tc.id,
      input: safelyParseJson(tc.input),
      expectedOutput: tc.expectedOutput, // Keep as string, compareOutputs will handle parsing
      isHidden: tc.isHidden,
      orderNum: tc.orderNum,
    }));

    const functionName = codeProblem.functionName || 'solution';

    // Combine official and custom test cases for batch submission
    const allTestCases = [
      ...officialTestCases,
      ...(userCustomTestCases?.map(tc => ({
        ...tc,
        id: 'custom',
        isHidden: false,
      })) || []),
    ];

    // Get language ID once
    const languageId = LANGUAGE_IDS[language.toLowerCase()];
    if (!languageId) {
      res.status(400).json({ error: `Unsupported language: ${language}` });
      return;
    }

    // Create Submission Record Early
    const submission = await prisma.submission.create({
      data: {
        code,
        language,
        status: 'PROCESSING',
        user: { connect: { id: userId } },
        problem: { connect: { id: problemId } },
        results: [], // Initialize as empty, will be updated later
      },
    });

    // Chunk the submissions into batches of 20
    const batchSize = 20;
    const submissionChunks = [];
    for (let i = 0; i < allTestCases.length; i += batchSize) {
      submissionChunks.push(allTestCases.slice(i, i + batchSize));
    }

    let judge0Results: ProcessedResult[] = [];
    for (const chunk of submissionChunks) {
      const batchSubmissions = chunk.map(testCase => {
        const formattedInputArray = Array.isArray(testCase.input)
          ? testCase.input
          : [testCase.input];
        const formattedCode = formatTestCode(
          code,
          language,
          formattedInputArray,
          functionName,
        );
        return {
          source_code: Buffer.from(formattedCode).toString('base64'),
          language_id: languageId,
        };
      });
      const chunkResults = await submitCodeBatch(batchSubmissions);
      judge0Results = judge0Results.concat(chunkResults);
    }

    const submissionResponseResults: TestResultForResponse[] = [];
    let overallAllPassed = true;

    for (let i = 0; i < allTestCases.length; i++) {
      const testCase = allTestCases[i];
      const judge0Result = judge0Results[i];

      const isCustom = testCase.id === 'custom';
      const expectedOutput = isCustom
        ? (testCase as UserCustomTestCase).expected
        : (testCase as ParsedTestCaseFromDB).expectedOutput;

      let expectedOutputParsed = safelyParseJson(expectedOutput);
      let actualOutputParsed = safelyParseJson(judge0Result.output.trim());

      const outputMatches = compareOutputs(expectedOutputParsed, actualOutputParsed);
      const casePassed = judge0Result.statusId === 3 && outputMatches;

      if (!casePassed) overallAllPassed = false;

      submissionResponseResults.push({
        input: Array.isArray(testCase.input)
          ? testCase.input
          : [testCase.input],
        expected: expectedOutputParsed,
        output: actualOutputParsed,
        passed: casePassed,
        runtime: judge0Result.executionTime,
        memory: judge0Result.memory,
        error:
          judge0Result.error ||
          (judge0Result.compilationOutput ? 'Compilation Error' : undefined),
        compilationOutput: judge0Result.compilationOutput,
        statusDescription: judge0Result.statusDescription,
        statusId: judge0Result.statusId,
        exitCode: judge0Result.exitCode,
        isCustom: isCustom,
      });
    }

    // Update Submission with all results
    await prisma.submission.update({
      where: { id: submission.id },
      data: {
        results: submissionResponseResults as unknown as Prisma.JsonArray,
        passed: overallAllPassed,
        status: 'COMPLETED',
        executionTime: Math.max(...submissionResponseResults.map(r => r.runtime || 0)),
        memory: Math.max(...submissionResponseResults.map(r => r.memory || 0)),
      },
    });

    res.status(200).json({
      results: submissionResponseResults,
      allPassed: overallAllPassed,
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
 * Gets the code template for a specific language from languageSupport JSON
 * Handles the new multi-language structure
 */
function getLanguageTemplate(codeProblem: any, language: string): string | null {
  if (!codeProblem) return null;

  // Try to get from languageSupport JSON first (new structure)
  if (codeProblem.languageSupport) {
    try {
      const languageSupport = typeof codeProblem.languageSupport === 'string' 
        ? JSON.parse(codeProblem.languageSupport) 
        : codeProblem.languageSupport;
        
      if (languageSupport[language]?.template) {
        return languageSupport[language].template;
      }
    } catch (e) {
      console.warn('Error parsing languageSupport JSON:', e);
    }
  }

  // For backward compatibility with old fields
  if (language === codeProblem.language_old || language === codeProblem.language) {
    return codeProblem.codeTemplate || codeProblem.code_template_old;
  }

  return null;
}

/**
 * Gets the reference implementation for a specific language
 */
function getReferenceImplementation(codeProblem: any, language: string): string | null {
  if (!codeProblem?.languageSupport) return null;

  try {
    const languageSupport = typeof codeProblem.languageSupport === 'string' 
      ? JSON.parse(codeProblem.languageSupport) 
      : codeProblem.languageSupport;
      
    return languageSupport[language]?.reference || null;
  } catch (e) {
    console.warn('Error parsing languageSupport JSON for reference implementation:', e);
    return null;
  }
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
  const { code, language = "python", input, problemId, functionName: customFunctionName } = req.body;
  
  if (!code || !language) {
    res.status(400).json({ error: 'Missing required parameters' });
    return;
  }

  try {
    // If a problem ID is provided, load function name from there
    let functionName = customFunctionName;
    let expectedOutput = null;
    
    if (problemId) {
      const problem = await prisma.problem.findUnique({
        where: { id: problemId },
        select: { 
          codeProblem: {
            select: {
              functionName: true,
              languageSupport: true,
              defaultLanguage: true
            }
          }
        },
      });
      
      // Get function name from the related CodeProblem
      if (problem?.codeProblem?.functionName) {
        functionName = problem.codeProblem.functionName;
      }
      
      // Check for reference implementation
      const referenceImpl = getReferenceImplementation(problem?.codeProblem, language);
      if (referenceImpl) {
        // Run reference implementation to get expected output
        const formattedRefCode = formatTestCode(referenceImpl, language, input, functionName || 'solution');
        const refResult = await submitCode(formattedRefCode, language);
        expectedOutput = refResult.output.trim();
      }
    }
    
    // Default function name if not found
    functionName = functionName || 'solution';
    
    // Format the code with the test driver
    const formattedCode = formatTestCode(code, language, input, functionName);
    
    // Submit to Judge0
    const result = await submitCode(formattedCode, language);
    
    // Add expected output if available
    const response = {
      ...result,
      expectedOutput,
      passed: expectedOutput !== null 
        ? result.output.trim() === expectedOutput 
        : null
    };
    
    // Return result to client
    res.status(200).json(response);
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
  const { code, language, problemId, userCustomTestCases } = req.body as {
    code: string;
    language: string;
    problemId: string;
    userCustomTestCases?: UserCustomTestCase[]; // Same type as in executeCode
  };

  if (!code || !language || !problemId) {
    res.status(400).json({ error: 'Missing required parameters' });
    return;
  }

  try {
    const problemData = await prisma.problem.findUnique({
      where: { id: problemId },
      select: {
        id: true,
        name: true,
        codeProblem: {
          select: {
            functionName: true,
            testCases: { orderBy: { orderNum: 'asc' }, take: 2 }, 
            timeLimit: true,
            memoryLimit: true,
          }
        }
      }
    });

    // Initial check for problemData itself
    if (!problemData) {
        res.status(404).json({ error: 'Problem not found.' });
        return;
    }

    // Check if codeProblem exists and if official test cases are needed or present
    if (!problemData.codeProblem) {
      // If no codeProblem, we can only run custom tests if they are provided
      if (!userCustomTestCases || userCustomTestCases.length === 0) {
         res.status(400).json({ error: 'Problem details not found and no custom test cases provided.' });
         return;
      }
      // If there are custom tests, we can proceed without official ones, using a default functionName if needed
    }
    
    const codeProblemDetails = problemData.codeProblem; // Now problemData.codeProblem is safer to access if !problemData.codeProblem was handled
    const functionName = codeProblemDetails?.functionName || 'solution';
    const quickRunResults: TestResultForResponse[] = [];
    let overallAllPassed = true;

    // 1. Process Official Test Cases (Limited for Quick Run)
    if (codeProblemDetails && codeProblemDetails.testCases && codeProblemDetails.testCases.length > 0) {
      const officialTestCases: ParsedTestCaseFromDB[] = codeProblemDetails.testCases.map(tc => ({
        id: tc.id,
        input: safelyParseJson(tc.input),
        expectedOutput: tc.expectedOutput,
        isHidden: tc.isHidden,
        orderNum: tc.orderNum,
      }));

      for (const officialCase of officialTestCases) {
        const formattedInputArray = Array.isArray(officialCase.input) ? officialCase.input : [officialCase.input];
        const formattedCode = formatTestCode(code, language, formattedInputArray, functionName);
        const judge0Result: ProcessedResult = await submitCode(formattedCode, language);

        let expectedOutputParsed = safelyParseJson(officialCase.expectedOutput);
        let actualOutputParsed = safelyParseJson(judge0Result.output.trim());
        
        const outputMatches = compareOutputs(expectedOutputParsed, actualOutputParsed);
        const casePassed = judge0Result.statusId === 3 && outputMatches;

        if (!casePassed) overallAllPassed = false;
        
        quickRunResults.push({
          input: formattedInputArray,
          expected: expectedOutputParsed,
          output: actualOutputParsed,
          passed: casePassed,
          runtime: judge0Result.executionTime,
          memory: judge0Result.memory,
          error: judge0Result.error || (judge0Result.compilationOutput ? "Compilation Error" : undefined),
          compilationOutput: judge0Result.compilationOutput,
          statusDescription: judge0Result.statusDescription,
          statusId: judge0Result.statusId,
          exitCode: judge0Result.exitCode,
          isCustom: false,
        });
      }
    }

    // 2. Process User Custom Test Cases (if any)
    if (userCustomTestCases && userCustomTestCases.length > 0) {
      for (const customCase of userCustomTestCases) {
        const customInputArray = Array.isArray(customCase.input) ? customCase.input : [customCase.input];
        const formattedCode = formatTestCode(code, language, customInputArray, functionName);
        const judge0Result: ProcessedResult = await submitCode(formattedCode, language);

        let customExpectedParsed = customCase.expected !== undefined ? safelyParseJson(customCase.expected) : undefined;
        let actualOutputParsed = safelyParseJson(judge0Result.output.trim());

        let casePassed = judge0Result.statusId === 3;
        if (customCase.expected !== undefined) {
          casePassed = casePassed && compareOutputs(customExpectedParsed, actualOutputParsed);
        }

        if (!casePassed) overallAllPassed = false;

        quickRunResults.push({
          input: customInputArray,
          expected: customExpectedParsed,
          output: actualOutputParsed,
          passed: casePassed,
          runtime: judge0Result.executionTime,
          memory: judge0Result.memory,
          error: judge0Result.error || (judge0Result.compilationOutput ? "Compilation Error" : undefined),
          compilationOutput: judge0Result.compilationOutput,
          statusDescription: judge0Result.statusDescription,
          statusId: judge0Result.statusId,
          exitCode: judge0Result.exitCode,
          isCustom: true,
        });
      }
    }
    
    if (quickRunResults.length === 0) {
        // This condition means neither official (even if limited) nor custom tests were run/provided.
        // If userCustomTestCases were provided but problemData.codeProblem was null (so no functionName implicitly),
        // the loop for custom tests would still run with functionName = 'solution'.
        // So, if quickRunResults is empty, it truly means no tests were effectively processed.
        overallAllPassed = false; 
        // Consider if a different response is better, e.g., 400 if no tests could be run.
        // For now, returning empty results with allPassed: false.
    }

    res.status(200).json({
      results: quickRunResults,
      allPassed: overallAllPassed,
      isQuickRun: true,
    });

  } catch (error) {
    console.error('Test execution error:', error);
    
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Unknown error during test execution' 
    });
  }
} 