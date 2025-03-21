import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { RepeatIcon, CalendarDays, Dumbbell } from 'lucide-react';
import { useDashboardReviews } from '../hooks/useDashboardReviews';

/**
 * A card to display on the dashboard that shows due review information
 * and provides a quick link to start reviewing
 */
export function DashboardReviewCard() {
  const { dueCount, upcomingCount, isLoading, hasReviews } = useDashboardReviews();
  const navigate = useNavigate();
  
  const handleStartReviews = () => {
    navigate('/problems');
  };
  
  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <Dumbbell className="h-5 w-5 text-primary" />
            <span>Spaced Repetition</span>
          </CardTitle>
          <CardDescription>Review problems to strengthen your memory</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-12 flex items-center justify-center">
            <div className="animate-spin rounded-full h-5 w-5 border-2 border-primary border-t-transparent" />
          </div>
        </CardContent>
      </Card>
    );
  }
  
  if (!hasReviews && upcomingCount === 0) {
    return null; // Don't show the card if there are no reviews due now or coming up
  }
  
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center gap-2">
          <Dumbbell className="h-5 w-5 text-primary" />
          <span>Spaced Repetition</span>
        </CardTitle>
        <CardDescription>Review problems to strengthen your memory</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {hasReviews ? (
            <div className="flex justify-between items-center">
              <div>
                <h3 className="font-medium">
                  {dueCount} problem{dueCount !== 1 ? 's' : ''} to review today
                </h3>
                <p className="text-sm text-muted-foreground">
                  Strengthen your memory with daily reviews
                </p>
              </div>
              <Button size="sm" onClick={handleStartReviews}>
                <RepeatIcon className="h-4 w-4 mr-1" />
                Start Review
              </Button>
            </div>
          ) : upcomingCount > 0 ? (
            <div className="flex justify-between items-center">
              <div>
                <h3 className="font-medium">
                  {upcomingCount} problem{upcomingCount !== 1 ? 's' : ''} this week
                </h3>
                <p className="text-sm text-muted-foreground">
                  Check back soon for your scheduled reviews
                </p>
              </div>
              <Button size="sm" variant="outline" onClick={handleStartReviews}>
                <CalendarDays className="h-4 w-4 mr-1" />
                See Schedule
              </Button>
            </div>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
} 