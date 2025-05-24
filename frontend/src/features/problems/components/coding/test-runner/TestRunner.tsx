import { useState, useCallback, useMemo, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Play, Send } from "lucide-react";
import { useTestRunner } from './useTestRunner';
import { TestCase as TestCaseType } from '../../../types/coding';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TestCaseTab } from './TestCaseTab';
import { ResultTab } from './ResultTab';

const getLocalStorageKeyForCustomTests = (problemId: string) => `problem-${problemId}-customTestCases`;

interface TestRunnerProps {
  code: string;
  officialTestCases: TestCaseType[];
  problemId: string;
  onRunComplete?: () => void;
  onAllTestsPassed?: () => void;
  language: string;
  isRunning?: boolean;
  setIsRunning?: React.Dispatch<React.SetStateAction<boolean>>;
  functionParams?: { name: string; type: string }[];
}

/**
 * Component for running and displaying test results
 */
export function TestRunner({ 
  code, 
  officialTestCases,
  problemId, 
  onRunComplete,
  onAllTestsPassed,
  language,
  isRunning: externalIsRunning,
  setIsRunning: externalSetIsRunning,
  functionParams
}: TestRunnerProps) {
  const [activeTab, setActiveTab] = useState("testcase");
  const [selectedTestCase, setSelectedTestCase] = useState<number | null>(0);
  
  // Initialize userCustomTestCases from LocalStorage if available, else empty array
  const [userCustomTestCases, setUserCustomTestCases] = useState<TestCaseType[]>(() => {
    if (problemId) {
      const storedCustomTests = localStorage.getItem(getLocalStorageKeyForCustomTests(problemId));
      try {
        return storedCustomTests ? JSON.parse(storedCustomTests) : [];
      } catch (e) {
        console.error("Failed to parse stored custom test cases:", e);
        return [];
      }
    }
    return [];
  });
  
  // Effect to save userCustomTestCases to LocalStorage whenever it or problemId changes
  useEffect(() => {
    if (problemId) {
      localStorage.setItem(getLocalStorageKeyForCustomTests(problemId), JSON.stringify(userCustomTestCases));
    }
    // If problemId is not yet available (e.g., parent component still loading),
    // don't save. Custom tests will be in state and saved once problemId is valid.
  }, [userCustomTestCases, problemId]);

  // Combine official and custom test cases for display in TestCaseTab
  const displayedTestCases = useMemo(() => {
    return [...officialTestCases, ...userCustomTestCases];
  }, [officialTestCases, userCustomTestCases]);

  // Use local state if external state is not provided
  const [localIsRunning, setLocalIsRunning] = useState(false);
  const isRunning = externalIsRunning !== undefined ? externalIsRunning : localIsRunning;
  const setIsRunning = externalSetIsRunning || setLocalIsRunning;
  
  const {
    testResults,
    allPassed,
    runTests,
    runQuickTests,
  } = useTestRunner();

  // Handle adding a custom test case (updates userCustomTestCases state)
  const handleAddTestCase = useCallback((newTestCase: TestCaseType) => {
    setUserCustomTestCases(prev => {
      const newCustomCases = [...prev, newTestCase];
      // Select the newly added test case (index within the displayedTestCases array)
      setSelectedTestCase(officialTestCases.length + newCustomCases.length - 1);
      return newCustomCases;
    });
  }, [officialTestCases.length]); // Dependency on officialTestCases.length for correct indexing

  const handleDeleteTestCase = useCallback((indexInDisplayedTestCases: number) => {
    const numOfficial = officialTestCases.length;
    if (indexInDisplayedTestCases < numOfficial) {
      // Should not happen if delete is only shown for custom tests
      console.warn("Attempted to delete an official test case.");
      return;
    }

    const customIndexToDelete = indexInDisplayedTestCases - numOfficial;

    setUserCustomTestCases(prevCustomCases => 
      prevCustomCases.filter((_, i) => i !== customIndexToDelete)
    );

    // Adjust selectedTestCase if necessary
    setSelectedTestCase(prevSelected => {
      if (prevSelected === null) return null;
      if (indexInDisplayedTestCases === prevSelected) {
        // If the deleted case was selected, select the previous one, or 0 if it was the first custom.
        // Or null if no tests remain.
        const newCustomLength = userCustomTestCases.length - 1;
        if (newCustomLength <= 0 && officialTestCases.length === 0) return null;
        return Math.max(0, indexInDisplayedTestCases - 1);
      } else if (indexInDisplayedTestCases < prevSelected) {
        return prevSelected - 1; // Shift selection back if a preceding case was deleted
      }
      return prevSelected; // No change if deleted case was after the selected one
    });

  }, [officialTestCases.length, userCustomTestCases.length]); // userCustomTestCases.length for selectedTestCase adjustment logic

  // Run tests without creating a submission record (quick)
  const handleRunTests = async () => {
    setIsRunning(true);
    try {
      // Pass only userCustomTestCases to the hook
      await runQuickTests(code, problemId, language, userCustomTestCases);
      onRunComplete?.();
      if (testResults.length > 0 || userCustomTestCases.length > 0) { // Check if any results or custom tests to show
        setActiveTab("result");
      }
    } finally {
      setIsRunning(false);
    }
  };

  // Submit solution (creates a submission record)
  const handleSubmitSolution = async () => {
    setIsRunning(true);
    try {
      // Pass only userCustomTestCases to the hook
      await runTests(code, problemId, language, userCustomTestCases);
      onRunComplete?.();
      if (allPassed && onAllTestsPassed) {
        onAllTestsPassed();
      }
      if (testResults.length > 0 || userCustomTestCases.length > 0) { // Check if any results or custom tests to show
        setActiveTab("result");
      }
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="flex flex-col h-full overflow-hidden rounded-md dark:border-transparent border border-border">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col h-full">
        <div className="px-4 py-2 bg-muted/20 flex-shrink-0 dark:border-transparent border-b border-border">
          <TabsList className="bg-muted grid grid-cols-2 w-60">
            <TabsTrigger value="testcase">Testcase</TabsTrigger>
            <TabsTrigger value="result">Result</TabsTrigger>
          </TabsList>
        </div>
        
        {/* Hidden buttons for click events */}
        <div className="hidden">
          <Button 
            onClick={handleRunTests} 
            disabled={isRunning}
            className="gap-2"
            size="sm"
            variant="ghost"
            data-testrunner-run-button
          >
            Run Tests
          </Button>

          <Button 
            onClick={handleSubmitSolution} 
            disabled={isRunning}
            className="gap-2"
            size="sm"
            data-testrunner-submit-button
          >
            Submit Solution
          </Button>
        </div>

        {/* Both tabs share identical structure and CSS classes */}
        <div className="flex-1 flex flex-col overflow-hidden" style={{ minHeight: 0 }}>
          {activeTab === "testcase" ? (
            <TestCaseTab 
              testCases={displayedTestCases}
              selectedTestCase={selectedTestCase}
              setSelectedTestCase={setSelectedTestCase}
              functionParams={functionParams}
              onAddTestCase={handleAddTestCase}
              onDeleteTestCase={handleDeleteTestCase}
              numOfficialTestCases={officialTestCases.length}
            />
          ) : (
            <ResultTab
              testResults={testResults}
              selectedTestCase={selectedTestCase}
              setSelectedTestCase={setSelectedTestCase}
              testCases={displayedTestCases}
              functionParams={functionParams}
            />
          )}
        </div>
      </Tabs>
    </div>
  );
} 