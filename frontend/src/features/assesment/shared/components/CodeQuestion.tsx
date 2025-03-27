import React, { useState, useRef, useCallback } from 'react';
import { AssessmentQuestion, TestResult } from '../types';
import { Markdown } from "@/components/ui/markdown";
import { HtmlContent } from "@/components/ui/html-content";
import { isMarkdown } from "@/lib/markdown-to-html";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from '@/lib/utils';
import { Badge } from "@/components/ui/badge";
import { Timer } from "lucide-react";
import { CodeEditor } from '@/features/problems/components/coding/editor/CodeEditor';
import { TestRunner } from '@/features/problems/components/coding/test-runner/TestRunner';
import { Resizable } from "re-resizable";
import { SupportedLanguage } from '@/features/problems/types/coding';

// Constants for code editor layout
const MIN_EDITOR_HEIGHT = 200; // px

interface CodeQuestionProps {
  question: AssessmentQuestion;
  code?: string;
  onCodeChange: (code: string) => void;
  isReview?: boolean;
  testResults?: TestResult[];
  onCompleted?: () => void;
}

export function CodeQuestion({
  question,
  code,
  onCodeChange,
  isReview = false,
  testResults,
  onCompleted = () => {}
}: CodeQuestionProps) {
  if (!question.codeProblem) {
    return <div className="text-destructive">Error: Not a code question</div>;
  }

  const { codeTemplate, testCases, language } = question.codeProblem;
  
  // State for editor
  const [selectedLanguage, setSelectedLanguage] = useState<SupportedLanguage>(language as SupportedLanguage || 'python');
  const [isRunning, setIsRunning] = useState(false);
  const [editorHeight, setEditorHeight] = useState(window.innerHeight * 0.6);
  const editorRef = useRef<any>(null);

  // Format test cases from assessment format to problem format
  const formattedTestCases = JSON.stringify(testCases);

  // Handle code changes
  const handleCodeChange = useCallback((newCode: string) => {
    onCodeChange(newCode);
  }, [onCodeChange]);

  // Handle language changes
  const handleLanguageChange = useCallback((language: string) => {
    setSelectedLanguage(language as SupportedLanguage);
  }, []);
  
  return (
    <div className="h-full flex flex-col flex-1 overflow-hidden">
      {/* Main content area */}
      <div className="flex h-full overflow-hidden">
        {/* Left panel - Question description */}
        <div className="w-2/5 border-r h-full overflow-auto">
          <ScrollArea className="h-full" type="hover">
            <div className="p-4 space-y-4">
              <div className="space-y-2">
                <h2 className="text-xl font-semibold">{question.questionText}</h2>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="font-medium">
                    {question.difficulty || "MEDIUM"}
                  </Badge>
                </div>
              </div>
              
              <div className="max-w-full overflow-hidden">
                {isMarkdown(question.questionText) ? (
                  <div className="prose dark:prose-invert max-w-full overflow-hidden">
                    <Markdown 
                      content={question.questionText}
                      className="max-w-full [&_pre]:!whitespace-pre-wrap [&_pre]:!break-words [&_code]:!whitespace-pre-wrap [&_code]:!break-words [&_pre]:!max-w-full [&_pre]:!overflow-x-auto"
                    />
                  </div>
                ) : (
                  <HtmlContent 
                    content={question.questionText} 
                    className="max-w-full [&_pre]:!whitespace-pre-wrap [&_pre]:!break-words [&_code]:!whitespace-pre-wrap [&_code]:!break-words [&_pre]:!max-w-full [&_pre]:!overflow-x-auto"
                  />
                )}
              </div>
            </div>
          </ScrollArea>
        </div>

        {/* Right panel - Code Editor and Test Runner */}
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
                initialCode={code || codeTemplate || ''}
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
                onSubmitSolution={() => {}}
                isRunning={isRunning}
              />
            </div>
          </Resizable>

          {/* Test Runner */}
          <div className="flex-1 min-h-0 overflow-hidden border-t">
            <TestRunner
              code={code || codeTemplate || ''}
              testCases={JSON.parse(formattedTestCases)}
              problemId={question.id}
              onRunComplete={() => {}}
              language={selectedLanguage}
              onLanguageChange={handleLanguageChange}
              isRunning={isRunning}
              setIsRunning={setIsRunning}
            />
          </div>
        </div>
      </div>
    </div>
  );
} 