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
  
  // Get the current date (at the start of the day) for comparison
  const today = new Date();
  today.setHours(0, 0, 0, 0); // Normalize to the beginning of the day

  // Determine the base date for the next review
  let baseDate = new Date(); // Default to today if no previous date
  if (previousDueDate) {
    const normalizedPreviousDueDate = new Date(previousDueDate);
    normalizedPreviousDueDate.setHours(0, 0, 0, 0); // Normalize for fair comparison
    
    // If the previous due date is in the past, base the next review on today's date
    // Otherwise, base it on the previous due date
    baseDate = normalizedPreviousDueDate < today ? today : normalizedPreviousDueDate;
  } else {
    // If there's no previous due date, base it on today
    baseDate = today;
  }
  
  // Use the previous due date if provided AND it's not in the past, otherwise use current date
  // const baseDate = previousDueDate && previousDueDate >= today ? previousDueDate : today;
  const nextDate = new Date(baseDate);
  nextDate.setDate(nextDate.getDate() + daysToAdd);
  // Ensure the time is consistent, e.g., set to midnight or a specific time
  // nextDate.setHours(0, 0, 0, 0); // Optional: Normalize the resulting date
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
 * Review history entry type
 */
export interface ReviewHistoryEntry {
  date: Date | string;
  wasSuccessful: boolean;
  levelBefore: number;
  levelAfter: number;
  reviewOption?: string;
} 