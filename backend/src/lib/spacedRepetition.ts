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
  
  // Use the previous due date if provided, otherwise use current date
  const baseDate = previousDueDate || new Date();
  const nextDate = new Date(baseDate);
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