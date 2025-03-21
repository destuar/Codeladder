import { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuth } from '@/features/auth/AuthContext';

interface UseProblemCompletionResult {
  isProblemCompleted: boolean;
  handleMarkAsComplete: () => Promise<void>;
}

/**
 * Hook for managing problem completion state and API interactions
 */
export function useProblemCompletion(
  problemId: string,
  initialCompletionState: boolean = false,
  onCompleted?: () => void,
  isReviewMode: boolean = false // New parameter to indicate we're in review mode
): UseProblemCompletionResult {
  const [isProblemCompleted, setIsProblemCompleted] = useState(initialCompletionState);
  const { token } = useAuth();
  const queryClient = useQueryClient();

  // Update the state when problemId or initialCompletionState changes
  useEffect(() => {
    setIsProblemCompleted(initialCompletionState);
  }, [problemId, initialCompletionState]);

  const handleMarkAsComplete = async () => {
    // When in review mode, we should ALWAYS mark the problem as complete, regardless of current state
    // This prevents the toggle behavior which causes issues with the review data
    const isBeingMarkedComplete = isReviewMode ? true : !isProblemCompleted;
    
    console.log('[ProblemCompletion] Marking problem as complete:', {
      problemId,
      currentState: isProblemCompleted,
      isReviewMode,
      forcingComplete: isReviewMode,
      preserveReviewData: isReviewMode
    });
    
    // In review mode, always set to completed
    if (isReviewMode) {
      setIsProblemCompleted(true);
    } else {
      // Normal toggle behavior for non-review mode
      setIsProblemCompleted(!isProblemCompleted);
    }

    try {
      // In review mode, we pass a special parameter to force completion
      const response = await api.post(`/problems/${problemId}/complete`, { 
        preserveReviewData: isReviewMode,
        forceComplete: isReviewMode
      }, token);
      
      console.log('[ProblemCompletion] Server response:', response);
      
      // Invalidate queries to force a refresh of the data
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['problem', problemId] }),
        queryClient.invalidateQueries({ queryKey: ['learningPath'] }),
        queryClient.invalidateQueries({ queryKey: ['topic'] }),
        queryClient.invalidateQueries({ queryKey: ['allProblems'] }),
        // Also invalidate review data
        queryClient.invalidateQueries({ queryKey: ['dueReviews'] }),
        queryClient.invalidateQueries({ queryKey: ['reviewStats'] })
      ]);
      
      console.log('[ProblemCompletion] All queries invalidated');
      
      // Add a short delay before calling onCompleted in review mode
      // to ensure the server has updated the progress record
      if (onCompleted && isBeingMarkedComplete) {
        if (isReviewMode) {
          console.log('[ProblemCompletion] In review mode, adding delay before callback');
          setTimeout(() => {
            console.log('[ProblemCompletion] Calling onCompleted callback after delay');
            onCompleted();
          }, 300);
        } else {
          console.log('[ProblemCompletion] Calling onCompleted callback immediately');
          onCompleted();
        }
      }
    } catch (error) {
      // Revert the optimistic update on error
      if (isReviewMode) {
        // In review mode, keep as completed on error
        setIsProblemCompleted(true);
      } else {
        // Normal toggle reversion
        setIsProblemCompleted(!isProblemCompleted);
      }
      console.error('[ProblemCompletion] Error toggling problem completion:', error);
    }
  };

  return {
    isProblemCompleted,
    handleMarkAsComplete,
  };
} 