import { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuth } from '@/features/auth/AuthContext';

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

  // Update the state when problemId or initialCompletionState changes
  useEffect(() => {
    setIsProblemCompleted(initialCompletionState);
  }, [problemId, initialCompletionState]);

  // This function directly completes problems without showing a dialog
  const handleMarkAsComplete = async () => {
    // Store the previous state to use in case we need to revert
    const previousState = isProblemCompleted;
    
    // Always update UI immediately
    setIsProblemCompleted(!isProblemCompleted);
    
    // In review mode, don't make API calls - just update UI
    if (isReviewMode) {
      console.log('[ProblemCompletion] Skipping completion toggle in review mode');
      return;
    }
    
    // For non-review mode, fire API call asynchronously (non-blocking)
    completeToggleProblem(false).catch(error => {
      // Only revert UI on error
      console.error('[ProblemCompletion] Error toggling completion:', error);
      setIsProblemCompleted(previousState);
    });
  };

  // This function performs the actual API call to complete/uncomplete a problem
  const completeToggleProblem = async (addToSpacedRepetition: boolean = false) => {
    // When not in review mode, follow normal toggle behavior
    const isBeingMarkedComplete = !isProblemCompleted;
    
    console.log('[ProblemCompletion] Marking problem as complete:', {
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
      
      console.log('[ProblemCompletion] Server response:', response);
      
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
        
        console.log('[ProblemCompletion] All queries invalidated');
      }, 0);
      
      // Call onCompleted callback when marking as complete
      if (onCompleted && isBeingMarkedComplete) {
        console.log('[ProblemCompletion] Calling onCompleted callback');
        onCompleted();
      }
    } catch (error) {
      // Error handling is now in the handleMarkAsComplete function
      throw error;
    }
  };

  return {
    isProblemCompleted,
    handleMarkAsComplete,
    problemType
  };
} 