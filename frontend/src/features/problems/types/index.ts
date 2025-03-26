import { Topic } from '@/hooks/useLearningPath';

/**
 * Problem difficulty levels in order from easiest to hardest
 */
export type Difficulty = 'EASY_IIII' | 'EASY_III' | 'EASY_II' | 'EASY_I' | 'MEDIUM' | 'HARD';

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
  difficulty: Difficulty;
  problemType?: ProblemType;
  completed?: boolean;
  required?: boolean;
  reqOrder?: number;
  collection?: string[];
  collectionIds?: string[];
  topic?: Topic;
  content?: string;
  codeTemplate?: string;
  testCases?: string;
  nextProblemId?: string;
  nextProblemSlug?: string;
  prevProblemId?: string;
  prevProblemSlug?: string;
  isCompleted?: boolean;
  estimatedTime?: string | number;
  reviewLevel?: number;
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
  'EASY_IIII': 1,
  'EASY_III': 2,
  'EASY_II': 3,
  'EASY_I': 4,
  'MEDIUM': 5,
  'HARD': 6
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
  codeTemplate?: string;
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