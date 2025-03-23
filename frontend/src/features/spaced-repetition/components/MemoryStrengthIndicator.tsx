import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { HelpCircle } from 'lucide-react';

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
  // Get color based on strength
  const getStrengthColor = () => {
    if (level <= 1) return 'text-blue-500';
    if (level <= 3) return 'text-indigo-500';
    if (level <= 5) return 'text-violet-500';
    return 'text-purple-500';
  };
  
  // Get background color based on strength
  const getStrengthBgColor = () => {
    if (level <= 1) return 'bg-blue-500';
    if (level <= 3) return 'bg-indigo-500';
    if (level <= 5) return 'bg-violet-500';
    return 'bg-purple-500';
  };
  
  // Get color for specific level
  const getColorForLevel = (targetLevel: number) => {
    if (targetLevel <= 1) return 'text-blue-500';
    if (targetLevel <= 3) return 'text-indigo-500';
    if (targetLevel <= 5) return 'text-violet-500';
    return 'text-purple-500';
  };
  
  // Get background color for specific level
  const getBgColorForLevel = (targetLevel: number) => {
    if (targetLevel <= 1) return 'bg-blue-500';
    if (targetLevel <= 3) return 'bg-indigo-500';
    if (targetLevel <= 5) return 'bg-violet-500';
    return 'bg-purple-500';
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
  
  const indicator = (
    <div className={cn("relative flex items-center gap-1 group", className)}>
      <HelpCircle className="h-4 w-4 mr-1.5 text-slate-400 opacity-60" />
    </div>
  );
  
  if (!showTooltip) return indicator;
  
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          {indicator}
        </TooltipTrigger>
        <TooltipContent side="top" className="px-3 py-1.5 text-sm bg-white text-slate-800 font-medium border border-slate-200">
          See learning details
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}