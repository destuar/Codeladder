import { Button } from "@/components/ui/button";
import { PlayCircle, RepeatIcon } from "lucide-react";
import { cn } from '@/lib/utils';
import { Problem } from '../types';

interface ProblemActionButtonsProps {
  nextProblem: Problem | undefined;
  isLocked: boolean;
  onProblemStart: (problemId: string) => void;
}

/**
 * Renders the main action buttons for problem navigation
 */
export function ProblemActionButtons({ nextProblem, isLocked, onProblemStart }: ProblemActionButtonsProps) {
  return (
    <div className="grid grid-cols-2 gap-4">
      <Button
        variant="outline"
        size="lg"
        className={cn(
          "h-32 flex flex-col items-center justify-center gap-2 border-2",
          nextProblem ? "hover:border-primary" : "opacity-50 cursor-not-allowed"
        )}
        disabled={!nextProblem || isLocked}
        onClick={() => nextProblem && onProblemStart(nextProblem.id)}
      >
        <PlayCircle className="h-8 w-8" />
        <div className="text-center">
          <div className="font-semibold">Continue</div>
          {nextProblem ? (
            <div className="text-sm text-muted-foreground mt-1">
              {nextProblem.name}
              {nextProblem.reqOrder && ` (#${nextProblem.reqOrder})`}
            </div>
          ) : (
            <div className="text-sm text-muted-foreground mt-1">All problems completed!</div>
          )}
        </div>
      </Button>
      <Button
        variant="outline"
        size="lg"
        className="h-32 flex flex-col items-center justify-center gap-2 border-2 hover:border-primary"
        onClick={() => {/* TODO: Implement spaced repetition */}}
      >
        <RepeatIcon className="h-8 w-8" />
        <div className="text-center">
          <div className="font-semibold">Spaced Repetition</div>
          <div className="text-sm text-muted-foreground mt-1">Review completed problems</div>
        </div>
      </Button>
    </div>
  );
} 