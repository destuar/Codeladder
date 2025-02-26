import { Badge } from "@/components/ui/badge";
import { cn } from '@/lib/utils';
import { Difficulty } from '../types';

interface DifficultyBadgeProps {
  difficulty: Difficulty;
}

/**
 * Displays a badge indicating problem difficulty with appropriate styling
 */
export function DifficultyBadge({ difficulty }: DifficultyBadgeProps) {
  const getColor = () => {
    switch (difficulty) {
      case 'EASY_IIII':
      case 'EASY_III':
      case 'EASY_II':
      case 'EASY_I':
        return 'bg-emerald-500/15 text-emerald-600 hover:bg-emerald-500/25 border-emerald-500/20';
      case 'MEDIUM':
        return 'bg-amber-500/15 text-amber-600 hover:bg-amber-500/25 border-amber-500/20';
      case 'HARD':
        return 'bg-rose-500/15 text-rose-600 hover:bg-rose-500/25 border-rose-500/20';
      default:
        return '';
    }
  };

  return (
    <Badge variant="outline" className={cn("font-medium transition-colors", getColor())}>
      {difficulty.replace(/_/g, ' ')}
    </Badge>
  );
} 