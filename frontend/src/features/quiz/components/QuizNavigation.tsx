import React, { useEffect, useState } from 'react';
import { Check, Clock, ChevronLeft, ChevronRight, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { QuizQuestion } from '../hooks/useQuiz';

interface QuizNavigationProps {
  currentIndex: number;
  questions: QuizQuestion[];
  answers: Record<string, any>;
  onNavigate: (index: number) => void;
  onSubmit: () => void;
  isSubmitting: boolean;
  elapsedTime: number;
}

export function QuizNavigation({
  currentIndex,
  questions,
  answers,
  onNavigate,
  onSubmit,
  isSubmitting,
  elapsedTime
}: QuizNavigationProps) {
  const [timeString, setTimeString] = useState('00:00');
  
  // Format time for display
  useEffect(() => {
    const minutes = Math.floor(elapsedTime / 60).toString().padStart(2, '0');
    const seconds = (elapsedTime % 60).toString().padStart(2, '0');
    setTimeString(`${minutes}:${seconds}`);
  }, [elapsedTime]);
  
  // Calculate completion percentage
  const answeredCount = Object.keys(answers).length;
  const totalQuestions = questions.length;
  const progressPercentage = (answeredCount / totalQuestions) * 100;
  
  const isFirstQuestion = currentIndex === 0;
  const isLastQuestion = currentIndex === questions.length - 1;
  
  // Check if current question has been answered
  const isCurrentQuestionAnswered = (questionId: string) => {
    return answers[questionId] !== undefined;
  };
  
  return (
    <Card className="shadow-md">
      <CardHeader>
        <CardTitle className="text-lg flex items-center justify-between">
          <span>Quiz Progress</span>
          <div className="flex items-center text-muted-foreground">
            <Clock className="h-4 w-4 mr-1" />
            <span className="text-sm">{timeString}</span>
          </div>
        </CardTitle>
      </CardHeader>
      
      <CardContent>
        {/* Progress indicator */}
        <div className="mb-4">
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div 
              className="h-full bg-primary transition-all duration-300 ease-in-out"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
          <div className="mt-1 text-xs text-muted-foreground">
            {answeredCount} of {totalQuestions} questions answered
          </div>
        </div>
        
        {/* Question navigation */}
        <div className="grid grid-cols-5 gap-2 mb-4">
          {questions.map((question, index) => (
            <button
              key={question.id}
              className={`
                w-full aspect-square flex items-center justify-center rounded-md text-sm
                ${index === currentIndex ? 'bg-primary text-primary-foreground' : ''}
                ${isCurrentQuestionAnswered(question.id) && index !== currentIndex ? 'bg-primary/20 text-primary' : ''}
                ${!isCurrentQuestionAnswered(question.id) && index !== currentIndex ? 'bg-muted hover:bg-muted/70 text-muted-foreground' : ''}
                transition-colors duration-200
              `}
              onClick={() => onNavigate(index)}
            >
              {isCurrentQuestionAnswered(question.id) ? (
                <Check className="h-3 w-3" />
              ) : (
                index + 1
              )}
            </button>
          ))}
        </div>
        
        {/* Question type indicator */}
        <div className="mb-4 text-sm">
          <div className="flex items-center text-muted-foreground">
            <span className="font-medium text-foreground mr-2">Question type:</span>
            {questions[currentIndex].questionType === 'MULTIPLE_CHOICE' ? 
              'Multiple Choice' : 'Coding Question'}
          </div>
          <div className="mt-1 flex items-center text-muted-foreground">
            <span className="font-medium text-foreground mr-2">Points:</span>
            {questions[currentIndex].points || 1}
          </div>
        </div>
      </CardContent>
      
      <CardFooter className="flex-col space-y-3">
        <div className="flex justify-between w-full">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => onNavigate(currentIndex - 1)}
            disabled={isFirstQuestion}
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Previous
          </Button>
          
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => onNavigate(currentIndex + 1)}
            disabled={isLastQuestion}
          >
            Next
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
        
        {/* Submit quiz button */}
        <Button
          className="w-full"
          onClick={onSubmit}
          disabled={isSubmitting || answeredCount === 0}
        >
          {isSubmitting ? (
            <>
              <div className="animate-spin h-4 w-4 mr-2 border-2 border-primary-foreground border-t-transparent rounded-full" />
              Submitting...
            </>
          ) : (
            <>
              <Send className="h-4 w-4 mr-2" />
              Submit Quiz
            </>
          )}
        </Button>
        
        {answeredCount < totalQuestions && (
          <p className="text-xs text-muted-foreground text-center">
            {totalQuestions - answeredCount} question(s) remaining
          </p>
        )}
      </CardFooter>
    </Card>
  );
}
