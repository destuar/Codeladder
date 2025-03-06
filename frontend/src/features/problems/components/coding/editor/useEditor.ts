import { useRef, useEffect, useState } from 'react';
import { EditorConfig } from '../../../types/coding';

interface UseEditorResult {
  editorRef: React.MutableRefObject<any>;
  code: string;
  setCode: (code: string) => void;
  isDarkMode: boolean;
  handleEditorDidMount: (editor: any) => void;
  updateLayout: () => void;
}

/**
 * Custom hook for managing Monaco editor state and configuration
 */
export function useEditor(
  initialCode: string = "function solution() {\n  // Write your code here\n}",
  config?: Partial<EditorConfig>
): UseEditorResult {
  const [code, setCode] = useState(initialCode);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const editorRef = useRef<any>(null);

  // Handle editor mounting
  const handleEditorDidMount = (editor: any) => {
    editorRef.current = editor;
    // Initial layout
    requestAnimationFrame(() => {
      editor.layout();
    });
  };

  // Update editor layout
  const updateLayout = () => {
    if (editorRef.current) {
      requestAnimationFrame(() => {
        editorRef.current.layout();
      });
    }
  };

  // Monitor theme changes
  useEffect(() => {
    const isDark = document.documentElement.classList.contains('dark');
    setIsDarkMode(isDark);

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

  // Handle window resizing
  useEffect(() => {
    const handleResize = () => updateLayout();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return {
    editorRef,
    code,
    setCode,
    isDarkMode,
    handleEditorDidMount,
    updateLayout,
  };
} 