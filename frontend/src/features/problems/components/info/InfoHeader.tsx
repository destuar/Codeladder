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

interface InfoHeaderProps {
  isCompleted: boolean;
  onMarkComplete: () => void;
  nextProblemId?: string;
  prevProblemId?: string;
  onNavigate: (id: string) => void;
  title?: string;
}

/**
 * Header component for the info problem interface
 */
export function InfoHeader({
  isCompleted,
  onMarkComplete,
  nextProblemId,
  prevProblemId,
  onNavigate,
  title = "Problem",
}: InfoHeaderProps) {
  const { profile } = useProfile();
  const { user } = useAuth();

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
                onClick={() => prevProblemId && onNavigate(prevProblemId)}
                disabled={!prevProblemId}
                className="h-8 w-8"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent className="bg-popover text-popover-foreground border shadow-md">
              <p>Previous Problem</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <div className="mx-2 max-w-[300px] truncate text-center font-medium">
          {title}
        </div>

        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => nextProblemId && onNavigate(nextProblemId)}
                disabled={!nextProblemId}
                className="h-8 w-8"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent className="bg-popover text-popover-foreground border shadow-md">
              <p>Next Problem</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      {/* Right section - Actions */}
      <div className="flex items-center gap-2">
        <Button 
          variant={isCompleted ? "outline" : "default"}
          size="sm"
          className={cn(
            "shadow-sm transition-all duration-200",
            isCompleted && "border-green-500 text-green-500 hover:bg-green-500/10"
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