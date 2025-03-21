import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Check, X, HelpCircle, Dumbbell, AlertCircle, Loader2, ArrowUp, ArrowDown } from 'lucide-react';
import { ReviewResult } from '../api/spacedRepetitionApi';
import { format, addDays } from 'date-fns';
import { cn } from '@/lib/utils';
import { useQueryClient } from '@tanstack/react-query';
import { MemoryStrengthIndicator } from './MemoryStrengthIndicator';

interface ReviewControlsProps {
  problemId: string;
  onSubmitReview: (result: ReviewResult) => void;
  isEarlyReview?: boolean;
  scheduledDate?: string;
  referrer?: string | null;
  currentLevel?: number | null;
}

/**
 * Component that displays controls for submitting a review result
 */
export function ReviewControls({ 
  problemId, 
  onSubmitReview,
  isEarlyReview = false,
  scheduledDate,
  referrer,
  currentLevel = 0
}: ReviewControlsProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeOption, setActiveOption] = useState<'easy' | 'difficult' | 'forgot' | null>(null);
  
  // For memory strength visualization
  const [showLevelChange, setShowLevelChange] = useState(false);
  const [newLevel, setNewLevel] = useState<number | null>(null);
  const [levelChangeMessage, setLevelChangeMessage] = useState<string>('');
  
  // Log when component mounts to verify it's rendering
  useEffect(() => {
    console.log('ReviewControls mounted:', { problemId, isEarlyReview, scheduledDate, referrer });
  }, [problemId, isEarlyReview, scheduledDate, referrer]);
  
  // Handle returning to the previous page after submitting
  const navigateBack = () => {
    console.log('Navigating back with referrer:', referrer);
    
    // If we have a referrer that's a local path, use that as first priority
    if (referrer && referrer.startsWith('/')) {
      console.log('Returning to local referrer:', referrer);
      
      // Add a timestamp to force refresh if it's the spaced repetition page
      if (referrer.includes('/spaced-repetition')) {
        const ts = Date.now();
        navigate(`${referrer}${referrer.includes('?') ? '&' : '?'}refresh=true&t=${ts}`, { replace: true });
      } else {
        navigate(referrer, { replace: true });
      }
    }
    // If referrer is external, use window.location
    else if (referrer && !referrer.startsWith('/')) {
      console.log('Returning to external referrer:', referrer);
      window.location.href = referrer;
    }
    // Fall back to spaced-repetition page if we're in review mode
    else if (location.search.includes('mode=review')) {
      console.log('No valid referrer, but in review mode - returning to spaced repetition page');
      const ts = Date.now();
      navigate(`/spaced-repetition?refresh=true&t=${ts}`, { replace: true });
    }
    // Last resort - go to problems page
    else {
      console.log('No valid referrer, going to problems page');
      navigate('/problems', { replace: true });
    }
  };
  
  const handleReviewResult = async (wasSuccessful: boolean, option: 'easy' | 'difficult' | 'forgot') => {
    setIsSubmitting(true);
    setActiveOption(option);
    
    // Calculate predicted new level for immediate feedback
    // This matches the backend logic but runs on the frontend for instant feedback
    const predictedNewLevel = wasSuccessful 
      ? Math.min(7, (currentLevel || 0) + 1) 
      : Math.max(0, (currentLevel || 0) - 1);
    
    setNewLevel(predictedNewLevel);
    
    // Store the current level for comparison
    try {
      localStorage.setItem(`review-level-${problemId}`, (currentLevel || 0).toString());
    } catch (e) {
      console.error('Error storing level in localStorage:', e);
    }
    
    if (wasSuccessful) {
      setLevelChangeMessage(
        option === 'easy' 
          ? 'Great job! Your memory is getting stronger.' 
          : 'Good work! Keep practicing to strengthen your memory.'
      );
    } else {
      setLevelChangeMessage('Keep practicing! You\'ll get it next time.');
    }
    
    // Show the memory strength visualization
    setShowLevelChange(true);
    
    try {
      console.log('Submitting review:', { problemId, wasSuccessful, option });
      
      // Submit the review to the backend with the added reviewOption parameter
      let response;
      try {
        response = await onSubmitReview({ 
          problemId, 
          wasSuccessful, 
          reviewOption: option 
        });
        console.log('Review submission response:', response !== undefined ? response : 'No response data');
      } catch (submitError) {
        console.error('Error during review submission:', submitError);
        // Continue with the flow even if the submission had an error
        // This ensures users don't get stuck on the review screen
      }
      
      // Invalidate relevant queries to ensure data is fresh
      try {
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ['dueReviews'] }),
          queryClient.invalidateQueries({ queryKey: ['reviewStats'] }),
          queryClient.invalidateQueries({ queryKey: ['learningPath'] }),
          queryClient.invalidateQueries({ queryKey: ['topic'] }),
          // Also invalidate problem data to refresh its state
          queryClient.invalidateQueries({ queryKey: ['problem', problemId] })
        ]);
        console.log('All queries invalidated, preparing to navigate back');
      } catch (queryError) {
        console.error('Error invalidating queries:', queryError);
        // Continue with navigation even if query invalidation fails
      }
      
      // Longer delay to allow visibility of memory strength change before navigation
      setTimeout(() => {
        try {
          navigateBack();
        } catch (navError) {
          console.error('Navigation error:', navError);
          // Fallback navigation if the normal navigation fails
          navigate('/spaced-repetition', { replace: true });
        }
      }, 3000);
    } catch (error) {
      console.error('Error in review submission process:', error);
      setIsSubmitting(false);
      setActiveOption(null);
      setShowLevelChange(false);
      
      // Add a recovery option for the user
      setTimeout(() => {
        try {
          navigateBack();
        } catch (navError) {
          // Fallback navigation
          navigate('/spaced-repetition', { replace: true });
        }
      }, 2000);
    }
  };
  
  // Add keyboard shortcuts for quick response
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isSubmitting) return;
      
      switch (e.key) {
        case '1':
          handleReviewResult(true, 'easy');
          break;
        case '2':
          handleReviewResult(true, 'difficult');
          break;
        case '3':
          handleReviewResult(false, 'forgot');
          break;
        default:
          break;
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSubmitting, handleReviewResult]);
  
  const formattedDate = scheduledDate ? format(new Date(scheduledDate), 'MMM d, yyyy') : '';
  
  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 bg-black/50 backdrop-blur-sm">
      <Card className="w-full max-w-md shadow-lg border-2 animate-in fade-in zoom-in-95 duration-200">
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <Dumbbell className="h-5 w-5 text-black" />
            <CardTitle className="text-xl">How well did you remember?</CardTitle>
          </div>
          <CardDescription>
            {isEarlyReview && scheduledDate ? (
              <div className="flex items-center gap-1 text-gray-700">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                <span>Originally suggested for {formattedDate}</span>
              </div>
            ) : (
              <span>Your feedback helps optimize your learning schedule. This will determine when you'll see this problem again.</span>
            )}
          </CardDescription>
        </CardHeader>
        
        <CardContent className="pt-4 space-y-6">
          {showLevelChange && newLevel !== null ? (
            <div className="space-y-6 animate-in fade-in-50 duration-300">
              <div className="text-center space-y-3 py-4">
                <div className={cn(
                  "text-lg font-medium",
                  newLevel > (currentLevel || 0) ? "text-green-500" : "text-amber-500"
                )}>
                  {levelChangeMessage}
                </div>
                
                <div className="flex justify-center items-center gap-2">
                  <span className="text-sm">Memory Strength:</span>
                  <MemoryStrengthIndicator 
                    level={newLevel} 
                    previousLevel={currentLevel} 
                    className="scale-125 mx-3"
                  />
                </div>
                
                <div className="flex justify-center items-center gap-1 mt-2 text-sm text-muted-foreground">
                  {newLevel > (currentLevel || 0) ? (
                    <>
                      <ArrowUp className="h-3 w-3 text-green-500" />
                      <span>Level {currentLevel || 0} → {newLevel}</span>
                    </>
                  ) : (
                    <>
                      <ArrowDown className="h-3 w-3 text-amber-500" />
                      <span>Level {currentLevel || 0} → {newLevel}</span>
                    </>
                  )}
                </div>
                
                <div className="text-xs text-muted-foreground mt-4">
                  Redirecting to spaced repetition page...
                </div>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              <Button 
                variant="outline" 
                size="lg"
                className={cn(
                  "border-2 border-green-500 hover:bg-green-500/10 text-green-500 gap-2 py-6 text-base font-medium",
                  "hover:text-green-600 hover:border-green-600 transition-all",
                  activeOption === 'easy' && "bg-green-500/20"
                )}
                onClick={() => handleReviewResult(true, 'easy')}
                disabled={isSubmitting}
              >
                {isSubmitting && activeOption === 'easy' ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Check className="h-5 w-5" />
                )}
                <span>I remembered easily</span>
                <kbd className="ml-auto bg-muted px-1.5 py-0.5 text-xs rounded">1</kbd>
              </Button>
              
              <Button 
                variant="outline"
                size="lg"
                className={cn(
                  "border-2 border-amber-500 hover:bg-amber-500/10 text-amber-500 gap-2 py-6 text-base font-medium",
                  "hover:text-amber-600 hover:border-amber-600 transition-all",
                  activeOption === 'difficult' && "bg-amber-500/20"
                )}
                onClick={() => handleReviewResult(true, 'difficult')}
                disabled={isSubmitting}
              >
                {isSubmitting && activeOption === 'difficult' ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <HelpCircle className="h-5 w-5" />
                )}
                <span>I remembered with difficulty</span>
                <kbd className="ml-auto bg-muted px-1.5 py-0.5 text-xs rounded">2</kbd>
              </Button>
              
              <Button 
                variant="outline"
                size="lg"
                className={cn(
                  "border-2 border-red-500 hover:bg-red-500/10 text-red-500 gap-2 py-6 text-base font-medium",
                  "hover:text-red-600 hover:border-red-600 transition-all",
                  activeOption === 'forgot' && "bg-red-500/20"
                )}
                onClick={() => handleReviewResult(false, 'forgot')}
                disabled={isSubmitting}
              >
                {isSubmitting && activeOption === 'forgot' ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <X className="h-5 w-5" />
                )}
                <span>I forgot this one</span>
                <kbd className="ml-auto bg-muted px-1.5 py-0.5 text-xs rounded">3</kbd>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
} 