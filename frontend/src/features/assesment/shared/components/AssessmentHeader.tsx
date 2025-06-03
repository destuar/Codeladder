import React from 'react';
import { Button } from "@/components/ui/button";
import { Clock, ChevronLeft, ChevronRight, Settings, Send } from 'lucide-react';
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { BorderlessThemeToggle } from "@/features/problems/components/shared/BorderlessThemeToggle";
import { Link } from 'react-router-dom';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useProfile } from '@/features/profile/ProfileContext';
import { useAuth } from '@/features/auth/AuthContext';
import codeladderSvgLogo from '@/features/landingpage/images/CodeLadder.svg';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { LoadingSpinner } from '@/components/ui/loading-spinner';

interface AssessmentHeaderProps {
  currentIndex: number;
  totalQuestions: number;
  elapsedTime: number;
  answeredCount: number;
  isFirstQuestion: boolean;
  isLastQuestion: boolean;
  onPrevious: () => void;
  onNext: () => void;
  onExit: () => void;
  onSubmit: () => void;
  isSubmitting: boolean;
  title?: string;
  type?: string;
}

// Format time for display
const formatTime = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600).toString().padStart(2, '0');
  const mins = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0');
  const secs = (seconds % 60).toString().padStart(2, '0');
  return `${hours}:${mins}:${secs}`;
};

export function AssessmentHeader({
  currentIndex,
  totalQuestions,
  elapsedTime,
  answeredCount,
  isFirstQuestion,
  isLastQuestion,
  onPrevious,
  onNext,
  onExit,
  onSubmit,
  isSubmitting,
  title,
  type = 'ASSESSMENT'
}: AssessmentHeaderProps) {
  const { profile } = useProfile();
  const { user } = useAuth();
  const [showSubmitDialog, setShowSubmitDialog] = React.useState(false);

  // Normalize the type to uppercase and ensure "quiz" is always "QUIZ"
  const displayType = type.toUpperCase() === 'QUIZ' ? 'Quiz' : 
                      type.toUpperCase() === 'TEST' ? 'Test' : 
                      type.charAt(0).toUpperCase() + type.slice(1).toLowerCase();

  const handleSubmit = () => {
    setShowSubmitDialog(false);
    onSubmit();
  };

  return (
    <>
      <div className="border-b bg-background py-1.5">
        <div className="flex items-center justify-between w-full px-0 relative">
          {/* Left section - Logo, Exit button, Title & Timer */}
          <div className="flex items-center gap-2 pl-3 w-1/3">
            {/* CodeLadder logo */}
            <div className="mr-2">
              <img src={codeladderSvgLogo} alt="CodeLadder Logo" className="h-8 w-auto" />
            </div>
            
            {/* Back button - simple navigation without confirmation */}
            <Button
              variant="outline"
              size="sm"
              onClick={onExit}
              className="gap-1 mr-3"
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Back
            </Button>
            
            {/* Title and Timer moved here from middle section */}
            <div className="flex flex-col gap-1">
              {/* Title */}
              {title && (
                <span className="text-base font-medium my-0.5">
                  {title} {displayType}
                </span>
              )}
              
              {/* Timer and Progress */}
              <div className="flex items-center gap-4">
                {/* Timer */}
                <div className="flex items-center text-muted-foreground">
                  <Clock className="h-4 w-4 mr-1.5" />
                  <span className="text-sm font-mono">{formatTime(elapsedTime)}</span>
                </div>
                
                {/* Progress bar */}
                <div className="flex items-center gap-2">
                  <div className="w-32 h-2 bg-muted rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-primary transition-all duration-300 ease-in-out rounded-full"
                      style={{ width: `${(answeredCount / totalQuestions) * 100}%` }}
                    />
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {answeredCount}/{totalQuestions}
                  </span>
                </div>
              </div>
            </div>
          </div>
          
          {/* Middle section - Next/Previous Navigation */}
          <div className="absolute left-1/2 transform -translate-x-1/2 flex items-center justify-center gap-2">
            {/* Previous and Next buttons with counter moved here from left section */}
            <Button
              variant="outline"
              size="sm"
              onClick={onPrevious}
              disabled={isFirstQuestion}
              className="px-3 py-2 bg-muted/30 hover:bg-muted/70 border-muted-foreground/20 hover:border-muted-foreground/40 text-muted-foreground hover:text-foreground transition-all"
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
            
            <span className="text-sm font-medium text-muted-foreground px-2">
              {currentIndex + 1} / {totalQuestions}
            </span>
            
            <Button
              variant="outline"
              size="sm"
              onClick={onNext}
              disabled={isLastQuestion}
              className="px-3 py-2 bg-muted/30 hover:bg-muted/70 border-muted-foreground/20 hover:border-muted-foreground/40 text-muted-foreground hover:text-foreground transition-all"
            >
              <ChevronRight className="h-5 w-5" />
            </Button>
          </div>

          {/* Right section - action buttons */}
          <div className="flex items-center justify-end gap-2 pr-3 w-1/3">
            {/* Submit button */}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowSubmitDialog(true)}
                      disabled={answeredCount === 0 || isSubmitting}
                      className="transition-colors border-green-300/70 hover:border-green-500 hover:bg-green-50/30 text-green-600 dark:border-green-800/50 dark:text-green-400 dark:hover:bg-green-900/20"
                    >
                      {isSubmitting && (
                        <LoadingSpinner size="sm" className="mr-2 text-green-600" />
                      )}
                      {isSubmitting ? 'Submitting...' : (
                        <>
                          <Send className="h-4 w-4 mr-2" />
                          Submit {displayType}
                        </>
                      )}
                    </Button>
                  </div>
                </TooltipTrigger>
                {answeredCount === 0 && (
                  <TooltipContent className="bg-muted text-muted-foreground border max-w-xs p-2">
                    <p>Submit at least one question before submitting your {displayType.toLowerCase()}</p>
                  </TooltipContent>
                )}
              </Tooltip>
            </TooltipProvider>

            {/* Theme toggle, settings, and profile buttons */}
            <BorderlessThemeToggle />
            
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-9 w-9">
                    <Settings className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent className="bg-popover text-popover-foreground border shadow-md">
                  <p>Settings</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <Link to="/profile">
              <Avatar className="h-8 w-8 transition-transform hover:scale-105">
                <AvatarImage src={profile?.avatarUrl} />
                <AvatarFallback>{user?.name?.[0] || user?.email?.[0]}</AvatarFallback>
              </Avatar>
            </Link>
          </div>
        </div>
      </div>

      {/* Submit Confirmation Dialog */}
      <AlertDialog open={showSubmitDialog} onOpenChange={setShowSubmitDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Submit {displayType}?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to submit this {displayType.toLowerCase()}? You have completed {answeredCount} out of {totalQuestions} questions.
              {answeredCount < totalQuestions && (
                <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 p-2 rounded-md mt-2">
                  <span>Some questions are not yet completed. You can still submit, but unanswered questions will be scored as zero.</span>
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleSubmit}
              className="bg-green-600 text-white hover:bg-green-700 transition-colors"
            >
              Submit {displayType}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
} 