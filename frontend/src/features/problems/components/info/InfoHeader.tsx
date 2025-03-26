import { Button } from "@/components/ui/button";
import { CheckCircle2, ChevronRight, ChevronLeft, Settings } from "lucide-react";
import { cn } from '@/lib/utils';
import { Link } from 'react-router-dom';
import { ProblemTimer } from '../coding/timer/ProblemTimer';
import { useProfile } from '@/features/profile/ProfileContext';
import { useAuth } from '@/features/auth/AuthContext';
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import codeladderSvgLogo from '@/features/landingpage/images/CodeLadder.svg';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { BorderlessThemeToggle } from "../shared/BorderlessThemeToggle";

export interface InfoHeaderProps {
  title?: string;
  subtitle?: string;
  prevProblemId?: string;
  prevProblemSlug?: string;
  nextProblemId?: string;
  nextProblemSlug?: string;
  onNavigate: (id: string, slug?: string) => void;
  isCompleted?: boolean;
  onMarkComplete: () => void;
  isReviewMode?: boolean;
  sourceContext?: {
    from: string;
    name: string;
    id?: string;
    slug?: string;
  };
}

/**
 * Header component for the info problem interface
 */
export function InfoHeader({
  title = "Info",
  subtitle,
  prevProblemId,
  prevProblemSlug,
  nextProblemId,
  nextProblemSlug,
  onNavigate,
  isCompleted = false,
  onMarkComplete,
  isReviewMode = false,
  sourceContext,
}: InfoHeaderProps) {
  const { profile } = useProfile();
  const { user } = useAuth();

  // Display the source context name with the problem title
  const displayTitle = sourceContext ? sourceContext.name : title;

  return (
    <div className="flex justify-between items-center px-4 py-2 border-b h-16 bg-background">
      {/* Left section - Logo and Timer */}
      <div className="flex items-center gap-3">
        <Link to="/dashboard" className="flex items-center">
          <img src={codeladderSvgLogo} alt="CodeLadder Logo" className="h-8 w-auto" />
        </Link>
        <ProblemTimer className="ml-3" />
      </div>

      {/* Middle section - Problem navigation */}
      <div className="flex items-center">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => prevProblemId && onNavigate(prevProblemId, prevProblemSlug)}
                disabled={!prevProblemId || isReviewMode}
                className="h-8 w-8"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent className="bg-popover text-popover-foreground border shadow-md">
              <p>Previous Info</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <div className="mx-2 max-w-[300px] truncate text-center">
          {sourceContext ? (
            <div className="flex flex-col items-center">
              {sourceContext.from === 'topic' ? (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        asChild
                        className="font-medium rounded-md h-8 transition-colors"
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
                        className="font-medium rounded-md h-8 transition-colors"
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
                <span className="font-medium">{displayTitle}</span>
              )}
            </div>
          ) : (
            <span className="font-medium">{title}</span>
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
                className="h-8 w-8"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent className="bg-popover text-popover-foreground border shadow-md">
              <p>Next Info</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      {/* Right section - Actions */}
      <div className="flex items-center gap-2">
        <Button 
          variant={isCompleted ? "outline" : "ghost"}
          size="sm"
          className={cn(
            "transition-all duration-100",
            isCompleted && "border-green-500 text-green-500 hover:bg-green-500/10",
            !isCompleted && "text-muted-foreground hover:text-foreground",
            "active:scale-95"
          )}
          onClick={onMarkComplete}
        >
          <div className="flex items-center">
            {isCompleted ? (
              <>
                <CheckCircle2 className="w-4 h-4 mr-1" />
                <span>Completed</span>
              </>
            ) : (
              <span>Mark Complete</span>
            )}
          </div>
        </Button>
        
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
  );
} 