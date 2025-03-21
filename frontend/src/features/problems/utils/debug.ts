/**
 * Debug utilities for problem and review tracking
 */

/**
 * Log a problem's review metadata to help diagnose issues
 * @param problem The problem object to log
 * @param context Additional context information
 */
export function logProblemReviewState(problem: any, context: string = 'General') {
  if (!problem) {
    console.log(`[${context}] No problem provided`);
    return;
  }

  console.log(`[${context}] Problem review state:`, {
    id: problem.id,
    name: problem.name,
    isCompleted: problem.isCompleted || problem.completed,
    // Review fields might be in different locations depending on the API
    reviewFields: {
      reviewLevel: problem.reviewLevel,
      reviewScheduledAt: problem.reviewScheduledAt || problem.dueDate,
      lastReviewedAt: problem.lastReviewedAt,
      hasReviewHistory: problem.reviewHistory ? 
        (Array.isArray(problem.reviewHistory) ? problem.reviewHistory.length > 0 : !!problem.reviewHistory) : 
        false
    }
  });
}

/**
 * Log workflow steps during problem completion and review
 * @param step The current step in the workflow
 * @param data Any relevant data for the step
 */
export function logWorkflowStep(step: string, data: any = {}) {
  console.log(`[Workflow: ${step}]`, data);
} 