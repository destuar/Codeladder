import { api } from '@/lib/api';
import axios from 'axios';

/**
 * Interfaces for spaced repetition API
 */

export interface ReviewProblem {
  id: string;
  slug: string | null;
  name: string;
  difficulty: string;
  topic: {
    id: string;
    name: string;
    slug: string | null;
  };
  problemType: string;
  reviewLevel: number;
  lastReviewedAt: string | null;
  dueDate: string | null;
  progressId: string;
  // Remove the old reviewHistory field
  // New relation to the ReviewHistory table
  reviews: Array<{
    id: string;
    date: string;
    wasSuccessful: boolean;
    levelBefore?: number | null;
    levelAfter?: number | null;
    reviewOption?: string;
  }>;
}

export interface ReviewResult {
  problemId?: string;
  problemSlug?: string;
  wasSuccessful: boolean;
  reviewOption?: 'easy' | 'difficult' | 'forgot';
}

export interface ReviewStats {
  byLevel: Record<number, number>;
  dueNow: number;
  dueThisWeek: number;
  totalReviewed: number;
  levelCounts?: { level: number; count: number }[];
  completedToday?: number;
  completedThisWeek?: number;
  completedThisMonth?: number;
}

export interface ScheduledReviews {
  dueToday: ReviewProblem[];
  dueThisWeek: ReviewProblem[];
  dueThisMonth: ReviewProblem[]; 
  dueLater: ReviewProblem[];
  all: ReviewProblem[];
}

/**
 * Normalize a review problem to ensure consistent date handling
 * @param problem The raw problem data from the API
 * @returns Normalized problem with proper date handling
 */
function normalizeReviewProblem(problem: any): ReviewProblem {
  return {
    ...problem,
    // Ensure dates are properly formatted
    lastReviewedAt: problem.lastReviewedAt ? new Date(problem.lastReviewedAt).toISOString() : null,
    dueDate: problem.dueDate ? new Date(problem.dueDate).toISOString() : null
  };
}

/**
 * Get problems due for review
 */
export async function getDueReviews(token: string): Promise<ReviewProblem[]> {
  try {
    const problems = await api.get('/spaced-repetition/due', token);
    return Array.isArray(problems) ? problems.map(normalizeReviewProblem) : [];
  } catch (error) {
    console.error('Error fetching due reviews:', error);
    return [];
  }
}

/**
 * Get all scheduled reviews (including those beyond the current week)
 */
export async function getAllScheduledReviews(token: string): Promise<ScheduledReviews> {
  try {
    const response = await api.get('/spaced-repetition/all-scheduled', token);
    
    // Normalize all review problems
    if (response) {
      return {
        dueToday: Array.isArray(response.dueToday) ? response.dueToday.map(normalizeReviewProblem) : [],
        dueThisWeek: Array.isArray(response.dueThisWeek) ? response.dueThisWeek.map(normalizeReviewProblem) : [],
        dueThisMonth: Array.isArray(response.dueThisMonth) ? response.dueThisMonth.map(normalizeReviewProblem) : [],
        dueLater: Array.isArray(response.dueLater) ? response.dueLater.map(normalizeReviewProblem) : [],
        all: Array.isArray(response.all) ? response.all.map(normalizeReviewProblem) : []
      };
    }
    
    return {
      dueToday: [],
      dueThisWeek: [],
      dueThisMonth: [],
      dueLater: [],
      all: []
    };
  } catch (error) {
    console.error('Error fetching all scheduled reviews:', error);
    return {
      dueToday: [],
      dueThisWeek: [],
      dueThisMonth: [],
      dueLater: [],
      all: []
    };
  }
}

/**
 * Record a problem review result
 */
export async function recordReview(token: string, result: ReviewResult): Promise<any> {
  try {
    // Ensure result has the correct format and data types
    const cleanResult: ReviewResult = {
      wasSuccessful: !!result.wasSuccessful, // Convert to boolean
      reviewOption: result.reviewOption
    };
    
    // Only use problemSlug, never problemId
    if (result.problemSlug) {
      cleanResult.problemSlug = result.problemSlug;
    } else if (result.problemId) {
      // If only ID is provided, look up the slug first (not ideal but sometimes needed)
      console.log('Warning: Only problemId provided, slug would be better');
      cleanResult.problemSlug = result.problemId; // Use ID as a fallback
    }
    
    console.log('Recording review with data:', JSON.stringify(cleanResult));
    const response = await api.post('/spaced-repetition/review', cleanResult, token);
    console.log('Review recorded successfully:', response);
    return response;
  } catch (error) {
    console.error('Error recording review:', error);
    throw error;
  }
}

/**
 * Get spaced repetition statistics
 */
export async function getReviewStats(token: string): Promise<ReviewStats> {
  try {
    return await api.get('/spaced-repetition/stats', token);
  } catch (error) {
    console.error('Error fetching review stats:', error);
    // Return default empty stats
    return {
      byLevel: {},
      dueNow: 0,
      dueThisWeek: 0,
      totalReviewed: 0,
      completedToday: 0,
      completedThisWeek: 0,
      completedThisMonth: 0
    };
  }
}

/**
 * Remove a problem from the spaced repetition system
 * Can be called with either ID or slug
 */
export const removeProblemFromSpacedRepetition = async (
  identifier: string,
  token: string
): Promise<void> => {
  try {
    await api.delete(`/spaced-repetition/remove-problem/${identifier}`, token);
  } catch (error) {
    console.error('Error removing problem from spaced repetition:', error);
    throw error;
  }
};

/**
 * Add a completed problem to the spaced repetition system
 */
export const addCompletedProblemToSpacedRepetition = async (
  identifier: { problemId?: string; problemSlug?: string },
  token: string
): Promise<void> => {
  try {
    // Log the exact data being sent
    console.log('Adding problem to spaced repetition with data:', JSON.stringify(identifier));
    
    // Make sure we're not sending an empty or null slug
    const payload = { ...identifier };
    if (!payload.problemId) {
      throw new Error('Problem ID is required');
    }
    
    if (payload.problemSlug === null || payload.problemSlug === '' || payload.problemSlug === undefined) {
      delete payload.problemSlug;
      console.log('Removed null/empty slug from payload');
    }
    
    // Use the correct endpoint format without leading slash
    console.log('Making API request to endpoint: spaced-repetition/add-to-repetition');
    await api.post('spaced-repetition/add-to-repetition', payload, token);
  } catch (error: any) {
    console.error('Error adding problem to spaced repetition:', error);
    
    // Check if there's a specific error message from the backend
    if (error.message === 'Problem already exists in spaced repetition') {
      console.log('This problem is already in spaced repetition - not an actual error');
      // Don't throw for this specific case - it's not really an error
      return;
    }
    
    // Log more specific error details for debugging
    if (error.response) {
      console.error('Server error response:', {
        status: error.response.status,
        data: error.response.data
      });
    }
    throw error;
  }
};

/**
 * Get all completed coding problems that are available to add to spaced repetition
 */
export const getAvailableProblemsForSpacedRepetition = async (
  token: string
): Promise<Array<{
  id: string;
  slug: string | null;
  name: string;
  difficulty: string;
  topic?: {
    id: string;
    name: string;
    slug: string | null;
  };
}>> => {
  try {
    const problems = await api.get('/spaced-repetition/available-problems', token);
    return Array.isArray(problems) ? problems : [];
  } catch (error) {
    console.error('Error fetching available problems for spaced repetition:', error);
    return [];
  }
}; 