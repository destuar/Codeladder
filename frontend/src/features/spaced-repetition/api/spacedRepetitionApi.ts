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
  progressId?: string;
  spacedRepetitionItemId: string;
  reviewHistory?: Array<{
    date: string;
    wasSuccessful: boolean;
    reviewLevel: number;
    reviewOption?: 'easy' | 'difficult' | 'forgot';
  }>;
}

export interface ReviewResult {
  problemId?: string;
  problemSlug?: string;
  spacedRepetitionItemId?: string;
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
    dueDate: problem.dueDate ? new Date(problem.dueDate).toISOString() : null,
    // Ensure spacedRepetitionItemId is carried over, and id is the problem's id
    id: problem.problem?.id || problem.id, // Prefer problem.id from nested problem object if present from backend
    spacedRepetitionItemId: problem.spacedRepetitionItemId || problem.id, // Backend might send SRI id as 'id' at top level of item
    slug: problem.problem?.slug !== undefined ? problem.problem.slug : problem.slug,
    name: problem.problem?.name || problem.name,
    difficulty: problem.problem?.difficulty || problem.difficulty,
    topic: problem.problem?.topic || problem.topic,
    problemType: problem.problem?.problemType || problem.problemType,
    // reviewLevel, lastReviewedAt, dueDate are already handled or direct
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
  return api.post('/spaced-repetition/review', result, token);
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
    await api.post('/spaced-repetition/add-to-repetition', identifier, token);
  } catch (error) {
    console.error('Error adding problem to spaced repetition:', error);
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