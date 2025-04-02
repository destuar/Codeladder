import { ScrollArea } from "@/components/ui/scroll-area";
import { Plus } from "lucide-react";
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
import { useState } from "react";

interface TestCaseTabProps {
  testCases: TestCaseType[];
  selectedTestCase: number | null;
  setSelectedTestCase: (index: number) => void;
}

export function TestCaseTab({ 
  testCases, 
  selectedTestCase,
  setSelectedTestCase
}: TestCaseTabProps) {
  const [isAddingTestCase, setIsAddingTestCase] = useState(false);
  const [customInput, setCustomInput] = useState('');
  const [customExpected, setCustomExpected] = useState('');

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
    <>
      {/* Test case tabs */}
      <div className="p-2 flex items-center gap-2 flex-shrink-0 bg-background">
        <div className="flex gap-2 py-1 px-4">
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
      <ScrollArea className="flex-1" type="hover">
        {selectedTestCase !== null && selectedTestCase < testCases.length ? (
          <div className="p-4 pb-8 space-y-4">
            {/* Display test case input parameters */}
            {testCases[selectedTestCase].input && Array.isArray(testCases[selectedTestCase].input) && (
              <div>
                <h3 className="text-sm font-medium mb-2">Input</h3>
                <div className="space-y-1 mb-3">
                  <div className="text-xs text-muted-foreground font-mono">
                    {/* Try to determine parameter name from functionName, or default to "input" */}
                    {(() => {
                      if (testCases[selectedTestCase].input.length === 1) {
                        return "nums";
                      } else if (testCases[selectedTestCase].input.length === 2) {
                        return "nums"; // First parameter
                      }
                      return "input";
                    })()}
                    {" ="}
                  </div>
                  <div className="bg-muted/50 border rounded-md p-3">
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
              </div>
            )}
            
            {/* Second parameter (if exists) */}
            {testCases[selectedTestCase].input && Array.isArray(testCases[selectedTestCase].input) && testCases[selectedTestCase].input.length >= 2 && (
              <div>
                <div className="text-xs text-muted-foreground font-mono mb-2">target =</div>
                <div className="bg-muted/50 border rounded-md p-3">
                  <pre className="text-sm whitespace-pre-wrap break-all">{JSON.stringify(testCases[selectedTestCase].input[1], null, 2)}</pre>
                </div>
              </div>
            )}
            
            {/* Expected output */}
            {testCases[selectedTestCase]?.expected !== undefined && (
              <div>
                <h3 className="text-sm font-medium mb-2">Expected</h3>
                <div className="bg-muted/50 border rounded-md p-3">
                  <pre className="text-sm whitespace-pre-wrap break-all">{JSON.stringify(testCases[selectedTestCase].expected, null, 2)}</pre>
                </div>
              </div>
            )}
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