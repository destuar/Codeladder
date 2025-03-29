import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useToast } from '@/components/ui/use-toast';
import { useTest } from './hooks/useTest';
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
import { useAssessmentTimer } from '../shared/hooks/useAssessmentTimer';

export function TestPage() {
  const { testId } = useParams<{ testId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  
  // Check if this is a direct access that should go through the entry page
  useEffect(() => {
    // If we don't have state data from the entry page, redirect to entry
    if (testId && !location.state?.skipIntro) {
      console.log('Test page accessed directly without going through assessment entry. Redirecting...');
      navigate(`/assessment/test/${testId}`, { replace: true });
    }
  }, [testId, location.state, navigate]);
  
  // Get taskId from location state if it exists
  const taskId = location.state?.taskId;
  // Get level information from location state if available
  const levelId = location.state?.levelId;
  const levelName = location.state?.levelName;
  
  const {
    test,
    currentQuestionIndex,
    answers,
    isLoading,
    error,
    elapsedTime,
    isSubmitting,
    goToQuestion,
    saveAnswer,
    submitTest,
    startTestAttempt,
    attempt,
    forceReset,
  } = useTest(testId);
  
  const [localIsSubmitting, setLocalIsSubmitting] = useState(false);
  const [submittedQuestions, setSubmittedQuestions] = useState<string[]>([]);
  
  // Use the shared timer hook
  const remainingTime = useAssessmentTimer(testId, test?.timeLimit);
  
  // Calculate navigation state
  const isFirstQuestion = currentQuestionIndex === 0;
  const isLastQuestion = test?.questions ? currentQuestionIndex === test.questions.length - 1 : false;
  
  // Initialize the test state and track submission to session storage
  useEffect(() => {
    if (!testId) return;
    
    // Check if we're starting a new test attempt when we have a previously completed one
    const checkForCompletedAttempt = () => {
      const attemptId = sessionStorage.getItem(`test_attempt_${testId}`);
      if (attemptId) {
        console.log(`Found existing attempt ID: ${attemptId} for test: ${testId}`);
        
        // Check if this attempt was already completed (by looking for the result in sessionStorage)
        const completionFlag = sessionStorage.getItem(`test_${testId}_completed`);
        
        if (completionFlag === 'true') {
          console.log('This test was previously completed. Forcing complete reset to start fresh.');
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
      // Check if we have an existing test session
      const existingSession = sessionStorage.getItem(`test_${testId}`);
      if (!existingSession) {
        console.log('Initializing new test state in sessionStorage for:', testId);
        startTestAttempt(testId);
      } else {
        console.log('Using existing test session from sessionStorage');
      }
    }
    
    // Load submitted questions data from assessment storage
    const loadSubmittedQuestions = () => {
      const assessmentData = sessionStorage.getItem(`assessment_${testId}`);
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
      if (!test || !test.questions) return;
      
      // Get the current assessment data
      const assessmentData = sessionStorage.getItem(`assessment_${testId}`);
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
            sessionStorage.setItem(`assessment_${testId}`, JSON.stringify(data));
          }
        } catch (e) {
          console.error('Error updating assessment progress:', e);
        }
      }
    };
    
    // Update assessment progress whenever answers change
    if (test && test.questions && Object.keys(answers).length > 0) {
      updateAssessmentProgress();
    }
  }, [testId, startTestAttempt, test, answers, forceReset]);
  
  // Check if this session was directly accessed and test was completed, force redirect to the assessment page
  useEffect(() => {
    if (testId) {
      const completedFlag = sessionStorage.getItem(`test_${testId}_completed`);
      // Only do this for direct accesses - if coming from assessment page, state would have skipIntro
      const isDirectAccess = !location.state?.skipIntro;
      
      if (completedFlag === 'true' && isDirectAccess) {
        console.log('Test was completed and directly accessed - redirecting to assessment overview');
        // Redirect to assessment overview 
        navigate(`/tests/${testId}`, { replace: true });
      }
    }
  }, [testId, navigate, location.state]);
  
  // Navigate to the specific question when the test data loads
  useEffect(() => {
    // Only run this effect if we have a taskId in the location state and the test has loaded
    if (taskId && test && test.questions) {
      // Find the index of the question with the matching taskId
      const questionIndex = test.questions.findIndex((q: { id: string }) => q.id === taskId);
      
      // If found, navigate to that question
      if (questionIndex !== -1) {
        console.log(`Navigating to question ${questionIndex + 1} with id ${taskId}`);
        goToQuestion(questionIndex);
      } else {
        console.warn(`Question with id ${taskId} not found in test questions`);
      }
    }
  }, [test, taskId, goToQuestion]);
  
  // Get current question
  const currentQuestion = test?.questions?.[currentQuestionIndex];
  
  // Enable keyboard navigation
  useEffect(() => {
    const handleKeydown = (e: KeyboardEvent) => {
      if (!test) return;
      
      // Left arrow key - previous question
      if (e.key === 'ArrowLeft' && currentQuestionIndex > 0) {
        goToQuestion(currentQuestionIndex - 1);
      }
      
      // Right arrow key - next question
      if (e.key === 'ArrowRight' && currentQuestionIndex < (test?.questions?.length || 0) - 1) {
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
  }, [test, currentQuestionIndex, goToQuestion, currentQuestion, saveAnswer]);
  
  // Track which questions have been submitted
  useEffect(() => {
    // Function to mark current question as submitted
    const submitQuestion = () => {
      if (!currentQuestion || !testId) return;
      
      // Update assessment data in session storage
      const assessmentData = sessionStorage.getItem(`assessment_${testId}`);
      if (assessmentData) {
        try {
          const data = JSON.parse(assessmentData);
          
          // Find the current task and mark it as submitted
          if (data.tasks && data.tasks.length > 0) {
            const updatedTasks = data.tasks.map((task: any) => {
              if (task.id === currentQuestion.id) {
                return {
                  ...task,
                  isSubmitted: true,
                };
              }
              return task;
            });
            
            // Update submitted count
            data.tasks = updatedTasks;
            data.submittedCount = updatedTasks.filter((t: { isSubmitted?: boolean }) => t.isSubmitted).length;
            data.lastUpdated = new Date().toISOString();
            
            // Save updated assessment data
            sessionStorage.setItem(`assessment_${testId}`, JSON.stringify(data));
            
            // Update local state of submitted questions
            if (!submittedQuestions.includes(currentQuestion.id)) {
              console.log(`Marking question ${currentQuestion.id} as submitted locally.`);
              setSubmittedQuestions(prev => [...prev, currentQuestion.id]);
            }
          }
        } catch (e) {
          console.error('Error updating submitted questions:', e);
        }
      }
    };
    
    // Auto-submit the current question whenever its answer is saved/changed
    // and it hasn't been submitted yet.
    if (
      currentQuestion && 
      answers[currentQuestion.id] && // Check if an answer exists for the *current* question
      !submittedQuestions.includes(currentQuestion.id) // Check if not already submitted
    ) {
      console.log(`Detected answer change for current question ${currentQuestion.id}, submitting...`);
      submitQuestion();
    }
  }, [answers, currentQuestion, testId, submittedQuestions]);
  
  // Handle submitting the entire test
  const handleSubmitTest = async () => {
    if (!testId || !test) return;
    
    // Show confirmation dialog
    const confirmMessage = `Are you sure you want to submit this test? 
You have submitted ${submittedQuestions.length} out of ${test.questions.length} questions.`;
    
    const confirmed = window.confirm(confirmMessage);
    if (!confirmed) return;
    
    setLocalIsSubmitting(true);
    
    try {
      const result = await submitTest();
      
      if (result.success) {
        // Mark as completed in session storage
        sessionStorage.setItem(`test_${testId}_completed`, 'true');
        
        if (result.attemptId) {
          // Navigate to results page
          navigate(`/tests/attempts/${result.attemptId}/results`);
          
          // Show success toast
          toast({
            title: "Test Submitted",
            description: "Your test has been submitted successfully!",
            variant: "default",
          });
        } else {
          console.error('Missing attemptId in successful submit response');
          toast({
            title: "Error",
            description: "Failed to get test results. Please try again.",
            variant: "destructive",
          });
        }
      } else {
        toast({
          title: "Error",
          description: result.message || "Failed to submit test. Please try again.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error submitting test:', error);
      toast({
        title: "Error",
        description: "An error occurred while submitting. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLocalIsSubmitting(false);
    }
  };
  
  // Handle navigation
  const handlePreviousQuestion = () => {
    if (currentQuestionIndex > 0) {
      goToQuestion(currentQuestionIndex - 1);
    }
  };

  const handleNextQuestion = () => {
    if (test && currentQuestionIndex < test.questions.length - 1) {
      goToQuestion(currentQuestionIndex + 1);
    }
  };

  const handleExitTest = () => {
    // Navigate back to the assessment overview using the standardized route
    if (testId) {
      navigate(`/assessment/test/${testId}`, { 
        state: { 
          skipIntro: true,
          levelId,
          levelName 
        } 
      });
    } else {
      // Fallback to topics page if no testId
      navigate('/topics');
    }
  };
  
  // Add debugging for test and questions data
  useEffect(() => {
    if (test) {
      console.log('Test data loaded:', {
        id: test.id,
        title: test.title,
        hasQuestions: !!test.questions,
        questionsCount: test.questions?.length || 0,
        assessmentType: test.assessmentType || test.type
      });
      
      // If questions exist, log info about the first question
      if (test.questions && test.questions.length > 0) {
        const firstQuestion = test.questions[0];
        console.log('First question details:', {
          id: firstQuestion.id,
          type: firstQuestion.questionType,
          hasMcProblem: !!firstQuestion.mcProblem,
          hasCodeProblem: !!firstQuestion.codeProblem
        });
      } else {
        console.warn('Test loaded but contains no questions!');
      }
    } else if (error) {
      console.error('Error loading test:', error);
    }
  }, [test, error]);

  // Add debugging for the current question
  useEffect(() => {
    if (currentQuestion) {
      console.log('Current question:', {
        index: currentQuestionIndex,
        id: currentQuestion.id,
        type: currentQuestion.questionType,
        hasMcProblem: !!currentQuestion.mcProblem,
        hasCodeProblem: !!currentQuestion.codeProblem
      });
    } else if (test && test.questions) {
      console.warn('No current question despite test having questions!', {
        index: currentQuestionIndex,
        questionsLength: test.questions.length
      });
    }
  }, [currentQuestion, currentQuestionIndex, test]);
  
  if (isLoading) {
    return (
      <QuizLayout>
        <div className="flex items-center justify-center w-full h-screen">
          <div className="text-center space-y-4">
            <div className="space-y-2">
              <Skeleton className="h-4 w-[250px]" />
              <Skeleton className="h-4 w-[200px]" />
            </div>
            <p className="text-muted-foreground">Loading test...</p>
          </div>
        </div>
      </QuizLayout>
    );
  }
  
  if (error || !test || !test.questions) {
    return (
      <QuizLayout>
        <div className="flex items-center justify-center w-full h-screen">
          <Card className="w-[400px]">
            <CardHeader>
              <CardTitle className="flex items-center">
                <AlertCircle className="h-5 w-5 mr-2 text-red-500" />
                Error Loading Test
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                There was a problem loading this test. Please try again later or contact support.
              </p>
              <pre className="text-xs text-red-500 mt-2 p-2 bg-red-50 rounded overflow-auto max-h-[100px]">
                {error?.message || "Unknown error"}
              </pre>
              <Button 
                onClick={() => navigate('/dashboard')} 
                className="mt-4 w-full"
              >
                Return to Dashboard
              </Button>
            </CardContent>
          </Card>
        </div>
      </QuizLayout>
    );
  }
  
  return (
    <QuizLayout>
      {!test || !test.questions || test.questions.length === 0 ? (
        <div className="flex items-center justify-center w-full h-screen">
          <Card className="w-[400px]">
            <CardHeader>
              <CardTitle className="flex items-center">
                <AlertCircle className="h-5 w-5 mr-2 text-amber-500" />
                Test Not Available
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                This test doesn't have any questions or isn't available right now.
              </p>
              <Button 
                onClick={() => navigate('/dashboard')} 
                className="mt-4 w-full"
              >
                Return to Dashboard
              </Button>
            </CardContent>
          </Card>
        </div>
      ) : (
        <>
          {/* Sidebar navigation - safe rendering with checks */}
          {test && test.questions && (
            <QuizSidebar
              questions={test.questions}
              currentIndex={currentQuestionIndex}
              answers={answers}
              submittedQuestionIds={submittedQuestions}
              onNavigate={goToQuestion}
              onExit={handleExitTest}
              elapsedTime={remainingTime || 0}
              quizTitle={test.title || "Test"}
            />
          )}
        
          {/* Main test content area - full height/width */}
          <div className="h-screen w-full flex flex-col pl-10">
            {/* Use the shared AssessmentHeader component with safe rendering */}
            {test && test.questions && (
              <AssessmentHeader
                currentIndex={currentQuestionIndex}
                totalQuestions={test.questions.length}
                elapsedTime={remainingTime || 0}
                answeredCount={submittedQuestions.length}
                isFirstQuestion={isFirstQuestion}
                isLastQuestion={isLastQuestion}
                onPrevious={handlePreviousQuestion}
                onNext={handleNextQuestion}
                onExit={handleExitTest}
                title={levelName || test.levelName || test.title || "Test"}
                type="test"
              />
            )}
            
            {/* Current question content area */}
            <div className="flex-1 flex flex-col overflow-hidden">
              {currentQuestion && (
                <>
                  {currentQuestion.questionType === 'MULTIPLE_CHOICE' && (
                    <div className="flex flex-col h-full relative">
                      <MultipleChoiceQuestion
                        question={currentQuestion}
                        selectedOption={answers[currentQuestion.id] || ''}
                        onSelectOption={(optionId) => saveAnswer(currentQuestion.id, optionId)}
                      />
                      
                      {/* Navigation buttons for multiple choice */}
                      <div className="absolute bottom-6 right-6 flex gap-2">
                        <Button
                          variant="outline"
                          onClick={handlePreviousQuestion}
                          disabled={isFirstQuestion}
                        >
                          Previous
                        </Button>
                        <Button
                          onClick={handleNextQuestion}
                          disabled={isLastQuestion}
                          variant={isLastQuestion ? "outline" : "default"}
                        >
                          {isLastQuestion ? "Review" : "Next"}
                        </Button>
                      </div>
                    </div>
                  )}
                  
                  {currentQuestion.questionType === 'CODE' && (
                    <div className="flex flex-col h-full">
                      <CodeQuestion 
                        question={currentQuestion}
                        code={answers[currentQuestion.id] || currentQuestion.codeProblem?.codeTemplate || ''}
                        onCodeChange={(code) => saveAnswer(currentQuestion.id, code)}
                      />
                      
                      {/* Code question submit button - only needed for code questions */}
                      <div className="absolute bottom-6 right-6 flex gap-2">
                        <Button
                          variant="outline"
                          onClick={handlePreviousQuestion}
                          disabled={isFirstQuestion}
                        >
                          Previous
                        </Button>
                        
                        <div className="flex gap-2">
                          {/* Submit button for code questions */}
                          {!submittedQuestions.includes(currentQuestion.id) && (
                            <Button 
                              onClick={() => {
                                // Mark current question as submitted
                                if (!submittedQuestions.includes(currentQuestion.id)) {
                                  setSubmittedQuestions(prev => [...prev, currentQuestion.id]);
                                  
                                  // Update assessment data in session storage
                                  const assessmentData = sessionStorage.getItem(`assessment_${testId}`);
                                  if (assessmentData) {
                                    try {
                                      const data = JSON.parse(assessmentData);
                                      
                                      // Find the current task and mark it as submitted
                                      if (data.tasks && data.tasks.length > 0) {
                                        const updatedTasks = data.tasks.map((task: any) => {
                                          if (task.id === currentQuestion.id) {
                                            return {
                                              ...task,
                                              isSubmitted: true,
                                            };
                                          }
                                          return task;
                                        });
                                        
                                        // Update submitted count
                                        data.tasks = updatedTasks;
                                        data.submittedCount = updatedTasks.filter((t: { isSubmitted?: boolean }) => t.isSubmitted).length;
                                        data.lastUpdated = new Date().toISOString();
                                        
                                        // Save updated assessment data
                                        sessionStorage.setItem(`assessment_${testId}`, JSON.stringify(data));
                                      }
                                    } catch (e) {
                                      console.error('Error updating submitted questions:', e);
                                    }
                                  }
                                }
                              }}
                              variant="default"
                            >
                              Submit Answer
                            </Button>
                          )}
                          
                          <Button
                            onClick={handleNextQuestion}
                            disabled={isLastQuestion}
                            variant={isLastQuestion ? "outline" : "default"}
                          >
                            {isLastQuestion ? "Review" : "Next"}
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
            
            {/* Footer with submit button */}
            <div className="border-t border-gray-200 p-4 sticky bottom-0 bg-white dark:bg-gray-950 mt-auto">
              <div className="max-w-5xl mx-auto flex justify-end">
                <div className="flex items-center gap-4">
                  <div className="text-sm text-muted-foreground">
                    {submittedQuestions.length} of {test.questions.length} questions answered
                  </div>
                  
                  <Button
                    onClick={handleSubmitTest}
                    disabled={
                      isSubmitting || 
                      localIsSubmitting || 
                      submittedQuestions.length === 0
                    }
                    variant="default"
                    className="px-6"
                  >
                    {isSubmitting || localIsSubmitting ? (
                      <>
                        <span className="animate-pulse">Submitting...</span>
                      </>
                    ) : (
                      "Submit Test"
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </QuizLayout>
  );
}
