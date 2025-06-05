import { useState } from 'react';
import { format } from 'date-fns';
import { ScheduledReviews, ReviewProblem } from '../api/spacedRepetitionApi';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Clock, CalendarDays, ChevronRight } from 'lucide-react';
import { MemoryStrengthIndicator } from './MemoryStrengthIndicator';
import { Difficulty } from '@/features/problems/types';
import { DifficultyBadge } from '@/features/problems/components/DifficultyBadge';
import { MemoryProgressionJourney, ReviewHistoryEntry } from './MemoryProgressionJourney';
import { cn } from '@/lib/utils';

/**
 * A component to handle the memory journey button and state
 */
function MemoryJourneyButton({ problem }: { problem: ReviewProblem }) {
  const [showMemoryJourney, setShowMemoryJourney] = useState(false);
  
  // Get previous review data from localStorage if available
  const storageKey = `review-level-${problem.id}`;
  let previousLevel = null;
  
  // Check if we have a stored previous level
  try {
    const storedData = localStorage.getItem(storageKey);
    if (storedData) {
      previousLevel = parseInt(storedData, 10);
      // If current level is different, update storage after a delay
      if (previousLevel !== problem.reviewLevel) {
        setTimeout(() => {
          localStorage.setItem(storageKey, problem.reviewLevel.toString());
        }, 5000); // Update after animation completes
      }
    } else {
      // Store current level for future reference
      localStorage.setItem(storageKey, problem.reviewLevel.toString());
    }
  } catch (e) {
    console.error('Error accessing localStorage:', e);
  }
  
  const transformedHistory: ReviewHistoryEntry[] = (problem.reviewHistory || [])
    .slice() // Create a shallow copy before sorting to avoid mutating the original prop
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .map((entry, index, sortedArray) => {
      const levelBefore = index === 0 ? 0 : sortedArray[index - 1].reviewLevel;
      return {
        ...entry,
        levelBefore: levelBefore,
        levelAfter: entry.reviewLevel, // Assuming reviewLevel from API is levelAfter
        // reviewOption can remain as is, or be mapped if necessary
      };
    });
  
  return (
    <>
      <div 
        className="cursor-pointer" 
        onClick={() => setShowMemoryJourney(true)}
        title="View memory progression"
      >
        <MemoryStrengthIndicator 
          level={problem.reviewLevel} 
          previousLevel={previousLevel}
        />
      </div>
      
      {/* Memory progression journey modal */}
      {showMemoryJourney && (
        <MemoryProgressionJourney
          problemId={problem.id}
          problemSlug={problem.slug}
          currentLevel={problem.reviewLevel}
          reviewHistory={transformedHistory}
          onClose={() => setShowMemoryJourney(false)}
        />
      )}
    </>
  );
}

interface AllScheduledReviewsProps {
  scheduledReviews?: ScheduledReviews;
  onStartReview: (problem: { id: string; slug?: string | null }, options?: { isEarly?: boolean; dueDate?: string }) => void;
}

export function AllScheduledReviews({ scheduledReviews, onStartReview }: AllScheduledReviewsProps) {
  const [expandedCategories, setExpandedCategories] = useState<string[]>(['today']);

  if (!scheduledReviews) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Loading scheduled reviews...
      </div>
    );
  }

  const { dueToday, dueThisWeek, dueThisMonth, dueLater } = scheduledReviews;
  
  const hasReviews = 
    dueToday.length > 0 || 
    dueThisWeek.length > 0 || 
    dueThisMonth.length > 0 || 
    dueLater.length > 0;
  
  if (!hasReviews) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No scheduled reviews found.
      </div>
    );
  }

  // Render a problem card - matching the calendar view
  const renderProblemCard = (problem: ReviewProblem, category: string) => {
    const isActiveDay = category === 'today';
    
    return (
      <div 
        key={problem.id} 
        className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
      >
        <div>
          <div className="font-medium">{problem.name}</div>
          <div className="text-sm text-muted-foreground flex items-center gap-2 mt-1">
            {typeof problem.topic === 'string' ? (
              <span>{problem.topic}</span>
            ) : problem.topic && typeof problem.topic === 'object' && 'name' in problem.topic ? (
              <span>{problem.topic.name}</span>
            ) : null}
            <span>•</span>
            <DifficultyBadge difficulty={problem.difficulty as Difficulty} size="small" />
            {!isActiveDay && problem.dueDate && (
              <>
                <span>•</span>
                <span className="text-xs">Due {format(new Date(problem.dueDate), 'MMM d')}</span>
              </>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <MemoryJourneyButton problem={problem} />
          
          <Button 
            size="sm" 
            variant="outline"
            onClick={() => onStartReview(
              { 
                id: problem.id,
                slug: problem.slug || undefined
              }, 
              !isActiveDay ? { 
                isEarly: true, 
                dueDate: problem.dueDate ?? undefined 
              } : undefined
            )}
            className={cn(
              "px-2 py-1 h-7 sm:px-3 sm:py-1 sm:h-8 transition-all text-xs sm:text-sm",
              "bg-transparent hover:bg-blue-50/70 text-blue-600 border border-blue-200/70",
              "dark:border-blue-800/50 dark:text-blue-400 dark:hover:bg-blue-900/20",
              !isActiveDay && "opacity-80 hover:opacity-100"
            )}
          >
            Review
          </Button>
        </div>
      </div>
    );
  };

  const renderReviewList = (reviews: ReviewProblem[], category: string) => {
    return (
      <ScrollArea className="h-[300px] pr-4">
        <div className="space-y-2">
          {reviews.map(problem => renderProblemCard(problem, category))}
        </div>
      </ScrollArea>
    );
  };

  // Create the sections manually without using Accordion component
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <CalendarDays className="h-5 w-5 text-muted-foreground" />
        <h3 className="text-lg font-medium">All Scheduled Reviews</h3>
      </div>
      
      <div className="space-y-3">
        {/* Due Today Section */}
        {dueToday.length > 0 && (
          <div className="border rounded-md overflow-hidden">
            <div 
              className="px-4 py-3 bg-muted/30 flex items-center justify-between cursor-pointer"
              onClick={() => {
                if (expandedCategories.includes('today')) {
                  setExpandedCategories(expandedCategories.filter(cat => cat !== 'today'));
                } else {
                  setExpandedCategories([...expandedCategories, 'today']);
                }
              }}
            >
              <h4 className="font-medium">Due Today</h4>
              <div className="flex items-center gap-2">
                <Badge>{dueToday.length}</Badge>
                <ChevronRight 
                  className={`h-4 w-4 transition-transform ${
                    expandedCategories.includes('today') ? 'rotate-90' : ''
                  }`} 
                />
              </div>
            </div>
            {expandedCategories.includes('today') && (
              <div className="p-4">
                {renderReviewList(dueToday, 'today')}
              </div>
            )}
          </div>
        )}
        
        {/* Due This Week Section */}
        {dueThisWeek.length > 0 && (
          <div className="border rounded-md overflow-hidden">
            <div 
              className="px-4 py-3 bg-muted/30 flex items-center justify-between cursor-pointer"
              onClick={() => {
                if (expandedCategories.includes('week')) {
                  setExpandedCategories(expandedCategories.filter(cat => cat !== 'week'));
                } else {
                  setExpandedCategories([...expandedCategories, 'week']);
                }
              }}
            >
              <h4 className="font-medium">Due This Week</h4>
              <div className="flex items-center gap-2">
                <Badge>{dueThisWeek.length}</Badge>
                <ChevronRight 
                  className={`h-4 w-4 transition-transform ${
                    expandedCategories.includes('week') ? 'rotate-90' : ''
                  }`} 
                />
              </div>
            </div>
            {expandedCategories.includes('week') && (
              <div className="p-4">
                {renderReviewList(dueThisWeek, 'week')}
              </div>
            )}
          </div>
        )}
        
        {/* Due This Month Section */}
        {dueThisMonth.length > 0 && (
          <div className="border rounded-md overflow-hidden">
            <div 
              className="px-4 py-3 bg-muted/30 flex items-center justify-between cursor-pointer"
              onClick={() => {
                if (expandedCategories.includes('month')) {
                  setExpandedCategories(expandedCategories.filter(cat => cat !== 'month'));
                } else {
                  setExpandedCategories([...expandedCategories, 'month']);
                }
              }}
            >
              <h4 className="font-medium">Due This Month</h4>
              <div className="flex items-center gap-2">
                <Badge>{dueThisMonth.length}</Badge>
                <ChevronRight 
                  className={`h-4 w-4 transition-transform ${
                    expandedCategories.includes('month') ? 'rotate-90' : ''
                  }`} 
                />
              </div>
            </div>
            {expandedCategories.includes('month') && (
              <div className="p-4">
                {renderReviewList(dueThisMonth, 'month')}
              </div>
            )}
          </div>
        )}
        
        {/* Due Later Section */}
        {dueLater.length > 0 && (
          <div className="border rounded-md overflow-hidden">
            <div 
              className="px-4 py-3 bg-muted/30 flex items-center justify-between cursor-pointer"
              onClick={() => {
                if (expandedCategories.includes('later')) {
                  setExpandedCategories(expandedCategories.filter(cat => cat !== 'later'));
                } else {
                  setExpandedCategories([...expandedCategories, 'later']);
                }
              }}
            >
              <h4 className="font-medium">Due Later</h4>
              <div className="flex items-center gap-2">
                <Badge>{dueLater.length}</Badge>
                <ChevronRight 
                  className={`h-4 w-4 transition-transform ${
                    expandedCategories.includes('later') ? 'rotate-90' : ''
                  }`} 
                />
              </div>
            </div>
            {expandedCategories.includes('later') && (
              <div className="p-4">
                {renderReviewList(dueLater, 'later')}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
} 