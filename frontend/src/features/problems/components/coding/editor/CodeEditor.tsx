import { useRef } from 'react';
import Editor, { EditorProps } from "@monaco-editor/react";
import { useEditor } from './useEditor';

interface CodeEditorProps {
  initialCode?: string;
  onChange?: (code: string) => void;
  className?: string;
}

const DEFAULT_EDITOR_OPTIONS: EditorProps['options'] = {
  minimap: { enabled: false },
  fontSize: 14,
  lineNumbers: 'on' as const,
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
};

/**
 * Monaco editor component with proper theme handling and layout management
 */
export function CodeEditor({ 
  initialCode,
  onChange,
  className 
}: CodeEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const {
    editorRef,
    code,
    setCode,
    isDarkMode,
    handleEditorDidMount,
  } = useEditor(initialCode);

  const handleCodeChange = (value: string | undefined) => {
    const newCode = value || "";
    setCode(newCode);
    onChange?.(newCode);
  };

  return (
    <div ref={containerRef} className={className}>
      <Editor
        height="100%"
        defaultLanguage="javascript"
        theme={isDarkMode ? "vs-dark" : "vs-light"}
        value={code}
        onChange={handleCodeChange}
        onMount={handleEditorDidMount}
        options={DEFAULT_EDITOR_OPTIONS}
        className="absolute inset-0"
      />
    </div>
  );
} 