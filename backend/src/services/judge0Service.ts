/**
 * @file backend/src/services/judge0Service.ts
 * 
 * Judge0 Service
 * Provides an interface to the Judge0 API for code execution.
 * Handles submission of code to the Judge0 API and processing of results.
 */

import axios from 'axios';
import env from '../config/env';
import { Request } from 'express';
import { LANGUAGE_IDS } from '../shared/languageIds';

// Add a timeout for Judge0 requests
const JUDGE0_TIMEOUT = Number(env.JUDGE0_TIMEOUT) || 10000;

// Define the Judge0 API URL and auth token
const JUDGE0_API = env.JUDGE0_API_URL || 'https://judge0-ce.p.rapidapi.com';
const JUDGE0_AUTH_TOKEN = env.JUDGE0_AUTH_TOKEN;
const JUDGE0_HOST = env.JUDGE0_HOST || 'judge0-ce.p.rapidapi.com';

// Backup mapping for Judge0 Extra CE (if needed)
const EXTRA_LANGUAGE_IDS: Record<string, number> = {
  'python': 28,    // Python 3.10 (PyPy 7.3.12)
  'python3': 28,   // Python 3.10 (PyPy 7.3.12)
  'java': 4,       // Java (OpenJDK 14.0.1)
  'cpp': 2,        // C++ (Clang 10.0.1)
  'c': 1,          // C (Clang 10.0.1)
  'c#': 29,        // C# (.NET Core SDK 7.0.400)
  'cs': 29         // C# alias
};

// Submission request interface
interface SubmissionRequest {
  source_code: string;
  language_id: number;
  stdin?: string;
  expected_output?: string;
  cpu_time_limit?: number;
  memory_limit?: number;
  wall_time_limit?: number;
}

interface BatchSubmissionRequest {
  submissions: SubmissionRequest[];
}

// Submission response interface
interface SubmissionResponse {
  token: string;
}

// Result response interface
interface ResultResponse {
  stdout: string;
  stderr: string;
  status: {
    id: number;
    description: string;
  };
  time: string;
  memory: number;
  compile_output: string;
  exit_code: number;
  error?: string;
  message?: string;
}

// Status codes according to Judge0 documentation
const STATUS_CODES = {
  ACCEPTED: 3,
  WRONG_ANSWER: 4,
  TIME_LIMIT_EXCEEDED: 5,
  COMPILATION_ERROR: 6,
  RUNTIME_ERROR: 7,
  INTERNAL_ERROR: 8,
  EXEC_FORMAT_ERROR: 9,
  PROCESSING: 1,
  IN_QUEUE: 2
};

// Processed result interface for the client
export interface ProcessedResult {
  passed: boolean;
  output: string;
  error?: string;
  compilationOutput?: string;
  statusDescription: string;
  statusId: number;
  executionTime?: number;
  memory?: number;
  exitCode?: number;
  input?: any;
  expected?: any;
}

/**
 * Submits a batch of code submissions to Judge0 for execution.
 *
 * @param submissions - An array of submission requests.
 * @returns A promise that resolves to an array of processed results.
 */
export async function submitCodeBatch(
  submissions: SubmissionRequest[],
): Promise<ProcessedResult[]> {
  // 1. Create batch submission
  const response = await axios.post<SubmissionResponse[]>(
    `${JUDGE0_API}/submissions/batch?base64_encoded=true`,
    { submissions },
    {
      headers: {
        'Content-Type': 'application/json',
        'X-RapidAPI-Key': JUDGE0_AUTH_TOKEN,
        'X-RapidAPI-Host': JUDGE0_HOST,
      },
      timeout: JUDGE0_TIMEOUT,
    },
  );

  const submissionTokens = response.data.map(item => {
    if ('token' in item) {
      return item.token;
    }
    // Handle potential errors for individual submissions in the batch
    // For now, we'll filter out invalid responses
    return null;
  }).filter(token => token !== null) as string[];

  // 2. Poll for batch results
  return await getBatchSubmissionResult(submissionTokens);
}

/**
 * Get the result of a submission using its token
 *
 * @param token Submission token
 * @returns Processed result of the execution
 */
async function getBatchSubmissionResult(
  tokens: string[],
): Promise<ProcessedResult[]> {
  const MAX_RETRIES = 20; // Increased retries for batch
  const RETRY_DELAY = 1500; // Increased delay for batch

  for (let i = 0; i < MAX_RETRIES; i++) {
    const response = await axios.get<{ submissions: ResultResponse[] }>(
      `${JUDGE0_API}/submissions/batch?tokens=${tokens.join(',')}&base64_encoded=true&fields=*`,
      {
        headers: {
          'Content-Type': 'application/json',
          'X-RapidAPI-Key': JUDGE0_AUTH_TOKEN,
          'X-RapidAPI-Host': JUDGE0_HOST,
        },
        timeout: JUDGE0_TIMEOUT,
      },
    );

    const results = response.data.submissions;
    const allDone = results.every(
      result => result.status.id > 2, // Not "In Queue" or "Processing"
    );

    if (allDone) {
      return results.map(processResult);
    }

    await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
  }

  throw new Error('Batch submission processing timed out.');
}

/**
 * Submit code to Judge0 for execution
 * 
 * @param code Source code to execute
 * @param language Programming language of the source code
 * @param stdin Standard input for the program (optional)
 * @param expectedOutput Expected output for comparison (optional)
 * @returns Processed result of the execution
 */
export async function submitCode(
  code: string,
  language: string,
  stdin: string = '',
  expectedOutput: string = '',
): Promise<ProcessedResult> {
  // Get the language ID from the language mapping
  const languageId = LANGUAGE_IDS[language.toLowerCase()];
  if (!languageId) {
    console.error(`Unsupported language for Judge0 CE: ${language}. Attempted ID lookup in LANGUAGE_IDS.`);
    throw new Error(`Unsupported language for current Judge0 configuration: ${language}`);
  }

  // Prepare the submission request
  const submission: SubmissionRequest = {
    source_code: Buffer.from(code).toString('base64'),
    language_id: languageId,
    stdin: stdin ? Buffer.from(stdin).toString('base64') : undefined,
    expected_output: expectedOutput ? Buffer.from(expectedOutput).toString('base64') : undefined,
    cpu_time_limit: 2, // 2 seconds
    wall_time_limit: 5, // 5 seconds
    memory_limit: 128000, // 128MB
  };

  try {
    // Submit the code to Judge0
    const response = await axios.post<SubmissionResponse>(
      `${JUDGE0_API}/submissions?base64_encoded=true`, 
      submission, 
      {
        headers: {
          'Content-Type': 'application/json',
          'X-RapidAPI-Key': JUDGE0_AUTH_TOKEN,
          'X-RapidAPI-Host': JUDGE0_HOST
        },
        timeout: JUDGE0_TIMEOUT,
      }
    );

    // Get the submission token
    const token = response.data.token;
    
    // Get the result using the token
    return await getSubmissionResult(token);
  } catch (error) {
    console.error('Judge0 submission error:', error);

    // Check if it's an Axios error and specifically a 429
    if (axios.isAxiosError(error) && error.response && error.response.status === 429) {
      return {
        passed: false,
        output: '',
        error: 'Server is busy (rate limit exceeded). Please try again in a few minutes.',
        statusDescription: 'Rate Limit Exceeded',
        statusId: 429, // Using HTTP status code for clarity, or a custom one
      };
    }
    
    // For other errors, return a generic error response
    return {
      passed: false,
      output: '',
      error: error instanceof Error ? error.message : 'Unknown error occurred during code execution',
      statusDescription: 'Error',
      statusId: STATUS_CODES.INTERNAL_ERROR, // Or some other appropriate status
    };
  }
}

/**
 * Get the result of a submission using its token
 * 
 * @param token Submission token
 * @returns Processed result of the execution
 */
async function getSubmissionResult(token: string): Promise<ProcessedResult> {
  const MAX_RETRIES = 10;
  const RETRY_DELAY = 1000; // 1 second

  for (let i = 0; i < MAX_RETRIES; i++) {
    try {
      // Get the submission result
      const response = await axios.get<ResultResponse>(
        `${JUDGE0_API}/submissions/${token}`, 
        {
          headers: {
            'Content-Type': 'application/json',
            'X-RapidAPI-Key': JUDGE0_AUTH_TOKEN,
            'X-RapidAPI-Host': JUDGE0_HOST
          },
          params: {
            base64_encoded: 'true',
            fields: 'stdout,stderr,status,time,memory,compile_output,message,exit_code',
          },
          timeout: JUDGE0_TIMEOUT,
        }
      );

      // Check if the submission is still processing or in queue
      if (response.data.status.id === STATUS_CODES.PROCESSING || 
          response.data.status.id === STATUS_CODES.IN_QUEUE) {
        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
        continue;
      }

      // Process and return the result
      return processResult(response.data);
    } catch (error) {
      console.error('Error fetching submission result:', error);

      // Check if it's an Axios error and specifically a 429
      if (axios.isAxiosError(error) && error.response && error.response.status === 429) {
        return {
          passed: false,
          output: '',
          error: 'Server is busy (rate limit exceeded while fetching results). Please try again.',
          statusDescription: 'Rate Limit Exceeded',
          statusId: 429, // Using HTTP status code for clarity
        };
      }
      
      // For other errors, return a generic error response
      return {
        passed: false,
        output: '',
        error: error instanceof Error ? error.message : 'Unknown error occurred while fetching results',
        statusDescription: 'Error',
        statusId: STATUS_CODES.INTERNAL_ERROR,
      };
    }
  }

  // If we've exhausted all retries, return a timeout error
  return {
    passed: false,
    output: '',
    error: 'Code execution timed out after multiple retries',
    statusDescription: 'Timeout',
    statusId: STATUS_CODES.TIME_LIMIT_EXCEEDED,
  };
}

/**
 * Process the raw result from Judge0 into a more usable format
 * 
 * @param result Raw result from Judge0
 * @returns Processed result
 */
function processResult(result: ResultResponse): ProcessedResult {
  const {
    stdout, stderr, status, time, memory, compile_output, message, exit_code
  } = result;

  // Decode base64 encoded data
  const decodedOutput = stdout ? Buffer.from(stdout, 'base64').toString() : '';
  const decodedError = stderr ? Buffer.from(stderr, 'base64').toString() : '';
  const decodedCompileOutput = compile_output ? Buffer.from(compile_output, 'base64').toString() : '';

  // Convert execution time to milliseconds (from seconds)
  const executionTime = time ? parseFloat(time) * 1000 : undefined;

  return {
    passed: status.id === STATUS_CODES.ACCEPTED,
    output: decodedOutput,
    error: decodedError || undefined,
    compilationOutput: decodedCompileOutput || undefined,
    statusDescription: status.description,
    statusId: status.id,
    executionTime,
    memory,
    exitCode: exit_code,
  };
}

/**
 * Format the test code based on the language
 * 
 * @param code User submitted code
 * @param language Programming language
 * @param input Test case input
 * @param functionName Main function name to test
 * @returns Formatted code with test driver
 */
export function formatTestCode(
  code: string, 
  language: string, 
  input: any[],
  functionName: string
): string {
  // Convert input to a string representation based on language
  const inputStr = JSON.stringify(input);
  
  switch (language.toLowerCase()) {
    case 'javascript':
      return `
${code}

// Test driver
function runTest() {
  const input = ${inputStr};
  try {
    const result = ${functionName}(...input);
    console.log(JSON.stringify(result));
  } catch (error) {
    console.error("Runtime error:", error.message);
    process.exit(1);
  }
}

runTest();
      `;
    
    case 'python':
    case 'python3':
      return `
${code}

# Test driver
def run_test():
    import json
    import sys
    
    input_data = ${inputStr}
    try:
        result = ${functionName}(*input_data)
        print(json.dumps(result) if result is not None else "None")
    except Exception as e:
        print("Runtime error:", str(e), file=sys.stderr)
        sys.exit(1)

run_test()
      `;
    
    case 'java':
      // For Java, we need to extract the class name from the code
      const classMatch = code.match(/public\s+class\s+(\w+)/);
      const className = classMatch ? classMatch[1] : 'Solution';
      
      return `
${code}

// Test driver
public class Main {
    public static void main(String[] args) {
        ${className} solution = new ${className}();
        try {
            // Parse input
            String input = "${inputStr.replace(/"/g, '\\"')}";
            // Implementation depends on the specific problem
            // This is a placeholder - real implementation would need to parse the input properly
            Object result = solution.${functionName}(/* parse and pass arguments here */);
            System.out.println(result);
        } catch (Exception e) {
            System.err.println("Runtime error: " + e.getMessage());
            System.exit(1);
        }
    }
}
      `;
    
    case 'cpp':
    case 'c++':
      return `
${code}

// Test driver
int main() {
    // Implementation depends on the specific problem
    // This is a placeholder - real implementation would need to parse the input properly
    
    try {
        // Parse input from string: ${inputStr}
        
        // Call the solution function
        auto result = ${functionName}(/* parsed arguments */);
        
        // Output the result
        std::cout << result << std::endl;
    } catch (const std::exception& e) {
        std::cerr << "Runtime error: " << e.what() << std::endl;
        return 1;
    }
    
    return 0;
}
      `;
    
    default:
      throw new Error(`Unsupported language for test formatting: ${language}`);
  }
} 