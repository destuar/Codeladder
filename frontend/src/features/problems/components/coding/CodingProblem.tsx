import { useState, useRef, useMemo, useCallback, useEffect } from 'react';
import { Card } from "@/components/ui/card";
import { Markdown } from "@/components/ui/markdown";
import { HtmlContent } from "@/components/ui/html-content";
import { isMarkdown } from "@/lib/markdown-to-html";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from '@/lib/utils';
import { Badge } from "@/components/ui/badge";
import { Timer, RepeatIcon, FileText, Clipboard, History } from "lucide-react";
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
import { SupportedLanguage, LANGUAGE_CONFIGS, TestCase as TestCaseType } from "../../types/coding";
import { Resizable } from "re-resizable";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SubmissionsTab } from './submissions/SubmissionsTab';
import { api } from '@/lib/api';
import { logger } from '@/lib/logger';

const MIN_PANEL_WIDTH = 300;
const MAX_PANEL_WIDTH = 800;
const DEFAULT_EDITOR_HEIGHT = 500; // px
const MIN_EDITOR_HEIGHT = 200; // px

const getLocalStorageKeyForCodes = (problemId: string) => `problem-${problemId}-languageCodes`;

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
  const editorRef = useRef<any>(null);
  const [leftPanelTab, setLeftPanelTab] = useState("description");
  const [functionParams, setFunctionParams] = useState<{ name: string; type: string }[]>([]);
  const [problemDetails, setProblemDetails] = useState<any>(null);

  const parsedOfficialTestCases = useMemo(() => {
    if (!testCasesString) return [];
    try {
      const parsed = typeof testCasesString === 'string' 
        ? JSON.parse(testCasesString) 
        : testCasesString;
      return Array.isArray(parsed) ? parsed.map(tc => ({...tc})) as TestCaseType[] : [];
    } catch (e) {
      logger.error('Error parsing test cases', e);
      return [];
    }
  }, [testCasesString]);

  // Effect to save languageCodes to LocalStorage whenever it or problemId changes
  useEffect(() => {
    if (problemId) {
      localStorage.setItem(getLocalStorageKeyForCodes(problemId), JSON.stringify(languageCodes));
    }
  }, [languageCodes, problemId]);

  // Effect for initial problem load (fetching data and setting initial language)
  useEffect(() => {
    const fetchProblem = async () => {
      if (!problemId) return;
      try {
        const response = await api.get(`/problems/${problemId}`);
        setProblemDetails(response);

        let initialLang = response.codeProblem?.defaultLanguage || 'python';
        // Check if there's already code for this initialLang in languageCodes (from LocalStorage)
        // If not, setSelectedLanguage will trigger the code-setting useEffect to load a template.
        setSelectedLanguage(initialLang as SupportedLanguage);

        if (response.codeProblem?.params) {
          try {
            let params = response.codeProblem.params;
            if (typeof params === 'string') params = JSON.parse(params);
            if (Array.isArray(params)) setFunctionParams(params);
          } catch (err) { 
            logger.error('Error parsing function parameters', err); 
          }
        }
      } catch (error) {
        logger.error('Failed to fetch problem', error);
        setCode('// Failed to load problem template.');
      }
    };

    if (problemId) {
      // Load from LocalStorage first (done in useState initializer for languageCodes)
      // Then fetch problem details which might provide templates for languages not in LocalStorage
      fetchProblem();
    } else {
      // For new problem (no problemId), selectedLanguage is 'python' by default.
      // The code-setting useEffect will handle loading initial code/template for this selectedLanguage.
      // This ensures code state is initialized even if there's no problemId for LocalStorage.
      if (!languageCodes[selectedLanguage]) { // If no stored code for default python on a new problem
        const initialNewProblemCode = codeTemplate || LANGUAGE_CONFIGS[selectedLanguage]?.defaultTemplate || '';
        setCode(initialNewProblemCode);
        // Also update languageCodes so it can be potentially saved if problemId becomes available later (though less likely flow)
        setLanguageCodes(prev => ({...prev, [selectedLanguage]: initialNewProblemCode }));
      }
    }
  }, [problemId]); // Removed languageCodes from here to avoid re-triggering by its own update

  // Effect to manage and display code based on selected language, problemDetails, and languageCodes (from LocalStorage or memory)
  useEffect(() => {
    let newCodeContent: string | undefined = undefined;
    let updateLanguageCache = false; // Flag to indicate if languageCodes should be updated with a new template

    if (languageCodes[selectedLanguage] !== undefined) {
      newCodeContent = languageCodes[selectedLanguage]!;
    } else if (problemDetails) {
      newCodeContent = getLanguageTemplate(problemDetails, selectedLanguage);
      updateLanguageCache = true; 
    } else if (!problemId) { // New problem, no problemDetails yet, and no code in languageCodes for selectedLang
      // Use codeTemplate prop if it's for the current selectedLanguage (assume python if not specified), otherwise default config.
      const primaryLangForPropTemplate = 'python'; // Assuming codeTemplate prop is for Python on a new problem
      if (codeTemplate && selectedLanguage === primaryLangForPropTemplate) {
        newCodeContent = codeTemplate;
      } else {
        newCodeContent = LANGUAGE_CONFIGS[selectedLanguage]?.defaultTemplate || '';
      }
      updateLanguageCache = true;
    }

    if (newCodeContent !== undefined) {
      setCode(newCodeContent); // Update the editor's displayed code
      if (updateLanguageCache) {
        // Update languageCodes state if a new template was loaded (and not already in languageCodes)
        // This will then be picked up by the LocalStorage saving effect.
        setLanguageCodes(prev => {
            if (prev[selectedLanguage] === undefined) { // Only update if we just loaded a template for an empty slot
                return { ...prev, [selectedLanguage]: newCodeContent };
            }
            return prev; // Otherwise, no change needed, user's typed code (already in languageCodes) is preserved
        });
      }
    }
  }, [selectedLanguage, problemDetails, problemId, codeTemplate, languageCodes]); // Added languageCodes to deps

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

  // Helper function to get language template from problem data
  const getLanguageTemplate = (problem: any, language: string): string => {
    if (!problem?.codeProblem) return LANGUAGE_CONFIGS[language as SupportedLanguage]?.defaultTemplate || '';
    const langSupport = problem.codeProblem.languageSupport;
    if (langSupport && typeof langSupport === 'object' && langSupport[language]?.template) {
      return langSupport[language].template;
    }
    // Fallback to a generic default if specific template isn't found in languageSupport
    return LANGUAGE_CONFIGS[language as SupportedLanguage]?.defaultTemplate || '';
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
                <TabsList className="bg-muted">
                  <TabsTrigger value="description" className="flex items-center gap-1">
                    <FileText className="h-4 w-4" />
                    <span>Description</span>
                  </TabsTrigger>
                  <TabsTrigger value="submissions" className="flex items-center gap-1">
                    <History className="h-4 w-4" />
                    <span>Submissions</span>
                  </TabsTrigger>
                </TabsList>
              </div>
            
              <TabsContent value="description" className="h-full flex-1 overflow-hidden m-0 p-0">
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
              </TabsContent>
              
              <TabsContent value="submissions" className="h-full flex-1 overflow-hidden m-0 p-0">
                <SubmissionsTab problemId={problemId} />
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

            {/* Test Runner - with function params */}
            <div className="flex-1 min-h-0 overflow-hidden">
              <TestRunner
                code={code}
                officialTestCases={parsedOfficialTestCases}
                problemId={problemId}
                onRunComplete={() => {}}
                onAllTestsPassed={() => {
                  if (!hookIsCompleted) {
                    logger.debug('All tests passed, automatically marking problem as complete');
                    hookHandleMarkComplete();
                    toast.success('Congratulations! All tests passed. Problem automatically marked as complete! 🎉');
                  }
                }}
                language={selectedLanguage}
                isRunning={isRunning}
                setIsRunning={setIsRunning}
                functionParams={functionParams}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 