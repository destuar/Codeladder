import { useRef, useEffect, useState, useCallback } from 'react';

// Define EditorConfig interface inline to avoid import error
interface EditorConfig {
  lineNumbers?: boolean;
  minimap?: boolean;
  wordWrap?: boolean;
  fontSize?: number;
}

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
    
    // Set initial layout with a slight delay to ensure container is properly sized
    setTimeout(() => {
      editor.layout();
    }, 100);
  };

  // Update editor layout
  const updateLayout = useCallback(() => {
    if (editorRef.current) {
      // Use both setTimeout and requestAnimationFrame to ensure the layout update
      // happens after the DOM has been updated
      setTimeout(() => {
        requestAnimationFrame(() => {
          if (editorRef.current) {
            editorRef.current.layout();
            
            // Sometimes a second layout call is needed after a brief delay
            // to ensure correct rendering, especially during resizing
            setTimeout(() => {
              if (editorRef.current) {
                editorRef.current.layout();
              }
            }, 10);
          }
        });
      }, 0);
    }
  }, []);

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
    
    // Create a ResizeObserver to detect container size changes
    if (typeof ResizeObserver !== 'undefined') {
      const resizeObserver = new ResizeObserver(() => {
        updateLayout();
      });
      
      // We can't directly observe the editor element since it's created later,
      // but we can observe the parent element if it exists
      const editorContainer = document.querySelector('.monaco-editor')?.parentElement;
      if (editorContainer) {
        resizeObserver.observe(editorContainer);
      }
      
      return () => {
        window.removeEventListener('resize', handleResize);
        resizeObserver.disconnect();
      };
    }
    
    return () => window.removeEventListener('resize', handleResize);
  }, [updateLayout]);

  return {
    editorRef,
    code,
    setCode,
    isDarkMode,
    handleEditorDidMount,
    updateLayout,
  };
} 