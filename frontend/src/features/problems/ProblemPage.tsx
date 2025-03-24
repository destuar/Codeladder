import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuth } from '@/features/auth/AuthContext';
import InfoProblem from './components/InfoProblem';
import CodingProblem from './components/coding/CodingProblem';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { ReviewControls } from '@/features/spaced-repetition/components/ReviewControls';
import { useSpacedRepetition } from '@/features/spaced-repetition/hooks/useSpacedRepetition';
import { Problem, ProblemType } from './types';
import { isToday } from 'date-fns';
import { logProblemReviewState, logWorkflowStep } from './utils/debug';

// Custom hook to only use spaced repetition when needed
function useConditionalSpacedRepetition(enabled: boolean) {
  // Only call useSpacedRepetition when enabled
  if (enabled) {
    return useSpacedRepetition();
  }
  
  // Return a placeholder object when disabled
  return {
    dueReviews: [],
    allScheduledReviews: undefined,
    stats: undefined,
    isLoading: false,
    isReviewPanelOpen: false,
    toggleReviewPanel: () => {},
    submitReview: async () => null,
    startReview: () => {},
    refreshReviews: async () => {},
    removeProblem: async () => {},
    addCompletedProblem: async () => {},
    isAddingProblem: false,
    getAvailableProblems: async () => [],
    isLoadingAvailableProblems: false
  };
}

const ProblemPage: React.FC = () => {
  const { problemId } = useParams<{ problemId: string }>();
  const { token } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const location = useLocation();
  
  // Store the referrer URL to navigate back after review
  const [referrer, setReferrer] = useState<string | null>(null);
  
  // Track completion state locally so we can show review controls immediately after completion
  const [hasJustCompleted, setHasJustCompleted] = useState(false);
  
  // Check if we're in review mode
  const searchParams = new URLSearchParams(location.search);
  const isReviewMode = searchParams.get('mode') === 'review';
  const isEarlyReview = searchParams.get('early') === 'true';
  const scheduledDate = searchParams.get('dueDate') || undefined;
  
  // Determine if we should use spaced repetition
  const shouldUseSpacedRepetition = isReviewMode || isEarlyReview || hasJustCompleted;
  
  // Get the spaced repetition hook for review functionality
  const { submitReview } = useConditionalSpacedRepetition(shouldUseSpacedRepetition);
  
  // Track if review was submitted
  const [reviewSubmitted, setReviewSubmitted] = useState(false);
  
  // Wrapper for submitReview that also sets local tracking state
  const handleSubmitReview = async (result: any) => {
    logWorkflowStep('SubmittingReview', { 
      ...result, 
      reviewSubmitted,
      problemId 
    });
    
    try {
      const response = await submitReview(result);
      
      // Mark review as submitted
      setReviewSubmitted(true);
      
      // Force refresh problem data
      queryClient.invalidateQueries({ queryKey: ['problem', problemId] });
      
      return response;
    } catch (error) {
      console.error('Error submitting review:', error);
      throw error;
    }
  };
  
  // Ensure problem data is refetched after review completion
  useEffect(() => {
    if (reviewSubmitted) {
      // Refetch problem data to get latest state
      logWorkflowStep('RefetchingAfterReview', { problemId });
      queryClient.invalidateQueries({ queryKey: ['problem', problemId] });
      
      // Reset review submitted flag after a delay
      const timer = setTimeout(() => {
        setReviewSubmitted(false);
      }, 2000);
      
      return () => clearTimeout(timer);
    }
  }, [reviewSubmitted, problemId, queryClient]);
  
  // Store the referrer when the component mounts
  useEffect(() => {
    // Get the referrer from document.referrer or from the query params
    const urlReferrer = searchParams.get('referrer');
    const documentReferrer = document.referrer;
    
    // Use URL referrer parameter if available, otherwise use document.referrer
    // Filter out empty strings and current page URLs
    let actualReferrer = urlReferrer || 
      (documentReferrer && !documentReferrer.includes(window.location.pathname) ? documentReferrer : null);
    
    // If we're in review mode and no referrer is specified, default to the spaced repetition page
    if (isReviewMode && !actualReferrer) {
      actualReferrer = '/spaced-repetition';
    }
    
    setReferrer(actualReferrer);
    
    logWorkflowStep('ProblemPage:Init', { 
      urlReferrer, 
      documentReferrer, 
      actualReferrer, 
      isReviewMode,
      problemId
    });
  }, [location, isReviewMode, searchParams, problemId]);
  
  const { data: problem, isLoading, error } = useQuery<Problem>({
    queryKey: ['problem', problemId],
    queryFn: () => api.get(`/problems/${problemId}`, token),
    enabled: !!problemId && !!token,
  });

  // Log the problem data whenever it changes
  useEffect(() => {
    if (problem) {
      logProblemReviewState(problem, 'ProblemPage:DataLoaded');
    }
  }, [problem]);

  // Convert estimatedTime to number if it's a string
  const estimatedTimeNum = problem?.estimatedTime ? parseInt(problem.estimatedTime.toString()) : undefined;

  // In review mode, we want to start with the problem marked as not completed
  // regardless of its actual completion status
  const effectiveIsCompleted = isReviewMode ? false : problem?.isCompleted;

  // Handler for when a problem is completed
  const handleProblemCompleted = () => {
    logWorkflowStep('ProblemCompleted', { problemId, isReviewMode });
    // Immediately set this flag to show review controls faster
    setHasJustCompleted(true);
  };

  // Should show review controls if in review mode AND the problem was just completed (not based on problem.isCompleted)
  const shouldShowReviewControls = isReviewMode && hasJustCompleted;
  
  // Debug log to verify the review controls state
  useEffect(() => {
    logWorkflowStep('ReviewControlsState', { 
      isReviewMode,
      hasJustCompleted,
      shouldShowReviewControls,
      originalIsCompleted: problem?.isCompleted,
      effectiveIsCompleted,
      problemId
    });
  }, [isReviewMode, hasJustCompleted, shouldShowReviewControls, problem?.isCompleted, effectiveIsCompleted, problemId]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (error || !problem) {
    logWorkflowStep('ProblemLoadError', { error, problemId });
    return (
      <div className="p-8 text-center text-destructive">
        Error loading problem
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] flex flex-col">
      {(problem.problemType === 'INFO' || problem.problemType === 'STANDALONE_INFO') ? (
        <>
          <div className="flex-1">
            <InfoProblem 
              content={problem.content || ''}
              isCompleted={effectiveIsCompleted}
              nextProblemId={problem.nextProblemId}
              prevProblemId={problem.prevProblemId}
              estimatedTime={estimatedTimeNum}
              isStandalone={problem.problemType === 'STANDALONE_INFO'}
              problemId={problem.id}
              isReviewMode={isReviewMode}
              onCompleted={handleProblemCompleted}
              problemType={problem.problemType}
            />
          </div>
          {shouldShowReviewControls && (
            <ReviewControls
              problemId={problem.id}
              onSubmitReview={handleSubmitReview}
              isEarlyReview={isEarlyReview}
              scheduledDate={scheduledDate}
              referrer={referrer}
              currentLevel={problem.reviewLevel || 0}
            />
          )}
        </>
      ) : (
        <ErrorBoundary>
          <>
            <div className="flex-1">
              <CodingProblem 
                title={problem.name}
                content={problem.content || ''}
                codeTemplate={problem.codeTemplate}
                testCases={problem.testCases}
                difficulty={problem.difficulty}
                nextProblemId={problem.nextProblemId}
                prevProblemId={problem.prevProblemId}
                onNavigate={(id: string) => navigate(`/problems/${id}`)}
                estimatedTime={estimatedTimeNum}
                isCompleted={effectiveIsCompleted}
                problemId={problem.id}
                isReviewMode={isReviewMode}
                onCompleted={handleProblemCompleted}
                problemType={problem.problemType}
              />
            </div>
            {shouldShowReviewControls && (
              <ReviewControls
                problemId={problem.id}
                onSubmitReview={handleSubmitReview}
                isEarlyReview={isEarlyReview}
                scheduledDate={scheduledDate}
                referrer={referrer}
                currentLevel={problem.reviewLevel || 0}
              />
            )}
          </>
        </ErrorBoundary>
      )}
    </div>
  );
};

export default ProblemPage; 