import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/features/auth/AuthContext';
import { 
  getDueReviews, 
  recordReview, 
  getReviewStats,
  ReviewProblem, 
  ReviewResult,
  ReviewStats
} from '../api/spacedRepetitionApi';

export interface UseSpacedRepetitionResult {
  dueReviews: ReviewProblem[];
  stats: ReviewStats | undefined;
  isLoading: boolean;
  isReviewPanelOpen: boolean;
  toggleReviewPanel: () => void;
  submitReview: (result: ReviewResult) => void;
  startReview: (problemId: string) => void;
  refreshReviews: () => Promise<void>;
}

/**
 * Custom hook for managing spaced repetition functionality
 */
export function useSpacedRepetition(): UseSpacedRepetitionResult {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [isReviewPanelOpen, setIsReviewPanelOpen] = useState(false);
  
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
  const startReview = useCallback((problemId: string) => {
    navigate(`/problems/${problemId}?mode=review`);
  }, [navigate]);
  
  // Force refresh all spaced repetition data
  const refreshReviews = useCallback(async (): Promise<void> => {
    await Promise.all([
      refetchReviews(),
      refetchStats()
    ]);
  }, [refetchReviews, refetchStats]);
  
  return {
    dueReviews,
    stats,
    isLoading: isLoadingReviews || isLoadingStats,
    isReviewPanelOpen,
    toggleReviewPanel,
    submitReview,
    startReview,
    refreshReviews
  };
} 