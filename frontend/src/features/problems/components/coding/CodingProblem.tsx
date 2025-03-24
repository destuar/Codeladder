import { useState, useRef } from 'react';
import { Card } from "@/components/ui/card";
import { Markdown } from "@/components/ui/markdown";
import { HtmlContent } from "@/components/ui/html-content";
import { isMarkdown } from "@/lib/markdown-to-html";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from '@/lib/utils';
import { Badge } from "@/components/ui/badge";
import { Timer } from "lucide-react";
import { CodingProblemProps } from '../../types';
import { ResizablePanel } from './ResizablePanel';
import { ProblemTimer } from './timer/ProblemTimer';
import { CodeEditor, CodeEditorRef } from './editor/CodeEditor';
import { TestRunner } from './test-runner/TestRunner';
import { ProblemHeader } from '@/features/problems/components/coding/ProblemHeader';
import { useProblemCompletion } from '@/features/problems/hooks/useProblemCompletion';
import { formatEstimatedTime } from '../../utils/time';
import { SupportedLanguage } from '../../types/coding';
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
  sourceContext,
}: CodingProblemProps) {
  const [leftPanelWidth, setLeftPanelWidth] = useState(window.innerWidth * 0.4);
  const [editorHeight, setEditorHeight] = useState(DEFAULT_EDITOR_HEIGHT);
  const [code, setCode] = useState(codeTemplate || "");
  const [selectedLanguage, setSelectedLanguage] = useState<SupportedLanguage>('javascript');
  
  // Add ref for the code editor component
  const editorRef = useRef<CodeEditorRef>(null);

  const {
    isProblemCompleted,
    handleMarkAsComplete
  } = useProblemCompletion(problemId, isCompleted, onCompleted, isReviewMode);

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

  // Modified handler for code editor
  const handleCodeChange = (newCode: string) => {
    setCode(newCode);
  };

  // Handle language changes
  const handleLanguageChange = (language: string) => {
    setSelectedLanguage(language as SupportedLanguage);
  };

  return (
    <div className="flex flex-col bg-background h-screen">
      <ProblemHeader
        isCompleted={isProblemCompleted}
        onMarkComplete={handleMarkAsComplete}
        nextProblemId={nextProblemId}
        nextProblemSlug={nextProblemSlug}
        prevProblemId={prevProblemId}
        prevProblemSlug={prevProblemSlug}
        onNavigate={onNavigate}
        title={title}
        sourceContext={sourceContext}
      />

      <div className="flex flex-1 min-h-0">
        {/* Left panel - Problem description */}
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
              onLanguageChange={handleLanguageChange}
            />
          </div>
        </div>
      </div>
    </div>
  );
} 