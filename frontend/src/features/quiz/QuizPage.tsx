import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useToast } from '@/components/ui/use-toast';
import { useQuiz, QuizQuestion } from './hooks/useQuiz';
import { MultipleChoiceQuestion } from './components/MultipleChoiceQuestion';
import { CodeQuestion } from './components/CodeQuestion';
import { QuizLayout } from '@/components/layouts/QuizLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertCircle, Clock, Check, ChevronLeft, ChevronRight, Send } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

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
  
  useEffect(() => {
    // Only start a quiz attempt if we have a quizId
    if (quizId) {
      console.log('Starting quiz attempt for:', quizId);
      startQuizAttempt(quizId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quizId]); // Intentionally omit startQuizAttempt to prevent re-runs
  
  // If the attempt is loaded and we don't have an attemptId, try to extract it
  useEffect(() => {
    if (attempt && !isLoading) {
      console.log('Attempt loaded:', attempt);
      // Store the attempt ID in localStorage for persistence
      if (attempt.id && quizId) {
        localStorage.setItem(`quiz_attempt_${quizId}`, attempt.id);
        console.log(`Stored attempt ID ${attempt.id} in localStorage from loaded attempt`);
      }
    }
  }, [attempt, isLoading, quizId]);
  
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
      if (isSubmitting) return;
      
      console.log('Starting quiz submission process');
      
      // Show a submitting toast to the user
      toast({
        title: "Submitting Quiz",
        description: "Please wait while your quiz is being submitted...",
      });
      
      // Get the current attemptId from the hook before submitting
      // This will be our fallback in case the submission result is null
      const currentAttemptId = attempt?.id;
      console.log('Current attempt ID before submission:', currentAttemptId);
      
      const result = await submitQuiz();
      console.log('Quiz submission result:', JSON.stringify(result));
      
      // Add detailed logging for debugging
      if (!result) {
        console.error('Result is null or undefined, will try to use current attemptId');
      } else {
        console.log('Result structure:', Object.keys(result));
      }
      
      // Get attemptId from result, or fall back to the current attempt ID
      let attemptId = result?.attemptId || currentAttemptId;
      
      // Check if the result indicates the attempt was already completed
      const wasAlreadyCompleted = result?.result?.alreadyCompleted === true;
      
      // If we still don't have an attemptId, try localStorage as a last resort
      if (!attemptId && quizId) {
        const storedAttemptId = localStorage.getItem(`quiz_attempt_${quizId}`);
        if (storedAttemptId) {
          console.log(`Recovered attempt ID from localStorage: ${storedAttemptId}`);
          attemptId = storedAttemptId;
        }
      }
      
      if (attemptId) {
        console.log(`Redirecting to results page for attempt: ${attemptId}`);
        
        // Short delay to allow the backend to process the quiz completion
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Navigate to the results page
        navigate(`/quizzes/attempts/${attemptId}/results`);
        
        toast({
          title: wasAlreadyCompleted ? "Quiz Already Submitted" : "Quiz Submitted",
          description: wasAlreadyCompleted 
            ? "This quiz was already submitted. Viewing results."
            : "Your quiz has been submitted successfully!",
          variant: "default",
        });
      } else {
        console.error('Missing attempt ID in result and no current attempt ID available:', result);
        toast({
          title: "Error",
          description: "Failed to submit quiz. Please try again.",
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
        } else if (error.message.includes('404')) {
          // Special handling for 404 errors which might be due to the API not supporting all endpoints
          errorMessage = "Error submitting quiz. The server endpoint may not be available yet.";
        }
      }
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
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
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Submitting..." : "Submit Quiz"}
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
