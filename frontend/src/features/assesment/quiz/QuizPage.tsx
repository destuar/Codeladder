import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useToast } from '@/components/ui/use-toast';
import { useQuiz } from './hooks/useQuiz';
import { QuizLayout } from '@/components/layouts/QuizLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertCircle } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
// Import shared components
import { 
  MultipleChoiceQuestion, 
  CodeQuestion, 
  QuizSidebar,
  AssessmentHeader 
} from '../shared/components';

export function QuizPage() {
  const { quizId } = useParams<{ quizId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  
  // Get taskId from location state if it exists
  const taskId = location.state?.taskId;
  // Get topic information from location state if available
  const topicSlug = location.state?.topicSlug;
  const topicName = location.state?.topicName;
  
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
    forceReset,
  } = useQuiz(quizId);
  
  const [localIsSubmitting, setLocalIsSubmitting] = useState(false);
  const [submittedQuestions, setSubmittedQuestions] = useState<string[]>([]);
  
  // Calculate navigation state
  const isFirstQuestion = currentQuestionIndex === 0;
  const isLastQuestion = quiz?.questions ? currentQuestionIndex === quiz.questions.length - 1 : false;
  
  // Initialize the quiz state and track submission to session storage
  useEffect(() => {
    if (!quizId) return;
    
    // Check if we're starting a new quiz attempt when we have a previously completed one
    const checkForCompletedAttempt = () => {
      const attemptId = sessionStorage.getItem(`quiz_attempt_${quizId}`);
      if (attemptId) {
        console.log(`Found existing attempt ID: ${attemptId} for quiz: ${quizId}`);
        
        // Check if this attempt was already completed (by looking for the result in sessionStorage)
        const completionFlag = sessionStorage.getItem(`quiz_${quizId}_completed`);
        
        if (completionFlag === 'true') {
          console.log('This quiz was previously completed. Forcing complete reset to start fresh.');
          // Use the new forceReset method instead of manual cleanup
          forceReset();
          return true; // Indicate that a reset was performed
        }
      }
      return false; // No reset performed
    };
    
    // First check if we need to clear old data
    const wasReset = checkForCompletedAttempt();
    
    // Only check for existing session if we didn't just perform a reset
    if (!wasReset) {
      // Check if we have an existing quiz session
      const existingSession = sessionStorage.getItem(`quiz_${quizId}`);
      if (!existingSession) {
        console.log('Initializing new quiz state in sessionStorage for:', quizId);
        startQuizAttempt(quizId);
      } else {
        console.log('Using existing quiz session from sessionStorage');
      }
    }
    
    // Load submitted questions data from assessment storage
    const loadSubmittedQuestions = () => {
      const assessmentData = sessionStorage.getItem(`assessment_${quizId}`);
      if (assessmentData) {
        try {
          const data = JSON.parse(assessmentData);
          if (data.tasks && data.tasks.length > 0) {
            // Find all question IDs that have been submitted
            const submitted = data.tasks
              .filter((task: { isSubmitted?: boolean }) => task.isSubmitted)
              .map((task: { id: string }) => task.id);
            
            setSubmittedQuestions(submitted);
          }
        } catch (e) {
          console.error('Error loading submitted questions:', e);
        }
      }
    };
    
    loadSubmittedQuestions();
    
    // Update the assessment progress in session storage
    const updateAssessmentProgress = () => {
      if (!quiz || !quiz.questions) return;
      
      // Get the current assessment data
      const assessmentData = sessionStorage.getItem(`assessment_${quizId}`);
      if (assessmentData) {
        try {
          const data = JSON.parse(assessmentData);
          
          // Update tasks with the latest answers but preserve submission status
          if (data.tasks && data.tasks.length > 0) {
            const updatedTasks = data.tasks.map((task: { id: string; isSubmitted?: boolean }) => {
              // Keep the isSubmitted status as is - don't change it based on answers
              // Only update other fields that might have changed
              return { 
                ...task,
                // Don't modify isSubmitted status here
              };
            });
            
            // Only count tasks that were explicitly submitted
            data.tasks = updatedTasks;
            data.submittedCount = updatedTasks.filter((t: { isSubmitted?: boolean }) => t.isSubmitted).length;
            data.lastUpdated = new Date().toISOString();
            
            // Save updated assessment data
            sessionStorage.setItem(`assessment_${quizId}`, JSON.stringify(data));
          }
        } catch (e) {
          console.error('Error updating assessment progress:', e);
        }
      }
    };
    
    // Update assessment progress whenever answers change
    if (quiz && quiz.questions && Object.keys(answers).length > 0) {
      updateAssessmentProgress();
    }
  }, [quizId, startQuizAttempt, quiz, answers, forceReset]);
  
  // Check if this session was directly accessed and quiz was completed, force redirect to the assessment page
  useEffect(() => {
    if (quizId) {
      const completedFlag = sessionStorage.getItem(`quiz_${quizId}_completed`);
      // Only do this for direct accesses - if coming from assessment page, state would have skipIntro
      const isDirectAccess = !location.state?.skipIntro;
      
      if (completedFlag === 'true' && isDirectAccess) {
        console.log('Quiz was completed and directly accessed - redirecting to assessment overview');
        // Redirect to assessment overview 
        navigate(`/quizzes/${quizId}`, { replace: true });
      }
    }
  }, [quizId, navigate, location.state]);
  
  // Navigate to the specific question when the quiz data loads
  useEffect(() => {
    // Only run this effect if we have a taskId in the location state and the quiz has loaded
    if (taskId && quiz && quiz.questions) {
      // Find the index of the question with the matching taskId
      const questionIndex = quiz.questions.findIndex((q: { id: string }) => q.id === taskId);
      
      // If found, navigate to that question
      if (questionIndex !== -1) {
        console.log(`Navigating to question ${questionIndex + 1} with id ${taskId}`);
        goToQuestion(questionIndex);
      } else {
        console.warn(`Question with id ${taskId} not found in quiz questions`);
      }
    }
  }, [quiz, taskId, goToQuestion]);
  
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
        <div className="flex items-center justify-center w-full h-screen">
          <div className="flex flex-col items-center space-y-4">
            <Skeleton className="h-12 w-12 rounded-full" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-[250px]" />
              <Skeleton className="h-4 w-[200px]" />
            </div>
            <p className="text-muted-foreground">Loading quiz...</p>
          </div>
        </div>
      </QuizLayout>
    );
  }
  
  if (error || !quiz || !quiz.questions) {
    return (
      <QuizLayout>
        <div className="flex items-center justify-center w-full h-screen">
          <Card className="w-[400px]">
            <CardHeader>
              <CardTitle className="flex items-center">
                <AlertCircle className="h-5 w-5 mr-2 text-red-500" />
                Error Loading Quiz
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                There was a problem loading this quiz. Please try again later or contact support.
              </p>
              <pre className="text-xs text-red-500 mt-2 p-2 bg-red-50 rounded overflow-auto max-h-[100px]">
                {typeof error === 'object' ? JSON.stringify(error, null, 2) : String(error)}
              </pre>
              <Button onClick={() => window.location.reload()} className="mt-4 w-full">
                Retry
              </Button>
            </CardContent>
          </Card>
        </div>
      </QuizLayout>
    );
  }
  
  // Check if all questions have been answered
  const allAnswered = quiz && quiz.questions && 
    quiz.questions.length > 0 && 
    Object.keys(answers).length === quiz.questions.length;

  // Handle navigation
  const handlePreviousQuestion = () => {
    if (currentQuestionIndex > 0) {
      goToQuestion(currentQuestionIndex - 1);
    }
  };

  const handleNextQuestion = () => {
    if (quiz && currentQuestionIndex < quiz.questions.length - 1) {
      goToQuestion(currentQuestionIndex + 1);
    }
  };

  const handleExitQuiz = () => {
    // Navigate back to the assessment overview
    if (quizId) {
      navigate(`/quizzes/${quizId}`, { state: { skipIntro: true } });
    } else {
      // Fallback to topics page if no quizId
      navigate('/topics');
    }
  };
  
  // Handle submitting the entire quiz
  const handleSubmitQuiz = async () => {
    if (!quizId || !quiz) return;
    
    // Show confirmation dialog
    const confirmMessage = `Are you sure you want to submit this quiz? 
You have submitted ${submittedQuestions.length} out of ${quiz.questions.length} questions.`;
    
    const confirmed = window.confirm(confirmMessage);
    if (!confirmed) return;
    
    setLocalIsSubmitting(true);
    
    try {
      const result = await submitQuiz();
      
      if (result.success) {
        // Mark as completed in session storage
        sessionStorage.setItem(`quiz_${quizId}_completed`, 'true');
        
        if (result.attemptId) {
          // Navigate to results page
          navigate(`/quizzes/attempts/${result.attemptId}/results`);
          
          // Show success toast
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
      console.error('Error submitting quiz:', error);
      toast({
        title: "Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLocalIsSubmitting(false);
    }
  };
  
  // Render the appropriate question component based on type
  const renderQuestion = () => {
    if (!currentQuestion) return null;
    
    // Function to mark current question as submitted
    const submitQuestion = () => {
      if (!currentQuestion || !quizId) return;
      
      // Update assessment data in session storage
      const assessmentData = sessionStorage.getItem(`assessment_${quizId}`);
      if (assessmentData) {
        try {
          const data = JSON.parse(assessmentData);
          
          // Update tasks with submission status for the current question
          if (data.tasks && data.tasks.length > 0) {
            const updatedTasks = data.tasks.map((task: { id: string; isSubmitted?: boolean }) => {
              // Only mark the current question as submitted
              if (task.id === currentQuestion.id) {
                return { ...task, isSubmitted: true };
              }
              return task;
            });
            
            // Update assessment data
            data.tasks = updatedTasks;
            data.submittedCount = updatedTasks.filter((t: { isSubmitted?: boolean }) => t.isSubmitted).length;
            data.lastUpdated = new Date().toISOString();
            
            // Save updated assessment data
            sessionStorage.setItem(`assessment_${quizId}`, JSON.stringify(data));
            
            // Update local state of submitted questions
            setSubmittedQuestions(prev => {
              if (!prev.includes(currentQuestion.id)) {
                return [...prev, currentQuestion.id];
              }
              return prev;
            });
            
            // Show confirmation toast
            toast({
              title: "Question Submitted",
              description: "Your answer has been saved and the question marked as submitted.",
              variant: "default",
            });
          }
        } catch (e) {
          console.error('Error updating assessment progress:', e);
          toast({
            title: "Error",
            description: "Failed to submit your answer.",
            variant: "destructive",
          });
        }
      }
    };
    
    if (currentQuestion.questionType === 'MULTIPLE_CHOICE') {
      return (
        <div className="flex flex-col h-full relative">
          <MultipleChoiceQuestion 
            question={currentQuestion}
            selectedOption={answers[currentQuestion.id] as string || ''}
            onSelectOption={(optionId) => saveAnswer(currentQuestion.id, optionId)}
          />
          
          {/* Floating submit button for multiple choice questions */}
          <div className="absolute bottom-6 right-6">
            <Button 
              className="px-8 shadow-md hover:shadow-lg transition-all"
              disabled={!answers[currentQuestion.id]}
              onClick={submitQuestion}
            >
              Submit Answer
            </Button>
          </div>
        </div>
      );
    } else if (currentQuestion.questionType === 'CODE') {
      // For code questions, no extra submit button needed as CodeQuestion already has one
      return (
        <div className="flex flex-col h-full">
          <CodeQuestion
            question={currentQuestion}
            code={answers[currentQuestion.id] as string || ''}
            onCodeChange={(code) => saveAnswer(currentQuestion.id, code)}
            onCompleted={submitQuestion}  // Pass the submitQuestion function to be called when tests pass
          />
        </div>
      );
    }
    
    return <div>Unknown question type</div>;
  };
  
  return (
    <QuizLayout>
      {isLoading ? (
        <div className="flex items-center justify-center w-full h-screen">
          <div className="flex flex-col items-center space-y-4">
            <Skeleton className="h-12 w-12 rounded-full" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-[250px]" />
              <Skeleton className="h-4 w-[200px]" />
            </div>
            <p className="text-muted-foreground">Loading quiz...</p>
          </div>
        </div>
      ) : error ? (
        <div className="flex items-center justify-center w-full h-screen">
          <Card className="w-[400px]">
            <CardHeader>
              <CardTitle className="flex items-center">
                <AlertCircle className="h-5 w-5 mr-2 text-red-500" />
                Error Loading Quiz
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                There was a problem loading this quiz. Please try again later or contact support.
              </p>
              <pre className="text-xs text-red-500 mt-2 p-2 bg-red-50 rounded overflow-auto max-h-[100px]">
                {typeof error === 'object' ? JSON.stringify(error, null, 2) : String(error)}
              </pre>
              <Button onClick={() => window.location.reload()} className="mt-4 w-full">
                Retry
              </Button>
            </CardContent>
          </Card>
        </div>
      ) : !quiz || !quiz.questions || quiz.questions.length === 0 ? (
        <div className="flex items-center justify-center w-full h-screen">
          <Card className="w-[400px]">
            <CardHeader>
              <CardTitle className="flex items-center">
                <AlertCircle className="h-5 w-5 mr-2 text-amber-500" />
                Quiz Not Available
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                This quiz doesn't have any questions or isn't available right now.
              </p>
              <Button 
                onClick={() => navigate('/topics')} 
                className="mt-4 w-full"
              >
                Return to Topics
              </Button>
            </CardContent>
          </Card>
        </div>
      ) : (
        <>
          {/* Sidebar navigation - safe rendering with checks */}
          {quiz && quiz.questions && (
            <QuizSidebar
              questions={quiz.questions}
              currentIndex={currentQuestionIndex}
              answers={answers}
              submittedQuestionIds={submittedQuestions}
              onNavigate={goToQuestion}
              onExit={handleExitQuiz}
              elapsedTime={elapsedTime}
              quizTitle={quiz.title || "Quiz"}
            />
          )}
        
          {/* Main quiz content area - full height/width */}
          <div className="h-screen w-full flex flex-col pl-10">
            {/* Use the shared AssessmentHeader component with safe rendering */}
            {quiz && quiz.questions && (
              <AssessmentHeader
                currentIndex={currentQuestionIndex}
                totalQuestions={quiz.questions.length}
                elapsedTime={elapsedTime}
                answeredCount={submittedQuestions.length}
                isFirstQuestion={isFirstQuestion}
                isLastQuestion={isLastQuestion}
                onPrevious={handlePreviousQuestion}
                onNext={handleNextQuestion}
                onExit={handleExitQuiz}
                title={topicName || quiz.topicName || quiz.title || "Quiz"}
                type="quiz"
              />
            )}
            
            {/* Information banner about submission */}
            <div className="bg-blue-50 dark:bg-blue-900/20 py-2 px-4 border-b border-blue-200 dark:border-blue-800">
              <p className="text-sm text-blue-700 dark:text-blue-300">
                Submit your questions below, then click the "Back" button to return to the assessment overview page and submit the entire quiz.
              </p>
            </div>
            
            {/* Question content area - takes remaining screen height */}
            <div className="flex-1 flex flex-col overflow-hidden">
              {renderQuestion()}
            </div>
          </div>
        </>
      )}
    </QuizLayout>
  );
}
