import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Brain, Lightbulb } from 'lucide-react';

interface MemoryStrengthIndicatorProps {
  level: number;
  className?: string;
  showTooltip?: boolean;
  previousLevel?: number | null;
}

/**
 * Component that visualizes memory strength based on review level
 */
export function MemoryStrengthIndicator({ 
  level, 
  className, 
  showTooltip = true, 
  previousLevel = null 
}: MemoryStrengthIndicatorProps) {
  // Get color based on strength - with dark mode support
  const getStrengthColor = () => {
    if (level <= 1) return 'text-blue-500 dark:text-blue-400';
    if (level <= 3) return 'text-indigo-500 dark:text-indigo-400';
    if (level <= 5) return 'text-violet-500 dark:text-violet-400';
    return 'text-purple-500 dark:text-purple-400';
  };
  
  // Get background color based on strength - with dark mode support
  const getStrengthBgColor = () => {
    if (level <= 1) return 'bg-blue-500 dark:bg-blue-600';
    if (level <= 3) return 'bg-indigo-500 dark:bg-indigo-600';
    if (level <= 5) return 'bg-violet-500 dark:bg-violet-600';
    return 'bg-purple-500 dark:bg-purple-600';
  };
  
  // Get color for specific level - with dark mode support
  const getColorForLevel = (targetLevel: number) => {
    if (targetLevel <= 1) return 'text-blue-500 dark:text-blue-400';
    if (targetLevel <= 3) return 'text-indigo-500 dark:text-indigo-400';
    if (targetLevel <= 5) return 'text-violet-500 dark:text-violet-400';
    return 'text-purple-500 dark:text-purple-400';
  };
  
  // Get background color for specific level - with dark mode support
  const getBgColorForLevel = (targetLevel: number) => {
    if (targetLevel <= 1) return 'bg-blue-500 dark:bg-blue-600';
    if (targetLevel <= 3) return 'bg-indigo-500 dark:bg-indigo-600';
    if (targetLevel <= 5) return 'bg-violet-500 dark:bg-violet-600';
    return 'bg-purple-500 dark:bg-purple-600';
  };
  
  // Get description based on level
  const getStrengthDescription = () => {
    if (level === 0) return 'New - Just learned';
    if (level === 1) return 'Fragile - Review soon';
    if (level <= 3) return 'Building - Keep reviewing';
    if (level <= 5) return 'Strong - Good retention';
    return 'Mastered - Long-term memory';
  };
  
  // Get retention percentage for a specific level
  const getRetentionPercentage = (targetLevel: number = level) => {
    const percentages = [25, 40, 60, 70, 80, 85, 90, 95];
    return percentages[targetLevel];
  };
  
  // Animation class for level transition
  const getAnimationClass = () => {
    if (previousLevel !== null && previousLevel !== level) {
      return "animate-pulse";
    }
    return "";
  };
  
  const indicator = (
    <div className={cn("relative flex items-center justify-center", className)}>
      <div 
        className={cn(
          "w-6 h-6 rounded-full flex items-center justify-center border transition-colors hover:shadow-sm", 
          level <= 1 
            ? 'bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800'
            : level <= 3
              ? 'bg-indigo-50 border-indigo-200 dark:bg-indigo-900/20 dark:border-indigo-800'
              : level <= 5
                ? 'bg-violet-50 border-violet-200 dark:bg-violet-900/20 dark:border-violet-800'
                : 'bg-purple-50 border-purple-200 dark:bg-purple-900/20 dark:border-purple-800',
          getAnimationClass()
        )}
      >
        <Lightbulb className={cn("h-3 w-3", getStrengthColor())} />
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
        <TooltipContent side="top" className="px-4 py-3 text-sm space-y-2">
          <div className="font-medium flex items-center gap-1.5">
            <Lightbulb className={cn("h-3 w-3", getStrengthColor())} />
            <span>Memory Level {level}</span>
          </div>
          <p className="text-muted-foreground text-xs">{getStrengthDescription()}</p>
          <div className="text-xs">
            Estimated retention: ~{getRetentionPercentage()}%
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}