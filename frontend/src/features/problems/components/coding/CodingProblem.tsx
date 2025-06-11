import { useState, useRef, useMemo, useCallback, useEffect } from 'react';
import { Card } from "@/components/ui/card";
import { Markdown } from "@/components/ui/markdown";
import { HtmlContent } from "@/components/ui/html-content";
import { isMarkdown } from "@/lib/markdown-to-html";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from '@/lib/utils';
import { Badge } from "@/components/ui/badge";
import { Timer, RepeatIcon, FileText, Clipboard, History, BookCheck, Play, Send, Loader2 } from "lucide-react";
import { CodingProblemProps } from '../../types';
import { ResizablePanel } from './ResizablePanel';
import { ProblemTimer } from './timer/ProblemTimer';
import { CodeEditor, CodeEditorRef } from './editor/CodeEditor';
import { TestRunner } from './test-runner/TestRunner';
import { ProblemHeader } from '@/features/problems/components/coding/ProblemHeader';
import { ProblemHeaderProps } from '@/features/problems/components/coding/ProblemHeader';
import { useProblemCompletion } from '@/features/problems/hooks/useProblemCompletion';
import { formatEstimatedTime } from '../../utils/time';
import { DifficultyBadge } from '@/features/problems/components/DifficultyBadge';
import { Difficulty } from '../../types';
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
import { SupportedLanguage, LANGUAGE_CONFIGS, TestCase as TestCaseType } from "../../types/coding";
import { Resizable } from "re-resizable";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SubmissionsTab } from './submissions/SubmissionsTab';
import { api } from '@/lib/api';
import { logger } from '@/lib/logger';
import { Light as SyntaxHighlighter } from 'react-syntax-highlighter';
import { atomOneDark } from 'react-syntax-highlighter/dist/esm/styles/hljs';
import python from 'react-syntax-highlighter/dist/esm/languages/hljs/python';
import javascript from 'react-syntax-highlighter/dist/esm/languages/hljs/javascript';
import java from 'react-syntax-highlighter/dist/esm/languages/hljs/java';
import csharp from 'react-syntax-highlighter/dist/esm/languages/hljs/csharp';
import cpp from 'react-syntax-highlighter/dist/esm/languages/hljs/cpp';

SyntaxHighlighter.registerLanguage('python', python);
SyntaxHighlighter.registerLanguage('javascript', javascript);
SyntaxHighlighter.registerLanguage('java', java);
SyntaxHighlighter.registerLanguage('csharp', csharp);
SyntaxHighlighter.registerLanguage('cpp', cpp);

const MIN_PANEL_WIDTH = 300;
const MAX_PANEL_WIDTH = 800;
const DEFAULT_EDITOR_HEIGHT = 500; // px
const MIN_EDITOR_HEIGHT = 200; // px
const TAB_TEXT_VISIBILITY_THRESHOLD = 380; // px, hide text below this width

const getLocalStorageKeyForCodes = (problemId: string) => `problem-${problemId}-languageCodes`;

/**
 * Main component for the coding problem interface
 */
export default function CodingProblem({
  title,
  content,
  codeProblem,
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
  const [selectedLanguage, setSelectedLanguage] = useState<SupportedLanguage>(
    (codeProblem.defaultLanguage as SupportedLanguage) || 'python'
  );
  const [languageCodes, setLanguageCodes] = useState<{ [key in SupportedLanguage]?: string }>(() => {
    if (problemId) {
      const storedCodes = localStorage.getItem(getLocalStorageKeyForCodes(problemId));
      try {
        return storedCodes ? JSON.parse(storedCodes) : {};
      } catch (e) {
        logger.error("Failed to parse stored language codes", e);
        return {};
      }
    }
    return {};
  });
  const [code, setCode] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const editorRef = useRef<any>(null);
  const [leftPanelTab, setLeftPanelTab] = useState("description");
  const [functionParams, setFunctionParams] = useState<{ name: string; type: string }[]>(() => {
    if (codeProblem?.params) {
      try {
        let params = codeProblem.params;
        if (typeof params === 'string') params = JSON.parse(params);
        if (Array.isArray(params)) return params;
      } catch (err) {
        logger.error('Error parsing function parameters', err);
      }
    }
    return [];
  });

  const showTabText = leftPanelWidth >= TAB_TEXT_VISIBILITY_THRESHOLD;

  const parsedOfficialTestCases = useMemo(() => {
    if (!codeProblem.testCases) return [];
    try {
        // The test cases are already an object array from the prop
        return Array.isArray(codeProblem.testCases) ? codeProblem.testCases.map(tc => ({...tc})) as TestCaseType[] : [];
    } catch (e) {
        logger.error('Error parsing test cases', e);
        return [];
    }
  }, [codeProblem.testCases]);

  // Effect to save languageCodes to LocalStorage whenever it or problemId changes
  useEffect(() => {
    if (problemId) {
      localStorage.setItem(getLocalStorageKeyForCodes(problemId), JSON.stringify(languageCodes));
    }
  }, [languageCodes, problemId]);
  
  // Helper function to get language template from problem data
  const getLanguageTemplate = (cp: typeof codeProblem, language: string): string => {
    if (!cp) return LANGUAGE_CONFIGS[language as SupportedLanguage]?.defaultTemplate || '';
    const langSupport = cp.languageSupport;
    if (langSupport && typeof langSupport === 'object' && langSupport[language]?.template) {
        return langSupport[language].template;
    }
    // Fallback for older problem formats or if languageSupport is not defined
    if (language === 'python' && typeof cp.codeTemplate === 'string') {
        return cp.codeTemplate;
    }
    // Generic fallback
    return LANGUAGE_CONFIGS[language as SupportedLanguage]?.defaultTemplate || '';
  };

  // Effect to manage and display code based on selected language
  useEffect(() => {
    let newCodeContent: string | undefined = undefined;

    // 1. Prioritize code already worked on (from LocalStorage/state)
    if (languageCodes[selectedLanguage] !== undefined) {
      newCodeContent = languageCodes[selectedLanguage]!;
    } 
    // 2. Otherwise, get the template for the selected language from the problem data
    else {
      newCodeContent = getLanguageTemplate(codeProblem, selectedLanguage);
      
      // Update languageCodes state with the new template so it's not lost on language switch
       setLanguageCodes(prev => ({ ...prev, [selectedLanguage]: newCodeContent }));
    }

    if (newCodeContent !== undefined) {
      setCode(newCodeContent); // Update the editor's displayed code
    }
  }, [selectedLanguage, codeProblem, languageCodes]);

  const { 
    isProblemCompleted: hookIsCompleted, 
    handleMarkAsComplete: hookHandleMarkComplete 
  } = useProblemCompletion(problemId, isCompleted, onCompleted, isReviewMode);

  const handleCodeChange = useCallback((newCode: string) => {
    setCode(newCode); 
    setLanguageCodes(prev => ({ ...prev, [selectedLanguage]: newCode })); // This triggers LocalStorage save
    onCodeChange?.(newCode);
  }, [selectedLanguage, onCodeChange]);

  const handleLanguageChange = useCallback((language: string) => {
    setSelectedLanguage(language as SupportedLanguage);
  }, []);

  // Handle navigation
  const handleNavigate = useCallback((id: string, slug?: string) => {
    if (onNavigate) {
      onNavigate(id, slug);
    }
  }, [onNavigate]);

  // Format estimated time
  const formattedTime = useMemo(() => {
    if (!estimatedTime) return null;
    const minutes = Math.round(estimatedTime);
    return `${minutes} min${minutes !== 1 ? 's' : ''}`;
  }, [estimatedTime]);

  const solutionData = useMemo(() => {
    const defaultResult = { reference: null, explanation: null };
    
    if (!codeProblem) return defaultResult;

    const langSupport = codeProblem.languageSupport?.[selectedLanguage];
    if (langSupport) {
      return {
        reference: langSupport.reference || null,
        explanation: langSupport.solution || null
      };
    }

    // Fallback for older data structures
    const reference = codeProblem.referenceImplementations?.[selectedLanguage] || null;
    return { reference, explanation: null };

  }, [codeProblem, selectedLanguage]);

  const handleRunClick = () => {
    setIsSubmitting(false);
    document.querySelector<HTMLButtonElement>('[data-testrunner-run-button]')?.click();
  };

  const handleSubmitClick = () => {
    setIsSubmitting(true);
    document.querySelector<HTMLButtonElement>('[data-testrunner-submit-button]')?.click();
  };

  const handleSubmissionComplete = () => {
    setIsSubmitting(false);
  };

  const handleResetCode = () => {
    const template = getLanguageTemplate(codeProblem, selectedLanguage);
    setCode(template);
  };

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
            className="h-full dark:border-transparent border-r border-border"
          >
            <Tabs value={leftPanelTab} onValueChange={setLeftPanelTab} className="h-full flex flex-col">
              <div className="px-4 py-2 bg-muted/20 flex-shrink-0 dark:border-transparent border-b border-border">
                <TabsList className="bg-muted grid w-full grid-cols-3">
                  <TabsTrigger value="description" className="flex items-center gap-1">
                    <FileText className="h-4 w-4" />
                    {showTabText && <span>Description</span>}
                  </TabsTrigger>
                  <TabsTrigger value="submissions" className="flex items-center gap-1">
                    <History className="h-4 w-4" />
                    {showTabText && <span>Submissions</span>}
                  </TabsTrigger>
                  <TabsTrigger value="solution" className="flex items-center gap-1">
                    <BookCheck className="h-4 w-4" />
                    {showTabText && <span>Solution</span>}
                  </TabsTrigger>
                </TabsList>
              </div>
            
              <TabsContent value="description" className="h-full flex-1 overflow-hidden m-0 p-0">
                <ScrollArea className="h-full" type="hover">
                  <div className="p-6 space-y-6 w-full">
                    <div className="space-y-4">
                      <h1 className="text-3xl font-bold">{title}</h1>
                      <div className="flex items-center gap-2">
                        {difficulty && <DifficultyBadge difficulty={difficulty as Difficulty} size="small" />}
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
                        <div className="prose dark:prose-invert max-w-full overflow-hidden">
                          <Markdown 
                            content={content}
                            className="max-w-full [&_pre]:!whitespace-pre-wrap [&_pre]:!break-words [&_code]:!whitespace-pre-wrap [&_code]:!break-words [&_pre]:!max-w-full [&_pre]:!overflow-x-auto"
                          />
                        </div>
                      ) : (
                        <div className="prose dark:prose-invert max-w-full">
                          <HtmlContent content={content} />
                        </div>
                      )}
                    </div>
                  </div>
                </ScrollArea>
              </TabsContent>
              
              <TabsContent value="submissions" className="h-full flex-1 overflow-hidden m-0 p-0">
                <SubmissionsTab problemId={problemId} />
              </TabsContent>

              <TabsContent value="solution" className="h-full flex-1 overflow-hidden m-0 p-0">
                <ScrollArea className="h-full" type="hover">
                  <div className="p-6 space-y-6">
                    <h2 className="text-2xl font-bold">Solution</h2>
                    
                    {solutionData.reference ? (
                      <div>
                        <h3 className="text-xl font-semibold mb-2">Reference Implementation</h3>
                        <SyntaxHighlighter 
                          language={selectedLanguage} 
                          style={atomOneDark}
                          customStyle={{
                            background: 'var(--color-background-secondary, #2d2d2d)',
                            borderRadius: '0.5rem',
                            padding: '1rem',
                            fontSize: '0.9rem',
                            overflowY: 'auto'
                          }}
                          showLineNumbers
                          wrapLines
                          lineProps={{style: {wordBreak: 'break-all', whiteSpace: 'pre-wrap'}}}
                        >
                          {solutionData.reference}
                        </SyntaxHighlighter>
                      </div>
                    ) : (
                      <div className="text-muted-foreground italic mt-4">
                        The reference implementation for {LANGUAGE_CONFIGS[selectedLanguage]?.label || selectedLanguage} is not available yet.
                      </div>
                    )}

                    {solutionData.explanation && (
                       <div className="mt-6">
                         <HtmlContent content={solutionData.explanation} className="prose dark:prose-invert max-w-full" />
                       </div>
                    )}

                    {!solutionData.explanation && !solutionData.reference && (
                       <div className="text-muted-foreground italic">
                        The solution for {LANGUAGE_CONFIGS[selectedLanguage]?.label || selectedLanguage} is not available yet.
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </TabsContent>
            </Tabs>
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
                bottom: <div className="h-2 w-full bg-border dark:bg-muted/50 hover:bg-primary/50 transition-colors cursor-ns-resize"></div>
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
                  onRunTests={handleRunClick}
                  onSubmitSolution={handleSubmitClick}
                  isRunning={isRunning}
                  isSubmitting={isSubmitting}
                />
              </div>
            </Resizable>

            {/* Test Runner - with function params */}
            <div className="flex-1 min-h-0 overflow-hidden">
              <TestRunner
                code={code}
                officialTestCases={parsedOfficialTestCases}
                problemId={problemId}
                onAllTestsPassed={hookHandleMarkComplete}
                language={selectedLanguage}
                isRunning={isRunning}
                setIsRunning={setIsRunning}
                functionParams={functionParams}
                onSubmissionComplete={handleSubmissionComplete}
                isCompleted={hookIsCompleted}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Reset code dialog */}
      <AlertDialog open={false} onOpenChange={() => {}}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reset Code</AlertDialogTitle>
            <AlertDialogDescription>
              <p>This will reset your code to the default template. Are you sure?</p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleResetCode}>Reset</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
} 