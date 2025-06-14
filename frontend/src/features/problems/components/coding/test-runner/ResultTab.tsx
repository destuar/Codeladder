import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { TestResult } from '../../../types/coding';
import { ParameterDisplay } from "./ParameterDisplay";

interface ResultTabProps {
  testResults: TestResult[];
  selectedTestCase: number | null;
  setSelectedTestCase: (index: number) => void;
  testCases: any[]; // For empty state display
  functionParams?: { name: string; type: string }[]; // Add functionParams prop
}

export function ResultTab({ 
  testResults, 
  selectedTestCase, 
  setSelectedTestCase,
  testCases,
  functionParams = [] // Default to empty array
}: ResultTabProps) {
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
      {/* Test case navigation - same styling as TestCaseTab */}
      <div className="p-2 flex items-center gap-2 flex-shrink-0 bg-background">
        <ScrollArea className="w-full whitespace-nowrap">
          <div className="flex items-center gap-2 py-1 px-4">
            {/* Status indicator - shown separately */}
            {testResults.length > 0 && (
              <div className={cn(
                "rounded-md px-3 py-1.5 text-sm font-medium mr-2",
                testResults.every(r => r.passed) 
                  ? "bg-green-600/10 text-green-500" 
                  : "bg-red-500/10 text-red-500"
              )}>
                {testResults.every(r => r.passed) 
                  ? `Accepted (${testResults[0]?.runtime || 0} ms)` 
                  : `Failed (${testResults.filter(r => r.passed).length}/${testResults.length})`
                }
              </div>
            )}
            
            {/* Test case buttons - styled like TestCaseTab */}
            {testResults.length > 0 ? (
              testResults.map((result, index) => (
                <button
                  key={index}
                  className={cn(
                    "min-w-[80px] flex-shrink-0 flex items-center justify-center rounded-md px-3 py-1.5 text-sm font-medium transition-all duration-200",
                    selectedTestCase === index 
                      ? "bg-primary/10 text-primary border border-primary/40 shadow-sm transform scale-105" 
                      : "bg-background text-foreground/80 border dark:border-transparent border-border hover:bg-accent hover:text-accent-foreground"
                  )}
                  onClick={() => setSelectedTestCase(index)}
                >
                  Case {index + 1}
                  <div className="w-2 h-2 rounded-full ml-1.5" style={{ 
                    backgroundColor: result.passed ? '#10b981' : '#ef4444' 
                  }} />
                </button>
              ))
            ) : (
              <div className="text-sm text-muted-foreground">
                
              </div>
            )}
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      </div>
      
      {/* Test case details - always rendered */}
      <ScrollArea className="flex-1" type="hover">
        {testResults.length > 0 && selectedTestCase !== null && selectedTestCase < testResults.length ? (
          <div className="p-4 pb-8 space-y-4">
            {/* Input section */}
            <div className="space-y-3">
              <h3 className="text-sm font-medium">Input</h3>
              {testResults[selectedTestCase].input.map((param: any, idx: number) => (
                <ParameterDisplay
                  key={idx}
                  name={getParameterName(idx)}
                  value={param}
                />
              ))}
            </div>
            
            {/* Output section */}
            <div>
              <h3 className="text-sm font-medium mb-2">Output</h3>
              <ParameterDisplay
                name="output"
                value={testResults[selectedTestCase].output}
              />
            </div>
            
            {/* Expected section */}
            <div>
              <h3 className="text-sm font-medium mb-2">Expected</h3>
              <ParameterDisplay
                name="expected"
                value={testResults[selectedTestCase].expected}
              />
            </div>
            
            {/* Error display if any */}
            {testResults[selectedTestCase].error && (
              <div>
                <h3 className="text-sm font-medium text-red-600 mb-2">Error</h3>
                <div className="bg-red-500/10 rounded-md p-3 dark:border-transparent border border-red-200">
                  <pre className="text-sm text-red-700 whitespace-pre-wrap break-all">
                    {testResults[selectedTestCase].error}
                  </pre>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="p-4 flex items-center justify-center h-full">
            <div className="text-center text-muted-foreground">
              <p>Run your code to see results</p>
            </div>
          </div>
        )}
      </ScrollArea>
    </>
  );
} 