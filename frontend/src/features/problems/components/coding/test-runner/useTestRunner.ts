import { useState, useCallback } from 'react';
import { TestCase, TestResult } from '../../../types/coding';
import axios from 'axios';

interface ExecuteCodeResponse {
  results: TestResult[];
  allPassed: boolean;
  submissionId: string;
}

interface ExecuteCustomTestResponse {
  passed?: boolean;
  output?: string;
  input?: any[];
  expected?: any;
  executionTime?: number;
  memory?: number;
  error?: string;
  compilationOutput?: string;
  statusDescription?: string;
  statusId?: number;
  exitCode?: number;
}

// For the quick run tests endpoint
interface RunTestsResponse {
  results: TestResult[];
  allPassed: boolean;
  isQuickRun: boolean;
}

interface UseTestRunnerResult {
  testResults: TestResult[];
  runTests: (code: string, testCases: TestCase[], problemId: string, language: string) => Promise<void>;
  runQuickTests: (code: string, problemId: string, language: string) => Promise<void>;
  runCustomTest: (code: string, input: any[], functionName: string, language: string) => Promise<TestResult>;
}

/**
 * Custom hook for managing test execution and results
 * isRunning state is managed by the parent component
 */
export function useTestRunner(): UseTestRunnerResult {
  const [testResults, setTestResults] = useState<TestResult[]>([]);

  // This calls the execute endpoint which creates a submission
  const runTests = useCallback(async (code: string, testCases: TestCase[], problemId: string, language: string) => {
    setTestResults([]);

    try {
      // Get the auth token from localStorage
      const token = localStorage.getItem('token');
      
      // Call the backend API to execute the code
      const response = await axios.post<ExecuteCodeResponse>('/api/code/execute', 
        {
          code,
          language,
          problemId
        },
        {
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {})
          }
        }
      );

      const data = response.data;
      
      // Process the results
      if (data && data.results && Array.isArray(data.results)) {
        setTestResults(data.results);
      } else {
        throw new Error('Invalid response format from server');
      }
    } catch (error) {
      console.error('Error running tests:', error);
      
      // Provide empty results to avoid UI issues
      setTestResults([{
        passed: false,
        input: [],
        expected: "Error",
        output: "Failed to execute tests",
        runtime: 0,
        memory: 0,
        error: error instanceof Error ? error.message : 'Unknown error'
      }]);
    }
  }, []);

  // This calls the new run-tests endpoint which doesn't create a submission
  const runQuickTests = useCallback(async (code: string, problemId: string, language: string) => {
    setTestResults([]);

    try {
      // Get the auth token from localStorage
      const token = localStorage.getItem('token');
      
      // Call the backend API to run tests without creating a submission
      const response = await axios.post<RunTestsResponse>('/api/code/run-tests', 
        {
          code,
          language,
          problemId
        },
        {
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {})
          }
        }
      );

      const data = response.data;
      
      // Process the results
      if (data && data.results && Array.isArray(data.results)) {
        setTestResults(data.results);
      } else {
        throw new Error('Invalid response format from server');
      }
    } catch (error) {
      console.error('Error running quick tests:', error);
      
      // Provide empty results to avoid UI issues
      setTestResults([{
        passed: false,
        input: [],
        expected: "Error",
        output: "Failed to execute tests",
        runtime: 0,
        memory: 0,
        error: error instanceof Error ? error.message : 'Unknown error'
      }]);
    }
  }, []);

  const runCustomTest = useCallback(async (
    code: string, 
    input: any[], 
    functionName: string, 
    language: string
  ): Promise<TestResult> => {
    try {
      // Get the auth token from localStorage
      const token = localStorage.getItem('token');
      
      // Call the backend API to execute the custom test
      const response = await axios.post<ExecuteCustomTestResponse>('/api/code/custom-test', 
        {
          code,
          language,
          input,
          functionName
        },
        {
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {})
          }
        }
      );
      
      // Process and return the result
      const result = response.data;
      
      // Ensure result has the right shape
      const formattedResult: TestResult = {
        passed: result.passed || false,
        input: input,
        expected: result.expected || 'N/A',
        output: result.output || '',
        runtime: result.executionTime || 0,
        memory: result.memory || 0,
        error: result.error,
        compilationOutput: result.compilationOutput,
        statusDescription: result.statusDescription,
        statusId: result.statusId,
        exitCode: result.exitCode
      };
      
      return formattedResult;
    } catch (error) {
      console.error('Error running custom test:', error);
      
      // Return error result
      return {
        passed: false,
        input: input,
        expected: "N/A",
        output: "Error",
        runtime: 0,
        memory: 0,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }, []);

  return {
    testResults,
    runTests,
    runQuickTests,
    runCustomTest,
  };
} 