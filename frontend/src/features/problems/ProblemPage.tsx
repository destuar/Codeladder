import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuth } from '@/features/auth/AuthContext';
import InfoProblem from './components/info/InfoProblem';
import CodingProblem from './components/coding/CodingProblem';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { ReviewControls } from '@/features/spaced-repetition/components/ReviewControls';
import { useSpacedRepetition } from '@/features/spaced-repetition/hooks/useSpacedRepetition';
import { Problem, ProblemType } from './types';
import { isToday } from 'date-fns';
import { logProblemReviewState, logWorkflowStep } from './utils/debug';

const ProblemPage: React.FC = () => {
  const { problemId, slug } = useParams<{ problemId?: string, slug?: string }>();
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
  
  // Get the spaced repetition hook for review functionality
  const { submitReview } = useSpacedRepetition();
  
  // Track if review was submitted
  const [reviewSubmitted, setReviewSubmitted] = useState(false);
  
  // Fetch problem either by ID or by slug
  const { data: problem, isLoading, error } = useQuery({
    queryKey: ['problem', problemId, slug],
    queryFn: async () => {
      if (problemId) {
        return await api.get(`problems/${problemId}`, token);
      } else if (slug) {
        return await api.get(`problems/slug/${slug}`, token);
      }
      throw new Error('No problem ID or slug provided');
    },
    enabled: !!token && (!!problemId || !!slug),
    staleTime: 5 * 60 * 1000 // 5 minutes
  });
  
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

  // Render the appropriate problem component based on the type
  switch (problem?.problemType) {
    case 'INFO':
    case 'STANDALONE_INFO':
      return (
        <ErrorBoundary>
          <>
            <div className="flex-1">
              <InfoProblem 
                title={problem.name}
                content={problem.content || ''}
                nextProblemId={problem.nextProblemId}
                nextProblemSlug={problem.nextProblemSlug}
                prevProblemId={problem.prevProblemId}
                prevProblemSlug={problem.prevProblemSlug}
                onNavigate={(id: string, slug?: string) => {
                  if (slug) {
                    navigate(`/problem/${slug}${sourceContext ? `?${new URLSearchParams(sourceContext as any).toString()}` : ''}`);
                  } else {
                    navigate(`/problems/${id}${sourceContext ? `?${new URLSearchParams(sourceContext as any).toString()}` : ''}`);
                  }
                }}
                estimatedTime={estimatedTimeNum}
                isCompleted={effectiveIsCompleted}
                problemId={problem.id}
                isStandalone={problem.problemType === 'STANDALONE_INFO'}
                isReviewMode={isReviewMode}
                onCompleted={handleProblemCompleted}
                sourceContext={sourceContext}
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
      );

    case 'CODING':
      return (
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
                onNavigate={(id: string, slug?: string) => {
                  if (slug) {
                    navigate(`/problem/${slug}${sourceContext ? `?${new URLSearchParams(sourceContext as any).toString()}` : ''}`);
                  } else {
                    navigate(`/problems/${id}${sourceContext ? `?${new URLSearchParams(sourceContext as any).toString()}` : ''}`);
                  }
                }}
                estimatedTime={estimatedTimeNum}
                isCompleted={effectiveIsCompleted}
                problemId={problem.id}
                isReviewMode={isReviewMode}
                onCompleted={handleProblemCompleted}
                sourceContext={sourceContext}
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
      );

    default:
      return (
        <div className="p-8 text-center text-destructive">
          Unknown problem type
        </div>
      );
  }
};

export default ProblemPage; 