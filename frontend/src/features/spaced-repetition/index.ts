/**
 * Spaced repetition module
 * 
 * Provides components and hooks for implementing a spaced repetition system,
 * which helps users retain knowledge by reviewing content at strategic intervals.
 */

// Components
export { SpacedRepetitionPanel } from './components/SpacedRepetitionPanel';
export { ReviewControls } from './components/ReviewControls';
export { MemoryStrengthIndicator } from './components/MemoryStrengthIndicator';

// Hooks
export { useSpacedRepetition } from './hooks/useSpacedRepetition';

// API types
export type { ReviewProblem, ReviewResult, ReviewStats } from './api/spacedRepetitionApi'; 