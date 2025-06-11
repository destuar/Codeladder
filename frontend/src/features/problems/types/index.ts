import { Topic } from '@/hooks/useLearningPath';

/**
 * Problem difficulty levels in order from easiest to hardest
 */
export type Difficulty = 'BEGINNER' | 'EASY' | 'MEDIUM' | 'HARD';

/**
 * Available problem types
 */
export type ProblemType = 'INFO' | 'CODING' | 'STANDALONE_INFO';

/**
 * Available sort fields for problem lists
 */
export type SortField = 'name' | 'difficulty' | 'order' | 'completed';

/**
 * Sort direction for problem lists
 */
export type SortDirection = 'asc' | 'desc';

/**
 * Main Problem interface used across the application
 */
export interface Problem {
  id: string;
  name: string;
  slug?: string;
  description?: string;
  difficulty: Difficulty;
  required: boolean;
  reqOrder?: number;
  content?: string;
  solution?: string;
  problemType: ProblemType;
  codeTemplate?: string;
  testCases?: TestCase[];
  estimatedTime?: number;
  topic?: Topic;
  topicId?: string;
  codeProblem?: CodeProblemType;
  collections?: { collection: Collection }[];
  collectionIds?: string[];
  createdAt?: string;
  updatedAt?: string;
  progress?: Progress;
  isCompleted?: boolean;
  nextProblemId?: string;
  nextProblemSlug?: string;
  prevProblemId?: string;
  prevProblemSlug?: string;
  spacedRepetitionItems?: Array<{
    id: string;
    reviewLevel?: number;
    reviewScheduledAt?: string;
  }>;
}

/**
 * Collection type for problem categorization
 */
export interface Collection {
  id: string;
  name: string;
  slug?: string;
  description?: string;
}

/**
 * Progress type for tracking user progress on problems
 */
export interface Progress {
  id?: string;
  status?: string;
  reviewLevel?: number;
  reviewScheduledAt?: string;
  lastReviewedAt?: string;
}

/**
 * Props for the ProblemList component
 */
export interface ProblemListProps {
  problems: Problem[];
  isLocked?: boolean;
  canAccessAdmin?: boolean;
  onProblemStart: (problemId: string, slug?: string) => void;
  itemsPerPage?: number;
  showTopicName?: boolean;
  showOrder?: boolean;
  collections?: { id: string; name: string; slug?: string }[];
  selectedCollection?: string;
  onCollectionChange?: (collectionId: string) => void;
  enableSpacedRepetition?: boolean;
}

/**
 * Difficulty order mapping for sorting
 */
export const DIFFICULTY_ORDER: Record<Difficulty, number> = {
  'BEGINNER': 1,
  'EASY': 2,
  'MEDIUM': 3,
  'HARD': 4
};

/**
 * Test case interface for coding problems
 */
export interface TestCase {
  input: any[];
  expected: any;
}

/**
 * Test result interface for coding problems
 */
export interface TestResult {
  passed: boolean;
  input: any[];
  expected: any;
  output?: any;
  runtime?: number;
  memory?: number;
}

/**
 * Props for the CodingProblem component
 */
export interface CodingProblemProps {
  title: string;
  content: string;
  codeProblem: CodeProblemType;
  testCases?: string;
  difficulty: string;
  nextProblemId?: string;
  nextProblemSlug?: string;
  prevProblemId?: string;
  prevProblemSlug?: string;
  onNavigate: (id: string, slug?: string) => void;
  estimatedTime?: number;
  isCompleted?: boolean;
  problemId: string;
  isReviewMode?: boolean;
  onCompleted?: () => void;
  problemType?: string;
  onCodeChange?: (code: string) => void;
  isQuizMode?: boolean;
  sourceContext?: {
    from: string;
    name: string;
    id?: string;
    slug?: string;
  };
}

/**
 * Configuration for the code editor
 */
export interface EditorConfig {
  language: string;
  theme: string;
  options: {
    [key: string]: any;
  };
}

/**
 * Props for the resizable panel component
 */
export interface ResizablePanelProps {
  defaultWidth: number;
  minWidth: number;
  maxWidth: number;
  children: React.ReactNode;
  onResize?: (width: number) => void;
  className?: string;
}

// Renaming to avoid conflict and for clarity
export interface LanguageSupportInfo {
  template: string;
  reference: string;
  solution?: string;
}

// New interfaces for the nested problem types
export interface CodeProblemType {
  questionId?: string;
  codeTemplate: string | null;
  language: string;
  functionName: string | null;
  timeLimit: number | null;
  memoryLimit: number | null;
  testCases?: TestCase[];
  defaultLanguage?: string;
  languageSupport?: { [key: string]: LanguageSupportInfo };
  referenceImplementations?: { [key: string]: string };
  params?: { name: string; type: string }[] | string;
}

export interface InfoProblemType {
  questionId?: string;
  content: string;
} 