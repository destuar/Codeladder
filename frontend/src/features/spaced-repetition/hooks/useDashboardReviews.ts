import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/features/auth/AuthContext';
import { getReviewStats } from '../api/spacedRepetitionApi';

/**
 * A lightweight hook for getting review statistics specifically for the dashboard
 * or other components that need minimal review information
 */
export function useDashboardReviews() {
  const { token } = useAuth();
  
  const { 
    data: stats,
    isLoading,
    error
  } = useQuery({
    queryKey: ['reviewStats'],
    queryFn: async () => {
      if (!token) throw new Error('No token available');
      return getReviewStats(token);
    },
    enabled: !!token,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
  
  return {
    dueCount: stats?.dueNow || 0,
    upcomingCount: stats?.dueThisWeek || 0,
    isLoading,
    hasReviews: (stats?.dueNow || 0) > 0
  };
} 