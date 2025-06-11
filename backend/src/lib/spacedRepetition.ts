/**
 * Core functions for the spaced repetition system
 * Implements a simplified SuperMemo-2 algorithm with Fibonacci-based intervals
 */

import { prisma } from './prisma';

/**
 * Calculates the next review date based on the review level
 * @param reviewLevel The current review level (0-based)
 * @param previousDueDate The previous scheduled review date (optional)
 * @returns Date object for the next scheduled review
 */
export function calculateNextReviewDate(reviewLevel: number, previousDueDate?: Date | null): Date {
  // Fibonacci-based spacing (1, 1, 2, 3, 5, 8, 13, 21 days)
  const intervals = [1, 1, 2, 3, 5, 8, 13, 21];
  
  const daysToAdd = intervals[Math.min(reviewLevel, intervals.length - 1)];
  
  // Get the current date (at the start of the day)
  const today = new Date();
  today.setHours(0, 0, 0, 0); // Normalize to the beginning of the day

  // The base date for the next review is always today when a review is being processed.
  const baseDate = today; 
  
  const nextDate = new Date(baseDate);
  nextDate.setDate(nextDate.getDate() + daysToAdd);
  // Ensure the time is consistent, e.g., set to midnight or a specific time
  nextDate.setHours(0, 0, 0, 0); // Normalize the resulting date to start of day
  return nextDate;
}

/**
 * Determines the new review level based on current level and review success
 * @param currentLevel Current review level
 * @param wasSuccessful Whether the review was successful
 * @param reviewOption The user's feedback on the review difficulty
 * @returns Updated review level
 */
export function calculateNewReviewLevel(currentLevel: number, wasSuccessful: boolean, reviewOption?: ReviewOutcomeType): number {
  if (!wasSuccessful) { // Covers 'forgot', 'again', and 'difficult' if it leads to !wasSuccessful
    // For 'forgot' or 'again', reset or penalize heavily.
    // If 'difficult' but still marked unsuccessful by frontend, treat similarly.
    if (reviewOption === 'forgot' || reviewOption === 'again') {
      return Math.max(0, currentLevel - 2); // Penalize more, e.g., drop 2 levels or to 0
    }
    return Math.max(0, currentLevel - 1); // Standard penalty for unsuccessful
  }

  // Successful review
  switch (reviewOption) {
    case 'easy':
      return Math.min(7, currentLevel + 2); // Advance faster for 'easy'
    case 'good':
    case 'standard-review': // Default successful review
      return Math.min(7, currentLevel + 1);
    case 'difficult': // Successful but difficult
      // If 'difficult' was chosen but still wasSuccessful=true, advance by a smaller step or same step
      // but potentially with a shorter interval (handled by reviewOption in calculateNextReviewDate if we add it there)
      // For now, let's just advance by 1.
      return Math.min(7, currentLevel + 1); 
    default:
      return Math.min(7, currentLevel + 1);
  }
}

/**
 * Creates a review history entry for the current review
 * This now returns a Promise that resolves to the created ReviewHistory record
 */
export async function createReviewHistoryEntry(
  progressId: string,
  wasSuccessful: boolean, 
  levelBefore: number,
  levelAfter: number,
  reviewOption: string = 'standard-review'
) {
  return await prisma.reviewHistory.create({
    data: {
      progressId,
      date: new Date(),
      wasSuccessful,
      reviewOption,
      levelBefore,
      levelAfter
    }
  });
}

/**
 * Types for spaced repetition system
 */
export interface ReviewResult {
  problemId?: string;
  problemSlug?: string;
  wasSuccessful: boolean;
  reviewOption?: string;
}

/**
 * Defines the possible outcomes of a review which affect the next review level.
 */
export type ReviewOutcomeType = 'easy' | 'good' | 'difficult' | 'again' | 'forgot' | 'standard-review';

/**
 * Review history entry type
 */
export interface ReviewHistoryEntry {
  date: Date | string;
  wasSuccessful: boolean;
  levelBefore: number;
  levelAfter: number;
  reviewOption?: string;
} 