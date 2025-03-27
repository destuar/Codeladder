import React from 'react';
import { Button } from "@/components/ui/button";
import { Clock, ChevronLeft, ChevronRight, Send, XIcon, Settings } from 'lucide-react';
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { BorderlessThemeToggle } from "@/features/problems/components/shared/BorderlessThemeToggle";
import { Link } from 'react-router-dom';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useProfile } from '@/features/profile/ProfileContext';
import { useAuth } from '@/features/auth/AuthContext';

interface AssessmentHeaderProps {
  currentIndex: number;
  totalQuestions: number;
  elapsedTime: number;
  answeredCount: number;
  isFirstQuestion: boolean;
  isLastQuestion: boolean;
  allAnswered: boolean;
  isSubmitting: boolean;
  onPrevious: () => void;
  onNext: () => void;
  onExit: () => void;
  onSubmit: () => void;
}

// Format time for display
const formatTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60).toString().padStart(2, '0');
  const secs = (seconds % 60).toString().padStart(2, '0');
  return `${mins}:${secs}`;
};

export function AssessmentHeader({
  currentIndex,
  totalQuestions,
  elapsedTime,
  answeredCount,
  isFirstQuestion,
  isLastQuestion,
  allAnswered,
  isSubmitting,
  onPrevious,
  onNext,
  onExit,
  onSubmit
}: AssessmentHeaderProps) {
  const { profile } = useProfile();
  const { user } = useAuth();

  return (
    <div className="border-b bg-background py-2 px-4">
      <div className="flex items-center justify-between">
        {/* Left section - Navigation buttons */}
        <div className="flex items-center gap-2 w-1/3">
          {/* Exit button */}
          <Button
            variant="outline"
            size="sm"
            onClick={onExit}
            className="gap-1 bg-red-50 hover:bg-red-100 text-red-600 border-red-200 dark:bg-red-950/30 dark:hover:bg-red-950/50 dark:border-red-800/50 dark:text-red-400"
          >
            <XIcon className="h-4 w-4 mr-1" />
            Back
          </Button>
          
          {/* Previous and Next buttons with counter */}
          <Button
            variant="outline"
            size="sm"
            onClick={onPrevious}
            disabled={isFirstQuestion}
            className="px-2"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          
          <span className="text-sm font-medium text-muted-foreground">
            {currentIndex + 1} / {totalQuestions}
          </span>
          
          <Button
            variant="outline"
            size="sm"
            onClick={onNext}
            disabled={isLastQuestion}
            className="px-2"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        
        {/* Middle section - Timer and Progress */}
        <div className="flex items-center justify-center gap-4 w-1/3">
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

        {/* Right section - Submit button and action buttons */}
        <div className="flex items-center justify-end gap-2 w-1/3">
          {/* Submit button - only shown when all questions answered */}
          {allAnswered && (
            <Button
              variant="default"
              size="sm"
              onClick={onSubmit}
              disabled={isSubmitting}
              className="mr-2"
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin h-4 w-4 mr-2 border-2 border-primary-foreground border-t-transparent rounded-full" />
                  Submitting...
                </>
              ) : (
                <>
                  <Send className="h-3.5 w-3.5 mr-2" />
                  Submit
                </>
              )}
            </Button>
          )}
          
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
  );
} 