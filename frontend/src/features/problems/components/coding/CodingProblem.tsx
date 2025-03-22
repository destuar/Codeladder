import { useState } from 'react';
import { Card } from "@/components/ui/card";
import { Markdown } from "@/components/ui/markdown";
import { HtmlContent } from "@/components/ui/html-content";
import { isMarkdown } from "@/lib/markdown-to-html";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from '@/lib/utils';
import { Badge } from "@/components/ui/badge";
import { Timer, RepeatIcon } from "lucide-react";
import { CodingProblemProps } from '../../types';
import { ResizablePanel } from './ResizablePanel';
import { ProblemTimer } from './timer/ProblemTimer';
import { CodeEditor } from './editor/CodeEditor';
import { TestRunner } from './test-runner/TestRunner';
import { ProblemHeader } from '@/features/problems/components/coding/ProblemHeader';
import { useProblemCompletion } from '@/features/problems/hooks/useProblemCompletion';
import { Console } from "@/components/ui/console";
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

const MIN_PANEL_WIDTH = 300;
const MAX_PANEL_WIDTH = 800;

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
  prevProblemId,
  onNavigate,
  estimatedTime,
  isCompleted = false,
  problemId,
  isReviewMode = false,
  onCompleted,
}: CodingProblemProps) {
  const [activeTab, setActiveTab] = useState("code");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [leftPanelWidth, setLeftPanelWidth] = useState(window.innerWidth * 0.4);
  const [consoleResults, setConsoleResults] = useState([]);
  const [isConsoleOpen, setIsConsoleOpen] = useState(true);
  const [isRunning, setIsRunning] = useState(false);

  const {
    isProblemCompleted,
    handleMarkAsComplete,
    showCompletionDialog,
    setShowCompletionDialog,
    isAddingToSpacedRepetition,
    handleConfirmCompletion,
  } = useProblemCompletion(problemId, isCompleted, onCompleted, isReviewMode, 'CODING');

  // Parse test cases
  const testCases = (() => {
    if (!testCasesString) return [];
    try {
      const jsonString = typeof testCasesString === 'object' 
        ? JSON.stringify(testCasesString)
        : testCasesString;
      return JSON.parse(jsonString);
    } catch (error) {
      console.error('Error parsing test cases:', error);
      return [];
    }
  })();

  const getDifficultyColor = () => {
    if (difficulty.startsWith('EASY')) return "text-green-500";
    if (difficulty === 'MEDIUM') return "text-yellow-500";
    return "text-red-500";
  };

  const formattedTime = formatEstimatedTime(estimatedTime);

  return (
    <div className={cn(
      "flex flex-col bg-background",
      isFullscreen ? "fixed inset-0 z-50" : "h-[calc(100vh-3.5rem)]"
    )}>
      <ProblemHeader
        isCompleted={isProblemCompleted}
        isFullscreen={isFullscreen}
        onToggleFullscreen={() => setIsFullscreen(!isFullscreen)}
        onMarkComplete={handleMarkAsComplete}
        nextProblemId={nextProblemId}
        prevProblemId={prevProblemId}
        onNavigate={onNavigate}
      />

      {/* Spaced Repetition Dialog */}
      <AlertDialog open={showCompletionDialog} onOpenChange={setShowCompletionDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Mark Problem as Completed</AlertDialogTitle>
            <AlertDialogDescription>
              Would you like to add this problem to your spaced repetition dashboard for future practice?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => handleConfirmCompletion(false)}
              className="bg-primary"
            >
              Just Complete
            </AlertDialogAction>
            <Button 
              onClick={() => handleConfirmCompletion(true)}
              disabled={isAddingToSpacedRepetition}
              className="bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              {isAddingToSpacedRepetition ? (
                <>
                  <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  Adding...
                </>
              ) : (
                <>
                  <RepeatIcon className="mr-2 h-4 w-4" />
                  Add to Spaced Repetition
                </>
              )}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="flex flex-1 min-h-0">
        <ResizablePanel
          defaultWidth={leftPanelWidth}
          minWidth={MIN_PANEL_WIDTH}
          maxWidth={MAX_PANEL_WIDTH}
          onResize={setLeftPanelWidth}
          className="border-r"
        >
          <ScrollArea className="h-full" type="hover">
            <div className="p-6 space-y-6 w-full overflow-hidden">
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

        <div className="flex-1 flex flex-col">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
            <div className="border-b px-6">
              <TabsList className="bg-muted">
                <TabsTrigger value="code">Code</TabsTrigger>
                <TabsTrigger value="testcases">Test Cases</TabsTrigger>
              </TabsList>
            </div>

            <div className="flex-1 overflow-hidden">
              <TabsContent value="code" className="h-full data-[state=active]:flex flex-col">
                <CodeEditor
                  initialCode={codeTemplate}
                  className="flex-1 relative"
                />
                <Console
                  results={consoleResults}
                  isOpen={isConsoleOpen}
                  onToggle={() => setIsConsoleOpen(!isConsoleOpen)}
                  onClear={() => setConsoleResults([])}
                  isRunning={isRunning}
                />
              </TabsContent>

              <TabsContent value="testcases" className="h-full data-[state=active]:flex flex-col">
                <TestRunner
                  code={codeTemplate || ""}
                  testCases={testCases}
                />
              </TabsContent>
            </div>
          </Tabs>
        </div>
      </div>
    </div>
  );
} 