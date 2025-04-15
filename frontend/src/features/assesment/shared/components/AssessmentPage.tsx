import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useToast } from '@/components/ui/use-toast';
import { QuizLayout } from '@/components/layouts/QuizLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertCircle } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  MultipleChoiceQuestion, 
  CodeQuestion, 
  QuizSidebar,
  AssessmentHeader 
} from '.';
import { useAssessmentTimer } from '../hooks/useAssessmentTimer';
import { cn } from '@/lib/utils';

// Helper function to load submitted questions from session storage
const loadInitialSubmittedQuestions = (assessmentId: string, type: 'quiz' | 'test'): string[] => {
  const assessmentData = sessionStorage.getItem(`assessment_${assessmentId}`);
  if (assessmentData) {
    try {
      const data = JSON.parse(assessmentData);
      if (data.tasks?.length > 0) {
        const submitted = data.tasks
          .filter((task: { isSubmitted?: boolean }) => task.isSubmitted)
          .map((task: { id: string }) => task.id);
        console.log('Loaded initial submitted questions from sessionStorage:', submitted);
        return submitted;
      }
    } catch (e) {
      console.error('Error loading initial submitted questions:', e);
    }
  }
  console.log('No initial submitted questions found in sessionStorage.');
  return [];
};

export interface AssessmentPageProps {
  type: 'quiz' | 'test';
  id: string;
  assessment: any; // Replace with proper type
  currentQuestionIndex: number;
  answers: Record<string, string>;
  isLoading: boolean;
  error: any;
  isSubmitting: boolean;
  goToQuestion: (index: number) => void;
  saveAnswer: (questionId: string, answer: string) => void;
  submitAssessment: () => Promise<any>; // Return type changed to any for now
  forceReset: () => void;
  locationState?: {
    skipIntro?: boolean;
    taskId?: string;
    topicSlug?: string;
    topicName?: string;
    levelId?: string;
    levelName?: string;
  };
}

export function AssessmentPage({
  type,
  id,
  assessment,
  currentQuestionIndex,
  answers,
  isLoading,
  error,
  isSubmitting,
  goToQuestion,
  saveAnswer,
  submitAssessment,
  forceReset,
  locationState
}: AssessmentPageProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  
  const [localIsSubmitting, setLocalIsSubmitting] = useState(false);
  const [isReady, setIsReady] = useState(false); // New state to track if assessment data is loaded
  
  // Initialize submittedQuestions state using the helper function
  const [submittedQuestions, setSubmittedQuestions] = useState<string[]>(() => {
    if (!id) return [];
    return loadInitialSubmittedQuestions(id, type);
  });
  
  // Log assessment loading status
  useEffect(() => {
    if (!isLoading && assessment) {
      console.log('Assessment data loaded. Estimated time:', assessment.estimatedTime);
      setIsReady(true); // Mark as ready when data is loaded
    } else if (isLoading) {
      console.log('Assessment data is loading...');
      setIsReady(false); // Mark as not ready while loading
    }
  }, [isLoading, assessment]);
  
  // Use the shared timer hook - ONLY when assessment data is ready
  const { 
    remainingTime, 
    formattedTime, // Get formatted time
    isRunning, 
    pauseTimer, 
    resetTimer 
  } = useAssessmentTimer(
    isReady ? id : undefined, // Pass id only when ready
    assessment?.estimatedTime
    // Remove pause prop, manual control might be better if needed
    // isLoading // Pause timer while loading initially - Let isRunning control this
  );
  
  // Calculate navigation state
  const isFirstQuestion = currentQuestionIndex === 0;
  const isLastQuestion = assessment?.questions ? currentQuestionIndex === assessment.questions.length - 1 : false;
  
  // Check if this is a direct access that should go through the entry page
  useEffect(() => {
    if (id && !location.state?.skipIntro) {
      console.log('Assessment page accessed directly without going through entry. Redirecting...');
      navigate(`/assessment/${type}/${id}`, { replace: true });
    }
  }, [id, type, location.state, navigate]);
  
  // Effect to handle initialization, completion checks, and starting attempt
  useEffect(() => {
    if (!id) return;

    // 1. Check for previously completed attempt and reset if necessary
    const checkForCompletedAttempt = () => {
      const attemptId = sessionStorage.getItem(`${type}_attempt_${id}`);
      if (attemptId) {
        const completionFlag = sessionStorage.getItem(`${type}_${id}_completed`);
        if (completionFlag === 'true') {
          console.log('Assessment was previously completed. Forcing complete reset.');
          forceReset();
          // Clear submitted questions state when forcing a reset
          setSubmittedQuestions([]);
          return true; // Indicates a reset happened
        }
      }
      return false; // No reset needed
    };

    const wasReset = checkForCompletedAttempt();

    // 2. If not reset, ensure an attempt is started/session exists
    if (!wasReset) {
      const existingSession = sessionStorage.getItem(`${type}_${id}`);
      const existingAttemptId = sessionStorage.getItem(`${type}_attempt_${id}`); // Check for existing attempt ID

      if (!existingSession && !existingAttemptId) {
        // Scenario: Truly starting fresh (no session data, no attempt ID)
        console.log('Initializing new assessment session and starting attempt for:', id);
        // Only start a new attempt if none exists
        setSubmittedQuestions([]); // Ensure submitted questions are cleared
      } else if (!existingSession && existingAttemptId) {
        // Scenario: Session data missing, but an attempt ID exists (e.g., after session expiry/clear but before completion)
        // We should NOT start a new attempt here.
        // The useQuiz/useTest hook should load the attempt based on existingAttemptId.
        console.log(`Session data missing for ${id}, but found existing attemptId ${existingAttemptId}. Attempting to resume.`);
        // Ensure submitted questions are synced if possible, although main session is gone
        const loadedIds = loadInitialSubmittedQuestions(id, type);
        setSubmittedQuestions(currentIds => {
          if (JSON.stringify(currentIds) !== JSON.stringify(loadedIds)) {
            console.log('Re-syncing submittedQuestions state with sessionStorage on resume');
            return loadedIds;
          }
          return currentIds;
        });
      } else if (existingSession) {
        // Scenario: Session data exists, proceed as before (sync state)
        console.log(`Session found for ${id}. Syncing state.`);
        const loadedIds = loadInitialSubmittedQuestions(id, type);
        setSubmittedQuestions(currentIds => {
          if (JSON.stringify(currentIds) !== JSON.stringify(loadedIds)) {
            console.log('Re-syncing submittedQuestions state with sessionStorage');
            return loadedIds;
          }
          return currentIds;
        });
      }
    }

    // Dependencies: id, type, forceReset
    // Remove startAttempt from dependencies
  }, [id, type, forceReset]);
  
  // Effect to initialize or verify the assessment data structure in sessionStorage
  useEffect(() => {
    if (id && assessment?.questions) {
      const storageKey = `assessment_${id}`;
      const assessmentData = sessionStorage.getItem(storageKey);
      let data: any = null;

      try {
        if (assessmentData) {
          data = JSON.parse(assessmentData);
        }
      } catch (e) {
        console.error('Error parsing assessment data:', e);
        data = null; 
      }

      // Initialize or re-sync task structure if needed
      const needsInitialization = !data || !Array.isArray(data.tasks) || data.tasks.length !== assessment.questions.length;
      
      if (needsInitialization) {
        console.log('Initializing/Re-syncing assessment TASKS structure in sessionStorage');
        const currentSubmittedIds = loadInitialSubmittedQuestions(id, type); 

        const newData = {
          id,
          type,
          tasks: assessment.questions.map((q: any) => ({
            id: q.id,
            isSubmitted: currentSubmittedIds.includes(q.id),
            questionType: q.questionType
          })),
          submittedCount: currentSubmittedIds.length,
          lastUpdated: new Date().toISOString()
        };
        sessionStorage.setItem(storageKey, JSON.stringify(newData));
      } 
      // ELSE: If data exists, just ensure submittedCount and task statuses are synced
      else if (data && Array.isArray(data.tasks)) {
         const currentSubmittedIds = loadInitialSubmittedQuestions(id, type); 
         let needsUpdate = false;

         // Check if submitted count needs update
         if (data.submittedCount !== currentSubmittedIds.length) {
           console.warn('SessionStorage submittedCount mismatch. Recalculating.');
           data.submittedCount = currentSubmittedIds.length;
           needsUpdate = true;
         }
         
         // Resync task submitted status
         let tasksUpdated = false;
         data.tasks.forEach((task: any) => {
           const shouldBeSubmitted = currentSubmittedIds.includes(task.id);
           if (task.isSubmitted !== shouldBeSubmitted) {
              task.isSubmitted = shouldBeSubmitted;
              tasksUpdated = true;
           }
         });
         if (tasksUpdated) {
            console.log('Resyncing task submitted status.');
            needsUpdate = true;
         }
         
         // If any updates occurred, save back to sessionStorage
         if (needsUpdate) {
            data.lastUpdated = new Date().toISOString();
            // Make sure not to accidentally remove remainingTime if it existed
            const currentData = JSON.parse(sessionStorage.getItem(storageKey) || '{}');
            const updatedData = { ...currentData, ...data }; // Merge updates, preserving existing fields like remainingTime
            sessionStorage.setItem(storageKey, JSON.stringify(updatedData));
            console.log('Updated assessment task/count data in sessionStorage.');
         }
      }
    }
  }, [id, type, assessment?.questions]);
  
  // Get current question
  const currentQuestion = assessment?.questions?.[currentQuestionIndex];
  
  // Add effect to ensure selection is displayed when navigating between questions
  useEffect(() => {
    if (currentQuestion && answers[currentQuestion.id]) {
      // Log the current state when navigating to a question
      console.log(`Navigated to question ${currentQuestion.id}:`,
        {
          hasAnswer: !!answers[currentQuestion.id],
          answerValue: answers[currentQuestion.id],
          // Read directly from state which should be correctly initialized
          isSubmitted: submittedQuestions.includes(currentQuestion.id)
        }
      );
    }
  }, [currentQuestionIndex, currentQuestion, answers, submittedQuestions]);
  
  // Enable keyboard navigation
  useEffect(() => {
    const handleKeydown = (e: KeyboardEvent) => {
      if (!assessment) return;
      
      if (e.key === 'ArrowLeft' && currentQuestionIndex > 0) {
        goToQuestion(currentQuestionIndex - 1);
      }
      
      if (e.key === 'ArrowRight' && currentQuestionIndex < (assessment?.questions?.length || 0) - 1) {
        goToQuestion(currentQuestionIndex + 1);
      }
      
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
  }, [assessment, currentQuestionIndex, goToQuestion, currentQuestion, saveAnswer]);
  
  // Handle submitting a question
  const submitQuestion = useCallback(() => {
    if (!currentQuestion || !id) return;

    // Ensure the answer is saved in the main quiz state first
    // This part seems okay, relying on the parent hook's save mechanism
    const quizStorageKey = `${type}_${id}`;
    const quizState = sessionStorage.getItem(quizStorageKey);
    if (quizState) {
      try {
        const parsedState = JSON.parse(quizState);
        if (parsedState.answers && currentQuestion.id && answers[currentQuestion.id]) {
          if (!parsedState.answers[currentQuestion.id] ||
              parsedState.answers[currentQuestion.id] !== answers[currentQuestion.id]) {
            console.log(`Synchronizing answer in sessionStorage for question ${currentQuestion.id}`);
            parsedState.answers[currentQuestion.id] = answers[currentQuestion.id];
            parsedState.lastUpdated = new Date().toISOString();
            sessionStorage.setItem(quizStorageKey, JSON.stringify(parsedState));
          }
        }
      } catch (e) {
        console.error('Error updating quiz answers in sessionStorage:', e);
      }
    }

    // Update the assessment data in sessionStorage to mark as submitted
    const assessmentStorageKey = `assessment_${id}`;
    const assessmentData = sessionStorage.getItem(assessmentStorageKey);
    let currentSubmittedCount = 0;
    if (assessmentData) {
      try {
        const data = JSON.parse(assessmentData);
        let needsUpdate = false;
        if (data.tasks?.length > 0) {
          const updatedTasks = data.tasks.map((task: { id: string; isSubmitted?: boolean }) => {
            if (task.id === currentQuestion.id && !task.isSubmitted) {
              needsUpdate = true;
              return { ...task, isSubmitted: true };
            }
            return task;
          });

          if (needsUpdate) {
             data.tasks = updatedTasks;
             currentSubmittedCount = updatedTasks.filter((t: { isSubmitted?: boolean }) => t.isSubmitted).length;
             data.submittedCount = currentSubmittedCount;
             data.lastUpdated = new Date().toISOString();
             sessionStorage.setItem(assessmentStorageKey, JSON.stringify(data));
             console.log(`Marked question ${currentQuestion.id} as submitted in sessionStorage.`);

             // Update the state *after* successfully updating sessionStorage
             setSubmittedQuestions(prev => {
               if (!prev.includes(currentQuestion.id)) {
                 return [...prev, currentQuestion.id];
               }
               return prev;
             });
          } else {
             // If already submitted, just ensure count is correct
             currentSubmittedCount = data.tasks.filter((t: { isSubmitted?: boolean }) => t.isSubmitted).length;
          }
        }
      } catch (e) {
        console.error('Error updating assessment progress:', e);
      }
    }
  }, [currentQuestion, id, type, answers /* Add answers dependency */]);
  
  // Handle navigation
  const handlePreviousQuestion = () => {
    if (currentQuestionIndex > 0) {
      goToQuestion(currentQuestionIndex - 1);
    }
  };

  const handleNextQuestion = () => {
    if (assessment && currentQuestionIndex < assessment.questions.length - 1) {
      goToQuestion(currentQuestionIndex + 1);
    }
  };

  const handleExit = () => {
    // Determine the correct back navigation path
    let backPath = '/dashboard'; // Default to dashboard

    // For both quizzes and tests, first try to navigate to the assessment overview page
    if (id) {
      backPath = `/assessment/${type}/${id}`;
      console.log(`Exiting assessment - Navigating to: ${backPath}`);
      // Pass skipIntro state to ensure the overview is shown
      navigate(backPath, { 
        replace: true, 
        state: { skipIntro: true } 
      });
      return; // Exit the function after navigating
    }
    
    // Only fall back to topic page for quizzes if topicSlug is available and explicitly needed
    // AND if we didn\'t already navigate above
    else if (type === 'quiz' && locationState?.topicSlug) {
      backPath = `/topic/${locationState.topicSlug}`;
    }
    // If no specific back path determined, default to dashboard
    else {
      backPath = '/dashboard'; 
    }

    console.log(`Exiting assessment (fallback) - Navigating to: ${backPath}`);
    navigate(backPath, { replace: true });
  };
  
  if (isLoading) {
    return (
      <QuizLayout>
        <div className="flex items-center justify-center w-full h-screen">
          <div className="text-center space-y-4">
            <div className="space-y-2">
              <Skeleton className="h-4 w-[250px]" />
              <Skeleton className="h-4 w-[200px]" />
            </div>
            <p className="text-muted-foreground">Loading {type}...</p>
          </div>
        </div>
      </QuizLayout>
    );
  }
  
  if (error || !assessment || !assessment.questions) {
    return (
      <QuizLayout>
        <div className="flex items-center justify-center w-full h-screen">
          <Card className="w-[400px]">
            <CardHeader>
              <CardTitle className="flex items-center">
                <AlertCircle className="h-5 w-5 mr-2 text-red-500" />
                Error Loading {type.charAt(0).toUpperCase() + type.slice(1)}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                There was a problem loading this {type}. Please try again later or contact support.
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
  
  if (!assessment.questions.length) {
    return (
      <QuizLayout>
        <div className="flex items-center justify-center w-full h-screen">
          <Card className="w-[400px]">
            <CardHeader>
              <CardTitle className="flex items-center">
                <AlertCircle className="h-5 w-5 mr-2 text-amber-500" />
                {type.charAt(0).toUpperCase() + type.slice(1)} Not Available
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                This {type} doesn't have any questions or isn't available right now.
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
      </QuizLayout>
    );
  }
  
  return (
    <QuizLayout>
      <QuizSidebar
        questions={assessment.questions}
        currentIndex={currentQuestionIndex}
        answers={answers}
        submittedQuestionIds={submittedQuestions}
        onNavigate={goToQuestion}
        onExit={handleExit}
        elapsedTime={remainingTime ?? 0}
        quizTitle={assessment.title || type.charAt(0).toUpperCase() + type.slice(1)}
      />
      
      <div className="h-screen w-full flex flex-col pl-10">
        <AssessmentHeader
          currentIndex={currentQuestionIndex}
          totalQuestions={assessment.questions.length}
          elapsedTime={remainingTime ?? 0}
          answeredCount={submittedQuestions.length}
          isFirstQuestion={isFirstQuestion}
          isLastQuestion={isLastQuestion}
          onPrevious={handlePreviousQuestion}
          onNext={handleNextQuestion}
          onExit={handleExit}
          onSubmit={submitAssessment}
          isSubmitting={localIsSubmitting}
          title={
            type === 'quiz' 
              ? locationState?.topicName || assessment.topicName || assessment.title
              : locationState?.levelName || assessment.levelName || assessment.title
          }
          type={type}
        />
        
        <div className="flex-1 flex flex-col overflow-hidden">
          {currentQuestion && (
            <>
              {currentQuestion.questionType === 'MULTIPLE_CHOICE' && (
                <div className="flex flex-col h-full relative">
                  <MultipleChoiceQuestion
                    question={currentQuestion}
                    selectedOption={answers[currentQuestion.id] || ''}
                    onSelectOption={(optionId) => {
                      console.log(`AssessmentPage: saving answer ${optionId} for question ${currentQuestion.id}`);

                      // First save the answer
                      saveAnswer(currentQuestion.id, optionId);

                      // When a different answer is selected, REMOVE the question from submittedQuestions state
                      // AND update sessionStorage to reflect it's no longer submitted.
                      if (submittedQuestions.includes(currentQuestion.id)) {
                        console.log(`Answer changed for submitted question ${currentQuestion.id}. Resetting submitted status.`);
                        setSubmittedQuestions(prev => prev.filter(qid => qid !== currentQuestion.id));

                        // Also update the assessment data in sessionStorage
                        if (id) {
                          const assessmentStorageKey = `assessment_${id}`;
                          const assessmentData = sessionStorage.getItem(assessmentStorageKey);
                          if (assessmentData) {
                            try {
                              const data = JSON.parse(assessmentData);
                              let needsUpdate = false;
                              if (data.tasks?.length > 0) {
                                const updatedTasks = data.tasks.map((task: { id: string; isSubmitted?: boolean }) => {
                                  if (task.id === currentQuestion.id && task.isSubmitted) {
                                    needsUpdate = true;
                                    return { ...task, isSubmitted: false };
                                  }
                                  return task;
                                });

                                if (needsUpdate) {
                                  data.tasks = updatedTasks;
                                  data.submittedCount = updatedTasks.filter((t: { isSubmitted?: boolean }) => t.isSubmitted).length;
                                  data.lastUpdated = new Date().toISOString();
                                  sessionStorage.setItem(assessmentStorageKey, JSON.stringify(data));
                                }
                              }
                            } catch (e) {
                              console.error('Error updating assessment progress:', e);
                            }
                          }
                        }
                      }
                    }}
                  />
                  
                  <div className="absolute bottom-6 right-6 flex flex-col items-end">
                    {submittedQuestions.includes(currentQuestion.id) && (
                      <div className="text-sm text-muted-foreground mb-2 italic">
                        {answers[currentQuestion.id] 
                          ? "You can still change your answer by selecting a different option" 
                          : "Please select an answer"}
                      </div>
                    )}
                    <Button 
                      className={cn(
                        "px-8 shadow-md transition-all",
                        submittedQuestions.includes(currentQuestion.id) 
                          ? "bg-muted text-muted-foreground hover:bg-primary/90" 
                          : "hover:shadow-lg"
                      )}
                      disabled={!answers[currentQuestion.id]}
                      onClick={submitQuestion}
                    >
                      {submittedQuestions.includes(currentQuestion.id) ? "Submitted ✓" : "Submit Answer"}
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
                    onCompleted={submitQuestion}
                  />
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </QuizLayout>
  );
} 