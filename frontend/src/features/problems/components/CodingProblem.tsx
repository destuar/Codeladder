import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Markdown } from "@/components/ui/markdown";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import Editor from "@monaco-editor/react";
import { ChevronLeft, ChevronRight, Play, Send, Timer, Code2, CheckCircle2, XCircle, GripVertical } from "lucide-react";
import { cn } from "@/lib/utils";

interface TestCase {
  input: any[];
  expected: any;
}

interface TestResult {
  passed: boolean;
  message: string;
  input: any[];
  expected: any;
  output?: any;
}

interface CodingProblemProps {
  title: string;
  content: string;
  codeTemplate?: string;
  testCases?: string;
  difficulty: 'EASY_IIII' | 'EASY_III' | 'EASY_II' | 'EASY_I' | 'MEDIUM' | 'HARD';
  nextProblemId?: string;
  prevProblemId?: string;
  onNavigate?: (problemId: string) => void;
}

const MIN_PANEL_WIDTH = 300;
const MAX_PANEL_WIDTH = 800;
const COLLAPSED_WIDTH = 0;
const DOUBLE_CLICK_TIMEOUT = 300;

const CodingProblem: React.FC<CodingProblemProps> = ({ 
  title,
  content, 
  codeTemplate = "function solution() {\n  // Write your code here\n}", 
  testCases: testCasesString,
  difficulty,
  nextProblemId,
  prevProblemId,
  onNavigate
}) => {
  const [code, setCode] = useState(codeTemplate);
  const [activeTab, setActiveTab] = useState("description");
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [activeTestTab, setActiveTestTab] = useState("testcase-1");
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [leftPanelWidth, setLeftPanelWidth] = useState(window.innerWidth * 0.4);
  const [isDragging, setIsDragging] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [lastClickTime, setLastClickTime] = useState(0);
  const [startX, setStartX] = useState(0);
  const [startWidth, setStartWidth] = useState(0);
  const dragHandleRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<any>(null);
  const editorContainerRef = useRef<HTMLDivElement>(null);
  
  const testCases: TestCase[] = testCasesString ? JSON.parse(testCasesString) : [];

  // Add editor mount handler
  const handleEditorDidMount = (editor: any) => {
    editorRef.current = editor;
    // Initial layout
    requestAnimationFrame(() => {
      editor.layout();
    });
  };

  // Update editor layout after panel size changes
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    let animationFrameId: number;
    
    const updateLayout = () => {
      if (editorRef.current) {
        // Cancel any pending layout updates
        cancelAnimationFrame(animationFrameId);
        
        // Schedule a new layout update
        animationFrameId = requestAnimationFrame(() => {
          if (editorRef.current) {
            editorRef.current.layout();
            // Double-check layout after a short delay
            timeoutId = setTimeout(() => {
              editorRef.current?.layout();
            }, 100);
          }
        });
      }
    };

    // Create ResizeObserver to handle container size changes
    const resizeObserver = new ResizeObserver(() => {
      if (!isDragging) {
        updateLayout();
      }
    });

    // Observe both the editor container and its parent
    if (editorContainerRef.current) {
      resizeObserver.observe(editorContainerRef.current);
      if (editorContainerRef.current.parentElement) {
        resizeObserver.observe(editorContainerRef.current.parentElement);
      }
    }

    // Initial layout update
    updateLayout();

    return () => {
      clearTimeout(timeoutId);
      cancelAnimationFrame(animationFrameId);
      resizeObserver.disconnect();
    };
  }, [leftPanelWidth, isCollapsed, isDragging]);

  // Handle accordion toggle
  const handleDoubleClick = () => {
    if (isCollapsed) {
      setIsCollapsed(false);
      setLeftPanelWidth(startWidth || window.innerWidth * 0.4);
      // Schedule layout update after expansion
      requestAnimationFrame(() => {
        if (editorRef.current) {
          editorRef.current.layout();
        }
      });
    } else {
      setStartWidth(leftPanelWidth);
      setIsCollapsed(true);
      setLeftPanelWidth(COLLAPSED_WIDTH);
      // Schedule layout update after collapse
      requestAnimationFrame(() => {
        if (editorRef.current) {
          editorRef.current.layout();
        }
      });
    }
  };

  useEffect(() => {
    // Check if dark mode is enabled
    const isDark = document.documentElement.classList.contains('dark');
    setIsDarkMode(isDark);

    // Optional: Listen for theme changes
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.attributeName === 'class') {
          setIsDarkMode(document.documentElement.classList.contains('dark'));
        }
      });
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    });

    return () => observer.disconnect();
  }, []);

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setStartX(e.clientX);
    setStartWidth(leftPanelWidth);
    e.preventDefault();
    
    // Handle double click
    const clickTime = new Date().getTime();
    if (clickTime - lastClickTime < DOUBLE_CLICK_TIMEOUT) {
      handleDoubleClick();
    }
    setLastClickTime(clickTime);
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      
      const diff = e.clientX - startX;
      const newWidth = Math.max(
        MIN_PANEL_WIDTH,
        Math.min(startWidth + diff, MAX_PANEL_WIDTH)
      );
      setLeftPanelWidth(newWidth);
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
  }, [isDragging, startX, startWidth]);

  const handleRunTests = async () => {
    setIsRunning(true);
    // TODO: Implement actual code execution
    // This is a mock implementation with proper error checking
    setTimeout(() => {
      const mockResults = testCases.map((testCase, index) => ({
        passed: index === 0, // First test passes, others fail
        message: index === 0 ? "Test case passed" : "Test case failed",
        input: testCase.input,
        expected: testCase.expected,
        output: index === 0 ? testCase.expected : "different result"
      }));

      // If no test cases, show a message
      if (mockResults.length === 0) {
        mockResults.push({
          passed: false,
          message: "No test cases available",
          input: [],
          expected: "N/A",
          output: "N/A"
        });
      }

      setTestResults(mockResults);
      setIsRunning(false);
    }, 1000);
  };

  const handleSubmit = async () => {
    // TODO: Implement code submission
  };

  const getDifficultyColor = () => {
    if (difficulty.startsWith('EASY')) return "text-green-500";
    if (difficulty === 'MEDIUM') return "text-yellow-500";
    return "text-red-500";
  };

  const resolveTheme = () => {
    return isDarkMode ? "vs-dark" : "vs-light";
  };

  // Add window resize handler
  useEffect(() => {
    const handleResize = () => {
      if (editorRef.current) {
        editorRef.current.layout();
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div className="flex h-[calc(100vh-3.5rem)] bg-background">
      {/* Left panel - Problem description */}
      <div 
        style={{ 
          width: leftPanelWidth,
          transition: isDragging ? 'none' : 'width 0.3s ease-in-out'
        }} 
        className="flex-none relative border-r"
      >
        <ScrollArea className="h-full" type="hover">
          <div className="p-6 space-y-6">
            <div>
              <h1 className="text-3xl font-bold">{title}</h1>
              <div className="flex items-center gap-2 mt-2">
                <Badge variant="outline" className={cn("font-semibold", getDifficultyColor())}>
                  {difficulty.replace(/_/g, ' ')}
                </Badge>
                <div className="flex items-center text-sm text-muted-foreground">
                  <Timer className="w-4 h-4 mr-1" />
                  <span>45 min</span>
                </div>
              </div>
            </div>
            <div className="prose dark:prose-invert max-w-none overflow-x-auto">
              <Markdown content={content} />
            </div>
          </div>
        </ScrollArea>
      </div>

      {/* Enhanced draggable divider */}
      <div
        ref={dragHandleRef}
        className={cn(
          "relative w-1 hover:w-2 group flex items-center justify-center",
          "transition-all duration-200",
          isDragging ? "bg-primary/50" : "bg-border hover:bg-border/80"
        )}
        onMouseDown={handleMouseDown}
      >
        {/* Handle bar */}
        <div className={cn(
          "absolute inset-y-0 -ml-0.5 flex items-center justify-center",
          "opacity-0 group-hover:opacity-100 transition-opacity"
        )}>
          <div className={cn(
            "h-16 w-1 flex flex-col items-center justify-center gap-1",
            "rounded-full"
          )}>
            <div className="w-0.5 h-1 rounded-full bg-muted-foreground/50" />
            <div className="w-0.5 h-1 rounded-full bg-muted-foreground/50" />
            <div className="w-0.5 h-1 rounded-full bg-muted-foreground/50" />
          </div>
        </div>

        {/* Collapse/Expand button */}
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            "absolute top-3 -right-8",
            "opacity-0 group-hover:opacity-100",
            "transition-all duration-200",
            "h-6 w-6"
          )}
          onClick={handleDoubleClick}
        >
          {isCollapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </Button>
      </div>

      {/* Right panel - Code editor and test cases */}
      <div className="flex-1">
        <Tabs defaultValue="code" className="flex flex-col h-full">
          <div className="border-b px-6">
            <TabsList className="bg-muted">
              <TabsTrigger value="code">Code</TabsTrigger>
              <TabsTrigger value="testcases">Test Cases</TabsTrigger>
            </TabsList>
          </div>

          <div className="flex-1 overflow-hidden">
            <TabsContent value="code" className="h-full data-[state=active]:flex flex-col">
              <div ref={editorContainerRef} className="flex-1 relative">
                <Editor
                  height="100%"
                  defaultLanguage="javascript"
                  theme={resolveTheme()}
                  value={code}
                  onChange={(value) => setCode(value || "")}
                  onMount={handleEditorDidMount}
                  options={{
                    minimap: { enabled: false },
                    fontSize: 14,
                    lineNumbers: 'on',
                    scrollBeyondLastLine: false,
                    automaticLayout: false,
                    wordWrap: 'off',
                    scrollbar: {
                      horizontal: 'visible',
                      useShadows: true,
                      horizontalScrollbarSize: 12,
                      horizontalSliderSize: 12,
                      alwaysConsumeMouseWheel: false,
                      verticalHasArrows: true,
                      horizontalHasArrows: true
                    },
                    overviewRulerLanes: 0,
                    overviewRulerBorder: false,
                    hideCursorInOverviewRuler: true,
                    fixedOverflowWidgets: true,
                    renderLineHighlight: 'all',
                    contextmenu: true,
                    scrollBeyondLastColumn: 5,
                    renderWhitespace: 'selection'
                  }}
                  className="absolute inset-0"
                />
              </div>
            </TabsContent>

            <TabsContent value="testcases" className="h-full data-[state=active]:flex flex-col">
              <ScrollArea className="flex-1" type="hover">
                <div className="p-6 space-y-6">
                  {testResults.map((result: TestResult, index) => (
                    <div key={index} className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Badge variant={result.passed ? "outline" : "destructive"}>
                          {result.passed ? "Passed" : "Failed"}
                        </Badge>
                        <span className="text-sm font-medium">Test Case {index + 1}</span>
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
                  ))}
                </div>
              </ScrollArea>
            </TabsContent>
          </div>

          <div className="border-t bg-muted/50 p-4 mt-auto">
            <div className="flex justify-between gap-4">
              <div className="flex gap-2">
                <Button onClick={handleRunTests}>Run Tests</Button>
                <Button variant="outline" onClick={handleSubmit}>Submit</Button>
              </div>
              <div className="flex gap-2">
                {prevProblemId && (
                  <Button variant="outline" onClick={() => onNavigate?.(prevProblemId)}>Previous</Button>
                )}
                {nextProblemId && (
                  <Button onClick={() => onNavigate?.(nextProblemId)}>Next</Button>
                )}
              </div>
            </div>
          </div>
        </Tabs>
      </div>
    </div>
  );
};

export default CodingProblem; 