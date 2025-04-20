import { useState, useCallback, useRef, useEffect } from 'react';
import { TestCase, TestResult } from '../../../types/coding';
import axios from 'axios';
import { api } from '../../../../../lib/api';

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
  allPassed: boolean;
  runTests: (code: string, testCases: TestCase[], problemId: string, language: string) => Promise<void>;
  runQuickTests: (code: string, problemId: string, language: string) => Promise<void>;
  runCustomTest: (code: string, input: any[], functionName: string, language: string) => Promise<TestResult>;
}

/**
 * Custom hook for managing test execution and results
 * with enhanced token management and authentication
 */
export function useTestRunner(): UseTestRunnerResult {
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [allPassed, setAllPassed] = useState<boolean>(false);
  // Store pending requests for retry after token refresh
  const pendingRequests = useRef<Array<() => Promise<void>>>([]);
  // Track if a token refresh is in progress
  const isRefreshing = useRef(false);

  /**
   * Create secure headers with current authentication token
   * @returns Headers object with Content-Type and Authorization
   */
  const getSecureHeaders = useCallback(() => {
    const token = localStorage.getItem('token');
    return {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    };
  }, []);

  /**
   * Handle authentication errors with token refresh
   * @param error The error that occurred
   * @param retryFn Function to retry after token refresh
   */
  const handleAuthError = useCallback(async (error: any, retryFn: () => Promise<void>) => {
    // Only proceed if this is an authentication error
    if (error.response && error.response.status === 401) {
      // Add current request to pending queue
      pendingRequests.current.push(retryFn);
      
      // Only try refreshing once at a time
      if (!isRefreshing.current) {
        isRefreshing.current = true;
        try {
          // Try to refresh the token
          await api.post('/auth/refresh', {});
          
          // Execute all pending requests with new token
          const requests = [...pendingRequests.current];
          pendingRequests.current = [];
          
          for (const request of requests) {
            await request();
          }
        } catch (refreshError) {
          console.error('Token refresh failed:', refreshError);
          setTestResults([{
            passed: false,
            input: [],
            expected: "Authentication Error",
            output: "Your session has expired. Please log in again.",
            runtime: 0,
            memory: 0,
            error: "Session expired"
          }]);
          
          // Clear pending requests
          pendingRequests.current = [];
        } finally {
          isRefreshing.current = false;
        }
      }
    } else {
      // Re-throw non-auth errors
      throw error;
    }
  }, []);

  // Secure execute endpoint that creates a submission
  const runTests = useCallback(async (code: string, testCases: TestCase[], problemId: string, language: string) => {
    const executeRequest = async () => {
      setTestResults([]);
      setAllPassed(false);
      
      try {
        // Call the backend API with secure headers
        const response = await axios.post<ExecuteCodeResponse>(
          '/api/code/execute', 
          { code, language, problemId },
          { headers: getSecureHeaders() }
        );

        const data = response.data;
        
        // Process the results
        if (data && data.results && Array.isArray(data.results)) {
          setTestResults(data.results);
          setAllPassed(data.allPassed);
        } else {
          throw new Error('Invalid response format from server');
        }
      } catch (error) {
        if (axios.isAxiosError(error) && error.response?.status === 401) {
          // Handle auth error and retry
          await handleAuthError(error, () => executeRequest());
        } else {
          console.error('Error running tests:', error);
          
          // Provide error results for non-auth errors
          setTestResults([{
            passed: false,
            input: [],
            expected: "Error",
            output: "Failed to execute tests",
            runtime: 0,
            error: error instanceof Error ? error.message : 'Unknown error'
          }]);
          setAllPassed(false);
        }
      }
    };

    // Start the execution process
    await executeRequest();
  }, [getSecureHeaders, handleAuthError]);

  // Secure run-tests endpoint without creating a submission
  const runQuickTests = useCallback(async (code: string, problemId: string, language: string) => {
    const quickTestRequest = async () => {
      setTestResults([]);
      setAllPassed(false);
      
      try {
        // Call the backend API with secure headers
        const response = await axios.post<RunTestsResponse>(
          '/api/code/run-tests', 
          { code, language, problemId },
          { headers: getSecureHeaders() }
        );

        const data = response.data;
        
        // Process the results
        if (data && data.results && Array.isArray(data.results)) {
          setTestResults(data.results);
          setAllPassed(data.allPassed);
        } else {
          throw new Error('Invalid response format from server');
        }
      } catch (error) {
        if (axios.isAxiosError(error) && error.response?.status === 401) {
          // Handle auth error and retry
          await handleAuthError(error, () => quickTestRequest());
        } else {
          console.error('Error running quick tests:', error);
          
          // Provide error results for non-auth errors
          setTestResults([{
            passed: false,
            input: [],
            expected: "Error",
            output: "Failed to execute tests",
            runtime: 0,
            error: error instanceof Error ? error.message : 'Unknown error'
          }]);
          setAllPassed(false);
        }
      }
    };

    // Start the quick test process
    await quickTestRequest();
  }, [getSecureHeaders, handleAuthError]);

  // Secure custom test execution
  const runCustomTest = useCallback(async (
    code: string, 
    input: any[], 
    functionName: string, 
    language: string
  ): Promise<TestResult> => {
    const customTestRequest = async (): Promise<TestResult> => {
      try {
        // Call the backend API with secure headers
        const response = await axios.post<ExecuteCustomTestResponse>(
          '/api/code/custom-test', 
          { code, language, input, functionName },
          { headers: getSecureHeaders() }
        );
        
        // Process and return the result
        const result = response.data;
        
        // Ensure result has the right shape
        return {
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
      } catch (error) {
        if (axios.isAxiosError(error) && error.response?.status === 401) {
          // Handle auth error and retry
          return handleAuthError(error, () => customTestRequest())
            .then(() => customTestRequest());
        }
        
        console.error('Error running custom test:', error);
        
        // Return error result for non-auth errors
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
    };

    // Start the custom test process
    return customTestRequest();
  }, [getSecureHeaders, handleAuthError]);

  return {
    testResults,
    allPassed,
    runTests,
    runQuickTests,
    runCustomTest,
  };
} 