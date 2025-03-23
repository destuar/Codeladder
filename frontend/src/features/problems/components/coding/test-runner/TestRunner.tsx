import { useState } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Play } from "lucide-react";
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
import { SUPPORTED_LANGUAGES } from "../../../types/coding";

interface TestRunnerProps {
  code: string;
  testCases: TestCaseType[];
  problemId: string;
  onRunComplete?: () => void;
  language: string;
  onLanguageChange: (language: string) => void;
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
  onLanguageChange
}: TestRunnerProps) {
  const [activeTab, setActiveTab] = useState("tests");
  const [selectedTestCase, setSelectedTestCase] = useState<number | null>(null);
  
  const {
    isRunning,
    testResults,
    runTests,
  } = useTestRunner();

  const handleRunTests = async () => {
    await runTests(code, testCases, problemId, language);
    onRunComplete?.();
  };

  // Extract function name from testCases
  const functionName = testCases[0]?.functionName || 'solution';

  return (
    <div className="flex flex-col h-full">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col h-full">
        <div className="border-b px-4 py-2 bg-muted/20 flex-shrink-0">
          <TabsList className="bg-muted grid grid-cols-2 w-60">
            <TabsTrigger value="tests">Test Cases</TabsTrigger>
            <TabsTrigger value="custom">Custom Input</TabsTrigger>
          </TabsList>
        </div>
        
        <TabsContent value="tests" className="flex-1 flex flex-col overflow-hidden">
          <div className="p-3 border-b bg-muted/10 flex-shrink-0">
            <div className="flex justify-between gap-4">
              <Button 
                onClick={handleRunTests} 
                disabled={isRunning}
                className="gap-2"
                size="sm"
              >
                {isRunning ? (
                  <>
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-background border-t-foreground" />
                    Running...
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4" />
                    Run Tests
                  </>
                )}
              </Button>
              
              <span className="text-sm text-muted-foreground flex items-center">
                {testResults.length ? 
                  `${testResults.filter(r => r.passed).length} of ${testResults.length} passing` :
                  `${testCases.length} test case${testCases.length !== 1 ? 's' : ''}`
                }
              </span>
            </div>
          </div>
          
          <div className="flex-1 overflow-hidden">
            <ScrollArea className="h-full" type="always">
              <div className="p-4 space-y-4">
                {testResults.length === 0 ? (
                  // No test results yet
                  testCases.map((testCase, index) => (
                    <div key={index} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-medium">Test Case {index + 1}</h3>
                      </div>
                      <div className="mt-2 text-sm text-muted-foreground">
                        Run tests to see results
                      </div>
                    </div>
                  ))
                ) : (
                  // Show test results
                  testResults.map((result, index) => (
                    <TestCase
                      key={index}
                      result={result}
                      index={index}
                      onSelect={() => setSelectedTestCase(selectedTestCase === index ? null : index)}
                      isSelected={selectedTestCase === index}
                    />
                  ))
                )}
                
                {testCases.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    No test cases available for this problem
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>
        </TabsContent>
        
        <TabsContent value="custom" className="m-0 h-full border-0 data-[state=active]:flex data-[state=active]:flex-col">
          <CustomTestRunner 
            code={code} 
            functionName={functionName}
            language={language}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
} 