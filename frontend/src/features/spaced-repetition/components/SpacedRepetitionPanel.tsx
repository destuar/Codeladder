import { useState, useEffect, useCallback } from 'react';
import { useSpacedRepetition } from '../hooks/useSpacedRepetition';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { format, formatDistanceToNow, isSameDay, isToday, addDays, isWithinInterval, startOfDay, endOfDay, isAfter } from 'date-fns';
import { ReviewCalendar } from './ReviewCalendar';
import { ReviewProblem } from '../api/spacedRepetitionApi';
import { Difficulty } from '@/features/problems/types';
import { DifficultyBadge } from '@/features/problems/components/DifficultyBadge';
import { CalendarIcon, Clock, Calendar, ClockIcon, RefreshCw, ChevronDown, ChevronUp, ArrowLeft, Dumbbell, Check, Brain, Shuffle, Trash2, Edit2, Save, X, Plus, CalendarDays, HelpCircle, Lightbulb, LockIcon } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger
} from "@/components/ui/alert-dialog";
import { AddProblemsModal } from './AddProblemsModal';
import { cn } from '@/lib/utils';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

/**
 * Panel component that displays problems due for review and allows users to start reviews
 */
export function SpacedRepetitionPanel() {
  const location = useLocation();
  const navigate = useNavigate();
  const { 
    dueReviews, 
    allScheduledReviews,
    stats,
    isLoading, 
    startReview,
    toggleReviewPanel,
    isReviewPanelOpen,
    refreshReviews,
    removeProblem,
    addCompletedProblem,
    isAddingProblem,
    getAvailableProblems,
    isLoadingAvailableProblems
  } = useSpacedRepetition();
  
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedDayProblems, setSelectedDayProblems] = useState<ReviewProblem[]>([]);
  const [isCalendarDateSelected, setIsCalendarDateSelected] = useState(false);
  
  // Expansion states for each section
  const [isTodayOpen, setIsTodayOpen] = useState(false);
  const [isThisWeekOpen, setIsThisWeekOpen] = useState(false);
  const [isThisMonthOpen, setIsThisMonthOpen] = useState(false);
  const [isLaterOpen, setIsLaterOpen] = useState(false);
  
  const [showMemoryInfo, setShowMemoryInfo] = useState(false);
  
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedProblems, setSelectedProblems] = useState<Set<string>>(new Set());
  const [isRemoving, setIsRemoving] = useState(false);
  
  // State for Add Problems modal
  const [isAddProblemsModalOpen, setIsAddProblemsModalOpen] = useState(false);
  
  // Ensure the review panel is open when this component is mounted
  useEffect(() => {
    if (!isReviewPanelOpen) {
      toggleReviewPanel();
    }
  }, [isReviewPanelOpen, toggleReviewPanel]);
  
  // Handle refresh button click
  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refreshReviews();
    } finally {
      setIsRefreshing(false);
    }
  };
  
  // Check if we need to refresh data based on URL parameter
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const refreshParam = searchParams.get('refresh');
    
    if (refreshParam) {
      handleRefresh();
      
      // Remove the refresh parameter from the URL to avoid repeated refreshes
      searchParams.delete('refresh');
      const newSearch = searchParams.toString();
      const newPath = `${location.pathname}${newSearch ? `?${newSearch}` : ''}`;
      navigate(newPath, { replace: true });
    }
  }, [location.search, handleRefresh, location.pathname, navigate]);
  
  // Effect to set isTodayOpen based on screen size on mount
  useEffect(() => {
    const checkScreenSize = () => {
      if (window.innerWidth >= 1024) { // Tailwind 'lg' breakpoint is 1024px
        setIsTodayOpen(true);
      }
    };
    checkScreenSize(); // Check on initial mount
    // Optional: Add resize listener if needed, and cleanup
    // window.addEventListener('resize', checkScreenSize);
    // return () => window.removeEventListener('resize', checkScreenSize);
  }, []); // Empty dependency array ensures this runs only once on mount
  
  const handleDaySelect = (date: Date, problems: ReviewProblem[]) => {
    // If the date is already selected, unselect it
    if (isCalendarDateSelected && isSameDay(date, selectedDate)) {
      setIsCalendarDateSelected(false);
      setSelectedDate(new Date()); // Reset to today
      
      // Show a brief flash notification when returning to the main dashboard
      const dashboardElement = document.querySelector('[data-section="problems-card"]');
      if (dashboardElement) {
        dashboardElement.classList.add('bg-blue-50/30', 'dark:bg-blue-900/10');
        setTimeout(() => {
          dashboardElement.classList.remove('bg-blue-50/30', 'dark:bg-blue-900/10');
        }, 800);
      }
      
      return;
    }
    
    // Otherwise, select the new date
    setSelectedDate(date);
    setSelectedDayProblems(problems);
    setIsCalendarDateSelected(true);
  };
  
  const toggleEditMode = () => {
    if (isEditMode) {
      // Clear selections when exiting edit mode
      setSelectedProblems(new Set());
    }
    setIsEditMode(!isEditMode);
  };
  
  const toggleProblemSelection = (problemId: string) => {
    const newSelectedProblems = new Set(selectedProblems);
    if (newSelectedProblems.has(problemId)) {
      newSelectedProblems.delete(problemId);
    } else {
      newSelectedProblems.add(problemId);
    }
    setSelectedProblems(newSelectedProblems);
  };
  
  const handleRemoveSelectedProblems = async () => {
    if (selectedProblems.size === 0 || isRemoving) return;
    
    setIsRemoving(true);
    
    try {
      const promises = Array.from(selectedProblems).map(problemId => 
        removeProblem(problemId)
      );
      
      await Promise.all(promises);
      
      // Exit edit mode after successful removal
      setIsEditMode(false);
      setSelectedProblems(new Set());
    } catch (error) {
      console.error('Failed to remove problems:', error);
    } finally {
      setIsRemoving(false);
    }
  };
  
  // Render a problem card
  const renderProblemCard = (problem: ReviewProblem, isActiveDay: boolean, index?: number) => {
    return (
    <div 
      key={problem.id} 
      className={`font-sans flex items-center justify-between p-3 border-b border-border/10 ${
        isEditMode 
          ? selectedProblems.has(problem.id)
            ? 'bg-primary/10' 
            : 'hover:bg-blue-50/20 dark:hover:bg-blue-900/5 cursor-pointer' 
          : 'hover:bg-blue-50/20 dark:hover:bg-blue-900/5'
      } ${index !== undefined && index % 2 === 0 ? "bg-muted/10 dark:bg-muted/15" : ""}`}
      onClick={isEditMode ? () => toggleProblemSelection(problem.id) : undefined}
    >
      <div className="flex items-center gap-2">
        {isEditMode && (
          <div className={`w-5 h-5 flex-shrink-0 border rounded ${
            selectedProblems.has(problem.id) 
              ? 'bg-primary border-primary text-primary-foreground flex items-center justify-center' 
              : 'border-muted-foreground/30'
          }`}>
            {selectedProblems.has(problem.id) && <Check className="h-3 w-3" />}
          </div>
        )}
        <div>
          <div className="font-medium text-foreground">{problem.name}</div>
          <div className="text-sm text-muted-foreground flex items-center gap-2 mt-1">
              {(problem.topic && typeof problem.topic === 'object' && problem.topic.name) ? (
                <span>{problem.topic.name}</span>
              ) : (problem as any).collectionName ? (
                <span>{(problem as any).collectionName}</span>
              ) : ((problem as any).collections && Array.isArray((problem as any).collections) && (problem as any).collections.length > 0 && (problem as any).collections[0].name) ? (
                <span>{(problem as any).collections[0].name}</span>
              ) : null}
              
              {((problem.topic && typeof problem.topic === 'object' && problem.topic.name) || (problem as any).collectionName || ((problem as any).collections && Array.isArray((problem as any).collections) && (problem as any).collections.length > 0 && (problem as any).collections[0].name)) && (
                <span>•</span>
              )}

            <DifficultyBadge difficulty={problem.difficulty as Difficulty} size="small" />
            {!isActiveDay && problem.dueDate && (
              <>
                <span>•</span>
                <span className="text-xs">Due {format(new Date(problem.dueDate), 'MMM d')}</span>
              </>
            )}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {!isEditMode && (
          <Button
            size="sm"
            variant="outline"
            className={cn(
              "px-2 py-1 h-7 sm:px-3 sm:py-1 sm:h-8 transition-all text-xs sm:text-sm",
              "bg-transparent hover:bg-blue-50/70 text-blue-600 border border-blue-200/70",
              "dark:border-blue-800/50 dark:text-blue-400 dark:hover:bg-blue-900/20",
              !isActiveDay && "opacity-70 hover:opacity-100"
            )}
            onClick={(e) => {
              e.stopPropagation();
              startReview(
                {
                  id: problem.id,
                  slug: problem.slug || undefined,
                },
                !isActiveDay ? { isEarly: true, dueDate: problem.dueDate || undefined } : undefined
              );
            }}
          >
            Start
          </Button>
        )}
      </div>
    </div>
  );
  };
  
  // Handle shuffle practice for a section
  const handleShufflePractice = (problems: ReviewProblem[], isActiveSection: boolean) => {
    if (problems.length === 0) return;
    
    // Pick a random problem from the section
    const randomIndex = Math.floor(Math.random() * problems.length);
    const randomProblem = problems[randomIndex];
    
    // Start review for the randomly selected problem
    startReview(
      {
        id: randomProblem.id,
        slug: randomProblem.slug || undefined
      },
      !isActiveSection ? {
        isEarly: true,
        dueDate: randomProblem.dueDate || undefined
      } : undefined
    );
  };
  
  // Render expandable section with problems
  const renderCollapsibleSection = (
    title: string, 
    icon: React.ReactNode, 
    problems: ReviewProblem[], 
    isActiveSection: boolean,
    isOpen: boolean,
    setIsOpen: React.Dispatch<React.SetStateAction<boolean>>
  ) => (
    <Collapsible 
      open={isOpen} 
      onOpenChange={setIsOpen}
      className="space-y-2 font-sans"
    >
      <div className="mb-4 overflow-hidden rounded-md shadow-md hover:shadow-lg transition-shadow duration-300 dark:shadow-[0_4px_6px_-1px_rgba(82,113,255,0.15),_0_2px_4px_-2px_rgba(82,113,255,0.15)] bg-background/80 dark:bg-background backdrop-blur-md dark:border dark:border-[#5271FF]/15">
        <div className="flex w-full">
          <CollapsibleTrigger asChild className="flex-1">
            <Button 
              variant="ghost" 
              size="sm" 
              className="font-sans w-full justify-between text-left h-10 p-0 hover:bg-muted/30 rounded-none group"
            >
              <div className="flex items-center gap-2 text-sm font-medium pl-3">
                {icon}
                <span className="text-foreground">{title}</span>
                <Badge
                  variant="outline"
                  className={cn(
                    "ml-1 font-sans",
                    isActiveSection
                      ? [
                          "bg-white text-primary border-border",
                          "dark:bg-muted dark:text-muted-foreground dark:border-muted"
                        ]
                      : [
                          "dark:bg-muted dark:text-muted-foreground dark:border-muted"
                        ]
                  )}
                >
                  {problems.length}
                </Badge>
              </div>
              <div className="flex-shrink-0 pr-3">
                {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </div>
            </Button>
          </CollapsibleTrigger>
          
          {problems.length > 0 && (
            <Button 
              variant="ghost" 
              size="sm" 
              className="font-sans h-10 px-3 text-xs font-normal rounded-none hover:bg-muted/30 border-l border-border"
              onClick={(e) => {
                e.stopPropagation();
                handleShufflePractice(problems, isActiveSection);
              }}
            >
              <Shuffle className="h-3 w-3 mr-1.5" />
              Shuffle
            </Button>
          )}
        </div>
      </div>
      
      <CollapsibleContent className="space-y-2 border-t border-border mx-0.5 pt-2 px-0.5 pb-0.5">
        {problems.length > 0 ? (
          <div className="max-h-96 overflow-y-auto pr-1 space-y-2 dark-scrollbar">
            {problems.map((problem, index) => renderProblemCard(problem, isActiveSection, index))}
          </div>
        ) : (
          <div className="text-center py-3 text-muted-foreground/60 font-sans">
            <p className="text-xs">No problems in this section.</p>
          </div>
        )}
      </CollapsibleContent>
    </Collapsible>
  );
  
  // Render problems section
  const renderProblemsSection = () => {
    // Handle when a specific date is selected from the calendar
    if (isCalendarDateSelected && !isToday(selectedDate)) {
      return (
        <div className="space-y-4">
          <div className="flex justify-between items-center text-sm font-medium mb-2">
            <div className="flex items-center gap-2">
              <CalendarIcon className="h-4 w-4 text-primary" />
              <span>Due on {format(selectedDate, 'MMMM d, yyyy')}</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="bg-muted/50">
                {formatDistanceToNow(selectedDate, { addSuffix: true })}
              </Badge>
              <TooltipProvider delayDuration={300}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => setIsCalendarDateSelected(false)}
                      className="text-blue-600 dark:text-blue-400 hover:bg-blue-50/50 dark:hover:bg-blue-900/20 hover:text-blue-700 dark:hover:text-blue-300"
                    >
                      <ArrowLeft className="h-4 w-4 mr-1" />
                      Back to All
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="px-3 py-1.5 text-sm font-medium bg-popover text-popover-foreground">
                    <p className="font-sans whitespace-nowrap">Return to all scheduled reviews</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>
          
          {selectedDayProblems.length > 0 ? (
            <div className="grid gap-2 max-h-[500px] overflow-y-auto pr-1 dark-scrollbar">
              {selectedDayProblems.map((problem, index) => renderProblemCard(problem, false, index))}
            </div>
          ) : (
            <div className="text-center py-6 text-muted-foreground">
              <p>No problems due for review on this day.</p>
              <p className="text-sm mt-2">Try selecting a different day.</p>
            </div>
          )}
        </div>
      );
    }
    
    if (isLoading) {
      return (
        <div className="flex items-center justify-center p-8">
          <LoadingSpinner text="Loading reviews..." size="lg" />
        </div>
      );
    }
    
    if (!allScheduledReviews) {
      return (
        <div className="space-y-4">
          <div className="text-center text-muted-foreground p-6">
            <p>Loading review problems...</p>
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
    
    const { dueToday, dueThisWeek, dueThisMonth, dueLater } = allScheduledReviews;
    const totalProblems = dueToday.length + dueThisWeek.length + dueThisMonth.length + dueLater.length;
    
    if (totalProblems === 0) {
      return (
        <div className="font-sans text-center py-6 text-muted-foreground">
          <p>No problems due for review at the moment.</p>
          <p className="text-sm mt-2">Great job! Your queue is clear.</p>
        </div>
      );
    }
    
    return (
      <div className="space-y-6">
        {/* Due Today */}
        {renderCollapsibleSection(
          'Due Today', 
          <Calendar className="h-4 w-4 text-muted-foreground" />, 
          dueToday, 
          true,
          isTodayOpen,
          setIsTodayOpen
        )}
        
        {/* Due This Week */}
        {renderCollapsibleSection(
          'Due This Week', 
          <Calendar className="h-4 w-4 text-muted-foreground" />, 
          dueThisWeek, 
          false,
          isThisWeekOpen,
          setIsThisWeekOpen
        )}
        
        {/* Due This Month */}
        {renderCollapsibleSection(
          'Due This Month', 
          <Calendar className="h-4 w-4 text-muted-foreground" />, 
          dueThisMonth, 
          false,
          isThisMonthOpen,
          setIsThisMonthOpen
        )}
        
        {/* Due Later */}
        {renderCollapsibleSection(
          'Due Later', 
          <Calendar className="h-4 w-4 text-muted-foreground" />, 
          dueLater, 
          false,
          isLaterOpen,
          setIsLaterOpen
        )}
      </div>
    );
  };
  
  return (
    <div className="font-mono relative bg-background min-h-screen">
      <div className="absolute inset-0 z-0 bg-dot-[#5271FF]/[0.2] [mask-image:radial-gradient(ellipse_at_center,transparent_20%,black)]"></div>
      
      <div className="py-0 relative z-10 px-4 sm:px-6 lg:px-8">
        <div className="max-w-8xl mx-auto">
          {/* Centered Title and Description (Top of the "T") */}
          <div className="text-center mb-6">
            <h1 className="text-3xl font-bold mb-4 text-center text-foreground">
              {isCalendarDateSelected && !isToday(selectedDate)
                ? `Reviews for ${format(selectedDate, 'MMMM d, yyyy')}`
                : <>
                    <span className="sm:hidden">Review Calendar</span>
                    <span className="hidden sm:inline">The Review Calendar</span>
                  </>
              }
            </h1>
            <p className="text-center text-muted-foreground">
              {isCalendarDateSelected && !isToday(selectedDate)
                ? "Reviews scheduled for the selected date"
                : "Strengthen your memory."
              }
            </p>
          </div>

          {/* New Two-Column Grid (Cross-bar of the "T") */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start mt-8">
            {/* Left Column: Problems Area */}
            <div className="lg:col-span-8">
              {/* Problem List Content - Action buttons moved to the right */}
              <div>
                {isCalendarDateSelected ? (
                  <div>
                    {selectedDayProblems.length > 0 ? (
                      <div className="space-y-3">
                        {selectedDayProblems.map((problem, index) => renderProblemCard(problem, false, index))}
                      </div>
                    ) : (
                      <div className="text-center py-6 text-muted-foreground">
                        No reviews scheduled for this day
                      </div>
                    )}
                  </div>
                ) : (
                  <>
                    {isEditMode && (
                      <div className="mb-4 text-sm text-muted-foreground bg-muted/20 p-3 rounded-md border border-muted">
                        <p className="font-sans">The problems will remain marked as completed, but won't appear in your review schedule.</p>
                      </div>
                    )}
                    <div className="overflow-y-auto">
                      {renderProblemsSection()}
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Right Column: Action Buttons and Calendar */}
            <div className="lg:col-span-4 lg:-mt-14">
              {/* Action Buttons - Moved Here */}
              <div className="flex items-center justify-end gap-2 mb-4">
                {isEditMode ? (
                  <>
                    <TooltipProvider delayDuration={300}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button 
                            variant="destructive" 
                            size="sm"
                            onClick={handleRemoveSelectedProblems}
                            disabled={selectedProblems.size === 0 || isRemoving}
                            className="px-2"
                          >
                            {isRemoving ? (
                              <LoadingSpinner size="sm" className="mr-1" />
                            ) : (
                              <Trash2 className="h-4 w-4 mr-1" />
                            )}
                            {selectedProblems.size > 0 ? <span className="font-sans">{selectedProblems.size}</span> : ''}
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent side="bottom" className="px-3 py-1.5 text-sm font-medium bg-popover text-popover-foreground">
                          <p className="font-sans whitespace-nowrap">Remove selected problems from your review schedule</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>

                    <TooltipProvider delayDuration={300}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={toggleEditMode}
                            className="bg-transparent dark:bg-transparent text-[#5271FF] hover:text-white hover:bg-[#5271FF]/80 dark:text-[#6B8EFF] dark:hover:text-white dark:hover:bg-[#6B8EFF]/80 transition-colors duration-150"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent side="bottom" className="px-3 py-1.5 text-sm font-medium bg-popover text-popover-foreground">
                          <p className="font-sans whitespace-nowrap">Cancel selection and exit edit mode</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </>
                ) : (
                  <>
                    <TooltipProvider delayDuration={300}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={() => setIsAddProblemsModalOpen(true)}
                            className="bg-transparent dark:bg-transparent text-[#5271FF] hover:text-white hover:bg-[#5271FF]/80 dark:text-[#6B8EFF] dark:hover:text-white dark:hover:bg-[#6B8EFF]/80 transition-colors duration-150"
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent side="bottom" className="px-3 py-1.5 text-sm font-medium bg-popover text-popover-foreground">
                          <p className="font-sans whitespace-nowrap">Add new problems</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>

                    <TooltipProvider delayDuration={300}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={toggleEditMode}
                            className="bg-transparent dark:bg-transparent text-[#5271FF] hover:text-white hover:bg-[#5271FF]/80 dark:text-[#6B8EFF] dark:hover:text-white dark:hover:bg-[#6B8EFF]/80 transition-colors duration-150"
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent side="bottom" className="px-3 py-1.5 text-sm font-medium bg-popover text-popover-foreground">
                          <p className="font-sans whitespace-nowrap">Edit your review dashboard</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>

                    <TooltipProvider delayDuration={300}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={handleRefresh} 
                            disabled={isRefreshing}
                            className="bg-transparent dark:bg-transparent text-[#5271FF] hover:text-white hover:bg-[#5271FF]/80 dark:text-[#6B8EFF] dark:hover:text-white dark:hover:bg-[#6B8EFF]/80 transition-colors duration-150"
                          >
                            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent side="bottom" className="px-3 py-1.5 text-sm font-medium bg-popover text-popover-foreground">
                          <p className="font-sans whitespace-nowrap">Refresh your review schedule</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </>
                )}
              </div>
              
              {/* Calendar Card */}
              <Card className="bg-background/80 dark:bg-background backdrop-blur-md rounded-xl shadow-md hover:shadow-lg transition-shadow duration-300 dark:shadow-[0_4px_6px_-1px_rgba(82,113,255,0.15),_0_2px_4px_-2px_rgba(82,113,255,0.15)] overflow-hidden dark:border dark:border-[#5271FF]/15">
                <CardContent className="p-4 font-sans">
                  <div className="border-border rounded-lg font-sans">
                    <ReviewCalendar 
                      stats={stats} 
                      problems={allScheduledReviews ? allScheduledReviews.all : dueReviews} 
                      onDaySelect={handleDaySelect}
                      selectedDate={isCalendarDateSelected ? selectedDate : null}
                      isCalendarDateSelected={isCalendarDateSelected}
                    />
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>

      {/* Memory strengthening info modal - only render when visible */}
      {showMemoryInfo && (
        <div className="fixed inset-0 flex items-center justify-center z-50 bg-background/80 backdrop-blur-sm p-4">
          <Card className="w-full max-w-2xl max-h-[80vh] overflow-y-auto">
            <CardHeader>
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <Brain className="h-5 w-5 text-blue-500 dark:text-blue-400" />
                  <CardTitle>About Your Memory</CardTitle>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setShowMemoryInfo(false)}>
                  Close
                </Button>
              </div>
              <CardDescription>
                How spaced repetition levels help you retain knowledge more effectively
              </CardDescription>
            </CardHeader>
            
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <h3 className="text-lg font-medium">How Memory Works</h3>
                <p>
                  Your brain forms memories through a process called <span className="font-medium">memory consolidation</span>. 
                  When you learn something new, your brain creates temporary neural connections, but these fade 
                  quickly unless reinforced.
                </p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                  <div className="border border-border rounded-lg p-4 space-y-2">
                    <h4 className="font-medium flex items-center gap-2 text-blue-600 dark:text-blue-400">
                      <div className="w-6 h-6 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-500 dark:text-blue-400">1</div>
                      The Forgetting Curve
                    </h4>
                    <p className="text-sm">
                      Without review, your memory of new information drops rapidly. In just 24 hours, you may 
                      forget up to 70% of what you learned.
                    </p>
                    <div className="relative h-32 mt-3">
                      <div className="absolute inset-0 bg-blue-500/5 rounded-lg overflow-hidden dark:bg-blue-900/10">
                        <div className="w-full h-full relative">
                          <div className="absolute top-0 left-0 w-full h-full">
                            <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-full">
                              <path 
                                d="M0,10 C30,70 60,90 100,90" 
                                stroke="rgba(59, 130, 246, 0.5)" 
                                strokeWidth="3" 
                                fill="none" 
                              />
                            </svg>
                          </div>
                          <div className="absolute bottom-2 left-2 text-xs text-blue-500 dark:text-blue-400">Time</div>
                          <div className="absolute top-2 left-2 text-xs text-blue-500 dark:text-blue-400">Memory</div>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="border border-border rounded-lg p-4 space-y-2">
                    <h4 className="font-medium flex items-center gap-2 text-blue-600 dark:text-blue-400">
                      <div className="w-6 h-6 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-500 dark:text-blue-400">2</div>
                      Spaced Repetition
                    </h4>
                    <p className="text-sm">
                      By reviewing information right before you would forget it, you strengthen the memory 
                      each time, making it last longer.
                    </p>
                    <div className="relative h-32 mt-3">
                      <div className="absolute inset-0 bg-blue-500/5 rounded-lg overflow-hidden dark:bg-blue-900/10">
                        <div className="w-full h-full relative">
                          <div className="absolute top-0 left-0 w-full h-full">
                            <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-full">
                              <path 
                                d="M0,80 L10,40 L20,70 L30,20 L40,50 L50,10 L60,30 L70,5 L80,20 L90,3 L100,15" 
                                stroke="rgba(59, 130, 246, 0.5)" 
                                strokeWidth="3" 
                                fill="none" 
                              />
                              <circle cx="10" cy="40" r="2" fill="rgba(59, 130, 246, 0.7)" />
                              <circle cx="20" cy="70" r="2" fill="rgba(59, 130, 246, 0.7)" />
                              <circle cx="30" cy="20" r="2" fill="rgba(59, 130, 246, 0.7)" />
                              <circle cx="40" cy="50" r="2" fill="rgba(59, 130, 246, 0.7)" />
                              <circle cx="50" cy="10" r="2" fill="rgba(59, 130, 246, 0.7)" />
                            </svg>
                          </div>
                          <div className="absolute bottom-2 left-2 text-xs text-blue-500 dark:text-blue-400">Time</div>
                          <div className="absolute top-2 left-2 text-xs text-blue-500 dark:text-blue-400">Memory</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                
                <h3 className="text-lg font-medium mt-8">Our Spaced Repetition System</h3>
                <p>
                  We use a Fibonacci-based spacing system optimized for efficient learning:
                </p>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
                  {[1, 2, 3, 4].map(level => (
                    <div key={level} className="border border-border rounded-md p-3 text-center">
                      <div className={`text-xl font-bold ${
                        level <= 1 ? 'text-blue-500 dark:text-blue-400' : 
                        level <= 3 ? 'text-indigo-500 dark:text-indigo-400' : 
                        'text-violet-500 dark:text-violet-400'
                      }`}>
                        Level {level}
                      </div>
                      <div className="text-sm mt-1">
                        {level === 1 && 'Review tomorrow'}
                        {level === 2 && 'Review in 2 days'}
                        {level === 3 && 'Review in 3 days'}
                        {level === 4 && 'Review in 5 days'}
                      </div>
                      <div className="mt-2 text-xs text-muted-foreground">
                        {level === 1 && '~40% retention'}
                        {level === 2 && '~60% retention'}
                        {level === 3 && '~70% retention'}
                        {level === 4 && '~80% retention'}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-3">
                  {[5, 6, 7].map(level => (
                    <div key={level} className="border border-border rounded-md p-3 text-center">
                      <div className={`text-xl font-bold ${
                        level <= 5 ? 'text-violet-500 dark:text-violet-400' : 
                        'text-purple-500 dark:text-purple-400'
                      }`}>
                        Level {level}
                      </div>
                      <div className="text-sm mt-1">
                        {level === 5 && 'Review in 8 days'}
                        {level === 6 && 'Review in 13 days'}
                        {level === 7 && 'Review in 21 days'}
                      </div>
                      <div className="mt-2 text-xs text-muted-foreground">
                        {level === 5 && '~85% retention'}
                        {level === 6 && '~90% retention'}
                        {level === 7 && '~95% retention'}
                      </div>
                    </div>
                  ))}
                </div>
                
                <div className="bg-blue-500/5 border border-blue-500/10 rounded-lg p-4 mt-6 dark:bg-blue-900/10 dark:border-blue-900/20">
                  <h4 className="font-medium mb-2 text-blue-600 dark:text-blue-400">Tips for Effective Learning</h4>
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-start gap-2">
                      <Check className="h-4 w-4 text-green-500 dark:text-green-400 mt-0.5" />
                      <span>Stay consistent with your reviews - do them when they're due.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="h-4 w-4 text-green-500 dark:text-green-400 mt-0.5" />
                      <span>Be honest about how well you remember - this optimizes your learning schedule.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="h-4 w-4 text-green-500 dark:text-green-400 mt-0.5" />
                      <span>Explain concepts in your own words as you review them to strengthen recall.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="h-4 w-4 text-green-500 dark:text-green-400 mt-0.5" />
                      <span>Connect new information to things you already know to build stronger neural pathways.</span>
                    </li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
      
      {/* Add Problems Modal */}
      <AddProblemsModal 
        isOpen={isAddProblemsModalOpen}
        onClose={() => setIsAddProblemsModalOpen(false)}
      />
    </div>
  );
}