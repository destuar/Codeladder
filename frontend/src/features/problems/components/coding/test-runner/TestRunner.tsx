import { useState, useEffect, useRef } from "react";
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
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

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
  const [isAddingTestCase, setIsAddingTestCase] = useState(false);
  const [customInput, setCustomInput] = useState('');
  const [customExpected, setCustomExpected] = useState('');
  
  // Refs for scroll areas
  const resultsScrollAreaRef = useRef<HTMLDivElement>(null);
  const testcaseScrollAreaRef = useRef<HTMLDivElement>(null);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);
  
  // Use local state if external state is not provided
  const [localIsRunning, setLocalIsRunning] = useState(false);
  const isRunning = externalIsRunning !== undefined ? externalIsRunning : localIsRunning;
  const setIsRunning = externalSetIsRunning || setLocalIsRunning;
  
  const {
    testResults,
    runTests,
    runQuickTests,
  } = useTestRunner();

  // Set up resize observer for the scroll area
  useEffect(() => {
    // Force scroll area to update on resize
    const forceScrollAreaUpdate = () => {
      // Update testcase scroll area
      if (testcaseScrollAreaRef.current) {
        const scrollArea = testcaseScrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
        if (scrollArea) {
          const height = (scrollArea as HTMLElement).clientHeight;
          const width = (scrollArea as HTMLElement).clientWidth;
          void (scrollArea as HTMLElement).offsetHeight;
        }
      }
      
      // Update results scroll area
      if (resultsScrollAreaRef.current) {
        const scrollArea = resultsScrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
        if (scrollArea) {
          const height = (scrollArea as HTMLElement).clientHeight;
          const width = (scrollArea as HTMLElement).clientWidth;
          void (scrollArea as HTMLElement).offsetHeight;
        }
      }
    };
    
    // Set up observers for both scroll areas
    const elementsToObserve: HTMLDivElement[] = [];
    
    if (testcaseScrollAreaRef.current) {
      elementsToObserve.push(testcaseScrollAreaRef.current);
    }
    
    if (resultsScrollAreaRef.current) {
      elementsToObserve.push(resultsScrollAreaRef.current);
    }
    
    if (elementsToObserve.length > 0) {
      // Create a new ResizeObserver
      resizeObserverRef.current = new ResizeObserver(() => {
        forceScrollAreaUpdate();
      });
      
      // Observe all relevant scroll areas
      elementsToObserve.forEach(el => {
        resizeObserverRef.current?.observe(el);
      });
    }
    
    // Also handle window resize events
    const handleWindowResize = () => {
      // Delay to ensure the container has settled
      setTimeout(forceScrollAreaUpdate, 100);
    };
    
    window.addEventListener('resize', handleWindowResize);
    
    // Cleanup
    return () => {
      if (resizeObserverRef.current) {
        resizeObserverRef.current.disconnect();
      }
      window.removeEventListener('resize', handleWindowResize);
    };
  }, [activeTab]);

  // When tab changes, trigger a scroll area update with a slight delay
  useEffect(() => {
    const timer = setTimeout(() => {
      // Update relevant scroll area based on active tab
      if (activeTab === "result" && resultsScrollAreaRef.current) {
        const scrollArea = resultsScrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
        if (scrollArea) {
          void (scrollArea as HTMLElement).offsetHeight;
        }
      } else if (activeTab === "testcase" && testcaseScrollAreaRef.current) {
        const scrollArea = testcaseScrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
        if (scrollArea) {
          void (scrollArea as HTMLElement).offsetHeight;
        }
      }
    }, 100);
    
    return () => clearTimeout(timer);
  }, [activeTab]);

  // When test results come in, switch to the results tab
  useEffect(() => {
    if (testResults.length > 0) {
      setActiveTab("result");
      // Ensure selectedTestCase is valid for the testResults array
      if (selectedTestCase === null || selectedTestCase >= testResults.length) {
        setSelectedTestCase(0);
      }
    }
  }, [testResults.length]);

  // Run tests without creating a submission record (quick)
  const handleRunTests = async () => {
    setIsRunning(true);
    try {
      console.log('Running quick tests for problem:', problemId);
      const results = await runQuickTests(code, problemId, language);
      console.log('Quick tests completed with results:', results);
      onRunComplete?.();
    } finally {
      setIsRunning(false);
    }
  };

  // Submit solution (creates a submission record)
  const handleSubmitSolution = async () => {
    setIsRunning(true);
    try {
      console.log('Submitting solution for problem:', problemId);
      const results = await runTests(code, testCases, problemId, language);
      console.log('Submission completed with results:', results);
      onRunComplete?.();
    } finally {
      setIsRunning(false);
    }
  };

  // Extract function name from testCases
  const functionName = testCases[0]?.functionName || 'solution';
  
  // Handle adding custom test case
  const handleAddTestCase = () => {
    // This would typically call a backend API or update state
    console.log('Adding custom test case:', { input: customInput, expected: customExpected });
    // Reset form after submission
    setCustomInput('');
    setCustomExpected('');
    setIsAddingTestCase(false);
  };

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
          {/* Test case tabs - NEW DESIGN */}
          <div className="border-b flex items-center p-2 bg-background">
            <div className="flex gap-2 overflow-x-auto py-1 px-2">
              {testCases.map((_, index) => (
                <button
                  key={index}
                  className={cn(
                    "min-w-[80px] flex items-center justify-center rounded-md border px-3 py-1.5 text-sm font-medium transition-all duration-200",
                    selectedTestCase === index 
                      ? "bg-primary/10 text-primary border-primary/40 shadow-sm transform scale-105" 
                      : "bg-background text-foreground/80 border-border hover:bg-accent hover:text-accent-foreground"
                  )}
                  onClick={() => setSelectedTestCase(index)}
                >
                  Case {index + 1}
                </button>
              ))}
              <Dialog open={isAddingTestCase} onOpenChange={setIsAddingTestCase}>
                <DialogTrigger asChild>
                  <button 
                    className="min-w-[44px] flex items-center justify-center rounded-md border border-border bg-background text-foreground/80 hover:bg-accent hover:text-accent-foreground px-2 py-1.5 transition-colors"
                    aria-label="Add test case"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[425px]">
                  <DialogHeader>
                    <DialogTitle>Add Custom Test Case</DialogTitle>
                    <DialogDescription>
                      Create a new test case with custom input and expected output.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                      <Label htmlFor="custom-input">Input</Label>
                      <Textarea
                        id="custom-input"
                        value={customInput}
                        onChange={(e) => setCustomInput(e.target.value)}
                        placeholder="[1, 2, 3]"
                        className="font-mono"
                      />
                      <p className="text-xs text-muted-foreground">
                        Input should be valid JSON. For arrays, use [1, 2, 3] format.
                      </p>
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="custom-expected">Expected Output</Label>
                      <Textarea
                        id="custom-expected"
                        value={customExpected}
                        onChange={(e) => setCustomExpected(e.target.value)}
                        placeholder="6"
                        className="font-mono"
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <DialogClose asChild>
                      <Button variant="outline">Cancel</Button>
                    </DialogClose>
                    <Button type="submit" onClick={handleAddTestCase}>Add Test Case</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </div>
          
          {/* Test case content */}
          <ScrollArea className="flex-1 bg-background" ref={testcaseScrollAreaRef}>
            <div className="p-4">
              {selectedTestCase !== null && selectedTestCase < testCases.length && (
                <div className="space-y-6">
                  {/* Display test case input parameters */}
                  {testCases[selectedTestCase].input && Array.isArray(testCases[selectedTestCase].input) && (
                    <div>
                      <div className="flex items-center mb-2">
                        <div className="text-sm font-medium">
                          {/* Try to determine parameter name from functionName, or default to "input" */}
                          {(() => {
                            if (testCases[selectedTestCase].input.length === 1) {
                              return "nums";
                            } else if (testCases[selectedTestCase].input.length === 2) {
                              return "nums"; // First parameter
                            }
                            return "input";
                          })()}
                        </div>
                      </div>
                      <div className="bg-muted rounded-md border p-3">
                        <pre className="text-sm whitespace-pre-wrap break-all">
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
                    <div>
                      <div className="flex items-center mb-2">
                        <div className="text-sm font-medium">target</div>
                      </div>
                      <div className="bg-muted rounded-md border p-3">
                        <pre className="text-sm whitespace-pre-wrap break-all">{JSON.stringify(testCases[selectedTestCase].input[1], null, 2)}</pre>
                      </div>
                    </div>
                  )}
                  
                  {/* Expected output */}
                  {testCases[selectedTestCase]?.expected !== undefined && (
                    <div>
                      <div className="flex items-center mb-2">
                        <div className="text-sm font-medium">expected output</div>
                      </div>
                      <div className="bg-muted rounded-md border p-3">
                        <pre className="text-sm whitespace-pre-wrap break-all">{JSON.stringify(testCases[selectedTestCase].expected, null, 2)}</pre>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </ScrollArea>
        </TabsContent>
        
        <TabsContent value="result" className="flex-1 flex flex-col bg-background">
          {testResults.length > 0 ? (
            <div className="flex flex-col h-full overflow-hidden">
              {/* Results header with acceptance status */}
              <div className={cn(
                "border-b p-4 flex items-center justify-between flex-shrink-0",
                testResults.every(r => r.passed) ? "bg-green-950/10 dark:bg-green-500/10" : "bg-red-950/10 dark:bg-red-500/10"
              )}>
                <div className="flex items-center gap-3">
                  {testResults.every(r => r.passed) ? (
                    <>
                      <span className="text-xl font-semibold text-green-500">Accepted</span>
                      <span className="text-sm text-muted-foreground border-l border-border pl-3">
                        Runtime: {testResults[0]?.runtime || 0} ms
                      </span>
                    </>
                  ) : (
                    <>
                      <span className="text-xl font-semibold text-red-500">Failed</span>
                      <span className="text-sm text-muted-foreground border-l border-border pl-3">
                        {testResults.filter(r => r.passed).length} of {testResults.length} tests passed
                      </span>
                    </>
                  )}
                </div>
              </div>
              
              {/* Test case navigation */}
              <div className="border-b p-2 flex items-center gap-2 overflow-x-auto flex-shrink-0">
                {testResults.map((result, index) => (
                  <button
                    key={index}
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors",
                      selectedTestCase === index 
                        ? result.passed 
                          ? "text-green-600 bg-green-950/5 dark:bg-green-500/10" 
                          : "text-red-600 bg-red-950/5 dark:bg-red-500/10"
                        : result.passed ? "text-green-600" : "text-red-600",
                      "hover:bg-muted"
                    )}
                    onClick={() => setSelectedTestCase(index)}
                  >
                    <div className="w-2 h-2 rounded-full" style={{ 
                      backgroundColor: result.passed ? '#10b981' : '#ef4444' 
                    }} />
                    Case {index + 1}
                  </button>
                ))}
              </div>
              
              {/* Test case content - with scrolling */}
              <ScrollArea className="flex-1" ref={resultsScrollAreaRef}>
                <div className="p-4 space-y-6">
                  {/* Debug info */}
                  {process.env.NODE_ENV !== 'production' && selectedTestCase !== null && selectedTestCase < testResults.length && (
                    <div className="border border-dashed border-yellow-500 bg-yellow-50 dark:bg-yellow-950/20 p-4 mb-4 text-xs rounded">
                      <p>Debug: Selected test case: {selectedTestCase}</p>
                      <p>Debug: Total test results: {testResults.length}</p>
                      <p>Debug: Current test case passed: {testResults[selectedTestCase]?.passed?.toString()}</p>
                      <p>Debug: Current test case data: {JSON.stringify({
                        input: testResults[selectedTestCase]?.input,
                        expected: testResults[selectedTestCase]?.expected,
                        output: testResults[selectedTestCase]?.output,
                      })}</p>
                    </div>
                  )}
                  
                  {/* No selection message */}
                  {(selectedTestCase === null || selectedTestCase >= testResults.length || !testResults[selectedTestCase]) && (
                    <div className="flex flex-col items-center justify-center h-40 text-muted-foreground">
                      <p>Select a test case to view details</p>
                    </div>
                  )}
                  
                  {/* Test case content - only render if valid selected test case */}
                  {selectedTestCase !== null && selectedTestCase < testResults.length && testResults[selectedTestCase] && (
                    <>
                      {/* Input section */}
                      <div>
                        <h3 className="text-sm font-medium mb-3">Input</h3>
                        
                        {/* First parameter */}
                        {testResults[selectedTestCase].input && Array.isArray(testResults[selectedTestCase].input) && testResults[selectedTestCase].input.length >= 1 && (
                          <div className="space-y-1 mb-3">
                            <div className="text-xs text-muted-foreground font-mono">nums =</div>
                            <div className="bg-muted/80 border rounded-md p-3">
                              <pre className="text-sm whitespace-pre-wrap break-all">
                                {JSON.stringify(testResults[selectedTestCase].input[0], null, 2)}
                              </pre>
                            </div>
                          </div>
                        )}
                        
                        {/* Second parameter if exists */}
                        {testResults[selectedTestCase].input && Array.isArray(testResults[selectedTestCase].input) && testResults[selectedTestCase].input.length >= 2 && (
                          <div className="space-y-1">
                            <div className="text-xs text-muted-foreground font-mono">target =</div>
                            <div className="bg-muted/80 border rounded-md p-3">
                              <pre className="text-sm whitespace-pre-wrap break-all">
                                {JSON.stringify(testResults[selectedTestCase].input[1], null, 2)}
                              </pre>
                            </div>
                          </div>
                        )}
                      </div>
                      
                      {/* Output section */}
                      <div>
                        <h3 className="text-sm font-medium mb-3">Output</h3>
                        <div className="bg-muted/80 border rounded-md p-3">
                          <pre className="text-sm whitespace-pre-wrap break-all">
                            {JSON.stringify(testResults[selectedTestCase].output, null, 2)}
                          </pre>
                        </div>
                      </div>
                      
                      {/* Expected section */}
                      <div>
                        <h3 className="text-sm font-medium mb-3">Expected</h3>
                        <div className="bg-muted/80 border rounded-md p-3">
                          <pre className="text-sm whitespace-pre-wrap break-all">
                            {JSON.stringify(testResults[selectedTestCase].expected, null, 2)}
                          </pre>
                        </div>
                      </div>
                      
                      {/* Error display if any */}
                      {testResults[selectedTestCase].error && (
                        <div>
                          <h3 className="text-sm font-medium text-red-600 mb-3">Error</h3>
                          <div className="bg-red-500/10 border border-red-200 rounded-md p-3">
                            <pre className="text-sm text-red-700 whitespace-pre-wrap break-all">
                              {testResults[selectedTestCase].error}
                            </pre>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </ScrollArea>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <p>Run your code to see results</p>
                <p className="text-sm">
                  {testCases.length} test case{testCases.length !== 1 ? 's' : ''} available
                </p>
              </div>
            </div>
          )}
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