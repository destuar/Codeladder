import { Button } from "@/components/ui/button";
import { CheckCircle2, ChevronRight, ChevronLeft, Settings } from "lucide-react";
import { cn } from '@/lib/utils';
import { Link } from 'react-router-dom';
import { ProblemTimer } from './timer/ProblemTimer';
import { useProfile } from '@/features/profile/ProfileContext';
import { useAuth } from '@/features/auth/AuthContext';
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { useLogoSrc } from '@/features/landingpage/hooks/useLogoSrc';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { BorderlessThemeToggle } from "../shared/BorderlessThemeToggle";
import { logger } from '@/lib/logger';

// Export the interface
export interface ProblemHeaderProps {
  isCompleted: boolean;
  onMarkComplete: () => void;
  nextProblemId?: string;
  nextProblemSlug?: string;
  prevProblemId?: string;
  prevProblemSlug?: string;
  onNavigate: (id: string, slug?: string) => void;
  title?: string;
  difficulty?: string;
  isQuizMode?: boolean;
  isReviewMode?: boolean;
  problemType?: string;
  sourceContext?: {
    from: string;
    name: string;
    id?: string;
    slug?: string;
  };
}

/**
 * Header component for the coding problem interface
 */
export function ProblemHeader({
  isCompleted,
  onMarkComplete,
  nextProblemId,
  nextProblemSlug,
  prevProblemId,
  prevProblemSlug,
  onNavigate,
  title = "Problem",
  difficulty,
  isQuizMode = false,
  isReviewMode = false,
  problemType = 'CODING',
  sourceContext,
}: ProblemHeaderProps) {
  const { profile } = useProfile();
  const { user } = useAuth();
  const logoSrc = useLogoSrc('single');

  // Check if it's a coding problem to show the timer
  const isCodingProblem = problemType === 'CODING';

  // Display the source context name with the problem title
  const displayTitle = sourceContext ? sourceContext.name : title;

  return (
    <div className={cn(
      "flex justify-between items-center px-4 bg-background dark:border-transparent border-b border-border",
      // Mobile: match standard header height used across the app
      "h-16 py-2"
    )}>
      {/* Left section - Logo and Timer */}
      <div className="flex items-center gap-3 w-1/4">
        <Link to="/dashboard" className="flex items-center">
          <img src={logoSrc} alt="CodeLadder Logo" className={cn(
            // Mobile: slightly smaller logo but not as small as before
            "h-10 w-auto md:h-12"
          )} />
        </Link>
        {isCodingProblem && (
          <div className="ml-3">
            {/* Mobile: Hide timer completely */}
            <div className="hidden md:block">
              <ProblemTimer />
            </div>
          </div>
        )}
      </div>

      {/* Middle section - Problem navigation - always centered */}
      <div className="flex items-center justify-center flex-1">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => prevProblemId && onNavigate(prevProblemId, prevProblemSlug)}
                disabled={!prevProblemId || isReviewMode}
                className={cn(
                  // Mobile: slightly larger buttons for better touch targets
                  "h-7 w-7 md:h-8 md:w-8"
                )}
              >
                <ChevronLeft className={cn(
                  // Mobile: slightly larger icons
                  "h-4 w-4 md:h-4 md:w-4"
                )} />
              </Button>
            </TooltipTrigger>
            <TooltipContent className="bg-popover text-popover-foreground border shadow-md">
              <p>Previous Problem</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <div className={cn(
          "mx-2 truncate text-center",
          // Mobile: slightly larger max width and text
          "max-w-[220px] text-sm md:max-w-[300px] md:text-base"
        )}>
          {sourceContext ? (
            <div className="flex flex-col items-center">
              {sourceContext.from === 'topic' ? (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        asChild
                        className={cn(
                          "font-medium rounded-md transition-colors",
                          // Mobile: slightly larger button
                          "h-7 text-sm md:h-8 md:text-sm"
                        )}
                      >
                        <Link to={`/topic/${sourceContext.slug || sourceContext.id}`}>
                          {displayTitle}
                        </Link>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent className="bg-popover text-popover-foreground border shadow-md">
                      <p>View Topic</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              ) : sourceContext.from === 'collection' ? (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        asChild
                        className={cn(
                          "font-medium rounded-md transition-colors",
                          // Mobile: slightly larger button
                          "h-7 text-sm md:h-8 md:text-sm"
                        )}
                      >
                        <Link to={`/collections/${sourceContext.slug || sourceContext.id}`}>
                          {displayTitle}
                        </Link>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent className="bg-popover text-popover-foreground border shadow-md">
                      <p>View Collection</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              ) : (
                <span className={cn(
                  "font-medium",
                  // Mobile: slightly larger text
                  "text-sm md:text-sm"
                )}>{displayTitle}</span>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center">
              <span className={cn(
                "font-medium",
                // Mobile: slightly larger text
                "text-sm md:text-sm"
              )}>{title}</span>
            </div>
          )}
        </div>

        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => nextProblemId && onNavigate(nextProblemId, nextProblemSlug)}
                disabled={!nextProblemId || isReviewMode}
                className={cn(
                  // Mobile: slightly larger buttons for better touch targets
                  "h-7 w-7 md:h-8 md:w-8"
                )}
              >
                <ChevronRight className={cn(
                  // Mobile: slightly larger icons
                  "h-4 w-4 md:h-4 md:w-4"
                )} />
              </Button>
            </TooltipTrigger>
            <TooltipContent className="bg-popover text-popover-foreground border shadow-md">
              <p>Next Problem</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      {/* Right section - Actions */}
      <div className="flex items-center gap-2 w-1/4 justify-end">
        {!isQuizMode && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="ghost"
                  size="sm"
                  className={cn(
                    "transition-all duration-100",
                    isCompleted && "text-green-500 hover:bg-green-500/10",
                    !isCompleted && "text-muted-foreground hover:text-foreground",
                    "active:scale-95",
                    // Mobile: slightly larger button and text
                    "h-7 text-sm px-2 md:h-8 md:text-sm md:px-3"
                  )}
                  onClick={() => {
                    logger.debug('Mark Complete button clicked, current status:', isCompleted);
                    onMarkComplete();
                  }}
                >
                  <div className="flex items-center">
                    {isCompleted ? (
                      <>
                        <CheckCircle2 className={cn(
                          "mr-1",
                          // Mobile: slightly larger icon
                          "w-4 h-4 md:w-4 md:h-4"
                        )} />
                        <span className="hidden sm:inline">Completed</span>
                        <span className="sm:hidden">Done</span>
                      </>
                    ) : (
                      <>
                        <span className="hidden sm:inline">Mark Complete</span>
                        <span className="sm:hidden">Complete</span>
                      </>
                    )}
                  </div>
                </Button>
              </TooltipTrigger>
              <TooltipContent className="bg-popover text-popover-foreground border shadow-md">
                <p>{isCompleted ? "Click to mark as incomplete" : "Click to mark as complete"}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
        
        {/* Theme Toggle - Hidden on mobile */}
        <div className="hidden md:block">
          <BorderlessThemeToggle />
        </div>
        
        {/* Profile Avatar - Hidden on mobile */}
        <Link to="/profile" className="hidden md:block">
          <Avatar className="h-8 w-8 transition-transform hover:scale-105">
            <AvatarImage src={profile?.avatarUrl} />
            <AvatarFallback>{user?.name?.[0] || user?.email?.[0]}</AvatarFallback>
          </Avatar>
        </Link>
      </div>
    </div>
  );
} 