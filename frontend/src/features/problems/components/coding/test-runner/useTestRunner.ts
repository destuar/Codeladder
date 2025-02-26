import { useState, useCallback } from 'react';
import { TestCase, TestResult } from '../../../types/coding';

interface UseTestRunnerResult {
  isRunning: boolean;
  testResults: TestResult[];
  consoleOutput: string[];
  runTests: (code: string, testCases: TestCase[]) => Promise<void>;
  clearConsole: () => void;
}

/**
 * Custom hook for managing test execution and results
 */
export function useTestRunner(): UseTestRunnerResult {
  const [isRunning, setIsRunning] = useState(false);
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [consoleOutput, setConsoleOutput] = useState<string[]>([]);

  const runTests = useCallback(async (code: string, testCases: TestCase[]) => {
    setIsRunning(true);
    setTestResults([]);
    setConsoleOutput([]);

    try {
      // TODO: Replace with actual test execution logic
      // This is a mock implementation
      await new Promise(resolve => setTimeout(resolve, 1000));

      const results = testCases.map((testCase, index) => {
        const passed = index === 0; // Mock result
        const runtime = Math.floor(Math.random() * 100) + 1;
        const memory = Math.floor(Math.random() * 40) + 10;

        return {
          passed,
          input: testCase.input,
          expected: testCase.expected,
          output: passed ? testCase.expected : "different result",
          runtime,
          memory
        };
      });

      // If no test cases, show a message
      if (results.length === 0) {
        results.push({
          passed: false,
          input: [],
          expected: "N/A",
          output: "N/A",
          runtime: 0,
          memory: 0
        });
      }

      setTestResults(results);
      setConsoleOutput(['Test execution completed']);
    } catch (error) {
      console.error('Error running tests:', error);
      setConsoleOutput([`Error: ${error instanceof Error ? error.message : 'Unknown error'}`]);
    } finally {
      setIsRunning(false);
    }
  }, []);

  const clearConsole = useCallback(() => {
    setConsoleOutput([]);
  }, []);

  return {
    isRunning,
    testResults,
    consoleOutput,
    runTests,
    clearConsole,
  };
} 