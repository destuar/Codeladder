import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Play, Plus, X } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { useTestRunner } from './useTestRunner';
import { formatValue } from '../../../utils/formatters';
import { CustomTestCase } from '../../../types/coding';

interface CustomTestRunnerProps {
  code: string;
  functionName: string;
  language: string;
}

export function CustomTestRunner({ code, functionName, language }: CustomTestRunnerProps) {
  const [inputText, setInputText] = useState('');
  const [customTestCases, setCustomTestCases] = useState<CustomTestCase[]>([]);
  const [selectedTestCase, setSelectedTestCase] = useState<number | null>(null);
  
  const { isRunning, runCustomTest } = useTestRunner();

  const handleAddTestCase = useCallback(() => {
    if (!inputText.trim()) return;
    
    const newTestCase: CustomTestCase = {
      input: inputText.trim(),
    };
    
    setCustomTestCases((prev) => [...prev, newTestCase]);
    setInputText('');
  }, [inputText]);

  const handleRemoveTestCase = useCallback((index: number) => {
    setCustomTestCases((prev) => prev.filter((_, i) => i !== index));
    if (selectedTestCase === index) {
      setSelectedTestCase(null);
    } else if (selectedTestCase !== null && selectedTestCase > index) {
      setSelectedTestCase(selectedTestCase - 1);
    }
  }, [selectedTestCase]);

  const handleRunTest = useCallback(async (input: string, index: number) => {
    try {
      // Parse input string to array
      let parsedInput;
      try {
        // Try to parse as JSON first
        parsedInput = JSON.parse(`[${input}]`);
      } catch (e) {
        // Fall back to simple comma-separated values
        parsedInput = input.split(',').map(item => item.trim());
      }
      
      // Run the test
      const result = await runCustomTest(code, parsedInput, functionName, language);
      
      // Update the test case with results
      setCustomTestCases(prev => {
        const updated = [...prev];
        updated[index] = {
          ...updated[index],
          output: result.output,
          passed: result.error ? false : true,
          error: result.error,
        };
        return updated;
      });
    } catch (error) {
      console.error('Error running custom test:', error);
      
      // Update with error
      setCustomTestCases(prev => {
        const updated = [...prev];
        updated[index] = {
          ...updated[index],
          output: 'Error running test',
          passed: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        };
        return updated;
      });
    }
  }, [code, functionName, language, runCustomTest]);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="p-3 border-b bg-muted/10 flex-shrink-0">
        <div className="flex gap-2">
          <Input
            placeholder="Enter input values (e.g., 1, 2, 3 or [1,2,3], 'test')"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleAddTestCase();
              }
            }}
            className="flex-1"
          />
          <Button
            size="sm"
            variant="secondary"
            onClick={handleAddTestCase}
            title="Add test case"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>
      
      <ScrollArea className="flex-1 min-h-0" type="hover">
        <div className="p-4 space-y-4">
          {customTestCases.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Add a custom test case to try your code
            </div>
          ) : (
            customTestCases.map((testCase, index) => (
              <div key={index} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-medium">Custom Test {index + 1}</h3>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 w-8 p-0"
                      onClick={() => handleRemoveTestCase(index)}
                      title="Remove test case"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 w-8 p-0"
                      onClick={() => handleRunTest(testCase.input, index)}
                      disabled={isRunning}
                      title="Run this test case"
                    >
                      {isRunning ? (
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-background border-t-foreground" />
                      ) : (
                        <Play className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-2">
                  <div className="mt-1">
                    <h4 className="text-xs font-medium text-muted-foreground mb-1">Input:</h4>
                    <code className="text-xs bg-muted p-1 rounded block overflow-x-auto">
                      {testCase.input}
                    </code>
                  </div>
                  
                  {testCase.output !== undefined && (
                    <>
                      <Separator className="my-1" />
                      <div>
                        <h4 className="text-xs font-medium text-muted-foreground mb-1">Output:</h4>
                        <code 
                          className={`text-xs p-1 rounded block overflow-x-auto ${
                            testCase.error ? 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400' : 'bg-muted'
                          }`}
                        >
                          {testCase.error || testCase.output}
                        </code>
                      </div>
                    </>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
} 