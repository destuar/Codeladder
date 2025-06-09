import { useState, useCallback, useRef, useEffect } from 'react';
import { TestCase, TestResult } from '../../../types/coding';
import axios from 'axios';
import { api } from '../../../../../lib/api';
import { logger } from '@/lib/logger';

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

// Forward declaration for TestCaseType from ../../../types/coding
type TestCaseType = import('../../../types/coding').TestCase;

interface UseTestRunnerResult {
  testResults: TestResult[];
  allPassed: boolean;
  // Removed TestCase[] from runTests signature, backend will fetch official ones
  runTests: (code: string, problemId: string, language: string, userCustomTestCases?: TestCaseType[]) => Promise<{ allPassed: boolean }>;
  runQuickTests: (code: string, problemId: string, language: string, userCustomTestCases?: TestCaseType[]) => Promise<{ allPassed: boolean }>;
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
    logger.debug('[useTestRunner] getSecureHeaders - Token from localStorage:', token ? `Present (ends with ${token.slice(-6)})` : 'MISSING or EMPTY');
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
    if ((error as any).isAxiosError && (error as any).response && (error as any).response.status === 401) {
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
          logger.error('Token refresh failed', refreshError);
          setTestResults([{
            passed: false,
            input: [],
            expected: "Authentication Error",
            output: "Your session has expired. Please log in again.",
            runtime: 0,
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
  const runTests = useCallback(async (code: string, problemId: string, language: string, userCustomTestCases?: TestCaseType[]) => {
    const executeRequest = async (): Promise<{ allPassed: boolean }> => {
      setTestResults([]);
      setAllPassed(false);
      
      const headers = getSecureHeaders();
      logger.debug('[useTestRunner] runTests - Headers for /api/code/execute:', headers);

      try {
        const payload: { code: string; language: string; problemId: string; userCustomTestCases?: TestCaseType[] } = { 
          code, 
          language, 
          problemId 
        };
        if (userCustomTestCases && userCustomTestCases.length > 0) {
          payload.userCustomTestCases = userCustomTestCases;
        }

        const response = await axios.post<ExecuteCodeResponse>(
          '/api/code/execute', 
          payload,
          { headers }
        );

        const data = response.data;
        
        if (data && data.results && Array.isArray(data.results)) {
          setTestResults(data.results);
          setAllPassed(data.allPassed);
          
          // Debug logging to track test execution results
          logger.debug('[useTestRunner] Submission test results:', {
            allPassed: data.allPassed,
            resultsCount: data.results.length,
            passedTests: data.results.filter(r => r.passed).length,
            failedTests: data.results.filter(r => !r.passed).length
          });
          
          return { allPassed: data.allPassed };
        } else {
          throw new Error('Invalid response format from server');
        }
      } catch (error) {
        if ((error as any).isAxiosError && (error as any).response?.status === 401) {
          await handleAuthError(error as any, async () => { await executeRequest(); });
          return executeRequest(); // Return the result from the retry
        } else {
          logger.error('Error running tests', error);
          
          setTestResults([{
            passed: false,
            input: [],
            expected: "Error",
            output: "Failed to execute tests",
            runtime: 0,
            error: error instanceof Error ? error.message : 'Unknown error'
          }]);
          setAllPassed(false);
          return { allPassed: false };
        }
      }
    };

    // Start the execution process
    return await executeRequest();
  }, [getSecureHeaders, handleAuthError]);

  // Secure run-tests endpoint without creating a submission
  const runQuickTests = useCallback(async (code: string, problemId: string, language: string, userCustomTestCases?: TestCaseType[]) => {
    const quickTestRequest = async (): Promise<{ allPassed: boolean }> => {
      setTestResults([]);
      setAllPassed(false);
      
      const headers = getSecureHeaders();
      logger.debug('[useTestRunner] runQuickTests - Headers for /api/code/run-tests:', headers);
      
      try {
        const payload: { code: string; language: string; problemId: string; userCustomTestCases?: TestCaseType[] } = { 
          code, 
          language, 
          problemId 
        };
        if (userCustomTestCases && userCustomTestCases.length > 0) {
          payload.userCustomTestCases = userCustomTestCases;
        }

        const response = await axios.post<RunTestsResponse>(
          '/api/code/run-tests', 
          payload,
          { headers }
        );

        const data = response.data;
        
        if (data && data.results && Array.isArray(data.results)) {
          setTestResults(data.results);
          setAllPassed(data.allPassed);
          return { allPassed: data.allPassed };
        } else {
          throw new Error('Invalid response format from server');
        }
      } catch (error) {
        if ((error as any).isAxiosError && (error as any).response?.status === 401) {
          await handleAuthError(error as any, async () => { await quickTestRequest(); });
          return quickTestRequest(); // Return the result from the retry
        } else {
          logger.error('Error running quick tests', error);
          
          setTestResults([{
            passed: false,
            input: [],
            expected: "Error",
            output: "Failed to execute tests",
            runtime: 0,
            error: error instanceof Error ? error.message : 'Unknown error'
          }]);
          setAllPassed(false);
          return { allPassed: false };
        }
      }
    };

    // Start the quick test process
    return await quickTestRequest();
  }, [getSecureHeaders, handleAuthError]);

  // Secure custom test execution
  const runCustomTest = useCallback(async (
    code: string, 
    input: any[], 
    functionName: string, 
    language: string
  ): Promise<TestResult> => {
    const customTestRequest = async (): Promise<TestResult> => {
      const headers = getSecureHeaders();
      logger.debug('[useTestRunner] runCustomTest - Headers for /api/code/custom-test:', headers);

      try {
        const response = await axios.post<ExecuteCustomTestResponse>(
          '/api/code/custom-test', 
          { code, language, input, functionName },
          { headers }
        );
        
        const result = response.data;
        
        return {
          passed: result.passed || false,
          input: input,
          expected: result.expected || 'N/A',
          output: result.output || '',
          runtime: result.executionTime || 0,
          error: result.error,
          // Ensure all fields of TestResult are covered
          compilationOutput: result.compilationOutput,
          statusDescription: result.statusDescription,
          statusId: result.statusId,
          exitCode: result.exitCode,
          memory: result.memory,
        };
      } catch (error) {
        if ((error as any).isAxiosError && (error as any).response?.status === 401) {
          await handleAuthError(error as any, async () => { await customTestRequest(); });
          return customTestRequest(); // Ensure a TestResult is returned
        }
        
        logger.error('Error running custom test', error);
        return {
          passed: false,
          input: input,
          expected: 'N/A',
          output: '',
          runtime: 0,
          error: error instanceof Error ? error.message : 'Failed to run custom test due to an unknown error.',
          // Default values for other TestResult fields
          compilationOutput: undefined,
          statusDescription: 'Error',
          statusId: -1, // Or some error status ID
          exitCode: -1,
          memory: undefined,
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