import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Timer, Maximize2, Minimize2, CheckCircle2 } from "lucide-react";
import { cn } from '@/lib/utils';
import { ProblemTimer } from './timer/ProblemTimer';
import { formatEstimatedTime } from '../../utils/time';

interface ProblemHeaderProps {
  title: string;
  difficulty: string;
  estimatedTime?: number;
  isCompleted: boolean;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
  onMarkComplete: () => void;
}

/**
 * Header component for the coding problem interface
 */
export function ProblemHeader({
  title,
  difficulty,
  estimatedTime,
  isCompleted,
  isFullscreen,
  onToggleFullscreen,
  onMarkComplete,
}: ProblemHeaderProps) {
  const getDifficultyColor = () => {
    if (difficulty.startsWith('EASY')) return "text-green-500";
    if (difficulty === 'MEDIUM') return "text-yellow-500";
    return "text-red-500";
  };

  const formattedTime = formatEstimatedTime(estimatedTime);

  return (
    <div className="flex justify-between items-center px-6 py-2 border-b">
      <div className="flex items-center gap-3">
        <ProblemTimer />
      </div>
      <div className="flex-1 mx-6">
        <h1 className="text-xl font-semibold">{title}</h1>
        <div className="flex items-center gap-2 mt-1">
          <Badge variant="outline" className={cn("font-semibold", getDifficultyColor())}>
            {difficulty.replace(/_/g, ' ')}
          </Badge>
          {formattedTime && (
            <div className="flex items-center text-sm text-muted-foreground">
              <Timer className="w-4 h-4 mr-1" />
              <span>{formattedTime}</span>
            </div>
          )}
        </div>
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