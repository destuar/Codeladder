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
  console.log('Calculating new review level with inputs:', {
    currentLevel,
    wasSuccessful,
    typeofCurrentLevel: typeof currentLevel
  });
  
  // Handle invalid or corrupt level
  if (currentLevel === undefined || (typeof currentLevel === 'number' && isNaN(currentLevel))) {
    console.log('WARNING: Invalid level detected, defaulting to 0');
    currentLevel = 0;
  }
  
  if (currentLevel === null) {
    const result = wasSuccessful ? 1 : 0;
    console.log(`Level was null, new level: ${result}`);
    return result;
  }
  
  // Parse integer to ensure proper calculation - IMPORTANT FIX
  const actualCurrentLevel = Number(currentLevel);
  
  if (isNaN(actualCurrentLevel)) {
    console.log('WARNING: Level could not be parsed to a number, defaulting to 0');
    const result = wasSuccessful ? 1 : 0;
    return result;
  }
  
  // Force the calculation to happen with numbers, not strings
  const result = wasSuccessful 
    ? Math.min(7, actualCurrentLevel + 1) 
    : Math.max(0, actualCurrentLevel - 1);
    
  console.log(`Level calculation: ${actualCurrentLevel} → ${result} (wasSuccessful: ${wasSuccessful})`);
  return result;
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