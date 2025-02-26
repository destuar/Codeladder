import { ScrollArea } from "@/components/ui/scroll-area";
import { Console } from "@/components/ui/console";
import { Button } from "@/components/ui/button";
import { Play } from "lucide-react";
import { TestCase as TestCaseComponent } from './TestCase';
import { useTestRunner } from './useTestRunner';
import { TestCase } from '../../../types/coding';

interface TestRunnerProps {
  code: string;
  testCases: TestCase[];
  onRunComplete?: () => void;
}

/**
 * Component for running and displaying test results
 */
export function TestRunner({ code, testCases, onRunComplete }: TestRunnerProps) {
  const {
    isRunning,
    testResults,
    consoleOutput,
    runTests,
    clearConsole,
  } = useTestRunner();

  const handleRunTests = async () => {
    await runTests(code, testCases);
    onRunComplete?.();
  };

  return (
    <div className="flex flex-col h-full">
      <ScrollArea className="flex-1" type="hover">
        <div className="p-6 space-y-6">
          {testResults.map((result, index) => (
            <TestCaseComponent
              key={index}
              result={result}
              index={index}
            />
          ))}
        </div>
      </ScrollArea>

      <div className="border-t bg-muted/50 p-4">
        <div className="flex justify-between gap-4">
          <Button 
            onClick={handleRunTests} 
            disabled={isRunning}
            className="gap-2"
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
        </div>
      </div>

      <Console
        results={testResults}
        isOpen={true}
        onToggle={() => {}}
        onClear={clearConsole}
        isRunning={isRunning}
      />
    </div>
  );
} 