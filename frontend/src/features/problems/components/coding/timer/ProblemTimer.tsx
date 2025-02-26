import { Button } from "@/components/ui/button";
import { Timer, Pause, RotateCcw } from "lucide-react";
import { cn } from '@/lib/utils';
import { useTimer } from './useTimer';

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
        size="lg"
        className={cn(
          "gap-2 min-w-[120px] font-mono",
          isRunning && "bg-primary/10 text-primary hover:bg-primary/20"
        )}
        onClick={toggle}
      >
        {isRunning ? (
          <Pause className="h-4 w-4" />
        ) : (
          <Timer className="h-4 w-4" />
        )}
        {formattedTime}
      </Button>
      {isExpanded && (
        <Button
          variant="ghost"
          size="icon"
          className="absolute -right-10 top-1/2 -translate-y-1/2"
          onClick={reset}
        >
          <RotateCcw className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
} 