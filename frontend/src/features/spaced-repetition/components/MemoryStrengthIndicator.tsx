import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Brain } from 'lucide-react';

interface MemoryStrengthIndicatorProps {
  level: number;
  className?: string;
  showTooltip?: boolean;
}

/**
 * Component that visualizes memory strength based on review level
 */
export function MemoryStrengthIndicator({ level, className, showTooltip = true }: MemoryStrengthIndicatorProps) {
  // Map review level (0-7) to a percentage (0-100%)
  const strengthPercentage = Math.min(100, Math.round((level / 7) * 100));
  
  // Get color based on strength
  const getStrengthColor = () => {
    if (level <= 1) return 'text-blue-500';
    if (level <= 3) return 'text-indigo-500';
    if (level <= 5) return 'text-violet-500';
    return 'text-purple-500';
  };
  
  // Get description based on level
  const getStrengthDescription = () => {
    if (level === 0) return 'New - Just learned';
    if (level === 1) return 'Fragile - Review soon';
    if (level <= 3) return 'Building - Keep reviewing';
    if (level <= 5) return 'Strong - Good retention';
    return 'Mastered - Long-term memory';
  };
  
  // Calculate days until next review based on level
  const getNextReviewText = () => {
    // Fibonacci-based spacing (1, 1, 2, 3, 5, 8, 13, 21 days)
    const intervals = [1, 1, 2, 3, 5, 8, 13, 21];
    const daysToNext = intervals[level];
    
    if (daysToNext === 1) return 'Review tomorrow';
    return `Review in ${daysToNext} days`;
  };
  
  const indicator = (
    <div className={cn("flex items-center gap-1", className)}>
      <Brain className={cn("h-4 w-4", getStrengthColor())} />
      <div className="w-16 h-1.5 bg-gray-200 rounded-full overflow-hidden">
        <div 
          className={cn(
            "h-full rounded-full", 
            getStrengthColor().replace('text-', 'bg-')
          )} 
          style={{ width: `${strengthPercentage}%` }}
        />
      </div>
    </div>
  );
  
  if (!showTooltip) return indicator;
  
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          {indicator}
        </TooltipTrigger>
        <TooltipContent className="w-48">
          <div className="space-y-2">
            <p className="font-medium">{getStrengthDescription()}</p>
            <p className="text-xs text-muted-foreground">{getNextReviewText()}</p>
            <div className="flex justify-between text-xs">
              <span>New</span>
              <span>Mastered</span>
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
} 