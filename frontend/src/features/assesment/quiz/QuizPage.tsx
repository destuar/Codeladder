import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useToast } from '@/components/ui/use-toast';
import { useQuiz } from './hooks/useQuiz';
import { QuizLayout } from '@/components/layouts/QuizLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertCircle, Clock, Check, ChevronLeft, ChevronRight, Send } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
// Import shared components
import { MultipleChoiceQuestion, CodeQuestion, AssessmentNavigation } from '../shared/components';

// Format time for display
const formatTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60).toString().padStart(2, '0');
  const secs = (seconds % 60).toString().padStart(2, '0');
  return `${mins}:${secs}`;
};

export function QuizPage() {
  const { quizId } = useParams<{ quizId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const {
    quiz,
    currentQuestionIndex,
    answers,
    isLoading,
    error,
    elapsedTime,
    isSubmitting,
    goToQuestion,
    saveAnswer,
    submitQuiz,
    startQuizAttempt,
    attempt,
  } = useQuiz(quizId);
  
  const [localIsSubmitting, setLocalIsSubmitting] = useState(false);
  
  useEffect(() => {
    // Initialize the quiz state in localStorage
    if (quizId) {
      console.log('Initializing quiz state in localStorage for:', quizId);
      startQuizAttempt(quizId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quizId]); // Intentionally omit startQuizAttempt to prevent re-runs
  
  // Get current question
  const currentQuestion = quiz?.questions?.[currentQuestionIndex];
  
  // Enable keyboard navigation
  useEffect(() => {
    const handleKeydown = (e: KeyboardEvent) => {
      if (!quiz) return;
      
      // Left arrow key - previous question
      if (e.key === 'ArrowLeft' && currentQuestionIndex > 0) {
        goToQuestion(currentQuestionIndex - 1);
      }
      
      // Right arrow key - next question
      if (e.key === 'ArrowRight' && currentQuestionIndex < (quiz?.questions?.length || 0) - 1) {
        goToQuestion(currentQuestionIndex + 1);
      }
      
      // Number keys 1-9 for selecting options in multiple choice
      if (currentQuestion?.questionType === 'MULTIPLE_CHOICE' && 
          currentQuestion.mcProblem?.options &&
          /^[1-9]$/.test(e.key)) {
        const index = parseInt(e.key) - 1;
        if (index >= 0 && index < currentQuestion.mcProblem.options.length) {
          const optionId = currentQuestion.mcProblem.options[index].id;
          saveAnswer(currentQuestion.id, optionId);
        }
      }
    };
    
    window.addEventListener('keydown', handleKeydown);
    return () => window.removeEventListener('keydown', handleKeydown);
  }, [quiz, currentQuestionIndex, goToQuestion, currentQuestion, saveAnswer]);
  
  // Handle loading and error states
  if (isLoading) {
    return (
      <QuizLayout>
        <div className="py-12 container max-w-7xl flex items-center justify-center">
          <div className="w-full max-w-3xl">
            <Skeleton className="h-8 w-64 mb-8" />
            <Skeleton className="h-64 w-full mb-6" />
            <div className="flex gap-4">
              <Skeleton className="h-10 w-24" />
              <Skeleton className="h-10 w-24" />
            </div>
          </div>
        </div>
      </QuizLayout>
    );
  }
  
  if (error || !quiz || !quiz.questions) {
    return (
      <QuizLayout>
        <div className="py-12 container max-w-7xl flex items-center justify-center">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle className="flex items-center text-destructive">
                <AlertCircle className="h-5 w-5 mr-2" />
                Error Loading Quiz
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">
                {error?.message || "There was an error loading the quiz. Please try again later."}
              </p>
              <Button variant="default" onClick={() => navigate('/dashboard')}>
                Return to Dashboard
              </Button>
            </CardContent>
          </Card>
        </div>
      </QuizLayout>
    );
  }
  
  // Handle quiz completion
  const handleSubmit = async () => {
    try {
      setLocalIsSubmitting(true);
      
      console.log('Submitting quiz...');
      const result = await submitQuiz();
      
      console.log('Quiz submission result:', result);
      
      // If submission was cancelled by the user
      if (!result.success && result.message === 'Submission cancelled') {
        setLocalIsSubmitting(false);
        return;
      }
      
      // Show appropriate toast based on success/error
      if (result.success) {
        const attemptId = result.attemptId;
        
        if (attemptId) {
          console.log(`Redirecting to results page for attempt: ${attemptId}`);
          
          // Short delay to allow the backend to process the quiz completion
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          // Navigate to the results page
          navigate(`/quizzes/attempts/${attemptId}/results`);
          
          toast({
            title: "Quiz Submitted",
            description: "Your quiz has been submitted successfully!",
            variant: "default",
          });
        } else {
          console.error('Missing attempt ID in result:', result);
          toast({
            title: "Error",
            description: "Failed to get quiz results. Please try again.",
            variant: "destructive",
          });
        }
      } else {
        // Handle error
        console.error('Submission failed:', result.message);
        toast({
          title: "Error",
          description: result.message || "Failed to submit quiz. Please try again.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Submission error details:', error);
      
      // Provide more specific error messages based on the error type
      let errorMessage = "Failed to submit quiz. Please try again.";
      
      if (error instanceof Error) {
        if (error.message.includes('token')) {
          errorMessage = "Authentication error. Please log in again.";
        } else if (error.message.includes('network') || error.message.includes('connection')) {
          errorMessage = "Network error. Please check your connection.";
        }
      }
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLocalIsSubmitting(false);
    }
  };
  
  // Render the appropriate question component based on type
  const renderQuestion = () => {
    if (!currentQuestion) return null;
    
    if (currentQuestion.questionType === 'MULTIPLE_CHOICE') {
      return (
        <MultipleChoiceQuestion 
          question={currentQuestion}
          selectedOption={answers[currentQuestion.id] as string || ''}
          onSelectOption={(optionId) => saveAnswer(currentQuestion.id, optionId)}
        />
      );
    } else if (currentQuestion.questionType === 'CODE') {
      return (
        <CodeQuestion
          question={currentQuestion}
          code={answers[currentQuestion.id] as string || ''}
          onCodeChange={(code) => saveAnswer(currentQuestion.id, code)}
        />
      );
    }
    
    return <div>Unknown question type</div>;
  };
  
  return (
    <QuizLayout>
      {/* Main quiz content area - full height/width */}
      <div className="h-screen w-full relative flex flex-col">
        {/* Top navigation bar */}
        <div className="border-b bg-background py-2 px-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <span className="text-sm font-medium text-muted-foreground">
                Question {currentQuestionIndex + 1} of {quiz?.questions?.length || 0}
              </span>
              
              <div className="flex items-center text-muted-foreground">
                <Clock className="h-3.5 w-3.5 mr-1" />
                <span className="text-xs font-mono">{formatTime(elapsedTime)}</span>
              </div>
              
              {/* Progress bar */}
              <div className="hidden sm:flex items-center gap-1 ml-2">
                <div className="w-32 h-1.5 bg-muted rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-primary transition-all duration-300 ease-in-out rounded-full"
                    style={{ width: `${(Object.keys(answers).length / (quiz?.questions?.length || 1)) * 100}%` }}
                  />
                </div>
                <span className="text-xs text-muted-foreground">
                  {Object.keys(answers).length}/{quiz?.questions?.length || 0}
                </span>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              {currentQuestionIndex > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => goToQuestion(currentQuestionIndex - 1)}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Previous
                </Button>
              )}
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  if (window.confirm('Are you sure you want to reset this quiz? This will clear all your answers and start a new attempt.')) {
                    // Force create a new attempt
                    startQuizAttempt(quizId!, true);
                    // Reset the UI state
                    goToQuestion(0);
                    toast({
                      title: "Quiz Reset",
                      description: "Started a new quiz attempt",
                    });
                  }
                }}
                className="text-muted-foreground hover:text-foreground mr-2"
              >
                Reset Quiz
              </Button>
              
              {currentQuestionIndex < (quiz?.questions?.length || 0) - 1 ? (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => goToQuestion(currentQuestionIndex + 1)}
                  className="text-muted-foreground hover:text-foreground"
                >
                  Next
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              ) : (
                <Button
                  size="sm"
                  onClick={handleSubmit}
                  disabled={localIsSubmitting}
                >
                  {localIsSubmitting ? "Submitting..." : "Submit Quiz"}
                </Button>
              )}
            </div>
          </div>
        </div>
        
        {/* Question content area - takes remaining screen height */}
        <div className="flex-1 overflow-auto">
          {renderQuestion()}
        </div>
      </div>
    </QuizLayout>
  );
}
