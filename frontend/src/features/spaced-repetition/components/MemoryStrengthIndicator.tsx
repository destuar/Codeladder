import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Dumbbell, ArrowUp, ArrowDown } from 'lucide-react';
import { useState, useEffect } from 'react';

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
  // Map review level (0-7) to a percentage (0-100%)
  const strengthPercentage = Math.min(100, Math.round((level / 7) * 100));
  
  // Animation state for level change
  const [isAnimating, setIsAnimating] = useState(false);
  const [showLevelChange, setShowLevelChange] = useState(false);
  const levelChanged = previousLevel !== null && previousLevel !== level;
  const levelIncreased = previousLevel !== null && level > previousLevel;

  // Trigger animation when level changes
  useEffect(() => {
    if (levelChanged) {
      setIsAnimating(true);
      setShowLevelChange(true);
      
      // Hide level change indicator after animation
      const timer = setTimeout(() => {
        setShowLevelChange(false);
      }, 3000);
      
      return () => clearTimeout(timer);
    }
  }, [level, previousLevel, levelChanged]);
  
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

  // Get memory retention prediction
  const getRetentionPrediction = () => {
    // Simplified forgetting curve estimation (just for visualization)
    const retentionRates = [
      "25% after 1 day", // Level 0
      "40% after 1 day", // Level 1
      "60% after 2 days", // Level 2
      "70% after 3 days", // Level 3
      "80% after 5 days", // Level 4
      "85% after 8 days", // Level 5
      "90% after 13 days", // Level 6
      "95% after 21 days", // Level 7
    ];
    
    return retentionRates[level];
  };
  
  const indicator = (
    <div className={cn("relative flex items-center gap-1 group", className)}>
      <Dumbbell className={cn(
        "h-4 w-4 mr-1.5",
        getStrengthColor()
      )} />
      
      <div className="w-16 h-1.5 bg-gray-200 rounded-full overflow-hidden">
        <div 
          className={cn(
            "h-full rounded-full transition-all duration-700", 
            getStrengthColor().replace('text-', 'bg-')
          )} 
          style={{ width: `${strengthPercentage}%` }}
        />
      </div>

      {/* Level change indicator */}
      {showLevelChange && (
        <div className={cn(
          "absolute -top-8 left-1/2 -translate-x-1/2 flex items-center gap-0.5 text-xs font-medium animate-in fade-in slide-in-from-bottom-2 duration-300",
          levelIncreased ? "text-green-500" : "text-red-500"
        )}>
          {levelIncreased ? (
            <>
              <ArrowUp className="h-3 w-3" />
              <span>{`+${level - (previousLevel || 0)} Level`}</span>
            </>
          ) : (
            <>
              <ArrowDown className="h-3 w-3" />
              <span>{`-${(previousLevel || 0) - level} Level`}</span>
            </>
          )}
        </div>
      )}
    </div>
  );
  
  if (!showTooltip) return indicator;
  
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          {indicator}
        </TooltipTrigger>
        <TooltipContent className="w-64 p-4">
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <p className="font-medium text-base">{getStrengthDescription()}</p>
              <div className={cn(
                "px-2 py-0.5 rounded text-xs font-medium",
                getStrengthColor().replace('text-', 'bg-'),
                "bg-opacity-20"
              )}>
                Level {level}/7
              </div>
            </div>
            
            <div>
              <p className="text-sm mb-1">Memory Retention</p>
              <div className="h-1.5 w-full bg-gray-200 rounded-full">
                {[0, 1, 2, 3, 4, 5, 6, 7].map((l) => (
                  <div
                    key={l}
                    className={cn(
                      "h-full rounded-full transition-all",
                      l <= level ? getStrengthColor().replace('text-', 'bg-') : "bg-transparent"
                    )}
                    style={{
                      width: `${Math.min(100, Math.round((l / 7) * 100))}%`,
                      position: 'absolute'
                    }}
                  />
                ))}
              </div>
              <div className="flex justify-between text-xs mt-1">
                <span>Short-term</span>
                <span>Long-term</span>
              </div>
            </div>
            
            <div className="text-sm space-y-1">
              <p className="font-medium">{getNextReviewText()}</p>
              <p className="text-xs text-muted-foreground">Predicted retention: {getRetentionPrediction()}</p>
            </div>
            
            <div className="text-xs text-muted-foreground pt-1 border-t border-gray-200">
              <p>Regular reviews strengthen long-term memory</p>
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
} 