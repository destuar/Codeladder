export interface TestCase {
  input: any[];
  expected: any;
}

export interface TestResult {
  passed: boolean;
  input: any[];
  expected: any;
  output?: any;
  runtime?: number;
  memory?: number;
}

export interface CodingProblemProps {
  title: string;
  content: string;
  codeTemplate?: string;
  testCases?: string;
  difficulty: string;
  nextProblemId?: string;
  prevProblemId?: string;
  onNavigate: (id: string) => void;
  estimatedTime?: number;
  isCompleted?: boolean;
  problemId: string;
}

export interface EditorConfig {
  language: string;
  theme: string;
  options: {
    [key: string]: any;
  };
}

export interface ResizablePanelProps {
  defaultWidth: number;
  minWidth: number;
  maxWidth: number;
  children: React.ReactNode;
  onResize?: (width: number) => void;
  className?: string;
} 