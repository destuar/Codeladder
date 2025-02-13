import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, ChevronUp, X, Terminal, CheckCircle2, XCircle, Clock, Cpu, ChevronRight, Maximize2, Minimize2, GripVertical } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from './badge';
import { ScrollArea } from './scroll-area';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@radix-ui/react-collapsible";
import { Button } from './button';

interface TestResult {
  passed: boolean;
  input: any[];
  expected: any;
  output?: any;
  runtime?: number;
  memory?: number;
}

interface ConsoleProps {
  results: TestResult[];
  isOpen: boolean;
  onToggle: () => void;
  onClear: () => void;
  className?: string;
  isRunning: boolean;
}

const MIN_HEIGHT = 200;
const MAX_HEIGHT = 800;
const DEFAULT_HEIGHT = 300;

export function Console({ results, isOpen, onToggle, onClear, className, isRunning }: ConsoleProps) {
  const allPassed = results.length > 0 && results.every(r => r.passed);
  const anyFailed = results.some(r => !r.passed);
  const [openTestCases, setOpenTestCases] = useState<Record<number, boolean>>({});
  const [isMaximized, setIsMaximized] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [activeTab, setActiveTab] = useState<'output' | 'testcases'>('output');
  const consoleRef = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState(DEFAULT_HEIGHT);
  const [isDragging, setIsDragging] = useState(false);
  const [startY, setStartY] = useState(0);
  const [startHeight, setStartHeight] = useState(0);

  const toggleTestCase = (index: number) => {
    setOpenTestCases(prev => ({
      ...prev,
      [index]: !prev[index]
    }));
  };

  const toggleMaximize = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsMaximized(!isMaximized);
  };

  const expandAllTestCases = (e: React.MouseEvent) => {
    e.stopPropagation();
    const allIndices = results.reduce((acc, _, index) => {
      acc[index] = true;
      return acc;
    }, {} as Record<number, boolean>);
    setOpenTestCases(allIndices);
  };

  const collapseAllTestCases = (e: React.MouseEvent) => {
    e.stopPropagation();
    setOpenTestCases({});
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    setStartY(e.clientY);
    setStartHeight(height);
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      
      const diff = startY - e.clientY;
      const newHeight = Math.max(
        MIN_HEIGHT,
        Math.min(startHeight + diff, MAX_HEIGHT)
      );
      setHeight(newHeight);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, startY, startHeight]);

  return (
    <div 
      ref={consoleRef}
      className={cn(
        "border-t bg-background",
        isMaximized ? "fixed inset-0 z-50 border" : "relative",
        isDragging && "select-none",
        className
      )}
      style={{ 
        height: isMaximized ? '100vh' : isCollapsed ? '48px' : `${height}px`,
        transition: isDragging ? 'none' : 'height 0.3s ease-in-out'
      }}
    >
      {/* Drag Handle */}
      {!isMaximized && !isCollapsed && (
        <div
          className={cn(
            "absolute -top-1 left-0 right-0 h-2 group",
            "cursor-ns-resize hover:bg-border/50 z-50",
            isDragging && "bg-border/50"
          )}
          onMouseDown={handleMouseDown}
        >
          <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 flex items-center">
            <div className={cn(
              "h-4 rounded-sm flex items-center justify-center",
              "opacity-0 group-hover:opacity-100 transition-opacity",
              isDragging && "opacity-100"
            )}>
              <GripVertical className="h-4 w-4 text-muted-foreground" />
            </div>
          </div>
        </div>
      )}

      {/* Console Header */}
      <div 
        className={cn(
          "flex items-center justify-between px-4 py-2 border-b",
          "sticky top-0 bg-background z-10",
          isCollapsed && "h-full items-center"
        )}
      >
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Terminal className="h-4 w-4" />
            <span className="text-sm font-medium">Console</span>
          </div>
          {!isCollapsed && (
            <div className="flex items-center gap-2 border rounded-md">
              <button
                className={cn(
                  "px-3 py-1 text-sm transition-colors",
                  activeTab === 'output' ? "bg-muted" : "hover:bg-muted/50"
                )}
                onClick={() => setActiveTab('output')}
              >
                Output
              </button>
              <button
                className={cn(
                  "px-3 py-1 text-sm transition-colors",
                  activeTab === 'testcases' ? "bg-muted" : "hover:bg-muted/50"
                )}
                onClick={() => setActiveTab('testcases')}
              >
                Test Cases
              </button>
            </div>
          )}
          {results.length > 0 && (
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                <span>{results.filter(r => r.passed).length}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <XCircle className="h-3.5 w-3.5 text-red-500" />
                <span>{results.filter(r => !r.passed).length}</span>
              </div>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onClear();
            }}
            className="p-1 hover:bg-muted rounded-md"
          >
            <X className="h-4 w-4" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsMaximized(!isMaximized);
            }}
            className="p-1 hover:bg-muted rounded-md"
          >
            {isMaximized ? (
              <Minimize2 className="h-4 w-4" />
            ) : (
              <Maximize2 className="h-4 w-4" />
            )}
          </button>
          <button 
            onClick={(e) => {
              e.stopPropagation();
              setIsCollapsed(!isCollapsed);
            }} 
            className="p-1 hover:bg-muted rounded-md"
          >
            {isCollapsed ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </button>
        </div>
      </div>

      {/* Console Content */}
      {!isCollapsed && (
        <ScrollArea 
          className={cn(
            isMaximized ? "h-[calc(100vh-3rem)]" : "h-[calc(100%-2.5rem)]"
          )}
        >
          <div className="p-4 space-y-2 font-mono text-sm">
            {isRunning ? (
              <div className="flex items-center gap-2 text-muted-foreground">
                <div className="animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full" />
                Running test cases...
              </div>
            ) : results.length === 0 ? (
              <div className="text-muted-foreground">No test results</div>
            ) : activeTab === 'output' ? (
              <>
                {/* Summary Section */}
                <div className="mb-4 p-3 bg-muted/30 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                        <span>{results.filter(r => r.passed).length} Passed</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <XCircle className="h-4 w-4 text-red-500" />
                        <span>{results.filter(r => !r.passed).length} Failed</span>
                      </div>
                    </div>
                    {results[0]?.runtime !== undefined && (
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          Avg: {Math.round(results.reduce((acc, r) => acc + (r.runtime || 0), 0) / results.length)}ms
                        </div>
                        <div className="flex items-center gap-1">
                          <Cpu className="h-3 w-3" />
                          Max: {Math.max(...results.map(r => r.memory || 0))}MB
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                <div>Console output will go here...</div>
              </>
            ) : (
              /* Test Cases */
              <div className="space-y-2">
                {results.map((result, index) => (
                  <div
                    key={index}
                    className={cn(
                      "border rounded-lg overflow-hidden transition-colors duration-200",
                      result.passed ? "hover:border-green-500/50" : "hover:border-red-500/50"
                    )}
                  >
                    <button
                      className="flex items-center justify-between w-full p-3 hover:bg-muted/50 transition-colors"
                      onClick={() => toggleTestCase(index)}
                    >
                      <div className="flex items-center gap-2">
                        {result.passed ? (
                          <CheckCircle2 className="h-5 w-5 text-green-500" />
                        ) : (
                          <XCircle className="h-5 w-5 text-red-500" />
                        )}
                        <span className="font-medium">Test Case {index + 1}</span>
                      </div>
                      <div className="flex items-center gap-4">
                        {result.runtime !== undefined && result.memory !== undefined && (
                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {result.runtime}ms
                            </div>
                            <div className="flex items-center gap-1">
                              <Cpu className="h-3 w-3" />
                              {result.memory}MB
                            </div>
                          </div>
                        )}
                        <ChevronRight className={cn(
                          "h-4 w-4 transition-transform duration-200",
                          openTestCases[index] && "transform rotate-90"
                        )} />
                      </div>
                    </button>
                    {openTestCases[index] && (
                      <div className="p-3 space-y-2 border-t bg-muted/30">
                        <div className="grid grid-cols-[80px,1fr] gap-2">
                          <span className="text-muted-foreground">Input:</span>
                          <code className="bg-muted p-1.5 rounded">
                            {JSON.stringify(result.input)}
                          </code>
                        </div>
                        <div className="grid grid-cols-[80px,1fr] gap-2">
                          <span className="text-muted-foreground">Expected:</span>
                          <code className="bg-muted p-1.5 rounded">
                            {JSON.stringify(result.expected)}
                          </code>
                        </div>
                        {!result.passed && result.output !== undefined && (
                          <div className="grid grid-cols-[80px,1fr] gap-2">
                            <span className="text-muted-foreground">Output:</span>
                            <code className="bg-muted p-1.5 rounded text-destructive">
                              {JSON.stringify(result.output)}
                            </code>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </ScrollArea>
      )}
    </div>
  );
} 