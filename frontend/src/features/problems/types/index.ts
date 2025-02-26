import { Topic } from '@/hooks/useLearningPath';

export type Difficulty = 'EASY_IIII' | 'EASY_III' | 'EASY_II' | 'EASY_I' | 'MEDIUM' | 'HARD';
export type SortField = 'name' | 'difficulty' | 'order' | 'completed';
export type SortDirection = 'asc' | 'desc';

export interface Problem {
  id: string;
  name: string;
  difficulty: Difficulty;
  completed: boolean;
  required?: boolean;
  reqOrder?: number;
  topic?: Topic;
}

export interface ProblemListProps {
  problems: Problem[];
  isLocked?: boolean;
  canAccessAdmin?: boolean;
  onProblemStart: (problemId: string) => void;
  itemsPerPage?: number;
  showTopicName?: boolean;
  showOrder?: boolean;
}

export const DIFFICULTY_ORDER: Record<Difficulty, number> = {
  'EASY_IIII': 1,
  'EASY_III': 2,
  'EASY_II': 3,
  'EASY_I': 4,
  'MEDIUM': 5,
  'HARD': 6
}; 