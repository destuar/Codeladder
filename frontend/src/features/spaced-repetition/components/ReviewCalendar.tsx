import { useState } from 'react';
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek,
  addMonths,
  subMonths,
  addDays,
  getDay,
  isToday,
  isSameDay,
  isSameMonth,
  isWithinInterval,
  startOfDay,
  endOfDay,
  isAfter
} from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { ChevronLeft, ChevronRight, Calendar, CalendarCheck, CalendarDays } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { ReviewProblem, ReviewStats } from '../api/spacedRepetitionApi';

interface ReviewCalendarProps {
  stats?: ReviewStats;
  problems: ReviewProblem[];
  onDaySelect: (date: Date, problems: ReviewProblem[]) => void;
  selectedDate?: Date | null;
  isCalendarDateSelected?: boolean;
}

export function ReviewCalendar({ 
  stats, 
  problems, 
  onDaySelect,
  selectedDate,
  isCalendarDateSelected
}: ReviewCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<Date | null>(selectedDate || null);
  const [animationDirection, setAnimationDirection] = useState<'left' | 'right' | null>(null);
  
  // Function to navigate months
  const prevMonth = () => {
    setAnimationDirection('right');
    setCurrentMonth(subMonths(currentMonth, 1));
    
    // Reset animation direction after animation completes
    setTimeout(() => setAnimationDirection(null), 300);
  };
  
  const nextMonth = () => {
    setAnimationDirection('left');
    setCurrentMonth(addMonths(currentMonth, 1));
    
    // Reset animation direction after animation completes
    setTimeout(() => setAnimationDirection(null), 300);
  };
  
  // Get problems due on a specific date
  const getDueProblems = (date: Date | null): ReviewProblem[] => {
    if (!date) return [];
    
    return problems.filter(problem => {
      if (!problem.dueDate) return false;
      const dueDate = new Date(problem.dueDate);
      return isSameDay(dueDate, date);
    });
  };
  
  // Check if a date is within the next 7 days
  const isWithinNextWeek = (date: Date) => {
    const now = new Date();
    const today = startOfDay(now);
    const weekEnd = endOfDay(addDays(now, 6)); // Next 7 days
    
    return isWithinInterval(date, { start: today, end: weekEnd });
  };
  
  // Check if a date is beyond the next week (upcoming/future)
  const isFutureDate = (date: Date) => {
    const now = new Date();
    const weekEnd = endOfDay(addDays(now, 6)); // End of next 7 days
    
    return isAfter(date, weekEnd);
  };
  
  // Handle selecting a day
  const handleDaySelect = (date: Date) => {
    // If the day is already selected, unselect it
    if (selectedDay && isSameDay(selectedDay, date)) {
      setSelectedDay(null);
      onDaySelect(date, []);
    } else {
      setSelectedDay(date);
      onDaySelect(date, getDueProblems(date));
    }
  };
  
  const isSelected = (date: Date) => {
    return selectedDay ? isSameDay(date, selectedDay) : false;
  };
  
  // Generate calendar days for the current month view
  const generateCalendarDays = () => {
    // Get start and end dates for the month
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    
    // Get the start of the first week (might include days from previous month)
    const startDate = startOfWeek(monthStart, { weekStartsOn: 1 });
    // Get the end of the last week (might include days from next month)
    const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });
    
    const calendarDays = [];
    let day = startDate;
    
    // Generate rows for the calendar
    while (day <= endDate) {
      const week = [];
      // Generate 7 days for each week
      for (let i = 0; i < 7; i++) {
        week.push(day);
        day = addDays(day, 1);
      }
      calendarDays.push(week);
    }
    
    return calendarDays;
  };
  
  const calendarDays = generateCalendarDays();
  const selectedDayProblems = getDueProblems(selectedDay || new Date());
  
  return (
    <div className="space-y-4">
      {/* Month Navigation */}
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <Calendar className="h-5 w-5 text-blue-500 mr-2" />
          <h2 className="text-lg font-medium">
            {format(currentMonth, 'MMMM yyyy')}
          </h2>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="icon"
            onClick={prevMonth}
            className="h-8 w-8 border-blue-200 hover:bg-blue-50 hover:text-blue-500 dark:border-blue-800 dark:hover:bg-blue-900/30 dark:hover:text-blue-400"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={nextMonth}
            className="h-8 w-8 border-blue-200 hover:bg-blue-50 hover:text-blue-500 dark:border-blue-800 dark:hover:bg-blue-900/30 dark:hover:text-blue-400"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
      
      {/* Calendar Grid */}
      <div className={cn(
        "grid grid-cols-7 gap-1",
        animationDirection === 'left' && "animate-in slide-in-from-right-5 duration-300",
        animationDirection === 'right' && "animate-in slide-in-from-left-5 duration-300"
      )}>
        {/* Weekday headers */}
        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
          <div 
            key={day} 
            className="text-center text-xs font-medium py-2 text-muted-foreground"
          >
            {day}
          </div>
        ))}
        
        {/* Calendar days - flatten the 2D array for display */}
        {calendarDays.flat().map((day, index) => {
          const dayProblems = getDueProblems(day);
          const isCurrentSelected = selectedDay ? isSameDay(day, selectedDay) : false;
          const isCurrentDay = isToday(day);
          const inCurrentMonth = isSameMonth(day, currentMonth);
          const inNextWeek = isWithinNextWeek(day);
          const inFuture = isFutureDate(day);
          
          const dayClasses = cn(
            "h-12 flex flex-col justify-center items-center relative rounded-md text-sm transition-colors",
            "hover:bg-muted/80 cursor-pointer",
            !inCurrentMonth && "text-muted-foreground/40",
            isCurrentDay && !isCurrentSelected && "bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 font-medium border border-blue-200 dark:border-blue-800",
            isCurrentSelected && "bg-blue-500 text-white font-medium",
            dayProblems.length > 0 && inCurrentMonth && !isCurrentSelected && !isCurrentDay && "font-medium"
          );
          
          return (
            <div 
              key={`${format(day, 'yyyy-MM-dd')}-${index}`}
              className={dayClasses}
              onClick={() => handleDaySelect(day)}
            >
              <div>
                {format(day, 'd')}
              </div>
              
              {/* Dots indicator for number of problems */}
              {dayProblems.length > 0 && inCurrentMonth && (
                <div className="absolute bottom-1 flex justify-center">
                  <div 
                    className={cn(
                      "w-2 h-2 rounded-full", 
                      isCurrentSelected ? "bg-white/80" : (
                        inNextWeek ? "bg-blue-500 dark:bg-blue-400" :
                        inFuture ? "bg-indigo-500 dark:bg-indigo-400" :
                        "bg-amber-500 dark:bg-amber-400"
                      )
                    )}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
} 