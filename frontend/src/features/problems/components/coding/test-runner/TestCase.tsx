import { Badge } from "@/components/ui/badge";
import { TestResult } from '../../../types/coding';

interface TestCaseProps {
  result: TestResult;
  index: number;
}

/**
 * Component for displaying a single test case result
 */
export function TestCase({ result, index }: TestCaseProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Badge variant={result.passed ? "outline" : "destructive"}>
          {result.passed ? "Passed" : "Failed"}
        </Badge>
        <span className="text-sm font-medium">Test Case {index + 1}</span>
        {(result.runtime !== undefined || result.memory !== undefined) && (
          <span className="text-sm text-muted-foreground ml-auto">
            {result.runtime !== undefined && `${result.runtime}ms`}
            {result.runtime !== undefined && result.memory !== undefined && ' • '}
            {result.memory !== undefined && `${result.memory}MB`}
          </span>
        )}
      </div>
      <div className="space-y-1.5 overflow-x-auto">
        <div className="text-sm whitespace-nowrap">
          <span className="font-medium">Input:</span>{" "}
          <code className="text-sm bg-muted px-1.5 py-0.5 rounded">
            {JSON.stringify(result.input)}
          </code>
        </div>
        <div className="text-sm whitespace-nowrap">
          <span className="font-medium">Expected:</span>{" "}
          <code className="text-sm bg-muted px-1.5 py-0.5 rounded">
            {JSON.stringify(result.expected)}
          </code>
        </div>
        {!result.passed && result.output !== undefined && (
          <div className="text-sm whitespace-nowrap">
            <span className="font-medium">Output:</span>{" "}
            <code className="text-sm bg-muted px-1.5 py-0.5 rounded">
              {JSON.stringify(result.output)}
            </code>
          </div>
        )}
      </div>
    </div>
  );
} 