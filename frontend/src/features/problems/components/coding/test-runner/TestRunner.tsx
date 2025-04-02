import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Play, Send } from "lucide-react";
import { useTestRunner } from './useTestRunner';
import { TestCase as TestCaseType } from '../../../types/coding';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TestCaseTab } from './TestCaseTab';
import { ResultTab } from './ResultTab';

interface TestRunnerProps {
  code: string;
  testCases: TestCaseType[];
  problemId: string;
  onRunComplete?: () => void;
  language: string;
  isRunning?: boolean;
  setIsRunning?: React.Dispatch<React.SetStateAction<boolean>>;
}

/**
 * Component for running and displaying test results
 */
export function TestRunner({ 
  code, 
  testCases, 
  problemId, 
  onRunComplete,
  language,
  isRunning: externalIsRunning,
  setIsRunning: externalSetIsRunning
}: TestRunnerProps) {
  const [activeTab, setActiveTab] = useState("testcase");
  const [selectedTestCase, setSelectedTestCase] = useState<number | null>(0); // Default to first test case
  
  // Use local state if external state is not provided
  const [localIsRunning, setLocalIsRunning] = useState(false);
  const isRunning = externalIsRunning !== undefined ? externalIsRunning : localIsRunning;
  const setIsRunning = externalSetIsRunning || setLocalIsRunning;
  
  const {
    testResults,
    runTests,
    runQuickTests,
  } = useTestRunner();

  // Run tests without creating a submission record (quick)
  const handleRunTests = async () => {
    setIsRunning(true);
    try {
      await runQuickTests(code, problemId, language);
      onRunComplete?.();
      // Automatically switch to results tab after running tests
      if (testResults.length > 0) {
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
      await runTests(code, testCases, problemId, language);
      onRunComplete?.();
      // Automatically switch to results tab after running tests
      if (testResults.length > 0) {
        setActiveTab("result");
      }
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="flex flex-col h-full overflow-hidden border rounded-md">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col h-full">
        <div className="border-b px-4 py-2 bg-muted/20 flex-shrink-0">
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
            variant="outline"
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
              testCases={testCases}
              selectedTestCase={selectedTestCase}
              setSelectedTestCase={setSelectedTestCase}
            />
          ) : (
            <ResultTab
              testResults={testResults}
              selectedTestCase={selectedTestCase}
              setSelectedTestCase={setSelectedTestCase}
              testCases={testCases}
            />
          )}
        </div>
      </Tabs>
    </div>
  );
} 