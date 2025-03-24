import { useState } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Play, Send } from "lucide-react";
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
    runQuickTests,
  } = useTestRunner();

  // Run tests without creating a submission record (quick)
  const handleRunTests = async () => {
    await runQuickTests(code, problemId, language);
    onRunComplete?.();
  };

  // Submit solution (creates a submission record)
  const handleSubmitSolution = async () => {
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
              <div className="flex gap-2">
                <Button 
                  onClick={handleRunTests} 
                  disabled={isRunning}
                  className="gap-2"
                  size="sm"
                  variant="outline"
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

                <Button 
                  onClick={handleSubmitSolution} 
                  disabled={isRunning}
                  className="gap-2"
                  size="sm"
                >
                  {isRunning ? (
                    <>
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-background border-t-foreground" />
                      Submitting...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4" />
                      Submit Solution
                    </>
                  )}
                </Button>
              </div>
              
              <span className="text-sm text-muted-foreground flex items-center">
                {testResults.length ? 
                  `${testResults.filter(r => r.passed).length} of ${testResults.length} passing` :
                  `${testCases.length} test case${testCases.length !== 1 ? 's' : ''}`
                }
              </span>
            </div>
          </div>
          
          <div className="flex-1 overflow-hidden flex flex-col">
            <ScrollArea className="h-full">
              <div className="p-4 flex flex-col gap-2 pb-20">
                {testResults.length > 0 ? (
                  testResults.map((result, index) => (
                    <TestCase
                      key={index}
                      result={result}
                      expanded={selectedTestCase === index}
                      onToggle={() => setSelectedTestCase(prevState => 
                        prevState === index ? null : index
                      )}
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
            </ScrollArea>
          </div>
        </TabsContent>
        
        <TabsContent value="custom" className="flex-1 overflow-hidden">
          <CustomTestRunner 
            code={code} 
            functionName={functionName}
            language={language}
          />
        </TabsContent>
      </Tabs>
      
      <div className="p-2 border-t mt-auto bg-muted/20">
        <div className="flex justify-between items-center">
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