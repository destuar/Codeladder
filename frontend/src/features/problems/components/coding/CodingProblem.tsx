import { useState } from 'react';
import { Card } from "@/components/ui/card";
import { Markdown } from "@/components/ui/markdown";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from '@/lib/utils';
import { CodingProblemProps } from '../../types/coding';
import { ResizablePanel } from './ResizablePanel';
import { ProblemTimer } from './timer/ProblemTimer';
import { CodeEditor } from './editor/CodeEditor';
import { TestRunner } from './test-runner/TestRunner';
import { ProblemHeader } from '@/features/problems/components/coding/ProblemHeader';
import { useProblemCompletion } from '@/features/problems/hooks/useProblemCompletion';

const MIN_PANEL_WIDTH = 300;
const MAX_PANEL_WIDTH = 800;

/**
 * Main component for the coding problem interface
 */
export function CodingProblem({
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
}: CodingProblemProps) {
  const [activeTab, setActiveTab] = useState("code");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [leftPanelWidth, setLeftPanelWidth] = useState(window.innerWidth * 0.4);

  const {
    isProblemCompleted,
    handleMarkAsComplete
  } = useProblemCompletion(problemId, isCompleted);

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

  return (
    <div className={cn(
      "flex flex-col bg-background",
      isFullscreen ? "fixed inset-0 z-50" : "h-[calc(100vh-3.5rem)]"
    )}>
      <ProblemHeader
        title={title}
        difficulty={difficulty}
        estimatedTime={estimatedTime}
        isCompleted={isProblemCompleted}
        isFullscreen={isFullscreen}
        onToggleFullscreen={() => setIsFullscreen(!isFullscreen)}
        onMarkComplete={handleMarkAsComplete}
      />

      <div className="flex flex-1 min-h-0">
        <ResizablePanel
          defaultWidth={leftPanelWidth}
          minWidth={MIN_PANEL_WIDTH}
          maxWidth={MAX_PANEL_WIDTH}
          onResize={setLeftPanelWidth}
          className="border-r"
        >
          <ScrollArea className="h-full" type="hover">
            <div className="p-6 space-y-6">
              <div className="prose dark:prose-invert max-w-none overflow-x-auto">
                <Markdown content={content} />
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