/**
 * Input/expected test case pair
 */
export interface TestCase {
  id?: string;
  functionName?: string;
  functionParams?: FunctionParameter[];
  input: any[];
  expected: any;
  isHidden?: boolean;
}

/**
 * Result of a test case execution
 */
export interface TestResult {
  input: any[];
  output: any;
  expected: any;
  passed: boolean;
  runtime?: number;
  memory?: number;
  error?: string;
  compilationOutput?: string;
  statusDescription?: string;
  statusId?: number;
  exitCode?: number;
  isCustom?: boolean;
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
 * Function parameter definition
 */
export interface FunctionParameter {
  name: string;
  type: string;
  description?: string;
}

/**
 * Language configuration
 */
export interface LanguageConfig {
  label: string;
  monacoLanguage: string;
  defaultTemplate: string;
}

/**
 * Language data structure
 */
export interface LanguageData {
  enabled: boolean;
  template: string;
  reference: string;
}

// Supported language types
export type SupportedLanguage = 'javascript' | 'python' | 'java' | 'cpp' | 'typescript';

// Language configurations for the Monaco editor
export const LANGUAGE_CONFIGS: Record<SupportedLanguage, LanguageConfig> = {
  javascript: {
    label: 'JavaScript',
    monacoLanguage: 'javascript',
    defaultTemplate: 'function solution() {\n  // Write your code here\n}',
  },
  python: {
    label: 'Python',
    monacoLanguage: 'python',
    defaultTemplate: 'def solution():\n    # Write your code here\n    pass',
  },
  java: {
    label: 'Java',
    monacoLanguage: 'java',
    defaultTemplate: 'class Solution {\n    public static void solution() {\n        // Write your code here\n    }\n}',
  },
  cpp: {
    label: 'C++',
    monacoLanguage: 'cpp',
    defaultTemplate: '#include <iostream>\n\nvoid solution() {\n    // Write your code here\n}',
  },
  typescript: {
    label: 'TypeScript',
    monacoLanguage: 'typescript',
    defaultTemplate: 'function solution(): void {\n  // Write your code here\n}',
  },
};

// List of supported languages for dropdown selection
export const SUPPORTED_LANGUAGES = Object.entries(LANGUAGE_CONFIGS).map(([value, config]) => ({
  value: value as SupportedLanguage,
  label: config.label,
})); 