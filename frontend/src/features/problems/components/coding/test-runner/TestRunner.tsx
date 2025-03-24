import { useState } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Play, Send, Plus } from "lucide-react";
import { TestCase } from './TestCase';
import { useTestRunner } from './useTestRunner';
import { TestCase as TestCaseType } from '../../../types/coding';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CustomTestRunner } from './CustomTestRunner';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Define supported languages with their display names
const SUPPORTED_LANGUAGES: Record<string, string> = {
  'javascript': 'JavaScript',
  'python': 'Python',
  'java': 'Java',
  'cpp': 'C++',
  'typescript': 'TypeScript'
};

interface TestRunnerProps {
  code: string;
  testCases: TestCaseType[];
  problemId: string;
  onRunComplete?: () => void;
  language: string;
  onLanguageChange: (language: string) => void;
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
  onLanguageChange,
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
    } finally {
      setIsRunning(false);
    }
  };

  // Extract function name from testCases
  const functionName = testCases[0]?.functionName || 'solution';

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col flex-1 overflow-hidden">
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
        
        <TabsContent value="testcase" className="flex-1 flex flex-col bg-background">
          {/* Test case tabs */}
          <div className="border-b flex items-center py-0 bg-[#252525]">
            <div className="flex overflow-x-auto">
              {testCases.map((_, index) => (
                <button
                  key={index}
                  className={`px-4 py-2 text-sm font-medium ${
                    selectedTestCase === index 
                      ? 'bg-background text-foreground border-b-2 border-b-primary' 
                      : 'bg-[#252525] text-gray-400 border-r border-[#333]'
                  }`}
                  onClick={() => setSelectedTestCase(index)}
                >
                  Case {index + 1}
                </button>
              ))}
              <button className="px-3 py-2 text-sm text-gray-400 bg-[#252525] border-r border-[#333]">
                <Plus className="h-4 w-4" />
              </button>
            </div>
          </div>
          
          {/* Test case content */}
          <div className="flex-1 overflow-y-auto bg-background">
            <div className="p-4">
              {selectedTestCase !== null && selectedTestCase < testCases.length && (
                <div className="space-y-4">
                  {/* Display test case input parameters */}
                  {testCases[selectedTestCase].input && Array.isArray(testCases[selectedTestCase].input) && (
                    <div className="space-y-1">
                      <div className="text-sm text-muted-foreground">
                        {/* Try to determine parameter name from functionName, or default to "input" */}
                        {(() => {
                          if (testCases[selectedTestCase].input.length === 1) {
                            return "nums =";
                          } else if (testCases[selectedTestCase].input.length === 2) {
                            return "nums ="; // First parameter
                          }
                          return "input =";
                        })()}
                      </div>
                      <div className="bg-muted/40 rounded-md p-3">
                        <pre className="text-sm">
                          {(() => {
                            // For demo purposes, assume first array element is nums
                            if (testCases[selectedTestCase].input.length >= 1) {
                              return JSON.stringify(testCases[selectedTestCase].input[0], null, 2);
                            }
                            return JSON.stringify(testCases[selectedTestCase].input, null, 2);
                          })()}
                        </pre>
                      </div>
                    </div>
                  )}
                  
                  {/* Second parameter (if exists) */}
                  {testCases[selectedTestCase].input && Array.isArray(testCases[selectedTestCase].input) && testCases[selectedTestCase].input.length >= 2 && (
                    <div className="space-y-1">
                      <div className="text-sm text-muted-foreground">target =</div>
                      <div className="bg-muted/40 rounded-md p-3">
                        <pre className="text-sm">{JSON.stringify(testCases[selectedTestCase].input[1], null, 2)}</pre>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </TabsContent>
        
        <TabsContent value="result" className="flex-1 flex flex-col bg-background">
          <div className="p-3 border-b bg-background flex-shrink-0">
            <div className="flex items-center">
              <h3 className="text-sm font-medium">Test Results</h3>
              <span className="text-sm text-muted-foreground ml-auto">
                {testResults.length ? 
                  `${testResults.filter(r => r.passed).length} of ${testResults.length} passing` :
                  `${testCases.length} test case${testCases.length !== 1 ? 's' : ''}`
                }
              </span>
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto bg-background">
            <div className="p-4 flex flex-col gap-2">
              {testResults.length > 0 ? (
                testResults.map((result, index) => (
                  <TestCase
                    key={index}
                    result={result}
                    expanded={index === 0} // Expand first by default
                    onToggle={() => {}}
                    index={index}
                  />
                ))
              ) : (
                testCases.map((_, index) => (
                  <div 
                    key={index} 
                    className="border rounded p-3 flex justify-between items-center text-sm"
                  >
                    <div>
                      <span className="font-medium">Test {index + 1}</span>
                    </div>
                    <div className="text-muted-foreground">Not run yet</div>
                  </div>
                ))
              )}
            </div>
          </div>
        </TabsContent>
      </Tabs>
      
      <div className="border-t bg-muted/20 flex-shrink-0">
        <div className="flex justify-between items-center px-4 py-2">
          <span className="text-sm text-muted-foreground">Language:</span>
          <Select value={language} onValueChange={onLanguageChange}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Select Language" />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(SUPPORTED_LANGUAGES).map(([value, label]) => (
                <SelectItem key={value} value={value}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
} 