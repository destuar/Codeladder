import { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuth } from '@/features/auth/AuthContext';
import { addCompletedProblemToSpacedRepetition } from '@/features/spaced-repetition/api/spacedRepetitionApi';

interface UseProblemCompletionResult {
  isProblemCompleted: boolean;
  handleMarkAsComplete: () => Promise<void>;
  showCompletionDialog: boolean;
  setShowCompletionDialog: (show: boolean) => void;
  isAddingToSpacedRepetition: boolean;
  handleConfirmCompletion: (addToSpacedRepetition: boolean) => Promise<void>;
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
  const [showCompletionDialog, setShowCompletionDialog] = useState(false);
  const [isAddingToSpacedRepetition, setIsAddingToSpacedRepetition] = useState(false);
  const { token } = useAuth();
  const queryClient = useQueryClient();

  // Update the state when problemId or initialCompletionState changes
  useEffect(() => {
    setIsProblemCompleted(initialCompletionState);
  }, [problemId, initialCompletionState]);

  // This function now handles showing the dialog instead of directly completing
  const handleMarkAsComplete = async () => {
    // If already completed, we can directly toggle it off
    if (isProblemCompleted) {
      await completeToggleProblem(false);
      return;
    }
    
    // If in review mode, we always complete without confirmation
    if (isReviewMode) {
      // Set state immediately for faster UI feedback before API call
      setIsProblemCompleted(true);
      // Run API call non-blocking for better perceived performance
      completeToggleProblem(false);
      return;
    }
    
    // Only show dialog for CODING problems that aren't completed
    if (!isProblemCompleted && problemType === 'CODING') {
      setShowCompletionDialog(true);
    } else {
      // For non-coding problems, directly complete
      // Set state immediately for faster UI feedback
      setIsProblemCompleted(true); 
      // Run API call non-blocking for better perceived performance
      completeToggleProblem(false);
    }
  };

  // New function to handle the confirmation
  const handleConfirmCompletion = async (addToSpacedRepetition: boolean) => {
    setShowCompletionDialog(false);
    
    try {
      // First mark the problem as completed
      await completeToggleProblem(false);
      
      // Then add to spaced repetition if requested
      if (addToSpacedRepetition) {
        setIsAddingToSpacedRepetition(true);
        try {
          if (token) {
            await addCompletedProblemToSpacedRepetition(problemId, token);
            // Invalidate the queries to update the UI
            await Promise.all([
              queryClient.invalidateQueries({ queryKey: ['dueReviews'] }),
              queryClient.invalidateQueries({ queryKey: ['allScheduledReviews'] }),
              queryClient.invalidateQueries({ queryKey: ['reviewStats'] })
            ]);
          } else {
            console.error('[ProblemCompletion] No token available for adding to spaced repetition');
          }
        } catch (error) {
          console.error('[ProblemCompletion] Error adding problem to spaced repetition:', error);
        } finally {
          setIsAddingToSpacedRepetition(false);
        }
      }
    } catch (error) {
      console.error('[ProblemCompletion] Error during problem completion process:', error);
    }
  };

  // This function performs the actual API call to complete/uncomplete a problem
  const completeToggleProblem = async (addToSpacedRepetition: boolean) => {
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
    
    // In review mode, always set to completed (already handled in handleMarkAsComplete for faster UI response)
    if (!isReviewMode) {
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
      
      // Add a short delay before calling onCompleted in review mode
      // to ensure the server has updated the progress record
      if (onCompleted && isBeingMarkedComplete) {
        if (isReviewMode) {
          console.log('[ProblemCompletion] In review mode, adding minimal delay before callback');
          setTimeout(() => {
            console.log('[ProblemCompletion] Calling onCompleted callback after delay');
            onCompleted();
          }, 50); // Reduced from 300ms to 50ms for much faster appearance
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
    showCompletionDialog,
    setShowCompletionDialog,
    isAddingToSpacedRepetition,
    handleConfirmCompletion,
    problemType
  };
} 