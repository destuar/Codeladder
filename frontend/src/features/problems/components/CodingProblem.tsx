import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Markdown } from "@/components/ui/markdown";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import Editor from "@monaco-editor/react";
import { ChevronLeft, ChevronRight, Play, Send, Timer, Code2, CheckCircle2, XCircle, GripVertical, Maximize2, Minimize2, Pause, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import { Console } from "@/components/ui/console";

interface TestCase {
  input: any[];
  expected: any;
}

interface TestResult {
  passed: boolean;
  input: any[];
  expected: any;
  output?: any;
  runtime?: number;
  memory?: number;
}

interface CodingProblemProps {
  title: string;
  content: string;
  codeTemplate?: string;
  testCases?: string;
  difficulty: string;
  nextProblemId?: string;
  prevProblemId?: string;
  onNavigate: (id: string) => void;
}

const MIN_PANEL_WIDTH = 300;
const MAX_PANEL_WIDTH = 800;
const COLLAPSED_WIDTH = 0;
const DOUBLE_CLICK_TIMEOUT = 300;

export default function CodingProblem({ 
  title,
  content, 
  codeTemplate = "function solution() {\n  // Write your code here\n}", 
  testCases: testCasesString,
  difficulty,
  nextProblemId,
  prevProblemId,
  onNavigate
}: CodingProblemProps) {
  const [code, setCode] = useState(codeTemplate);
  const [activeTab, setActiveTab] = useState("description");
  const [consoleResults, setConsoleResults] = useState<TestResult[]>([]);
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [activeTestTab, setActiveTestTab] = useState("testcase-1");
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [leftPanelWidth, setLeftPanelWidth] = useState(window.innerWidth * 0.4);
  const [isDragging, setIsDragging] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [startX, setStartX] = useState(0);
  const [startWidth, setStartWidth] = useState(0);
  const [lastClickTime, setLastClickTime] = useState(0);
  const [consoleOutput, setConsoleOutput] = useState<string[]>([]);
  const [isConsoleOpen, setIsConsoleOpen] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [time, setTime] = useState(0); // Time in seconds
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [isTimerExpanded, setIsTimerExpanded] = useState(false);
  const dragHandleRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<any>(null);
  const editorContainerRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<NodeJS.Timeout>();
  
  // Parse test cases with error handling
  const testCases: TestCase[] = useMemo(() => {
    if (!testCasesString) return [];
    try {
      // If it's already an object, stringify it first
      const jsonString = typeof testCasesString === 'object' 
        ? JSON.stringify(testCasesString)
        : testCasesString;
      return JSON.parse(jsonString);
    } catch (error) {
      console.error('Error parsing test cases:', error);
      return [];
    }
  }, [testCasesString]);

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
    e.preventDefault();
    setIsDragging(true);
    setStartX(e.clientX);
    setStartWidth(leftPanelWidth);
    
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
    setConsoleResults([]);
    
    // Mock implementation with runtime and memory stats
    setTimeout(() => {
      const mockResults = testCases.map((testCase, index) => {
        const passed = index === 0;
        const runtime = Math.floor(Math.random() * 100) + 1; // Mock runtime between 1-100ms
        const memory = Math.floor(Math.random() * 40) + 10; // Mock memory usage between 10-50MB
        
        return {
          passed,
          input: testCase.input,
          expected: testCase.expected,
          output: passed ? testCase.expected : "different result",
          runtime,
          memory
        };
      });

      // If no test cases, show a message
      if (mockResults.length === 0) {
        mockResults.push({
          passed: false,
          input: [],
          expected: "N/A",
          output: "N/A",
          runtime: 0,
          memory: 0
        });
      }

      setConsoleResults(mockResults);
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

  const clearConsole = () => {
    setConsoleOutput([]);
  };

  // Add fullscreen toggle function
  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  // Timer functions
  const startTimer = () => {
    setIsTimerRunning(true);
    timerRef.current = setInterval(() => {
      setTime(prev => prev + 1);
    }, 1000);
  };

  const pauseTimer = () => {
    setIsTimerRunning(false);
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
  };

  const resetTimer = () => {
    pauseTimer();
    setTime(0);
  };

  const toggleTimer = () => {
    if (!isTimerExpanded) {
      setIsTimerExpanded(true);
      if (!isTimerRunning) {
        startTimer();
      }
    } else {
      if (isTimerRunning) {
        pauseTimer();
      } else {
        startTimer();
      }
    }
  };

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  return (
    <div className={cn(
      "flex flex-col bg-background",
      isFullscreen ? "fixed inset-0 z-50" : "h-[calc(100vh-3.5rem)]"
    )}>
      {/* Top header bar */}
      <div className="flex justify-between items-center px-6 py-2 border-b">
        <div className="flex items-center gap-3">
          <div className="relative">
            <Button
              variant={isTimerRunning ? "default" : "outline"}
              size="lg"
              className={cn(
                "gap-2 min-w-[120px] font-mono",
                isTimerRunning && "bg-primary/10 text-primary hover:bg-primary/20"
              )}
              onClick={toggleTimer}
            >
              {isTimerRunning ? (
                <Pause className="h-4 w-4" />
              ) : (
                <Timer className="h-4 w-4" />
              )}
              {formatTime(time)}
            </Button>
            {isTimerExpanded && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute -right-10 top-1/2 -translate-y-1/2"
                onClick={resetTimer}
              >
                <RotateCcw className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
        <Button variant="ghost" size="icon" onClick={toggleFullscreen}>
          {isFullscreen ? (
            <Minimize2 className="h-4 w-4" />
          ) : (
            <Maximize2 className="h-4 w-4" />
          )}
        </Button>
      </div>

      {/* Main content */}
      <div className="flex flex-1 min-h-0">
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

        {/* Resize handle */}
        <div
          ref={dragHandleRef}
          className={cn(
            "relative w-2 -ml-1 -mr-1 group",
            "cursor-ew-resize hover:bg-border/50 z-50",
            isDragging && "bg-border/50"
          )}
          onMouseDown={handleMouseDown}
        >
          <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 flex items-center">
            <div className={cn(
              "h-16 rounded-sm flex items-center justify-center",
              "opacity-0 group-hover:opacity-100 transition-opacity",
              isDragging && "opacity-100"
            )}>
              <GripVertical className="h-4 w-4 text-muted-foreground" />
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
        <div className="flex-1 flex flex-col">
          <Tabs defaultValue="code" className="flex-1 flex flex-col">
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
                
                {/* Updated Console */}
                <Console
                  results={consoleResults}
                  isOpen={isConsoleOpen}
                  onToggle={() => setIsConsoleOpen(!isConsoleOpen)}
                  onClear={() => setConsoleResults([])}
                  isRunning={isRunning}
                />
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

            <div className="border-t bg-muted/50 p-4">
              <div className="flex justify-between gap-4">
                <div className="flex gap-2">
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
                  <Button variant="outline" onClick={handleSubmit} className="gap-2">
                    <Send className="h-4 w-4" />
                    Submit
                  </Button>
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
    </div>
  );
} 