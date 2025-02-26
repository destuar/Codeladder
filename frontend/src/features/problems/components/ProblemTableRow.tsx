import { TableCell, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Circle } from "lucide-react";
import { cn } from '@/lib/utils';
import { Problem } from '../types';
import { DifficultyBadge } from './DifficultyBadge';

interface ProblemTableRowProps {
  problem: Problem;
  isLocked: boolean;
  showOrder: boolean;
  showTopicName: boolean;
  onProblemStart: (problemId: string) => void;
}

/**
 * Renders a single problem row in the table
 */
export function ProblemTableRow({
  problem,
  isLocked,
  showOrder,
  showTopicName,
  onProblemStart,
}: ProblemTableRowProps) {
  return (
    <TableRow 
      key={problem.id} 
      className="cursor-pointer hover:bg-muted/50"
      onClick={() => onProblemStart(problem.id)}
    >
      <TableCell>
        {problem.completed ? (
          <CheckCircle2 className={cn("h-5 w-5 text-green-500", isLocked && "text-muted-foreground")} />
        ) : (
          <Circle className="h-5 w-5 text-muted-foreground" />
        )}
      </TableCell>
      {showOrder && (
        <TableCell>
          {problem.required ? (
            <Badge variant="outline" className={cn(isLocked && "border-muted-foreground text-muted-foreground")}>
              #{problem.reqOrder}
            </Badge>
          ) : (
            <span className="text-muted-foreground">Optional</span>
          )}
        </TableCell>
      )}
      <TableCell>{problem.name}</TableCell>
      {showTopicName && (
        <TableCell>{problem.topic?.name}</TableCell>
      )}
      <TableCell>
        <DifficultyBadge difficulty={problem.difficulty} />
      </TableCell>
      <TableCell>
        <Badge variant="secondary" className={cn(isLocked && "bg-muted-foreground/20")}>
          Start
        </Badge>
      </TableCell>
    </TableRow>
  );
} 