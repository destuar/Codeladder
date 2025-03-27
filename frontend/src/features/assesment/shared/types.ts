// Define shared types for assessment features (quizzes and tests)

export interface AssessmentQuestion {
  id: string;
  questionText: string;
  questionType: 'MULTIPLE_CHOICE' | 'CODE';
  type?: 'MULTIPLE_CHOICE' | 'CODE'; // Alias for compatibility
  points: number;
  orderNum?: number;
  difficulty?: string;
  mcProblem?: McProblem;
  codeProblem?: CodeProblem;
}

export interface McProblem {
  questionId: string;
  explanation?: string;
  shuffleOptions: boolean;
  options: McOption[];
}

export interface McOption {
  id: string;
  questionId: string;
  optionText: string;
  isCorrect: boolean;
  explanation?: string;
  orderNum?: number;
}

export interface CodeProblem {
  questionId: string;
  codeTemplate?: string;
  functionName?: string;
  language: string;
  timeLimit: number;
  memoryLimit?: number;
  testCases: TestCase[];
}

export interface TestCase {
  id: string;
  codeProblemId: string;
  input: string;
  expectedOutput: string;
  isHidden: boolean;
  orderNum?: number;
}

export interface McResponse {
  responseId: string;
  selectedOptionId?: string;
}

export interface CodeResponse {
  responseId: string;
  codeSubmission?: string;
  compilationError?: string;
  runtimeError?: string;
  testCasesPassed?: number;
  totalTestCases?: number;
  executionTime?: number;
}

// Test results interface for review
export interface TestResult {
  passed: boolean;
  input: string;
  expectedOutput: string;
  actualOutput?: string;
  error?: string;
} 