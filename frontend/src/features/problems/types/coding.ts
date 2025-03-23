/**
 * Input/expected test case pair
 */
export interface TestCase {
  input: any[];
  expected: any;
  functionName?: string;
}

/**
 * Result of a test case execution
 */
export interface TestResult {
  passed: boolean;
  input: any[];
  expected: any;
  output: any;
  runtime: number;
  memory: number;
  error?: string;
  compilationOutput?: string;
  statusDescription?: string;
  statusId?: number;
  exitCode?: number;
}

/**
 * Custom test case input by the user
 */
export interface CustomTestCase {
  input: string;
  output?: string;
  passed?: boolean;
  error?: string;
}

/**
 * Available programming languages for the code editor
 */
export const SUPPORTED_LANGUAGES = [
  { value: 'javascript', label: 'JavaScript' },
  { value: 'python', label: 'Python' },
  { value: 'java', label: 'Java' },
  { value: 'cpp', label: 'C++' },
  { value: 'typescript', label: 'TypeScript' }
] as const;

export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number]['value'];

/**
 * Language configuration for Monaco editor
 */
export interface LanguageConfig {
  language: SupportedLanguage;
  label: string;
  monacoLanguage: string;
  fileExtension: string;
  defaultCode: string;
}

/**
 * Mapping of language to Monaco editor config
 */
export const LANGUAGE_CONFIGS: Record<SupportedLanguage, LanguageConfig> = {
  javascript: {
    language: 'javascript',
    label: 'JavaScript',
    monacoLanguage: 'javascript',
    fileExtension: '.js',
    defaultCode: 'function solution(args) {\n  // Your code here\n  return null;\n}'
  },
  python: {
    language: 'python',
    label: 'Python',
    monacoLanguage: 'python',
    fileExtension: '.py',
    defaultCode: 'def solution(args):\n    # Your code here\n    return None'
  },
  java: {
    language: 'java',
    label: 'Java',
    monacoLanguage: 'java',
    fileExtension: '.java',
    defaultCode: 'class Solution {\n    public static Object solution(Object[] args) {\n        // Your code here\n        return null;\n    }\n}'
  },
  cpp: {
    language: 'cpp',
    label: 'C++',
    monacoLanguage: 'cpp',
    fileExtension: '.cpp',
    defaultCode: '#include <vector>\n\nauto solution(std::vector<void*> args) {\n    // Your code here\n    return nullptr;\n}'
  },
  typescript: {
    language: 'typescript',
    label: 'TypeScript',
    monacoLanguage: 'typescript',
    fileExtension: '.ts',
    defaultCode: 'function solution(args: any[]): any {\n  // Your code here\n  return null;\n}'
  }
}; 