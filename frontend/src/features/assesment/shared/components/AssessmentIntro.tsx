import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Clock, FileText, ListChecks, ArrowUpDown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface AssessmentIntroProps {
  id: string;
  title: string;
  description?: string;
  duration: number; // in minutes
  questionsCount: number;
  type?: 'quiz' | 'test';
  onStart: () => void;
}

export function AssessmentIntro({
  id,
  title,
  description,
  duration,
  questionsCount,
  type = 'test',
  onStart
}: AssessmentIntroProps) {
  const navigate = useNavigate();
  
  // Format duration in hours and minutes
  const formatDuration = (minutes: number): string => {
    if (minutes === undefined || minutes === null) return 'Unknown duration';
    if (minutes <= 0) return 'Under 1 minute';
    
    if (minutes < 60) return `${minutes} minutes`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours} hour${hours > 1 ? 's' : ''}${mins ? `, ${mins} minutes` : ''}`;
  };

  return (
    <div className="min-h-[calc(100vh-6rem)] bg-background flex items-center justify-center px-4 pt-16 pb-16">
      <div className="max-w-3xl w-full">
        <h1 className="text-4xl font-bold text-center mb-4">{title}</h1>
        
        {description && (
          <p className="text-muted-foreground text-center mb-10 text-lg max-w-2xl mx-auto">
            {description}
          </p>
        )}
        
        <Card className="border shadow-sm">
          <CardContent className="p-6">
            <div className="grid grid-cols-2 gap-x-10 gap-y-8">
              <div className="flex items-center gap-3">
                <Clock className="h-6 w-6 text-blue-600 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold text-lg">{formatDuration(duration)} duration</h3>
                  <p className="text-muted-foreground">You cannot pause the test after starting.</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <FileText className="h-6 w-6 text-green-600 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold text-lg">Submit when finished</h3>
                  <p className="text-muted-foreground">Green button on the bottom right.</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <ListChecks className="h-6 w-6 text-amber-600 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold text-lg">Complete {questionsCount} tasks</h3>
                  <p className="text-muted-foreground">{questionsCount} questions</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <ArrowUpDown className="h-6 w-6 text-purple-600 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold text-lg">Any order</h3>
                  <p className="text-muted-foreground">Solve tasks in any order, switch anytime</p>
                </div>
              </div>
            </div>
            
            <div className="flex justify-center gap-5 mt-10">
              <Button 
                variant="outline" 
                size="lg"
                className="px-6 min-w-[120px] transition-colors bg-transparent hover:bg-red-50/70 text-red-600 border border-red-200/70 dark:border-red-800/50 dark:text-red-400 dark:hover:bg-red-900/20"
                onClick={() => navigate(-1)}
              >
                Back
              </Button>
              <Button 
                size="lg"
                className="px-8 min-w-[120px] bg-blue-600 hover:bg-blue-700 text-white"
                onClick={onStart}
              >
                Start
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 