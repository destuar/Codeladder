/**
 * @file backend/src/api/code/test.ts
 * 
 * Judge0 CE Health Check API
 * Provides a secure endpoint for testing the Judge0 CE connectivity
 */

import { Request, Response } from 'express';
import axios from 'axios';
import env from '../../config/env';

/**
 * Tests the connection to the Judge0 CE API
 * - Sends a simple JavaScript code snippet for execution
 * - Verifies the response format and execution results
 * - Provides detailed diagnostics for troubleshooting
 * 
 * This endpoint requires authentication to prevent abuse
 */
export const testJudge0Connection = async (req: Request, res: Response) => {
  try {
    // Simple JavaScript code for addition
    const testCode = `
function solution(a, b) {
  return a + b;
}

// Test driver
function runTest() {
  const input = [5, 7];
  try {
    const result = solution(...input);
    console.log(JSON.stringify(result));
  } catch (error) {
    console.error("Runtime error:", error.message);
    process.exit(1);
  }
}

runTest();
    `;

    // Create submission payload with correct language ID
    const submission = {
      source_code: Buffer.from(testCode).toString('base64'),
      language_id: 102, // JavaScript (Node.js 22.08.0)
    };

    // Submit code to Judge0 CE
    console.log('Sending test submission to Judge0 CE...');
    const submitResponse = await axios.post(
      `${env.JUDGE0_API_URL}/submissions?base64_encoded=true`,
      submission,
      {
        headers: {
          'Content-Type': 'application/json',
          'X-RapidAPI-Key': env.JUDGE0_AUTH_TOKEN,
          'X-RapidAPI-Host': env.JUDGE0_HOST
        },
        timeout: Number(env.JUDGE0_TIMEOUT),
      }
    );

    const token = submitResponse.data.token;
    console.log('Test submission successful! Token:', token);

    // Poll for results with reasonable timeout
    const MAX_RETRIES = 10;
    const RETRY_DELAY = 1000; // 1 second
    let result = null;

    for (let i = 0; i < MAX_RETRIES; i++) {
      // Wait before polling
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));

      // Get the submission result
      const resultResponse = await axios.get(
        `${env.JUDGE0_API_URL}/submissions/${token}?base64_encoded=true`,
        {
          headers: {
            'Content-Type': 'application/json',
            'X-RapidAPI-Key': env.JUDGE0_AUTH_TOKEN,
            'X-RapidAPI-Host': env.JUDGE0_HOST
          },
          params: {
            base64_encoded: 'true',
            fields: 'stdout,stderr,status,time,memory,compile_output,message,exit_code',
          },
          timeout: Number(env.JUDGE0_TIMEOUT),
        }
      );

      result = resultResponse.data;

      // Check if the submission is still processing or in queue
      if (!(result.status.id <= 2)) { // Not processing or in queue
        break;
      }

      console.log(`Test still processing (status: ${result.status.id}). Retrying...`);
    }

    if (!result) {
      return res.status(500).json({
        success: false,
        error: 'Failed to get execution result after multiple retries'
      });
    }

    // Process the result
    const stdout = result.stdout ? Buffer.from(result.stdout, 'base64').toString() : '';
    const stderr = result.stderr ? Buffer.from(result.stderr, 'base64').toString() : '';
    const compileOutput = result.compile_output ? Buffer.from(result.compile_output, 'base64').toString() : '';
    
    // Check for successful execution
    const isSuccessful = result.status.id === 3 && stdout.includes('12');

    return res.status(200).json({
      success: isSuccessful,
      message: isSuccessful ? 'Judge0 CE connection is working correctly' : 'Judge0 CE test failed',
      details: {
        status: result.status,
        output: stdout,
        error: stderr || undefined,
        compilationOutput: compileOutput || undefined,
        executionTime: result.time,
        memory: result.memory,
        exitCode: result.exit_code
      }
    });
  } catch (error) {
    console.error('Judge0 CE health check error:', error);
    
    // Provide detailed error information
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      details: error instanceof Error ? {
        name: error.name,
        stack: error.stack,
        // Include axios response data if available
        response: error.hasOwnProperty('response') ? 
          // @ts-ignore
          (error.response?.data || 'No response data') : undefined
      } : undefined
    });
  }
}; 