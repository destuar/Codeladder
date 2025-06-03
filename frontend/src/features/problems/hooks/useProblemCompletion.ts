import { useState, useEffect, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuth } from '@/features/auth/AuthContext';
import { logger } from '@/lib/logger';
import { toast } from 'react-hot-toast';

interface UseProblemCompletionResult {
  isProblemCompleted: boolean;
  handleMarkAsComplete: () => Promise<void>;
  problemType: string | undefined;
}

/**
 * Hook for managing problem completion state and API interactions
 */
export function useProblemCompletion(
  problemId: string,
  initialCompletionState: boolean = false,
  onCompleted?: () => void,
  isReviewMode: boolean = false, // New parameter to indicate we're in review mode
  problemType?: string // Add problem type to check if it's a coding problem
): UseProblemCompletionResult {
  const [isProblemCompleted, setIsProblemCompleted] = useState(initialCompletionState);
  const { token } = useAuth();
  const queryClient = useQueryClient();

  // Update the internal state whenever the initialCompletionState prop changes
  useEffect(() => {
    setIsProblemCompleted(initialCompletionState);
  }, [initialCompletionState]); // Only depend on the prop value itself

  // This function directly completes problems without showing a dialog
  const handleMarkAsComplete = async () => {
    // Store the previous state to use in case we need to revert
    const previousState = isProblemCompleted;
    
    // Always update UI immediately
    setIsProblemCompleted(!isProblemCompleted);
    
    // In review mode, don't make API calls - just update UI and call the callback
    if (isReviewMode) {
      logger.debug('[ProblemCompletion] Skipping API toggle in review mode, calling onCompleted directly');
      if (onCompleted) onCompleted();
      return;
    }
    
    // For non-review mode, fire API call asynchronously (non-blocking)
    completeToggleProblem(false).catch(error => {
      // Only revert UI on error
      logger.error('[ProblemCompletion] Error toggling completion', error);
      toast.error('Failed to update problem status');
      setIsProblemCompleted(previousState);
    });
  };

  // This function performs the actual API call to complete/uncomplete a problem
  const completeToggleProblem = async (addToSpacedRepetition: boolean = false) => {
    // When not in review mode, follow normal toggle behavior
    const isBeingMarkedComplete = !isProblemCompleted;
    
    logger.debug('[ProblemCompletion] Marking problem as complete:', {
      problemId,
      currentState: isProblemCompleted,
      isReviewMode,
      preserveReviewData: isReviewMode
    });
    
    try {
      // In review mode, we pass a parameter to preserve review data
      const response = await api.post(`/problems/${problemId}/complete`, { 
        preserveReviewData: isReviewMode
      }, token);
      
      logger.debug('[ProblemCompletion] Server response:', response);
      
      // Perform invalidation asynchronously to avoid blocking
      setTimeout(() => {
        // Invalidate queries to force a refresh of the data
        Promise.all([
          queryClient.invalidateQueries({ queryKey: ['problem', problemId] }),
          queryClient.invalidateQueries({ queryKey: ['learningPath'] }),
          queryClient.invalidateQueries({ queryKey: ['topic'] }),
          queryClient.invalidateQueries({ queryKey: ['allProblems'] }),
          // Also invalidate review data
          queryClient.invalidateQueries({ queryKey: ['dueReviews'] }),
          queryClient.invalidateQueries({ queryKey: ['reviewStats'] })
        ]);
        
        logger.debug('[ProblemCompletion] All queries invalidated');
      }, 0);
      
      // Call onCompleted callback when marking as complete (only in non-review mode now)
      // The review mode case is handled in handleMarkAsComplete
      if (onCompleted && isBeingMarkedComplete) {
        logger.debug('[ProblemCompletion] Calling onCompleted callback (non-review)');
        // onCompleted(); // Already called earlier if in review mode
      }
    } catch (error) {
      logger.error('[ProblemCompletion] Error toggling completion', error);
      toast.error('Failed to update problem status');
    }
  };

  return {
    isProblemCompleted,
    handleMarkAsComplete,
    problemType
  };
} 