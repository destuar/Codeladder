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
  // Get both the problemId and slug from the URL parameters
  const { problemId, slug } = useParams<{ problemId?: string; slug?: string }>();
  const { token } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const location = useLocation();
  
  // Store the effective ID we're using (either problemId or slug)
  const [effectiveId, setEffectiveId] = useState<string | undefined>(problemId || slug);
  
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

  // Extract source context from query parameters
  const sourceContext = (() => {
    const from = searchParams.get('from');
    const name = searchParams.get('name');
    const id = searchParams.get('id');
    
    if (from && name && id) {
      return { from, name, id };
    }
    
    return undefined;
  })();
  
  // Wrapper for submitReview that also sets local tracking state
  const handleSubmitReview = async (result: any) => {
    logWorkflowStep('SubmittingReview', { 
      ...result, 
      reviewSubmitted,
      problemId: effectiveId
    });
    
    try {
      const response = await submitReview(result);
      
      // Mark review as submitted
      setReviewSubmitted(true);
      
      // Force refresh problem data
      if (effectiveId) {
        queryClient.invalidateQueries({ queryKey: ['problem', effectiveId] });
      }
      
      return response;
    } catch (error) {
      console.error('Error submitting review:', error);
      throw error;
    }
  };
  
  // Ensure problem data is refetched after review completion
  useEffect(() => {
    if (reviewSubmitted && effectiveId) {
      // Refetch problem data to get latest state
      logWorkflowStep('RefetchingAfterReview', { problemId: effectiveId });
      queryClient.invalidateQueries({ queryKey: ['problem', effectiveId] });
      
      // Reset review submitted flag after a delay
      const timer = setTimeout(() => {
        setReviewSubmitted(false);
      }, 2000);
      
      return () => clearTimeout(timer);
    }
  }, [reviewSubmitted, effectiveId, queryClient]);
  
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
      problemId: effectiveId
    });
  }, [location, isReviewMode, searchParams, effectiveId]);

  // Determine if we're using problemId or slug
  useEffect(() => {
    // Update the effective ID when either problemId or slug changes
    setEffectiveId(problemId || slug);
  }, [problemId, slug]);
  
  // Fetch problem data using the appropriate endpoint based on whether we have an ID or slug
  const { data: problem, isLoading, error } = useQuery<Problem>({
    queryKey: ['problem', effectiveId],
    queryFn: () => {
      if (!effectiveId) return Promise.reject(new Error('No problem ID or slug provided'));
      
      // Use the slug API endpoint if we have a slug, otherwise use the ID endpoint
      const endpoint = slug 
        ? `/problems/slug/${slug}`  // This endpoint needs to exist on your backend
        : `/problems/${problemId}`;
      
      return api.get(endpoint, token);
    },
    enabled: !!effectiveId && !!token,
  });
  
  // Log errors if any
  useEffect(() => {
    if (!effectiveId) {
      logWorkflowStep('ProblemLoadError', { error: null, problemId: effectiveId });
    } else if (error) {
      logWorkflowStep('ProblemLoadError', { error, problemId: effectiveId });
    }
  }, [error, effectiveId]);
  
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

  // Handler for navigation to other problems
  const navigateToOtherProblem = (id: string, slug?: string) => {
    // Preserve the source context in the URL
    const sourceParams = sourceContext 
      ? `?${new URLSearchParams(sourceContext as any).toString()}` 
      : '';
    
    // Use slug-based navigation if a slug is provided
    if (slug) {
      navigate(`/problem/${slug}${sourceParams}`);
    } else {
      navigate(`/problems/${id}${sourceParams}`);
    }
  };

  // Handler for when a problem is completed
  const handleProblemCompleted = () => {
    logWorkflowStep('ProblemCompleted', { problemId: effectiveId, isReviewMode });
    // Immediately set this flag to show review controls faster
    setHasJustCompleted(true);
    
    // For now, we won't automatically navigate after completion in review mode
    if (!isReviewMode && problem?.nextProblemId) {
      const shouldNavigate = window.confirm('Congratulations! Would you like to move to the next problem?');
      if (shouldNavigate) {
        navigateToOtherProblem(problem.nextProblemId, problem.nextProblemSlug);
      }
    }
  };

  // Check if we should show review controls
  const shouldShowReviewControls = isReviewMode || hasJustCompleted;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (error || !problem) {
    logWorkflowStep('ProblemLoadError', { error, problemId: effectiveId });
    return (
      <div className="p-8 text-center text-destructive">
        Error loading problem
      </div>
    );
  }

  if (problem.problemType === 'INFO' || problem.problemType === 'STANDALONE_INFO') {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex flex-col">
        <div className="flex-1">
          <InfoProblem 
            content={problem.content || ''}
            isCompleted={effectiveIsCompleted}
            nextProblemId={problem.nextProblemId}
            nextProblemSlug={problem.nextProblemSlug}
            prevProblemId={problem.prevProblemId}
            prevProblemSlug={problem.prevProblemSlug}
            estimatedTime={estimatedTimeNum}
            isStandalone={problem.problemType === 'STANDALONE_INFO'}
            problemId={problem.id}
            isReviewMode={isReviewMode}
            onCompleted={handleProblemCompleted}
            problemType={problem.problemType}
            onNavigate={navigateToOtherProblem}
            sourceContext={sourceContext}
          />
        </div>

        {/* Show review controls when appropriate */}
        {shouldShowReviewControls && (
          <div className="mt-auto">
            <ReviewControls 
              problem={problem}
              hasJustCompleted={hasJustCompleted}
              referrer={referrer}
              onReviewSubmit={handleSubmitReview}
              scheduledDate={scheduledDate}
              isEarlyReview={isEarlyReview}
            />
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] flex flex-col">
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
              nextProblemSlug={problem.nextProblemSlug}
              prevProblemId={problem.prevProblemId}
              prevProblemSlug={problem.prevProblemSlug}
              onNavigate={navigateToOtherProblem}
              estimatedTime={problem.estimatedTime ? Number(problem.estimatedTime) : undefined}
              isCompleted={effectiveIsCompleted}
              problemId={problem.id}
              isReviewMode={isReviewMode}
              onCompleted={handleProblemCompleted}
              sourceContext={sourceContext}
            />
          </div>
          
          {/* Show review controls when appropriate */}
          {shouldShowReviewControls && (
            <div className="mt-auto">
              <ReviewControls 
                problem={problem}
                hasJustCompleted={hasJustCompleted}
                referrer={referrer}
                onReviewSubmit={handleSubmitReview}
                scheduledDate={scheduledDate}
                isEarlyReview={isEarlyReview}
              />
            </div>
          )}
        </>
      </ErrorBoundary>
    </div>
  );
};

export default ProblemPage; 