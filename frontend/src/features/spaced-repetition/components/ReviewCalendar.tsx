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
}

export function ReviewCalendar({ 
  stats, 
  problems, 
  onDaySelect
}: ReviewCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState(new Date());
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
  const getDueProblems = (date: Date) => {
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
    setSelectedDay(date);
    onDaySelect(date, getDueProblems(date));
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
  const selectedDayProblems = getDueProblems(selectedDay);
  
  return (
    <div className="space-y-2 p-0.5">
      <div className="flex items-center justify-between py-2 px-1">
        <h3 className="text-base font-medium text-slate-900 flex items-center gap-1.5">
          <CalendarDays className="h-4 w-4 text-blue-500" />
          <span>{format(currentMonth, 'MMMM yyyy')}</span>
        </h3>
        <div className="flex items-center gap-1">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={prevMonth} 
            className="h-7 w-7 rounded-full hover:bg-slate-100 hover:text-blue-500 transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={nextMonth} 
            className="h-7 w-7 rounded-full hover:bg-slate-100 hover:text-blue-500 transition-colors"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
      
      <div className={cn(
        "transition-all duration-300 transform",
        animationDirection === 'left' ? 'translate-x-2 opacity-0' : 
        animationDirection === 'right' ? '-translate-x-2 opacity-0' : 
        'translate-x-0 opacity-100'
      )}>
        <div>
          {/* Day of week headers */}
          <div className="grid grid-cols-7 text-center">
            {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, i) => (
              <div key={i} className="py-2 text-xs font-medium text-slate-600">
                {day}
              </div>
            ))}
          </div>
          
          {/* Calendar grid */}
          <div className="grid grid-cols-7">
            {calendarDays.map((week, weekIndex) => (
              week.map((day, dayIndex) => {
                const dueProblems = getDueProblems(day);
                const reviewCount = dueProblems.length;
                const isCurrentDay = isToday(day);
                const isSelected = isSameDay(day, selectedDay);
                const isCurrentMonth = isSameMonth(day, currentMonth);
                const isDueThisWeek = isWithinNextWeek(day) && reviewCount > 0;
                const isFuture = isFutureDate(day) && reviewCount > 0;
                
                return (
                  <div 
                    key={`${weekIndex}-${dayIndex}`} 
                    className={cn(
                      "relative bg-white aspect-square",
                      "flex flex-col items-center justify-center cursor-pointer",
                      isCurrentMonth ? "" : "text-slate-400 bg-slate-50",
                      isCurrentDay && !isSelected ? "font-bold text-blue-500" : "",
                      isDueThisWeek ? "bg-slate-50" : 
                      isFuture ? "bg-slate-50" : 
                      "hover:bg-slate-50",
                      isSelected ? "ring-2 ring-blue-500 bg-blue-50/30 z-10" : ""
                    )}
                    onClick={() => handleDaySelect(day)}
                  >
                    <div className={cn(
                      "flex items-center justify-center text-xs",
                      isCurrentDay ? "font-bold text-blue-500" : "",
                      isSelected ? "font-semibold" : "",
                      isSelected && !isCurrentDay ? "text-slate-900" : ""
                    )}>
                      {format(day, 'd')}
                    </div>
                    
                    {/* Review count indicator */}
                    {reviewCount > 0 && (
                      <div className="absolute bottom-1 w-full flex justify-center">
                        <div 
                          className={cn(
                            "h-2 w-2 rounded-full",
                            "bg-blue-500"
                          )}
                        />
                      </div>
                    )}
                  </div>
                );
              })
            ))}
          </div>
        </div>
      </div>
      
      {/* Selected day info */}
      <div className="mt-4 p-3 border rounded-md bg-white border-slate-200">
        <div className="flex items-center justify-center gap-1.5">
          <CalendarCheck className="h-4 w-4 text-slate-900" />
          <span className="font-medium text-slate-900">{format(selectedDay, 'MMMM d, yyyy')}</span>
          {isToday(selectedDay) && (
            <Badge variant="secondary" className="text-xs bg-slate-100 text-slate-700 hover:bg-slate-200">Today</Badge>
          )}
        </div>
        <div className="text-slate-600 text-xs mt-1.5 text-center">
          {selectedDayProblems.length === 0
            ? "No reviews scheduled"
            : `${selectedDayProblems.length} ${selectedDayProblems.length === 1 ? 'review' : 'reviews'} scheduled`}
        </div>
      </div>
    </div>
  );
} 