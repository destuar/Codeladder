import React, { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuth } from '@/features/auth/AuthContext';
import InfoProblem from './components/InfoProblem';
import CodingProblem from './components/coding/CodingProblem';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import ErrorBoundary from '@/components/ErrorBoundary';
import { ReviewControls } from '@/features/spaced-repetition/components/ReviewControls';
import { useSpacedRepetition } from '@/features/spaced-repetition/hooks/useSpacedRepetition';
import { Problem, ProblemType } from './types';
import { isToday } from 'date-fns';
import { logProblemReviewState, logWorkflowStep } from './utils/debug';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { LoadingCard, PageLoadingSpinner } from '@/components/ui/loading-spinner';
import { logger } from '@/lib/logger';
import { cn } from '@/lib/utils';

// Custom hook to only use spaced repetition when needed
function useConditionalSpacedRepetition(enabled: boolean) {
  // Always call useSpacedRepetition to maintain hook call order
  const spacedRepetition = useSpacedRepetition();
  
  // Return the real hook results when enabled
  if (enabled) {
    return spacedRepetition;
  }
  
  // Return a placeholder object that doesn't use the real functionality when disabled
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
  // Get the problemId parameter from the URL
  const { problemId, slug } = useParams<{ problemId?: string; slug?: string }>();
  const { token } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const location = useLocation();
  
  // Store the identifier we're using (either problemId or slug)
  const [effectiveIdentifier, setEffectiveIdentifier] = useState<string | undefined>(
    slug || problemId
  );
  
  // Store the referrer URL to navigate back after review
  const [referrer, setReferrer] = useState<string | null>(null);
  
  // Track completion state locally so we can show review controls immediately after completion
  const [hasJustCompleted, setHasJustCompleted] = useState(false);
  
  // New state to track visual completion in review mode
  const [reviewModeCompleted, setReviewModeCompleted] = useState(false);
  
  // Check if we're in review mode
  const searchParams = new URLSearchParams(location.search);
  const isReviewMode = searchParams.get('mode') === 'review' || location.pathname.includes('/review');
  const isEarlyReview = searchParams.get('early') === 'true';
  const scheduledDate = searchParams.get('dueDate') || undefined;
  
  // Determine if we should use spaced repetition
  const shouldUseSpacedRepetition = isReviewMode || isEarlyReview || hasJustCompleted;
  
  // Get the spaced repetition hook for review functionality
  const { submitReview } = useConditionalSpacedRepetition(shouldUseSpacedRepetition);
  
  // Track if review was submitted
  const [reviewSubmitted, setReviewSubmitted] = useState(false);

  // Extract source context from query parameters
  const sourceContext: { from: string; name: string; id?: string; slug?: string } | undefined = (() => {
    const from = searchParams.get('from');
    const name = searchParams.get('name');
    const id = searchParams.get('id');
    const slug = searchParams.get('slug');
    
    // First check if we have required parameters
    if (from && name) {
      // If we have a slug, prioritize that (preferred method)
      if (slug) {
        return { from, name, slug, ...(id ? { id } : {}) };
      }
      // Fall back to ID if no slug (for backward compatibility)
      else if (id) {
        return { from, name, id };
      }
    }
    
    return undefined;
  })();
  
  // Wrapper for submitReview that also sets local tracking state
  const handleSubmitReview = async (result: any) => {
    logWorkflowStep('SubmittingReview', { 
      ...result, 
      reviewSubmitted,
      problemIdentifier: effectiveIdentifier
    });
    
    try {
      const response = await submitReview(result);
      
      // Mark review as submitted
      setReviewSubmitted(true);
      
      // Force refresh problem data
      if (effectiveIdentifier) {
        queryClient.invalidateQueries({ queryKey: ['problem', effectiveIdentifier] });
      }
      
      return response;
    } catch (error) {
      logger.error('Error submitting review', error);
      throw error;
    }
  };
  
  // Ensure problem data is refetched after review completion
  useEffect(() => {
    if (reviewSubmitted && effectiveIdentifier) {
      // Refetch problem data to get latest state
      logWorkflowStep('RefetchingAfterReview', { problemIdentifier: effectiveIdentifier });
      queryClient.invalidateQueries({ queryKey: ['problem', effectiveIdentifier] });
      
      // Reset review submitted flag after a delay
      const timer = setTimeout(() => {
        setReviewSubmitted(false);
      }, 2000);
      
      return () => clearTimeout(timer);
    }
  }, [reviewSubmitted, effectiveIdentifier, queryClient]);
  
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
      problemIdentifier: effectiveIdentifier
    });
  }, [location, isReviewMode, searchParams, effectiveIdentifier]);

  // Update the effective identifier when parameters change
  useEffect(() => {
    setEffectiveIdentifier(slug || problemId);
  }, [problemId, slug]);
  
  // Fetch problem data using the appropriate endpoint based on whether we have an ID or slug
  const { data: problem, isLoading, error } = useQuery<Problem>({
    queryKey: ['problem', effectiveIdentifier],
    queryFn: async () => {
      if (!effectiveIdentifier) return Promise.reject(new Error('No problem identifier provided'));
      
      // Determine the appropriate endpoint based on whether we have a slug or ID
      let endpoint;
      
      if (slug) {
        // Slug-based endpoint
        endpoint = `/problems/slug/${slug}`;
      } else if (problemId) {
        // ID-based endpoint
        endpoint = `/problems/${problemId}`;
      } else {
        throw new Error('No valid problem identifier provided');
      }
      
      return api.get(endpoint, token);
    },
    enabled: !!effectiveIdentifier && !!token,
  });
  
  // Log errors if any
  useEffect(() => {
    if (!effectiveIdentifier) {
      logWorkflowStep('ProblemLoadError', { error: 'No identifier provided', problemIdentifier: effectiveIdentifier });
    } else if (error) {
      logWorkflowStep('ProblemLoadError', { error, problemIdentifier: effectiveIdentifier });
    }
  }, [error, effectiveIdentifier]);
  
  // Log the problem data whenever it changes
  useEffect(() => {
    if (problem) {
      logProblemReviewState(problem, 'ProblemPage:DataLoaded');
    }
  }, [problem]);

  // Show review controls if the problem has just been marked as completed (either first time, or in a review session)
  const shouldShowReviewControls = hasJustCompleted && problem;

  logWorkflowStep('RenderDecision', { 
    shouldShowReviewControls, 
    isReviewMode, 
    hasJustCompleted, 
    problemExists: !!problem,
    reviewSubmitted,
    problemIdentifier: effectiveIdentifier
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <PageLoadingSpinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-red-500 p-4 border border-red-500/50 rounded-md bg-red-500/10">
          Error loading problem: {error.message}
        </div>
      </div>
    );
  }

  if (!problem) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
         <div className="p-4 text-muted-foreground">Problem not found.</div>
      </div>
    );
  }
  
  // In review mode, we want to start with the problem marked as not completed
  // regardless of its actual completion status, but show as completed if the user
  // clicked the Mark Complete button in review mode
  const effectiveIsCompleted = isReviewMode 
    ? reviewModeCompleted 
    : problem?.isCompleted;

  // Handler for navigation to other problems
  const navigateToOtherProblem = (id: string, slug?: string) => {
    // Construct source parameters, prioritizing slug over id
    let sourceParams = '';
    if (sourceContext) {
      // Create a copy to modify
      const contextForParams: Record<string, string> = { 
        from: sourceContext.from, 
        name: sourceContext.name 
      };
      
      // Prioritize slug over id in parameters when available
      if (sourceContext.slug) {
        contextForParams.slug = sourceContext.slug;
      } else if (sourceContext.id) {
        contextForParams.id = sourceContext.id;
      }
      
      sourceParams = `?${new URLSearchParams(contextForParams).toString()}`;
    }
    
    // Use slug-based navigation if a slug is provided, which is preferred
    if (slug) {
      navigate(`/problem/${slug}${sourceParams}`);
    } else {
      navigate(`/problems/${id}${sourceParams}`);
    }
  };

  // Handler for when a problem is completed
  const handleProblemCompleted = async () => {
    if (!problem) {
      logger.error('Cannot toggle completion: problem data is not available');
      return;
    }

    const isBeingMarkedComplete = !effectiveIsCompleted;
    logWorkflowStep('ProblemCompleted', { 
      problemIdentifier: effectiveIdentifier, 
      isReviewMode,
      isBeingMarkedComplete 
    });

    // For review mode, update the visual completion state FIRST for immediate feedback
    if (isBeingMarkedComplete && isReviewMode) {
      // Update review mode completion state immediately for visual feedback
      setReviewModeCompleted(true);
    }

    // Show completion UI immediately if being marked complete
    if (isBeingMarkedComplete) {
      // No delay for better UX
      setHasJustCompleted(true);
    }
  };

  // Conditional Rendering based on Problem Type - Reverted to original structure
  return (
    <div className={cn(
      "flex flex-col",
      // Mobile: full height without subtracting space for nav
      "min-h-screen md:min-h-[calc(100vh-4rem)]"
    )}> {/* Modified top-level div */}
      <ErrorBoundary>
        <div className="flex-1"> {/* Original main content wrapper */}
          {problem.problemType === 'CODING' ? (
            problem.codeProblem ? (
              <CodingProblem
                title={problem.name}
                content={problem.content || problem.description || ''} // Use content first, with a fallback to description for robustness.
                codeProblem={problem.codeProblem}
                testCases={JSON.stringify(problem.codeProblem.testCases || [])}
                difficulty={problem.difficulty}
                nextProblemId={problem.nextProblemId}
                nextProblemSlug={problem.nextProblemSlug}
                prevProblemId={problem.prevProblemId}
                prevProblemSlug={problem.prevProblemSlug}
                onNavigate={navigateToOtherProblem}
                estimatedTime={problem.estimatedTime}
                isCompleted={effectiveIsCompleted}
                problemId={problem.id}
                isReviewMode={isReviewMode}
                onCompleted={handleProblemCompleted}
                problemType={problem.problemType}
                sourceContext={sourceContext}
              />
            ) : (
              <div className="text-destructive p-4 border border-destructive/50 rounded-md bg-destructive/10">
                <strong>Error:</strong> Code data is missing. Please try again later.
              </div>
            )
          ) : null}

          {problem.problemType === 'INFO' && (
            <InfoProblem
              title={problem.name}
              content={problem.content || ''}
              nextProblemId={problem.nextProblemId}
              nextProblemSlug={problem.nextProblemSlug}
              prevProblemId={problem.prevProblemId}
              prevProblemSlug={problem.prevProblemSlug}
              onNavigate={navigateToOtherProblem}
              estimatedTime={problem.estimatedTime}
              isCompleted={effectiveIsCompleted}
              problemId={problem.id}
              isReviewMode={isReviewMode}
              onCompleted={handleProblemCompleted}
              sourceContext={sourceContext}
            />
          )}
        </div>
        
        {/* Review Controls - Restored to original position and wrapper */}
        {shouldShowReviewControls && !reviewSubmitted && (
          <div className="mt-auto border-t pt-4 px-4 md:px-6 pb-4 bg-background dark:bg-card"> {/* Added bg for better visibility */}
            <ReviewControls 
              problem={problem} 
              spacedRepetitionItemId={problem?.spacedRepetitionItems?.[0]?.id}
              onReviewSubmit={handleSubmitReview} 
              isEarlyReview={isEarlyReview}
              scheduledDate={scheduledDate}
              referrer={referrer}
              hasJustCompleted={hasJustCompleted}
            />
          </div>
        )}
      </ErrorBoundary>
    </div>
  );
};

export default ProblemPage; 