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
  
  // Calculate whether this is the first or last question
  const isFirstQuestion = currentQuestionIndex === 0;
  const isLastQuestion = !quiz || currentQuestionIndex >= quiz.questions.length - 1;

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
    if (quizId) {
      // Navigate to the quiz overview but pass state to signal we should skip intro
      navigate(`/quizzes/${quizId}`, { state: { skipIntro: true } });
    }
  };
  
  // Handle quiz completion
  const handleSubmit = async () => {
    console.log('handleSubmit function triggered');
    try {
      // Check the submission state and show appropriate confirmation
      if (submittedQuestions.length < quiz.questions.length) {
        console.log('Not all questions submitted:', {
          submitted: submittedQuestions.length,
          total: quiz.questions.length
        });
        
        // Calculate which questions haven't been submitted
        const unsubmittedCount = quiz.questions.length - submittedQuestions.length;
        const unsubmittedQuestions = quiz.questions.filter((q: { id: string }) => !submittedQuestions.includes(q.id));
        console.log('Unsubmitted questions:', unsubmittedQuestions);
        
        // Create confirmation message based on submission state
        let confirmMessage = `Quiz Submission Summary:\n\n`;
        confirmMessage += `• Submitted: ${submittedQuestions.length} out of ${quiz.questions.length} questions\n`;
        
        // Add information about unanswered questions
        const unansweredCount = quiz.questions.length - Object.keys(answers).length;
        if (unansweredCount > 0) {
          confirmMessage += `• Unanswered: ${unansweredCount} questions\n`;
        }
        
        confirmMessage += `\nAre you sure you want to submit the quiz now?`;
        console.log('Showing confirmation dialog with message:', confirmMessage);
        
        // Show confirmation dialog
        if (!window.confirm(confirmMessage)) {
          console.log('User cancelled submission via dialog');
          return; // User cancelled submission
        }
        console.log('User confirmed submission via dialog');
      } else {
        // All questions have been submitted but still confirm
        console.log('All questions have been submitted, showing confirmation');
        if (!window.confirm('All questions have been submitted. Are you sure you want to submit the quiz?')) {
          console.log('User cancelled submission via dialog');
          return; // User cancelled submission
        }
        console.log('User confirmed submission via dialog');
      }
      
      setLocalIsSubmitting(true);
      console.log('Set localIsSubmitting to true');
      
      console.log('Calling submitQuiz()...');
      const result = await submitQuiz();
      
      console.log('Quiz submission result:', result);
      
      // If submission was cancelled by the user
      if (!result.success && result.message === 'Submission cancelled') {
        console.log('Submission was cancelled by user');
        setLocalIsSubmitting(false);
        return;
      }
      
      // Show appropriate toast based on success/error
      if (result.success) {
        console.log('Submission was successful');
        const attemptId = result.attemptId;
        
        if (attemptId) {
          console.log(`Got valid attemptId: ${attemptId}, redirecting to results page`);
          
          // Short delay to allow the backend to process the quiz completion
          console.log('Waiting 1 second before redirecting...');
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          // Set a flag to indicate this quiz was completed
          if (quizId) {
            sessionStorage.setItem(`quiz_${quizId}_completed`, 'true');
          }
          
          // Clean up all quiz session storage data
          console.log('Clearing all quiz session storage data');
          
          // Clear direct quiz data
          sessionStorage.removeItem(`quiz_${quizId}`);
          sessionStorage.removeItem(`assessment_${quizId}`);
          
          // Clear attempt ID
          sessionStorage.removeItem(`quiz_attempt_${quizId}`);
          
          // Find and clear any other quiz-related items
          if (quizId) {
            Object.keys(sessionStorage).forEach(key => {
              if (key.includes(quizId)) {
                console.log(`Clearing additional quiz session data: ${key}`);
                sessionStorage.removeItem(key);
              }
            });
          }
          
          // Navigate to the results page
          console.log(`Navigating to: /quizzes/attempts/${attemptId}/results`);
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
      console.error('Error submitting quiz:', error);
      toast({
        title: "Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
    } finally {
      console.log('Setting localIsSubmitting back to false');
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
        <div className="flex flex-col h-full">
          <MultipleChoiceQuestion 
            question={currentQuestion}
            selectedOption={answers[currentQuestion.id] as string || ''}
            onSelectOption={(optionId) => saveAnswer(currentQuestion.id, optionId)}
          />
          
          <div className="mt-auto py-4 px-6 border-t flex justify-end">
            <Button 
              className="px-8"
              disabled={!answers[currentQuestion.id]}
              onClick={submitQuestion}
            >
              Submit Answer
            </Button>
          </div>
        </div>
      );
    } else if (currentQuestion.questionType === 'CODE') {
      return (
        <div className="flex flex-col h-full">
          <CodeQuestion
            question={currentQuestion}
            code={answers[currentQuestion.id] as string || ''}
            onCodeChange={(code) => saveAnswer(currentQuestion.id, code)}
          />
          
          <div className="mt-auto py-4 px-6 border-t flex justify-end">
            <Button 
              className="px-8"
              disabled={!answers[currentQuestion.id]}
              onClick={submitQuestion}
            >
              Submit Answer
            </Button>
          </div>
        </div>
      );
    }
    
    return <div>Unknown question type</div>;
  };
  
  return (
    <QuizLayout>
      {/* Sidebar navigation */}
      <QuizSidebar
        questions={quiz.questions}
        currentIndex={currentQuestionIndex}
        answers={answers}
        submittedQuestionIds={submittedQuestions}
        onNavigate={goToQuestion}
        onExit={handleExitQuiz}
        elapsedTime={elapsedTime}
        quizTitle={quiz.title}
      />
    
      {/* Main quiz content area - full height/width */}
      <div className="h-screen w-full flex flex-col pl-10">
        {/* Use the shared AssessmentHeader component */}
        <AssessmentHeader
          currentIndex={currentQuestionIndex}
          totalQuestions={quiz.questions.length}
          elapsedTime={elapsedTime}
          answeredCount={submittedQuestions.length}
          isFirstQuestion={isFirstQuestion}
          isLastQuestion={isLastQuestion}
          isSubmitting={localIsSubmitting}
          onPrevious={handlePreviousQuestion}
          onNext={handleNextQuestion}
          onExit={handleExitQuiz}
        />
        
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
    </QuizLayout>
  );
}
