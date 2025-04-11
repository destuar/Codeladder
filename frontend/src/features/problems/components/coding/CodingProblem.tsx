import { useState, useRef, useMemo, useCallback } from 'react';
import { Card } from "@/components/ui/card";
import { Markdown } from "@/components/ui/markdown";
import { HtmlContent } from "@/components/ui/html-content";
import { isMarkdown } from "@/lib/markdown-to-html";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from '@/lib/utils';
import { Badge } from "@/components/ui/badge";
import { Timer, RepeatIcon } from "lucide-react";
import { CodingProblemProps } from '../../types';
import { ResizablePanel } from './ResizablePanel';
import { ProblemTimer } from './timer/ProblemTimer';
import { CodeEditor, CodeEditorRef } from './editor/CodeEditor';
import { TestRunner } from './test-runner/TestRunner';
import { ProblemHeader } from '@/features/problems/components/coding/ProblemHeader';
import { ProblemHeaderProps } from '@/features/problems/components/coding/ProblemHeader';
import { useProblemCompletion } from '@/features/problems/hooks/useProblemCompletion';
import { formatEstimatedTime } from '../../utils/time';
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { SupportedLanguage, LANGUAGE_CONFIGS } from "../../types/coding";
import { Resizable } from "re-resizable";

const MIN_PANEL_WIDTH = 300;
const MAX_PANEL_WIDTH = 800;
const DEFAULT_EDITOR_HEIGHT = 500; // px
const MIN_EDITOR_HEIGHT = 200; // px

/**
 * Main component for the coding problem interface
 */
export default function CodingProblem({
  title,
  content,
  codeTemplate,
  testCases: testCasesString,
  difficulty,
  nextProblemId,
  nextProblemSlug,
  prevProblemId,
  prevProblemSlug,
  onNavigate,
  estimatedTime,
  isCompleted = false,
  problemId,
  isReviewMode = false,
  onCompleted,
  onCodeChange,
  isQuizMode = false,
  sourceContext,
}: CodingProblemProps) {
  const [leftPanelWidth, setLeftPanelWidth] = useState(window.innerWidth * 0.4);
  const [editorHeight, setEditorHeight] = useState(window.innerHeight * 0.6);
  const [selectedLanguage, setSelectedLanguage] = useState<SupportedLanguage>('python');
  const [code, setCode] = useState(codeTemplate || '');
  const [isRunning, setIsRunning] = useState(false);
  const editorRef = useRef<any>(null);

  // Use the problem completion hook
  const { 
    isProblemCompleted: hookIsCompleted, 
    handleMarkAsComplete: hookHandleMarkComplete 
  } = useProblemCompletion(
    problemId,
    isCompleted, // Pass initial state from props
    onCompleted, // Pass parent callback to hook
    isReviewMode
  );

  // Parse test cases
  const testCases = useMemo(() => {
    try {
      // Check if testCasesString is already an object
      if (testCasesString && typeof testCasesString === 'object') {
        console.log("TestCases is already an object:", testCasesString);
        return testCasesString;
      }
      // Otherwise try to parse it as JSON
      const parsed = JSON.parse(testCasesString || '[]');
      console.log("TestCases parsed from JSON:", parsed);
      
      // Format validation and conversion
      if (Array.isArray(parsed)) {
        // Make sure each test case has an input property as an array
        const formatted = parsed.map(tc => {
          // If input is not an array, make it an array
          if (tc.input && !Array.isArray(tc.input)) {
            console.log("Converting non-array input to array:", tc.input);
            return {
              ...tc,
              input: [tc.input]
            };
          }
          return tc;
        });
        console.log("Formatted test cases:", formatted);
        return formatted;
      }
      
      return parsed;
    } catch (e) {
      console.error('Error parsing test cases:', e);
      return [];
    }
  }, [testCasesString]);

  // Handle code changes
  const handleCodeChange = useCallback((newCode: string) => {
    setCode(newCode);
    onCodeChange?.(newCode);
  }, [onCodeChange]);

  // Handle language changes
  const handleLanguageChange = useCallback((language: string) => {
    setSelectedLanguage(language as SupportedLanguage);
  }, []);

  // Handle navigation
  const handleNavigate = useCallback((id: string, slug?: string) => {
    if (onNavigate) {
      onNavigate(id, slug);
    }
  }, [onNavigate]);

  // Get difficulty color
  const getDifficultyColor = () => {
    if (difficulty.includes('EASY')) return 'bg-emerald-500/15 text-emerald-600 border-emerald-500/20';
    if (difficulty === 'MEDIUM') return 'bg-amber-500/15 text-amber-600 border-amber-500/20';
    if (difficulty === 'HARD') return 'bg-rose-500/15 text-rose-600 border-rose-500/20';
    return '';
  };

  // Format estimated time
  const formattedTime = useMemo(() => {
    if (!estimatedTime) return null;
    const minutes = Math.round(estimatedTime);
    return `${minutes} min${minutes !== 1 ? 's' : ''}`;
  }, [estimatedTime]);

  return (
    <div className={cn(
      "flex flex-col bg-background",
      isQuizMode ? "h-full" : "min-h-screen h-screen max-h-screen"
    )}>
      <ProblemHeader
        title={title || 'Problem'}
        difficulty={difficulty}
        nextProblemId={nextProblemId}
        nextProblemSlug={nextProblemSlug}
        prevProblemId={prevProblemId}
        prevProblemSlug={prevProblemSlug}
        onNavigate={handleNavigate}
        isCompleted={hookIsCompleted}
        onMarkComplete={hookHandleMarkComplete}
        isQuizMode={isQuizMode}
        isReviewMode={isReviewMode}
        sourceContext={sourceContext}
        problemType="CODING"
      />

      {/* Main content */}
      <div className="flex-1 overflow-hidden flex flex-col">
        <div className="flex flex-1 min-h-0 overflow-auto">
          {/* Left panel - Problem description */}
          <ResizablePanel
            defaultWidth={leftPanelWidth}
            minWidth={MIN_PANEL_WIDTH}
            maxWidth={MAX_PANEL_WIDTH}
            onResize={setLeftPanelWidth}
            className="border-r h-full"
          >
            <ScrollArea className="h-full" type="hover">
              <div className="p-6 space-y-6 w-full">
                <div className="space-y-4">
                  <h1 className="text-3xl font-bold">{title}</h1>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className={cn("font-semibold", getDifficultyColor())}>
                      {difficulty.replace(/_/g, ' ')}
                    </Badge>
                    {formattedTime && (
                      <div className="flex items-center text-sm text-muted-foreground">
                        <Timer className="w-4 h-4 mr-1" />
                        <span>{formattedTime}</span>
                      </div>
                    )}
                  </div>
                </div>
                <div className="max-w-full overflow-hidden">
                  {isMarkdown(content) ? (
                    // For backward compatibility, use Markdown for existing markdown content
                    <div className="prose dark:prose-invert max-w-full overflow-hidden">
                      <Markdown 
                        content={content}
                        className="max-w-full [&_pre]:!whitespace-pre-wrap [&_pre]:!break-words [&_code]:!whitespace-pre-wrap [&_code]:!break-words [&_pre]:!max-w-full [&_pre]:!overflow-x-auto"
                      />
                    </div>
                  ) : (
                    // Use HtmlContent for HTML content
                    <HtmlContent 
                      content={content} 
                      className="max-w-full [&_pre]:!whitespace-pre-wrap [&_pre]:!break-words [&_code]:!whitespace-pre-wrap [&_code]:!break-words [&_pre]:!max-w-full [&_pre]:!overflow-x-auto"
                    />
                  )}
                </div>
              </div>
            </ScrollArea>
          </ResizablePanel>

          {/* Right panel - Vertically arranged Code Editor and Test Runner */}
          <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
            {/* Code Editor */}
            <Resizable
              defaultSize={{ width: '100%', height: editorHeight }}
              minHeight={MIN_EDITOR_HEIGHT}
              maxHeight="70%"
              enable={{ bottom: true }}
              onResize={(e, direction, ref, d) => {
                // Update the editor layout whenever size changes
                requestAnimationFrame(() => {
                  if (editorRef.current) {
                    editorRef.current.updateLayout();
                  }
                });
              }}
              onResizeStop={(e, direction, ref, d) => {
                // Save the new height when resize is complete
                setEditorHeight(editorHeight + d.height);
              }}
              className="relative"
              handleComponent={{
                bottom: <div className="h-2 w-full bg-border hover:bg-primary/50 transition-colors cursor-ns-resize"></div>
              }}
            >
              <div className="absolute inset-0 overflow-hidden">
                <CodeEditor
                  initialCode={code}
                  onChange={handleCodeChange}
                  className="h-full"
                  language={selectedLanguage}
                  onLanguageChange={handleLanguageChange}
                  ref={editorRef}
                  onRunTests={() => {
                    // Use the data attribute to click the hidden button
                    const testRunnerElement = document.querySelector('[data-testrunner-run-button]');
                    if (testRunnerElement) {
                      (testRunnerElement as HTMLButtonElement).click();
                    }
                  }}
                  onSubmitSolution={() => {
                    // Use the data attribute to click the hidden button
                    const testRunnerElement = document.querySelector('[data-testrunner-submit-button]');
                    if (testRunnerElement) {
                      (testRunnerElement as HTMLButtonElement).click();
                    }
                  }}
                  isRunning={isRunning}
                />
              </div>
            </Resizable>

            {/* Test Runner */}
            <div className="flex-1 min-h-0 overflow-hidden border-t">
              <TestRunner
                code={code}
                testCases={testCases}
                problemId={problemId}
                onRunComplete={() => {}}
                language={selectedLanguage}
                isRunning={isRunning}
                setIsRunning={setIsRunning}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 