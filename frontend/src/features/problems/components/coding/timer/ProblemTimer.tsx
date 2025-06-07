import { Button } from "@/components/ui/button";
import { Timer, Pause, RotateCcw } from "lucide-react";
import { cn } from '@/lib/utils';
import { useTimer } from './useTimer';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface ProblemTimerProps {
  className?: string;
}

/**
 * Timer component for tracking problem solving duration
 */
export function ProblemTimer({ className }: ProblemTimerProps) {
  const {
    isRunning,
    isExpanded,
    formattedTime,
    toggle,
    reset,
  } = useTimer();

  return (
    <div className={cn("relative", className)}>
      <Button
        variant={isRunning ? "default" : "outline"}
        size="sm"
        className={cn(
          "gap-1 min-w-[90px] text-xs",
          isRunning && "bg-primary/10 text-primary hover:bg-primary/20"
        )}
        onClick={toggle}
      >
        {isRunning ? (
          <Pause className="h-3 w-3" />
        ) : (
          <Timer className="h-3 w-3" />
        )}
        {formattedTime}
      </Button>
      {isExpanded && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="absolute -right-9 top-1/2 -translate-y-1/2 h-6 w-6"
                onClick={reset}
              >
                <RotateCcw className="h-3 w-3" />
              </Button>
            </TooltipTrigger>
            <TooltipContent className="bg-popover text-popover-foreground border shadow-md">
              <p>Reset Timer</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
    </div>
  );
} 