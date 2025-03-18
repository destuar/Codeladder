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
  initialCompletionState: boolean = false
): UseProblemCompletionResult {
  const [isProblemCompleted, setIsProblemCompleted] = useState(initialCompletionState);
  const { token } = useAuth();
  const queryClient = useQueryClient();

  // Update the state when problemId or initialCompletionState changes
  useEffect(() => {
    setIsProblemCompleted(initialCompletionState);
  }, [problemId, initialCompletionState]);

  const handleMarkAsComplete = async () => {
    // Optimistically update the UI
    setIsProblemCompleted(!isProblemCompleted);

    try {
      await api.post(`/problems/${problemId}/complete`, {}, token);
      
      // Invalidate queries to force a refresh of the data
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['problem', problemId] }),
        queryClient.invalidateQueries({ queryKey: ['learningPath'] }),
        queryClient.invalidateQueries({ queryKey: ['topic'] }),
        queryClient.invalidateQueries({ queryKey: ['allProblems'] })
      ]);
    } catch (error) {
      // Revert the optimistic update on error
      setIsProblemCompleted(!isProblemCompleted);
      console.error('Error toggling problem completion:', error);
    }
  };

  return {
    isProblemCompleted,
    handleMarkAsComplete,
  };
} 