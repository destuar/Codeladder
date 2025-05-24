import { ScrollArea } from "@/components/ui/scroll-area";
import { Plus, X } from "lucide-react";
import { TestCase as TestCaseType } from '../../../types/coding';
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
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useState, useEffect, useMemo } from "react";

interface TestCaseTabProps {
  testCases: TestCaseType[];
  selectedTestCase: number | null;
  setSelectedTestCase: (index: number) => void;
  functionParams?: { name: string; type: string }[];
  onAddTestCase?: (testCase: TestCaseType) => void;
  onDeleteTestCase?: (index: number) => void;
  numOfficialTestCases?: number;
}

/**
 * Safely parses a JSON string
 * @param value The string to parse
 * @returns The parsed value or original if parsing fails
 */
const tryParseJson = (value: any): any => {
  if (!value || typeof value !== 'string') return value;
  
  try {
    return JSON.parse(value);
  } catch (e) {
    return value;
  }
};

export function TestCaseTab({ 
  testCases, 
  selectedTestCase,
  setSelectedTestCase,
  functionParams = [],
  onAddTestCase,
  onDeleteTestCase,
  numOfficialTestCases = 0
}: TestCaseTabProps) {
  const [isAddingTestCase, setIsAddingTestCase] = useState(false);
  const [customInput, setCustomInput] = useState('');
  const [customExpected, setCustomExpected] = useState('');

  // Process the current test case to ensure it has the right structure
  const currentTestCase = useMemo(() => {
    if (selectedTestCase === null || !testCases[selectedTestCase]) {
      return null;
    }

    const testCase = testCases[selectedTestCase];
    
    // Create a normalized version of the test case with proper array inputs
    return {
      ...testCase,
      input: (() => {
        if (testCase.input === undefined) {
          return [];
        }
        if (Array.isArray(testCase.input)) {
          return testCase.input;
        }
        if (typeof testCase.input === 'string') {
          if (testCase.input === '') {
            return [];
          }
          const parsedInput = tryParseJson(testCase.input);
          return Array.isArray(parsedInput) ? parsedInput : [parsedInput];
        }
        // Fallback for any other type, though type defs suggest this shouldn't be hit often.
        return [testCase.input];
      })()
    };
  }, [testCases, selectedTestCase]);

  // Handle adding custom test case
  const handleAddTestCase = () => {
    if (!customInput.trim()) {
      return; // Don't add empty input
    }

    if (!onAddTestCase) {
      console.warn("onAddTestCase prop is not provided to TestCaseTab");
      return;
    }

    try {
      // Parse input
      let parsedInput;
      try {
        parsedInput = JSON.parse(customInput);
      } catch (e) {
        // If not valid JSON, treat it as a simple string
        parsedInput = customInput.trim();
      }

      // Parse expected output
      let parsedExpected;
      try {
        parsedExpected = customExpected ? JSON.parse(customExpected) : '';
      } catch (e) {
        // If not valid JSON, treat it as a simple string
        parsedExpected = customExpected.trim();
      }

      // Create new test case
      const newTestCase: TestCaseType = {
        input: parsedInput,
        expected: parsedExpected,
        isHidden: false,
      };

      // Call the onAddTestCase callback
      onAddTestCase(newTestCase);
      
      // Close the dialog
      setIsAddingTestCase(false);
      
      // Reset form
      setCustomInput('');
      setCustomExpected('');
    } catch (error) {
      console.error('Error adding custom test case:', error);
      alert('Failed to add test case. Please check your input format.');
    }
  };

  // Get parameter name for the given index based on function parameters
  const getParameterName = (index: number): string => {
    if (functionParams && functionParams.length > index) {
      return functionParams[index].name;
    }
    
    // Fallbacks for common parameter names
    if (index === 0) return "input";
    if (index === 1) return "target";
    return `param ${index + 1}`;
  };

  return (
    <>
      {/* Test case tabs */}
      <div className="p-2 flex items-center gap-2 flex-shrink-0 bg-background group">
        <div className="flex gap-2 py-1 px-4 overflow-x-auto scrollbar-thin scrollbar-thumb-muted scrollbar-track-transparent">
          {testCases.map((testCase, index) => {
            const isCustom = index >= numOfficialTestCases;
            return (
              <div key={index} className="relative group/testcase-btn flex-shrink-0">
                <button
                  className={cn(
                    "min-w-[80px] flex items-center justify-center rounded-md px-3 py-1.5 text-sm font-medium transition-all duration-200",
                    selectedTestCase === index 
                      ? "bg-primary/10 text-primary border border-primary/40 shadow-sm transform scale-105" 
                      : "bg-background text-foreground/80 border dark:border-transparent border-border hover:bg-accent hover:text-accent-foreground"
                  )}
                  onClick={() => setSelectedTestCase(index)}
                >
                  Case {index + 1}
                  {testCase.isHidden && !isCustom && <span className="ml-1 text-xs opacity-60">(hidden)</span>}
                </button>
                {isCustom && onDeleteTestCase && (
                  <button 
                    onClick={(e) => { 
                        e.stopPropagation();
                        onDeleteTestCase(index); 
                    }}
                    className="absolute top-0 right-0 p-0.5 rounded-full bg-slate-200/70 text-slate-500 hover:bg-slate-400 hover:text-slate-700 opacity-0 group-hover/testcase-btn:opacity-100 transition-opacity duration-150 focus:opacity-100 z-10"
                    aria-label="Delete test case"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>
            );
          })}
          <Dialog open={isAddingTestCase} onOpenChange={setIsAddingTestCase}>
            <DialogTrigger asChild>
              <button 
                className="min-w-[44px] flex items-center justify-center rounded-md border dark:border-transparent border-border bg-background text-foreground/80 hover:bg-accent hover:text-accent-foreground px-2 py-1.5 transition-colors"
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
      <ScrollArea className="flex-1" type="hover">
        {currentTestCase && !currentTestCase.isHidden ? (
          <div className="p-4 pb-8 space-y-4">
            {/* Input section */}
            {currentTestCase.input && (
              <div>
                <h3 className="text-sm font-medium mb-2">Input</h3>
                
                {/* Display first parameter */}
                {currentTestCase.input.length >= 1 && (
                  <div className="space-y-1 mb-3">
                    <div className="text-xs text-muted-foreground font-mono">
                      {/* Use the parameter name from function parameters */}
                      {getParameterName(0)} {" ="}
                    </div>
                    <div className="bg-muted/50 rounded-md p-3 dark:border-transparent border border-border">
                      <pre className="text-sm whitespace-pre-wrap break-all">
                        {JSON.stringify(currentTestCase.input[0], null, 2)}
                      </pre>
                    </div>
                  </div>
                )}
                
                {/* Display second parameter (if exists) */}
                {currentTestCase.input.length >= 2 && (
                  <div className="space-y-1 mb-3">
                    <div className="text-xs text-muted-foreground font-mono">
                      {getParameterName(1)} {" ="}
                    </div>
                    <div className="bg-muted/50 rounded-md p-3 dark:border-transparent border border-border">
                      <pre className="text-sm whitespace-pre-wrap break-all">
                        {JSON.stringify(currentTestCase.input[1], null, 2)}
                      </pre>
                    </div>
                  </div>
                )}
                
                {/* Additional parameters if they exist */}
                {currentTestCase.input.length >= 3 && 
                  currentTestCase.input.slice(2).map((param: any, idx: number) => (
                    <div key={idx} className="space-y-1 mb-3">
                      <div className="text-xs text-muted-foreground font-mono">
                        {getParameterName(idx + 2)} {" ="}
                      </div>
                      <div className="bg-muted/50 rounded-md p-3 dark:border-transparent border border-border">
                        <pre className="text-sm whitespace-pre-wrap break-all">
                          {JSON.stringify(param, null, 2)}
                        </pre>
                      </div>
                    </div>
                  ))
                }
              </div>
            )}
            
            {/* Expected output */}
            {currentTestCase?.expected !== undefined && (
              <div>
                <h3 className="text-sm font-medium mb-2">Expected</h3>
                <div className="bg-muted/50 rounded-md p-3 dark:border-transparent border border-border">
                  <pre className="text-sm whitespace-pre-wrap break-all">
                    {JSON.stringify(tryParseJson(currentTestCase.expected), null, 2)}
                  </pre>
                </div>
              </div>
            )}
          </div>
        ) : currentTestCase && currentTestCase.isHidden ? (
          <div className="p-4 flex items-center justify-center h-full">
            <div className="text-center text-muted-foreground">
              <p>This is a hidden test case. Details are not shown to avoid giving away the solution.</p>
            </div>
          </div>
        ) : (
          <div className="p-4 flex items-center justify-center h-full">
            <div className="text-center text-muted-foreground">
              <p>Select a test case to view details</p>
            </div>
          </div>
        )}
      </ScrollArea>
    </>
  );
} 