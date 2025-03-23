import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/features/auth/AuthContext';
import { 
  getDueReviews, 
  recordReview, 
  getReviewStats,
  getAllScheduledReviews,
  removeProblemFromSpacedRepetition,
  addCompletedProblemToSpacedRepetition,
  getAvailableProblemsForSpacedRepetition,
  ReviewProblem, 
  ReviewResult,
  ReviewStats,
  ScheduledReviews
} from '../api/spacedRepetitionApi';
import { toast } from 'sonner';

export interface UseSpacedRepetitionResult {
  dueReviews: ReviewProblem[];
  allScheduledReviews: ScheduledReviews | undefined;
  stats: ReviewStats | undefined;
  isLoading: boolean;
  isReviewPanelOpen: boolean;
  toggleReviewPanel: () => void;
  submitReview: (result: ReviewResult) => void;
  startReview: (problemId: string, options?: { isEarly?: boolean; dueDate?: string }) => void;
  refreshReviews: () => Promise<void>;
  removeProblem: (problemId: string) => Promise<void>;
  addCompletedProblem: (problemId: string) => Promise<void>;
  isAddingProblem: boolean;
  getAvailableProblems: () => Promise<Array<{
    id: string;
    name: string;
    difficulty: string;
    topic?: {
      id: string;
      name: string;
    };
  }>>;
  isLoadingAvailableProblems: boolean;
}

/**
 * Custom hook for managing spaced repetition functionality
 */
export function useSpacedRepetition(): UseSpacedRepetitionResult {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const location = useLocation();
  const [isReviewPanelOpen, setIsReviewPanelOpen] = useState(false);
  const [isLoadingAvailableProblems, setIsLoadingAvailableProblems] = useState(false);
  
  // Get available problems for spaced repetition
  const getAvailableProblems = async () => {
    if (!token) {
      throw new Error('Authentication required');
    }
    
    setIsLoadingAvailableProblems(true);
    try {
      const problems = await getAvailableProblemsForSpacedRepetition(token);
      return problems;
    } catch (error) {
      console.error('Error fetching available problems:', error);
      return [];
    } finally {
      setIsLoadingAvailableProblems(false);
    }
  };
  
  // Get due reviews
  const { 
    data: dueReviews = [], 
    isLoading: isLoadingReviews,
    refetch: refetchReviews
  } = useQuery({
    queryKey: ['dueReviews'],
    queryFn: async () => {
      if (!token) throw new Error('No token available');
      return getDueReviews(token);
    },
    enabled: !!token,
    staleTime: 1000 * 60, // 1 minute
  });
  
  // Get all scheduled reviews (including beyond the current week)
  const {
    data: allScheduledReviews,
    isLoading: isLoadingAllReviews,
    refetch: refetchAllReviews
  } = useQuery({
    queryKey: ['allScheduledReviews'],
    queryFn: async () => {
      if (!token) throw new Error('No token available');
      return getAllScheduledReviews(token);
    },
    enabled: !!token,
    staleTime: 1000 * 60, // 1 minute
  });
  
  // Get review stats
  const {
    data: stats,
    isLoading: isLoadingStats,
    refetch: refetchStats
  } = useQuery({
    queryKey: ['reviewStats'],
    queryFn: async () => {
      if (!token) throw new Error('No token available');
      return getReviewStats(token);
    },
    enabled: !!token,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
  
  // Record a review
  const { mutate: submitReview } = useMutation({
    mutationFn: async (result: ReviewResult) => {
      if (!token) throw new Error('No token available');
      return recordReview(token, result);
    },
    onSuccess: () => {
      // Invalidate relevant queries to refresh the data
      queryClient.invalidateQueries({ queryKey: ['dueReviews'] });
      queryClient.invalidateQueries({ queryKey: ['allScheduledReviews'] });
      queryClient.invalidateQueries({ queryKey: ['reviewStats'] });
      queryClient.invalidateQueries({ queryKey: ['learningPath'] });
      queryClient.invalidateQueries({ queryKey: ['topic'] });
      queryClient.invalidateQueries({ queryKey: ['allProblems'] });
    }
  });
  
  // Toggle the review panel
  const toggleReviewPanel = useCallback(() => {
    setIsReviewPanelOpen(prev => !prev);
  }, []);
  
  // Start a review for a specific problem
  const startReview = useCallback((problemId: string, options?: { isEarly?: boolean; dueDate?: string }) => {
    let url = `/problems/${problemId}?mode=review&referrer=${encodeURIComponent(location.pathname + location.search)}`;
    
    // Keep tracking if this is an early review internally, but don't emphasize this in the UI
    if (options?.isEarly) {
      url += `&early=true`;
      if (options.dueDate) {
        url += `&dueDate=${options.dueDate}`;
      }
    }
    
    navigate(url);
  }, [navigate, location]);
  
  // Force refresh all spaced repetition data
  const refreshReviews = useCallback(async (): Promise<void> => {
    await Promise.all([
      refetchReviews(),
      refetchAllReviews(),
      refetchStats()
    ]);
  }, [refetchReviews, refetchAllReviews, refetchStats]);
  
  // Remove a problem from spaced repetition
  const { mutateAsync: removeProblemMutation, isPending: isRemovingProblem } = useMutation({
    mutationFn: async (problemId: string) => {
      if (!token) {
        throw new Error('Authentication required');
      }
      await removeProblemFromSpacedRepetition(problemId, token);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dueReviews'] });
      queryClient.invalidateQueries({ queryKey: ['allScheduledReviews'] });
      queryClient.invalidateQueries({ queryKey: ['reviewStats'] });
    }
  });

  const { mutateAsync: addCompletedProblemMutation, isPending: isAddingProblem } = useMutation({
    mutationFn: async (problemId: string) => {
      if (!token) {
        throw new Error('Authentication required');
      }
      await addCompletedProblemToSpacedRepetition(problemId, token);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dueReviews'] });
      queryClient.invalidateQueries({ queryKey: ['allScheduledReviews'] });
      queryClient.invalidateQueries({ queryKey: ['reviewStats'] });
      toast.success('Problem added to spaced repetition dashboard');
    },
    onError: (error: any) => {
      console.error('Error adding problem to spaced repetition:', error);
      toast.error(error.response?.data?.message || 'Failed to add problem to spaced repetition');
    }
  });

  const removeProblem = async (problemId: string) => {
    try {
      await removeProblemMutation(problemId);
    } catch (error) {
      console.error('Error removing problem from spaced repetition:', error);
      throw error;
    }
  };

  const addCompletedProblem = async (problemId: string) => {
    try {
      await addCompletedProblemMutation(problemId);
    } catch (error) {
      console.error('Error adding problem to spaced repetition:', error);
      throw error;
    }
  };
  
  return {
    dueReviews,
    allScheduledReviews,
    stats,
    isLoading: isLoadingReviews || isLoadingAllReviews || isLoadingStats,
    isReviewPanelOpen,
    toggleReviewPanel,
    submitReview,
    startReview,
    refreshReviews,
    removeProblem,
    addCompletedProblem,
    isAddingProblem,
    getAvailableProblems,
    isLoadingAvailableProblems
  };
} 