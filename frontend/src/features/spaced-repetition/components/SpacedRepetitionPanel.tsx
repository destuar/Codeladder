import { useState, useEffect } from 'react';
import { useSpacedRepetition } from '../hooks/useSpacedRepetition';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { format, formatDistanceToNow, isSameDay, isToday, addDays, isWithinInterval, startOfDay, endOfDay } from 'date-fns';
import { MemoryStrengthIndicator } from './MemoryStrengthIndicator';
import { ReviewCalendar } from './ReviewCalendar';
import { ReviewProblem } from '../api/spacedRepetitionApi';
import { CalendarIcon, Clock, Calendar, ClockIcon, RefreshCw } from 'lucide-react';

/**
 * Panel component that displays problems due for review and allows users to start reviews
 */
export function SpacedRepetitionPanel() {
  const { 
    dueReviews, 
    stats,
    isLoading, 
    startReview,
    toggleReviewPanel,
    isReviewPanelOpen,
    refreshReviews
  } = useSpacedRepetition();
  
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedDayProblems, setSelectedDayProblems] = useState<ReviewProblem[]>([]);
  
  // Ensure the review panel is open when this component is mounted
  useEffect(() => {
    if (!isReviewPanelOpen) {
      toggleReviewPanel();
    }
  }, [isReviewPanelOpen, toggleReviewPanel]);
  
  const getDifficultyColor = (difficulty: string) => {
    if (difficulty.includes('EASY')) return 'bg-emerald-500/15 text-emerald-600 border-emerald-500/20';
    if (difficulty === 'MEDIUM') return 'bg-amber-500/15 text-amber-600 border-amber-500/20';
    if (difficulty === 'HARD') return 'bg-rose-500/15 text-rose-600 border-rose-500/20';
    return '';
  };
  
  const handleDaySelect = (date: Date, problems: ReviewProblem[]) => {
    setSelectedDate(date);
    setSelectedDayProblems(problems);
  };

  // Group problems by timeframe (Today and This Week)
  const groupProblemsByTimeframe = () => {
    const now = new Date();
    const today = startOfDay(now);
    const todayEnd = endOfDay(now);
    const weekEnd = endOfDay(addDays(now, 6)); // Next 7 days

    const todayProblems = dueReviews.filter(problem => {
      if (!problem.dueDate) return false;
      const dueDate = new Date(problem.dueDate);
      return isWithinInterval(dueDate, { start: today, end: todayEnd });
    });

    // Match backend logic: "This Week" = problems due after today and within the next 7 days
    const thisWeekProblems = dueReviews.filter(problem => {
      if (!problem.dueDate) return false;
      const dueDate = new Date(problem.dueDate);
      
      // Backend criteria: gt: now, lte: nextWeek
      return dueDate > todayEnd && dueDate <= weekEnd;
    });

    return {
      today: todayProblems,
      thisWeek: thisWeekProblems
    };
  };

  // Handle refresh button click
  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refreshReviews();
    } finally {
      setIsRefreshing(false);
    }
  };

  // Render a problem card
  const renderProblemCard = (problem: ReviewProblem, isActiveDay: boolean) => (
    <div 
      key={problem.id} 
      className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
    >
      <div>
        <div className="font-medium">{problem.name}</div>
        <div className="text-sm text-muted-foreground flex items-center gap-2 mt-1">
          <span>{problem.topic.name}</span>
          <span>•</span>
          <Badge variant="outline" className={getDifficultyColor(problem.difficulty)}>
            {problem.difficulty.replace(/_/g, ' ')}
          </Badge>
          {!isActiveDay && problem.dueDate && (
            <>
              <span>•</span>
              <span className="text-xs">Due {format(new Date(problem.dueDate), 'MMM d')}</span>
            </>
          )}
        </div>
      </div>
      <div className="flex items-center gap-3">
        <MemoryStrengthIndicator level={problem.reviewLevel} />
        <Button 
          size="sm" 
          onClick={() => startReview(problem.id)}
          disabled={!isActiveDay}
          variant={isActiveDay ? "default" : "outline"}
        >
          {isActiveDay ? 'Review' : 'View'}
        </Button>
      </div>
    </div>
  );
  
  // Render section with problems
  const renderProblemSection = (title: string, icon: React.ReactNode, problems: ReviewProblem[], isActiveSection: boolean) => (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm font-medium border-b pb-2">
        {icon}
        <span>{title} ({problems.length})</span>
      </div>
      {problems.length > 0 ? (
        <div className="grid gap-2">
          {problems.map(problem => renderProblemCard(problem, isActiveSection))}
        </div>
      ) : (
        <div className="text-sm text-muted-foreground italic py-2">
          No problems due {title.toLowerCase()}.
        </div>
      )}
    </div>
  );
  
  // Render problems section (Today and This Week)
  const renderProblemsSection = () => {
    const isSelectedToday = isToday(selectedDate);
    
    // If not viewing today, show the selected day's problems
    if (!isSelectedToday) {
      return (
        <div className="space-y-4">
          <div className="flex justify-between items-center text-sm font-medium mb-2">
            <div className="flex items-center gap-2">
              <CalendarIcon className="h-4 w-4 text-primary" />
              <span>Due on {format(selectedDate, 'MMMM d, yyyy')}</span>
            </div>
            <Badge variant="outline" className="bg-muted/50">
              {formatDistanceToNow(selectedDate, { addSuffix: true })}
            </Badge>
          </div>
          
          {selectedDayProblems.length > 0 ? (
            <div className="grid gap-2 max-h-[500px] overflow-y-auto pr-1">
              {selectedDayProblems.map(problem => renderProblemCard(problem, false))}
            </div>
          ) : (
            <div className="text-center text-muted-foreground p-6">
              <p>No problems due for review on this day.</p>
              <p className="text-sm mt-2">Try selecting a different day.</p>
            </div>
          )}
        </div>
      );
    }
    
    // If viewing today, group problems by timeframe
    const { today, thisWeek } = groupProblemsByTimeframe();
    const totalProblems = today.length + thisWeek.length;
    
    if (isLoading) {
      return (
        <div className="flex justify-center p-6">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" />
        </div>
      );
    }
    
    // If stats show we should have problems but we don't, something might be wrong
    const expectedProblems = (stats?.dueNow || 0) + (stats?.dueThisWeek || 0);
    if (totalProblems === 0 && expectedProblems > 0) {
      return (
        <div className="space-y-4">
          <div className="text-center text-muted-foreground p-6">
            <p>Loading review problems...</p>
            <p className="text-sm mt-2">
              {stats?.dueNow || 0} problem(s) due today and {stats?.dueThisWeek || 0} problem(s) due this week.
            </p>
            <Button 
              variant="outline" 
              size="sm" 
              className="mt-4"
              onClick={handleRefresh}
              disabled={isRefreshing}
            >
              <RefreshCw className={`h-4 w-4 mr-1 ${isRefreshing ? 'animate-spin' : ''}`} />
              {isRefreshing ? 'Refreshing...' : 'Refresh Data'}
            </Button>
          </div>
        </div>
      );
    }
    
    // If there are truly no problems
    if (totalProblems === 0 && expectedProblems === 0) {
      return (
        <div className="text-center text-muted-foreground p-6">
          <p>No problems due for review this week.</p>
          <p className="text-sm mt-2">
            Complete more problems to add them to your review schedule.
          </p>
        </div>
      );
    }
    
    return (
      <div className="space-y-6 max-h-[500px] overflow-y-auto pr-1">
        {renderProblemSection("Today", <ClockIcon className="h-4 w-4 text-primary" />, today, true)}
        {renderProblemSection("This Week", <Calendar className="h-4 w-4 text-blue-500" />, thisWeek, false)}
      </div>
    );
  };
  
  return (
    <Card className="mb-6">
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-xl">Spaced Repetition Reviews</CardTitle>
            <CardDescription>
              Review these problems to strengthen your memory
            </CardDescription>
          </div>
          <div className="flex items-center gap-3">
            {stats && (
              <div className="flex gap-2">
                <Badge variant="outline" className="bg-primary/10 hover:bg-primary/20">
                  {stats.dueNow} Today
                </Badge>
                <Badge variant="outline" className="bg-primary/5 hover:bg-primary/10">
                  {stats.dueThisWeek} This Week
                </Badge>
              </div>
            )}
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={handleRefresh} 
              disabled={isRefreshing}
              title="Refresh data"
            >
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left side: Calendar */}
          <div className="lg:col-span-1">
            <div className="border rounded-lg p-4">
              <ReviewCalendar 
                stats={stats}
                problems={dueReviews} 
                onDaySelect={handleDaySelect}
              />
              
              {/* Legend */}
              <div className="mt-4 pt-4 border-t text-sm text-muted-foreground">
                <div className="flex items-center gap-2 mb-2">
                  <CalendarIcon className="h-3.5 w-3.5" />
                  <span>Calendar shows reviews by day</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-3.5 w-3.5" />
                  <span>Regular reviews improve retention</span>
                </div>
              </div>
            </div>
          </div>
          
          {/* Right side: Problem list */}
          <div className="lg:col-span-2 border rounded-lg p-4">
            {renderProblemsSection()}
          </div>
        </div>
      </CardContent>
    </Card>
  );
} 