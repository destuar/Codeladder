import React, { useRef, forwardRef, useImperativeHandle } from 'react';
import Editor, { EditorProps } from "@monaco-editor/react";
import { useEditor } from './useEditor';
import { LANGUAGE_CONFIGS, SUPPORTED_LANGUAGES, SupportedLanguage } from '../../../types/coding';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Play, Send, RotateCcw, Sun, Moon, Eye, EyeOff, Maximize2, Minimize2, Loader2 } from "lucide-react";
import { LoadingSpinner } from '@/components/ui/loading-spinner';

interface CodeEditorProps {
  initialCode?: string;
  onChange?: (code: string) => void;
  className?: string;
  language?: SupportedLanguage;
  onLanguageChange?: (language: string) => void;
  onRunTests?: () => void;
  onSubmitSolution?: () => void;
  isRunning?: boolean;
  isSubmitting?: boolean;
}

export interface CodeEditorRef {
  updateLayout: () => void;
}

const DEFAULT_EDITOR_OPTIONS: EditorProps['options'] = {
  minimap: { enabled: false },
  fontSize: 14,
  lineNumbers: 'on' as const,
  scrollBeyondLastLine: false,
  automaticLayout: true,
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
};

/**
 * Monaco editor component with proper theme handling and layout management
 */
export const CodeEditor = forwardRef<CodeEditorRef, CodeEditorProps>(({ 
  initialCode,
  onChange,
  className,
  language = 'javascript',
  onLanguageChange,
  onRunTests,
  onSubmitSolution,
  isRunning = false,
  isSubmitting = false
}, ref) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const {
    editorRef,
    code,
    setCode,
    isDarkMode,
    handleEditorDidMount,
    updateLayout,
  } = useEditor(initialCode);

  // Expose methods to parent components via ref
  useImperativeHandle(ref, () => ({
    updateLayout
  }));

  const handleCodeChange = (value: string | undefined) => {
    const newCode = value || "";
    setCode(newCode);
    onChange?.(newCode);
  };

  const handleLanguageChange = (newLanguage: string) => {
    onLanguageChange?.(newLanguage);
  };

  // Get the Monaco language name from the selected language
  const monacoLanguage = LANGUAGE_CONFIGS[language]?.monacoLanguage || 'javascript';

  return (
    <div ref={containerRef} className={`flex flex-col overflow-hidden ${className}`}>
      {/* Editor header with language selector */}
      <div className="flex items-center justify-between px-4 py-2 bg-muted/20 flex-shrink-0 dark:border-transparent border-b border-border">
        <h3 className="text-sm font-medium">Code Editor</h3>
        {onLanguageChange && (
          <div className="flex items-center space-x-2">
            <span className="text-xs text-muted-foreground">Language:</span>
            <Select
              value={language}
              onValueChange={handleLanguageChange}
            >
              <SelectTrigger className="w-[130px] h-8 text-xs">
                <SelectValue placeholder="Select Language" />
              </SelectTrigger>
              <SelectContent>
                {SUPPORTED_LANGUAGES.map((lang) => (
                  <SelectItem key={lang.value} value={lang.value}>
                    {lang.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>
      
      {/* Monaco Editor */}
      <div className="flex-1 relative min-h-0">
        <Editor
          height="100%"
          language={monacoLanguage}
          theme={isDarkMode ? "vs-dark" : "vs-light"}
          value={code}
          onChange={handleCodeChange}
          onMount={handleEditorDidMount}
          options={DEFAULT_EDITOR_OPTIONS}
          className="absolute inset-0"
          key={language}
        />
        
        {/* Run and Submit buttons */}
        {onRunTests && onSubmitSolution && (
          <div className="absolute bottom-4 right-4 flex gap-2 z-10">
            <Button 
              onClick={onRunTests} 
              disabled={isRunning}
              variant="outline"
              className="h-9 rounded-md px-4 text-sm gap-2 dark:border-transparent dark:bg-white/10 dark:hover:bg-white/20"
            >
              {isRunning && !isSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Play className="h-4 w-4" />
                  <span>Run</span>
                </>
              )}
            </Button>

            <Button 
              onClick={onSubmitSolution} 
              disabled={isRunning}
              className="h-9 rounded-md px-3 text-sm gap-2 bg-[#5271FF] hover:bg-[#415ACC] text-white"
            >
              {isRunning && isSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  <span>Submit</span>
                </>
              )}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}); 