/**
 * Core functions for the spaced repetition system
 * Implements a simplified SuperMemo-2 algorithm with Fibonacci-based intervals
 */

/**
 * Calculates the next review date based on the review level
 * @param reviewLevel The current review level (0-based)
 * @returns Date object for the next scheduled review
 */
export function calculateNextReviewDate(reviewLevel: number): Date {
  // Fibonacci-based spacing (1, 1, 2, 3, 5, 8, 13, 21 days)
  const intervals = [1, 1, 2, 3, 5, 8, 13, 21];
  
  const daysToAdd = intervals[Math.min(reviewLevel, intervals.length - 1)];
  
  const nextDate = new Date();
  nextDate.setDate(nextDate.getDate() + daysToAdd);
  return nextDate;
}

/**
 * Determines the new review level based on current level and review success
 * @param currentLevel Current review level
 * @param wasSuccessful Whether the review was successful
 * @returns Updated review level
 */
export function calculateNewReviewLevel(currentLevel: number, wasSuccessful: boolean): number {
  return wasSuccessful 
    ? Math.min(7, currentLevel + 1) 
    : Math.max(0, currentLevel - 1);
}

/**
 * Creates a review history entry for the current review
 * @param wasSuccessful Whether the review was successful
 * @param currentLevel The current review level before the review
 * @param reviewOption Type of review (easy, difficult, forgot)
 * @returns Review history entry object
 */
export function createReviewHistoryEntry(
  wasSuccessful: boolean, 
  currentLevel: number,
  newLevel: number,
  reviewOption?: 'easy' | 'difficult' | 'forgot' | 'added-to-repetition'
): Record<string, any> {
  return {
    date: new Date(),
    wasSuccessful,
    levelBefore: currentLevel,
    levelAfter: newLevel,
    reviewOption
  };
}

/**
 * Types for spaced repetition system
 */
export interface ReviewResult {
  problemId?: string;
  problemSlug?: string;
  wasSuccessful: boolean;
  reviewOption?: 'easy' | 'difficult' | 'forgot';
}

/**
 * Review history entry type
 */
export interface ReviewHistoryEntry {
  date: Date | string;
  wasSuccessful: boolean;
  levelBefore: number;
  levelAfter: number;
  reviewOption?: 'easy' | 'difficult' | 'forgot' | 'added-to-repetition';
} 