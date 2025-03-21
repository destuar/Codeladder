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
  endOfDay
} from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { ReviewProblem, ReviewStats } from '../api/spacedRepetitionApi';

interface ReviewCalendarProps {
  stats?: ReviewStats;
  problems: ReviewProblem[];
  onDaySelect: (date: Date, problems: ReviewProblem[]) => void;
}

export function ReviewCalendar({ stats, problems, onDaySelect }: ReviewCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState(new Date());
  
  // Function to navigate months
  const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
  const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
  
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
  
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">
          {format(currentMonth, 'MMMM yyyy')}
        </h3>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" onClick={prevMonth} className="h-7 w-7">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={nextMonth} className="h-7 w-7">
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
      
      <div className="rounded-md border">
        {/* Day of week headers */}
        <div className="grid grid-cols-7 gap-px border-b bg-muted text-center">
          {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, i) => (
            <div key={i} className="py-1.5 text-xs font-medium text-muted-foreground">
              {day}
            </div>
          ))}
        </div>
        
        {/* Calendar grid */}
        <div className="grid grid-cols-7 divide-x divide-y">
          {calendarDays.map((week, weekIndex) => (
            week.map((day, dayIndex) => {
              const dueProblems = getDueProblems(day);
              const reviewCount = dueProblems.length;
              const isCurrentDay = isToday(day);
              const isSelected = isSameDay(day, selectedDay);
              const isCurrentMonth = isSameMonth(day, currentMonth);
              const isDueThisWeek = isWithinNextWeek(day) && reviewCount > 0;
              
              return (
                <div 
                  key={`${weekIndex}-${dayIndex}`} 
                  className={cn(
                    "min-h-[45px] p-1.5 text-center",
                    "flex flex-col items-center justify-center transition-colors cursor-pointer",
                    isCurrentMonth ? "" : "text-muted-foreground/50 bg-muted/30",
                    isCurrentDay ? "bg-primary/10" : isDueThisWeek ? "bg-blue-50" : "hover:bg-muted/50",
                    isSelected ? "ring-2 ring-primary ring-inset" : ""
                  )}
                  onClick={() => handleDaySelect(day)}
                >
                  <div className={cn(
                    "inline-flex h-6 w-6 items-center justify-center rounded-full text-xs",
                    isCurrentDay ? "bg-primary text-primary-foreground" : ""
                  )}>
                    {format(day, 'd')}
                  </div>
                  {reviewCount > 0 && (
                    <Badge 
                      variant="outline" 
                      className={cn(
                        "text-xs py-0 px-1.5 h-4 mt-1",
                        isCurrentDay ? "bg-primary/20" : 
                        isDueThisWeek ? "bg-blue-100 border-blue-200 text-blue-600" : "bg-muted"
                      )}
                    >
                      {reviewCount}
                    </Badge>
                  )}
                </div>
              );
            })
          ))}
        </div>
      </div>
    </div>
  );
} 