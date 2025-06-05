import { useEffect, useState } from 'react';
import { Dumbbell, Check, X, ArrowRight, Info, Lightbulb } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { 
  Tooltip, 
  TooltipContent, 
  TooltipProvider, 
  TooltipTrigger 
} from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface ReviewHistoryEntry {
  date: string;
  wasSuccessful: boolean;
  levelBefore: number;
  levelAfter: number;
  reviewOption?: 'easy' | 'difficult' | 'forgot' | 'standard-review' | 'added-to-repetition';
}

interface MemoryProgressionJourneyProps {
  problemId: string;
  problemSlug?: string | null;
  currentLevel: number;
  reviewHistory?: ReviewHistoryEntry[];
  onClose?: () => void;
}

/**
 * A component that visualizes the user's memory strengthening journey over time
 * Shows how memory retention has improved through spaced repetition reviews
 */
export function MemoryProgressionJourney({
  problemId,
  problemSlug,
  currentLevel,
  reviewHistory = [],
  onClose
}: MemoryProgressionJourneyProps) {
  const [isOpen, setIsOpen] = useState(true);
  
  // Animation to fade in the component
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsOpen(true);
    }, 100);
    return () => clearTimeout(timer);
  }, []);
  
  // Get strength color based on level
  const getStrengthColor = (level: number) => {
    if (level <= 1) return 'text-blue-500';
    if (level <= 3) return 'text-indigo-500';
    if (level <= 5) return 'text-violet-500';
    return 'text-purple-500';
  };
  
  // Get background color based on level
  const getStrengthBgColor = (level: number) => {
    if (level <= 1) return 'bg-blue-500';
    if (level <= 3) return 'bg-indigo-500';
    if (level <= 5) return 'bg-violet-500';
    return 'bg-purple-500';
  };
  
  // Get descriptive text based on level
  const getStrengthDescription = (level: number) => {
    if (level === 0) return 'New - Just learned';
    if (level === 1) return 'Fragile - Review soon';
    if (level <= 3) return 'Building - Keep reviewing';
    if (level <= 5) return 'Strong - Good retention';
    return 'Mastered - Long-term memory';
  };
  
  // Calculate retention percentage
  const getRetentionPercentage = (level: number) => {
    const baseRetention = 25; // Base retention percentage
    const increasePerLevel = 10; // Percentage increase per level
    return Math.min(95, baseRetention + (level * increasePerLevel));
  };
  
  // Calculate next review interval in days
  const getNextReviewInterval = (level: number) => {
    // Fibonacci-based spacing (1, 1, 2, 3, 5, 8, 13, 21 days)
    const intervals = [1, 1, 2, 3, 5, 8, 13, 21];
    return intervals[Math.min(level, intervals.length - 1)];
  };
  
  // Format date for display
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Handle close
  const handleClose = () => {
    setIsOpen(false);
    setTimeout(() => {
      if (onClose) onClose();
    }, 300);
  };
  
  // Sort and prepare history data
  const sortedHistory = [...reviewHistory].sort((a, b) => 
    new Date(a.date).getTime() - new Date(b.date).getTime()
  );
  
  // Calculate success rate
  const successRate = reviewHistory.length > 0
    ? Math.round((reviewHistory.filter(r => r.wasSuccessful).length / reviewHistory.length) * 100)
    : 0;
  
  return (
    <div className={cn(
      "fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4",
      "transition-opacity duration-300",
      isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
    )}>
      <Card className="w-full max-w-3xl max-h-[80vh] overflow-y-auto">
        <CardHeader>
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <Lightbulb className={cn("h-4 w-4", getStrengthColor(currentLevel))} />
              <CardTitle>Memory Strengthening Journey</CardTitle>
            </div>
            <Button variant="ghost" size="sm" onClick={handleClose}>
              Close
            </Button>
          </div>
          <CardDescription>
            See how your memory retention has improved through spaced repetition
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Current memory strength */}
          <div className="border rounded-lg p-4 shadow-sm">
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-medium">Current Memory Strength</h3>
              <div className={cn(
                "px-2 py-1 rounded text-xs font-medium flex items-center gap-1.5",
                getStrengthColor(currentLevel),
                "bg-opacity-20",
                getStrengthBgColor(currentLevel).replace('bg-', 'bg-opacity-10')
              )}>
                <Lightbulb className="h-2.5 w-2.5" />
                <span>Level {currentLevel}/7</span>
              </div>
            </div>
            
            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>{getStrengthDescription(currentLevel)}</span>
                  <span>{getRetentionPercentage(currentLevel)}% retention</span>
                </div>
                <div className="h-2 w-full bg-gray-200 rounded-full overflow-hidden">
                  <div 
                    className={cn(
                      "h-full rounded-full transition-all duration-700", 
                      getStrengthBgColor(currentLevel)
                    )} 
                    style={{ width: `${(currentLevel / 7) * 100}%` }}
                  />
                </div>
              </div>
              
              <div className="flex gap-4 text-sm pt-2">
                <div>
                  <span className="text-muted-foreground">Next review:</span>{' '}
                  <span className="font-medium">In {getNextReviewInterval(currentLevel)} days</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Success rate:</span>{' '}
                  <span className="font-medium">{successRate}%</span>
                </div>
              </div>
            </div>
          </div>
          
          {/* Memory improvement over time */}
          {sortedHistory.length > 0 ? (
            <div className="border rounded-lg p-4 shadow-sm space-y-3">
              <h3 className="font-medium">Memory Improvement Timeline</h3>
              
              <div className="relative">
                {/* Level markers on the left */}
                <div className="absolute left-0 top-0 bottom-0 w-8 flex flex-col justify-between text-xs text-muted-foreground">
                  {[7, 6, 5, 4, 3, 2, 1, 0].map(level => (
                    <div key={level} className="flex items-center h-8">
                      <span>{level}</span>
                    </div>
                  ))}
                </div>
                
                {/* Graph container */}
                <div className="ml-8 pl-4 border-l border-dashed">
                  <div className="relative h-64">
                    {/* Horizontal grid lines */}
                    {[0, 1, 2, 3, 4, 5, 6, 7].map(level => (
                      <div 
                        key={level} 
                        className="absolute w-full border-t border-gray-100"
                        style={{ bottom: `${(level / 7) * 100}%` }}
                      />
                    ))}
                    
                    {/* Plot review history points */}
                    <div className="relative h-full">
                      {sortedHistory.map((entry, index) => {
                        // Calculate Y position based on level AFTER the review
                        const bottomPercentage = (entry.levelAfter / 7) * 100; // Use levelAfter
                        
                        // Calculate position for the line to the next point
                        const hasNextPoint = index < sortedHistory.length - 1;
                        const nextEntry = sortedHistory[index + 1];
                        const nextBottomPercentage = hasNextPoint 
                          ? (nextEntry.levelAfter / 7) * 100 // Use levelAfter for next point too
                          : bottomPercentage;
                        
                        return (
                          <div 
                            key={index}
                            className="absolute"
                            style={{ 
                              bottom: `${bottomPercentage}%`, // Position based on levelAfter
                              left: `${(index / (sortedHistory.length - 1 || 1)) * 100}%`
                            }}
                          >
                            {/* Line to next point */}
                            {hasNextPoint && (
                              <div 
                                className={cn(
                                  "absolute h-0.5",
                                  entry.wasSuccessful ? "bg-green-500" : "bg-red-500"
                                )}
                                style={{
                                  width: `${100 / (sortedHistory.length - 1)}%`,
                                  transform: `rotate(${Math.atan2(
                                    nextBottomPercentage - bottomPercentage, 
                                    100 / (sortedHistory.length - 1)
                                  )}rad)`,
                                  transformOrigin: 'left',
                                }}
                              />
                            )}
                            
                            {/* Point */}
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <div 
                                    className={cn(
                                      "h-3 w-3 rounded-full -ml-1.5 -mt-1.5 cursor-pointer border-2 border-white",
                                      entry.wasSuccessful ? "bg-green-500" : "bg-red-500"
                                    )}
                                  />
                                </TooltipTrigger>
                                <TooltipContent className="px-3 py-1.5 text-sm bg-white text-slate-800 font-medium border border-slate-200 space-y-1">
                                  <div className="font-medium">
                                    {entry.wasSuccessful ? (
                                      <div className="flex items-center gap-1 text-green-500">
                                        <Check className="h-3 w-3" />
                                        <span>Successful Review</span>
                                      </div>
                                    ) : (
                                      <div className="flex items-center gap-1 text-red-500">
                                        <X className="h-3 w-3" />
                                        <span>Unsuccessful Review</span>
                                      </div>
                                    )}
                                  </div>
                                  <div className="text-xs">
                                    <div>Date: {formatDate(entry.date)}</div>
                                    {/* UPDATED Tooltip: Show level achieved after review */}
                                    <div>Level: {entry.levelAfter} (was {entry.levelBefore})</div>
                                    {entry.reviewOption && (
                                      <div>
                                        Option: {entry.reviewOption.charAt(0).toUpperCase() + entry.reviewOption.slice(1)}
                                      </div>
                                    )}
                                  </div>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  
                  {/* Time labels */}
                  <div className="flex justify-between text-xs text-muted-foreground mt-1">
                    {sortedHistory.length > 0 && (
                      <>
                        <div>{new Date(sortedHistory[0].date).toLocaleDateString()}</div>
                        {sortedHistory.length > 2 && (
                          <div>{new Date(sortedHistory[Math.floor(sortedHistory.length / 2)].date).toLocaleDateString()}</div>
                        )}
                        <div>{new Date(sortedHistory[sortedHistory.length - 1].date).toLocaleDateString()}</div>
                      </>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="flex justify-between pt-2 text-xs text-muted-foreground">
                <div>First Review: {formatDate(sortedHistory[0].date)}</div>
                <div>Latest Review: {formatDate(sortedHistory[sortedHistory.length - 1].date)}</div>
              </div>
            </div>
          ) : (
            <div className="border rounded-lg p-6 text-center shadow-sm">
              <Info className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
              <p className="text-muted-foreground">No review history available yet.</p>
              <p className="text-sm mt-1">Complete reviews to build your memory strengthening journey.</p>
            </div>
          )}
          
          {/* Memory science information */}
          <div className="border border-blue-100 bg-blue-50 dark:bg-blue-950 dark:border-blue-900 rounded-lg p-4 text-sm space-y-2">
            <h3 className="font-medium flex items-center gap-1">
              <Info className="h-4 w-4 text-blue-500" />
              <span>How Spaced Repetition Strengthens Memory</span>
            </h3>
            <p>
              Each successful review moves information from short-term to long-term memory through a process called memory consolidation.
              The increasing intervals between reviews are optimized based on cognitive science research on the forgetting curve.
            </p>
            <p>
              By reviewing right before you're likely to forget, you strengthen neural pathways most efficiently, creating stronger and more durable memories.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 