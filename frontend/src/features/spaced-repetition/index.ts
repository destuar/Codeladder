/**
 * Spaced repetition module
 * 
 * Provides components and hooks for implementing a spaced repetition system,
 * which helps users retain knowledge by reviewing content at strategic intervals.
 */

// Component exports
export { SpacedRepetitionPanel } from './components/SpacedRepetitionPanel';
export { ReviewControls } from './components/ReviewControls';
export { MemoryStrengthIndicator } from './components/MemoryStrengthIndicator';
export { ReviewPage } from './components/ReviewPage';

// Hook exports
export { useSpacedRepetition } from './hooks/useSpacedRepetition';

// API type exports
export type { 
  ReviewProblem, 
  ReviewResult, 
  ReviewStats,
  ScheduledReviews 
} from './api/spacedRepetitionApi';

// API function exports
export { 
  getDueReviews,
  getAllScheduledReviews,
  recordReview,
  getReviewStats,
  removeProblemFromSpacedRepetition,
  addCompletedProblemToSpacedRepetition,
  getAvailableProblemsForSpacedRepetition
} from './api/spacedRepetitionApi';

// Utility functions
export const getIdentifierForProblem = (problem: { id?: string; slug?: string }): string => {
  // Prefer slug if available, otherwise use ID
  return problem.slug || problem.id || '';
}; 