import { api } from '@/lib/api';

/**
 * Interfaces for spaced repetition API
 */

export interface ReviewProblem {
  id: string;
  name: string;
  difficulty: string;
  topic: {
    id: string;
    name: string;
  };
  problemType: string;
  reviewLevel: number;
  lastReviewedAt: string | null;
  dueDate: string | null;
  progressId: string;
}

export interface ReviewResult {
  problemId: string;
  wasSuccessful: boolean;
}

export interface ReviewStats {
  byLevel: Record<number, number>;
  dueNow: number;
  dueThisWeek: number;
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
      dueThisWeek: 0
    };
  }
} 