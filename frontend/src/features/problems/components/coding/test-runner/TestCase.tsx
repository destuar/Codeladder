import { CheckCircle, XCircle, ChevronDown, ChevronRight } from 'lucide-react';
import { formatValue } from '../../../utils/formatters';
import { TestResult } from '../../../types/coding';

interface TestCaseProps {
  result: TestResult;
  expanded: boolean;
  onToggle: () => void;
  index?: number;
}

/**
 * Component for displaying a single test case result
 */
export function TestCase({ result, expanded, onToggle, index }: TestCaseProps) {
  const { passed, input, expected, output, runtime, memory, error } = result;

  // Helper function to format input values for display
  const formatInputs = (inputs: any[]): string => {
    if (!inputs || inputs.length === 0) return '()';
    return `(${inputs.map((item) => formatValue(item)).join(', ')})`;
  };

  // Helper function to format runtime in ms
  const formatRuntime = (ms: number): string => {
    if (ms < 1) return '<1 ms';
    if (ms < 1000) return `${Math.round(ms)} ms`;
    return `${(ms / 1000).toFixed(2)} s`;
  };

  // Helper function to format memory usage
  const formatMemory = (kb: number): string => {
    if (kb < 1000) return `${Math.round(kb)} KB`;
    return `${(kb / 1024).toFixed(2)} MB`;
  };

  // Use the index or a counter for display
  const displayIndex = index !== undefined ? index + 1 : 1;

  return (
    <div
      className={`border rounded-lg overflow-hidden transition-colors ${
        passed ? 'border-green-500/50' : 'border-red-500/50'
      } ${expanded ? 'bg-muted/50' : 'bg-background'} cursor-pointer`}
      onClick={onToggle}
    >
      {/* Header section - always visible */}
      <div className="flex items-center p-3 gap-3">
        <div>
          {passed ? (
            <CheckCircle className="text-green-500 h-5 w-5" />
          ) : (
            <XCircle className="text-red-500 h-5 w-5" />
          )}
        </div>
        
        <div className="flex-1">
          <div className="font-medium text-sm">
            Test Case {displayIndex}
          </div>
          <div className="text-xs text-muted-foreground truncate max-w-md">
            {formatInputs(input)}
          </div>
        </div>
        
        <div className="flex gap-2 text-xs">
          {runtime !== undefined && (
            <div className="text-muted-foreground">
              {formatRuntime(runtime)}
            </div>
          )}
          {memory !== undefined && (
            <div className="text-muted-foreground">
              {formatMemory(memory)}
            </div>
          )}
        </div>
        
        <div>
          {expanded ? (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          )}
        </div>
      </div>
      
      {/* Details section - only visible when expanded */}
      {expanded && (
        <div className="p-3 pt-0 border-t bg-muted/30">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <h4 className="text-xs font-medium">Input</h4>
              <div className="bg-muted p-2 rounded text-xs font-mono whitespace-pre-wrap break-all max-h-40 overflow-auto">
                {input.map((item: any, i: number) => (
                  <div key={i} className="mb-1">
                    {formatValue(item)}
                  </div>
                ))}
              </div>
            </div>
            
            <div className="space-y-2">
              <h4 className="text-xs font-medium">Expected Output</h4>
              <div className="bg-muted p-2 rounded text-xs font-mono whitespace-pre-wrap break-all max-h-40 overflow-auto">
                {formatValue(expected)}
              </div>
              
              <h4 className="text-xs font-medium">Your Output</h4>
              <div 
                className={`p-2 rounded text-xs font-mono whitespace-pre-wrap break-all max-h-40 overflow-auto ${
                  passed ? 'bg-green-500/10' : 'bg-red-500/10'
                }`}
              >
                {formatValue(output)}
              </div>
            </div>
          </div>
          
          {error && (
            <div className="mt-4">
              <h4 className="text-xs font-medium text-red-500">Error</h4>
              <div className="bg-red-500/10 p-2 rounded text-xs font-mono whitespace-pre-wrap break-all mt-1 max-h-40 overflow-auto">
                {error}
              </div>
            </div>
          )}
          
          {(runtime !== undefined || memory !== undefined) && (
            <div className="mt-4 text-xs text-muted-foreground flex gap-4">
              {runtime !== undefined && (
                <div>Runtime: {formatRuntime(runtime)}</div>
              )}
              {memory !== undefined && (
                <div>Memory: {formatMemory(memory)}</div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
} 