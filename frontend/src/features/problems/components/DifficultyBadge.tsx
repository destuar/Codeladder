import { Badge } from "@/components/ui/badge";
import { cn } from '@/lib/utils';
import { Difficulty } from '../types';

interface DifficultyBadgeProps {
  difficulty: Difficulty;
  size?: 'small' | 'normal';
}

/**
 * Displays a badge indicating problem difficulty with appropriate styling
 */
export function DifficultyBadge({ difficulty, size = 'normal' }: DifficultyBadgeProps) {
  const getColor = () => {
    switch (difficulty) {
      case 'BEGINNER':
        return 'bg-emerald-500/15 text-emerald-600 hover:bg-emerald-500/25 border-emerald-500/20';
      case 'EASY':
        return 'bg-emerald-500/15 text-emerald-600 hover:bg-emerald-500/25 border-emerald-500/20';
      case 'MEDIUM':
        return 'bg-amber-500/15 text-amber-600 hover:bg-amber-500/25 border-amber-500/20';
      case 'HARD':
        return 'bg-rose-500/15 text-rose-600 hover:bg-rose-500/25 border-rose-500/20';
      default:
        return '';
    }
  };

  const sizeClasses = size === 'small' 
    ? 'px-1.5 py-0.5 text-xs'
    : 'px-2.5 py-0.5 text-sm';

  return (
    <Badge variant="outline" className={cn("font-medium transition-colors", getColor(), sizeClasses)}>
      {difficulty.replace(/_/g, ' ')}
    </Badge>
  );
} 