/**
 * Core functions for the spaced repetition system
 * Implements a simplified SuperMemo-2 algorithm with Fibonacci-based intervals
 */

/**
 * Calculates the next review date based on the review level
 * @param reviewLevel The current review level (0-based)
 * @returns Date object for the next scheduled review
 */
export function calculateNextReviewDate(reviewLevel: number | null): Date {
  // Fibonacci-based spacing (1, 1, 2, 3, 5, 8, 13, 21 days)
  const intervals = [1, 1, 2, 3, 5, 8, 13, 21];
  
  // Default to level 0 if null
  const level = reviewLevel === null ? 0 : reviewLevel;
  const daysToAdd = intervals[Math.min(level, intervals.length - 1)];
  
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
export function calculateNewReviewLevel(currentLevel: number | null, wasSuccessful: boolean): number {
  if (currentLevel === null) return wasSuccessful ? 1 : 0;
  return wasSuccessful 
    ? Math.min(7, currentLevel + 1) 
    : Math.max(0, currentLevel - 1);
}

/**
 * Creates a review history entry for the current review
 * @param wasSuccessful Whether the review was successful
 * @param currentLevel The current review level
 * @returns Review history entry object
 */
export function createReviewHistoryEntry(wasSuccessful: boolean, currentLevel: number | null): Record<string, any> {
  return {
    date: new Date(),
    wasSuccessful,
    reviewLevel: currentLevel
  };
} 