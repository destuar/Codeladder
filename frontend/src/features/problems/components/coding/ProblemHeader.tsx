import { Button } from "@/components/ui/button";
import { Maximize2, Minimize2, CheckCircle2 } from "lucide-react";
import { cn } from '@/lib/utils';
import { ProblemTimer } from './timer/ProblemTimer';

interface ProblemHeaderProps {
  isCompleted: boolean;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
  onMarkComplete: () => void;
}

/**
 * Header component for the coding problem interface
 */
export function ProblemHeader({
  isCompleted,
  isFullscreen,
  onToggleFullscreen,
  onMarkComplete,
}: ProblemHeaderProps) {
  return (
    <div className="flex justify-between items-center px-6 py-2 border-b">
      <div className="flex items-center gap-3">
        <ProblemTimer />
      </div>
      <div className="flex items-center gap-2">
        <Button 
          variant={isCompleted ? "outline" : "default"}
          className={cn(
            "shadow-sm transition-all duration-200",
            isCompleted && "border-green-500 text-green-500 hover:bg-green-500/10"
          )}
          onClick={onMarkComplete}
        >
          <div className="flex items-center">
            {isCompleted ? (
              <>
                <CheckCircle2 className="w-5 h-5" />
                <span className="ml-2">Completed</span>
              </>
            ) : (
              <span>Mark as Complete</span>
            )}
          </div>
        </Button>
        <Button variant="ghost" size="icon" onClick={onToggleFullscreen}>
          {isFullscreen ? (
            <Minimize2 className="h-4 w-4" />
          ) : (
            <Maximize2 className="h-4 w-4" />
          )}
        </Button>
      </div>
    </div>
  );
} 