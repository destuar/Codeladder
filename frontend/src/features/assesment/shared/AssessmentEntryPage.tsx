import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuth } from '@/features/auth/AuthContext';
import { AssessmentOverview, AssessmentTask } from './components/AssessmentOverview';
import { AssessmentIntro } from './components/AssessmentIntro';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileX } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { QuizLayout } from '@/components/layouts/QuizLayout';
import { useAssessmentTimer } from './hooks/useAssessmentTimer';
import { 
    clearAssessmentSession, 
    isAssessmentCompleted, 
    markAssessmentCompleted 
} from '@/lib/sessionUtils';

export function AssessmentEntryPage() {
  const { assessmentType, assessmentId } = useParams<{ assessmentType: string; assessmentId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { token } = useAuth();
  const { toast } = useToast();
  const [submittedCount, setSubmittedCount] = useState<number>(0);
  const [savedTasks, setSavedTasks] = useState<AssessmentTask[] | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Check if we should skip the intro (when returning from quiz/test)
  const skipIntro = location.state?.skipIntro === true;
  
  const [showIntro, setShowIntro] = useState(!skipIntro);
  const [showExitDialog, setShowExitDialog] = useState(false);
  
  // Get additional location state (for level context in tests)
  const levelId = location.state?.levelId;
  const levelName = location.state?.levelName;
  
  // Determine if this is a quiz or test
  const isQuiz = assessmentType === 'quiz';
  const isTest = assessmentType === 'test';
  
  const storageKeyPrefix = isTest ? 'test' : 'quiz';
  
  // Check for saved assessment state and completion status
  useEffect(() => {
    if (!assessmentId || !assessmentType) return;

    const type = assessmentType as 'quiz' | 'test';

    // FIRST: Check if this assessment was previously completed
    if (isAssessmentCompleted(assessmentId, type)) {
      console.log(`Assessment ${assessmentId} was previously completed. Clearing session data.`);
      clearAssessmentSession(assessmentId, type);
      
      // Reset local state that might hold old data
      setSavedTasks(null);
      setSubmittedCount(0);
      // Force reload might be too disruptive, let the state reset naturally
      // window.location.reload(); // Consider removing this if state resets handle it
      return; // Stop further execution for this render
    }

    // If not completed, check for existing resumable session state
    const savedAssessment = sessionStorage.getItem(`assessment_${assessmentId}`);
    if (savedAssessment) {
      try {
        const assessmentData = JSON.parse(savedAssessment);
        
        // Restore tasks and submitted count
        if (assessmentData.tasks && assessmentData.tasks.length > 0) {
          setSavedTasks(assessmentData.tasks);
          // Count submitted tasks
          const submitted = assessmentData.tasks.filter((task: AssessmentTask) => task.isSubmitted).length;
          setSubmittedCount(submitted);
        }
      } catch (e) {
        console.error('Error parsing saved assessment data:', e);
        // Clear only the invalid assessment data, not the whole session yet
        sessionStorage.removeItem(`assessment_${assessmentId}`);
      }
    }
  }, [assessmentId, assessmentType]);
  
  // Fetch assessment data (quiz or test)
  const { 
    data: assessment,
    isLoading: assessmentLoading,
    isError: assessmentError,
    error,
    status
  } = useQuery({
    queryKey: [assessmentType, assessmentId],
    queryFn: async () => {
      if (!token || !assessmentId) throw new Error('No token or ID');
      console.log(`Fetching ${assessmentType} structure for entry page: ${assessmentId}`);
      // Use the new function to get initial structure
      return api.getAssessmentStructure(assessmentId, token, assessmentType as 'QUIZ' | 'TEST');
    },
    enabled: !!token && !!assessmentId,
    staleTime: 1000 * 60 * 5, // Cache data for 5 minutes
    gcTime: 1000 * 60 * 10, // Garbage collect after 10 minutes
    retry: 1, // Retry once on failure
    refetchOnWindowFocus: false, // Don't refetch just on focus
  });
  
  // Use the shared timer hook AFTER assessment data is available
  // Pass showExitDialog to pause the timer when the dialog is open
  const { 
    remainingTime, 
    formattedTime,
    startTimer, // Get the startTimer function
    pauseTimer, // Get pauseTimer if needed
    resetTimer, // Get resetTimer
    isRunning
  } = useAssessmentTimer(assessmentId, assessment?.estimatedTime, showExitDialog);
  
  // Fetch topic data for quiz (only for quizzes, not tests)
  const {
    data: topic,
    isLoading: topicLoading
  } = useQuery({
    queryKey: ['topic', assessment?.topicId],
    queryFn: async () => {
      if (!token || !assessment?.topicId) throw new Error('No token or topic ID available');
      return api.get(`/learning/topics/${assessment.topicId}`, token);
    },
    enabled: !!token && !!assessment?.topicId && isQuiz,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
  
  // Memoize the task formatting function
  const formatAssessmentTasksCallback = useCallback((): AssessmentTask[] => {
    if (!assessment || !assessment.questions) return [];
    
    // Define an explicit type for the question structure expected from the API
    type ApiQuestion = { id: string; questionType?: string; pointsPossible?: number; [key: string]: any };

    const freshQuestionsMap = new Map(assessment.questions.map((q: ApiQuestion) => [q.id, q]));

    // If we have saved tasks, use those to preserve submission/viewed state
    if (savedTasks && savedTasks.length === assessment.questions.length && 
        savedTasks.every((task, index) => assessment.questions[index] && task.id === assessment.questions[index].id)) {
      console.log('Using saved task status (submitted/viewed) from sessionStorage, but fresh data for type/details.');
      
      return savedTasks.map((savedTask, index) => {
        // Explicitly type freshQuestion after retrieval and cast the result
        const freshQuestion = freshQuestionsMap.get(savedTask.id) as { id: string; questionType?: string; pointsPossible?: number; [key: string]: any } | undefined;
        const originalType = freshQuestion?.questionType || 'Unknown';

        if (!freshQuestion?.questionType) {
           console.warn(`Restored task, but original type missing for question ID: ${savedTask.id}`);
        } else if (String(originalType).toUpperCase() !== 'MULTIPLE_CHOICE' && String(originalType).toUpperCase() !== 'CODE') {
           console.warn(`Restored task, but original type unrecognized from API: ${originalType}`);
        }

        return {
          id: savedTask.id,
          title: `Question ${index + 1}`, // Keep simple title
          type: originalType, // *** Use the fresh type from API ***
          maxScore: freshQuestion?.pointsPossible || savedTask.maxScore || 1, // Prioritize fresh score
          isSubmitted: savedTask.isSubmitted || false, // Restore status
          isViewed: savedTask.isViewed || false, // Restore status
        };
      });
    }
    
    // Otherwise, format tasks from fresh assessment data
    console.log('Formatting tasks purely from fresh assessment data');
    return assessment.questions.map((question: any, index: number) => {
      const taskType = question.questionType || 'Unknown';

      if (!question.questionType) {
          console.warn(`Question type is missing for question ID: ${question.id}`);
      } else if (String(taskType).toUpperCase() !== 'MULTIPLE_CHOICE' && String(taskType).toUpperCase() !== 'CODE') {
          console.warn(`Unrecognized question type from API: ${question.questionType}`);
      }
      
      return {
        id: question.id,
        title: `Question ${index + 1}`,
        type: taskType,
        maxScore: question.pointsPossible || 1,
        isSubmitted: false, // Initialize as false
        isViewed: false, // Initialize as false
      };
    });
  }, [assessment, savedTasks]);
  
  // Memoize the actual tasks array based on the callback result
  const formattedTasks = useMemo(() => formatAssessmentTasksCallback(), [formatAssessmentTasksCallback]);
  
  // Memoize callback functions
  const handleStartAssessment = useCallback((taskId?: string) => {
    if (assessmentId) {
      // Start the timer before navigating
      startTimer(); 
      
      if (isQuiz) {
        navigate(`/quizzes/${assessmentId}/take`, {
          state: {
            taskId: taskId,
            skipIntro: true,
            topicName: topic?.name,
            topicSlug: topic?.slug
          }
        });
      } else if (isTest) {
        navigate(`/tests/${assessmentId}/take`, {
          state: {
            taskId: taskId,
            skipIntro: true,
            levelId: levelId,
            levelName: levelName
          }
        });
      }
    }
  }, [assessmentId, isQuiz, isTest, navigate, topic, levelId, levelName, startTimer]);
  
  const handleProceedToOverview = useCallback(() => {
    setShowIntro(false);
  }, []);
  
  // Function to actually perform the exit logic (clearing storage, navigating)
  const performExitNavigation = useCallback(() => {
    // **CRITICAL:** Only clear session if the user explicitly exits *without* intending to resume.
    // This function is called from the ExitConfirmationDialog which implies discarding progress.
    if (assessmentId && assessmentType) {
        clearAssessmentSession(assessmentId, assessmentType as 'quiz' | 'test');
    }
    
    // Navigate away
    if (isTest) {
      navigate('/dashboard', { replace: true });
    } else if (isQuiz && topic?.slug) {
      navigate(`/topic/${topic.slug}`, { replace: true });
    } else if (location.state?.from) {
      navigate(location.state.from, { replace: true });
    } else {
      navigate('/dashboard', { replace: true });
    }
    console.log(`Exiting ${isTest ? 'test' : 'quiz'}. Topic slug: ${topic?.slug || 'none'}`);
  }, [assessmentId, isTest, isQuiz, navigate, topic, location.state]);

  // Callback to open/close the dialog
  const handleToggleExitDialog = useCallback((open: boolean) => {
    setShowExitDialog(open);
  }, []);
  
  // Modified exit handler: just opens the dialog
  const handleExitAssessment = useCallback(() => {
    handleToggleExitDialog(true); // Open the dialog
  }, [handleToggleExitDialog]);
  
  const handleFinishAssessment = useCallback(async () => {
    if (!assessmentId || !token || !assessmentType) {
      toast({
        title: "Error",
        description: `Missing required data to submit ${isTest ? 'test' : 'quiz'}.`,
        variant: "destructive",
      });
      return;
    }
    
    try {
      setIsSubmitting(true);
      
      // Confirm submission
      const confirmMessage = `Are you sure you want to submit this ${isTest ? 'test' : 'quiz'}? 
This will finalize your answers and end the session.`;
      
      const shouldSubmit = window.confirm(confirmMessage);
      if (!shouldSubmit) {
        setIsSubmitting(false);
        return;
      }
      
      // Need to load answers and session data
      const sessionData = sessionStorage.getItem(`${storageKeyPrefix}_${assessmentId}`);
      if (!sessionData) {
        toast({
          title: "Error",
          description: `No ${isTest ? 'test' : 'quiz'} session found. Please try again.`,
          variant: "destructive",
        });
        setIsSubmitting(false);
        return;
      }
      
      const parsedSessionData = JSON.parse(sessionData);
      const { answers, startTime } = parsedSessionData;
      
      if (!answers || !startTime) {
        toast({
          title: "Error",
          description: `Invalid ${isTest ? 'test' : 'quiz'} session data. Please try again.`,
          variant: "destructive",
        });
        setIsSubmitting(false);
        return;
      }
      
      // Use the shared submit endpoint
      const result = await api.submitCompleteQuiz(
        assessmentId,
        startTime, // Ensure startTime is correctly retrieved
        answers,
        token
      );
      
      if (result && result.id) {
        // **CRITICAL:** Mark as completed AND clear session data AFTER successful submission
        markAssessmentCompleted(assessmentId, assessmentType as 'quiz' | 'test');
        clearAssessmentSession(assessmentId, assessmentType as 'quiz' | 'test');
        
        toast({
          title: "Success",
          description: `${isTest ? 'Test' : 'Quiz'} submitted successfully!`,
        });
        // Navigate to results page
        navigate(`/assessment/results/${result.id}?type=${assessmentType}`);
      } else {
        throw new Error(result.message || 'Failed to submit and get attempt ID');
      }
    } catch (error: any) {
      console.error(`Error submitting ${isTest ? 'test' : 'quiz'}:`, error);
      toast({
        title: "Submission Error",
        description: error.message || 'An unknown error occurred during submission.',
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  }, [assessmentId, assessmentType, token, isTest, navigate, toast, clearAssessmentSession, markAssessmentCompleted]);
  
  // Layout component for consistency
  const QuizLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    return (
      <div className="min-h-screen bg-background">
        {children}
      </div>
    );
  };
  
  // Handle loading state
  if (assessmentLoading) {
    return (
      <QuizLayout>
        <div className="container py-8">
          <div className="max-w-7xl mx-auto px-4">
            <Skeleton className="h-12 w-64 mb-4" />
            <Skeleton className="h-6 w-96 mb-8" />
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
              <Skeleton className="h-40 col-span-2" />
              <Skeleton className="h-40" />
            </div>
            
            <Skeleton className="h-80 w-full" />
          </div>
        </div>
      </QuizLayout>
    );
  }
  
  // Handle error state
  if (assessmentError || !assessment) {
    return (
      <QuizLayout>
        <div className="container py-16">
          <Card className="max-w-md mx-auto">
            <CardContent className="pt-6 flex flex-col items-center text-center">
              <FileX className="h-16 w-16 text-muted-foreground mb-4" />
              <h2 className="text-xl font-semibold mb-2">Assessment Not Found</h2>
              <p className="text-muted-foreground mb-6">
                {error instanceof Error ? error.message : "We couldn't find the assessment you're looking for."}
              </p>
              <Button 
                onClick={() => navigate(-1)}
                className="w-full"
              >
                Go Back
              </Button>
            </CardContent>
          </Card>
        </div>
      </QuizLayout>
    );
  }
  
  // Show intro view first (unless skipIntro is true or we have saved session)
  if (showIntro) {
    // If it's a quiz, wait for topic data to load before showing the intro
    // to ensure the correct title (topic name) is displayed without flickering.
    if (isQuiz && topicLoading) {
      return (
        <QuizLayout>
          <div className="min-h-[calc(100vh-6rem)] bg-background flex items-center justify-center px-4 pt-16 pb-16">
            <div className="max-w-3xl w-full text-center">
              <Skeleton className="h-10 w-3/4 mx-auto mb-4" />
              <Skeleton className="h-6 w-1/2 mx-auto mb-10" />
              <Card className="border shadow-sm">
                <CardContent className="p-6">
                  <Skeleton className="h-48 w-full" />
                  <div className="flex justify-center gap-5 mt-10">
                    <Skeleton className="h-12 w-28" />
                    <Skeleton className="h-12 w-28" />
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </QuizLayout>
      );
    }
    
    // Render intro once quiz topic data is loaded, or for tests immediately
    return (
      <AssessmentIntro
        id={assessmentId || ''}
        // For quizzes, prioritize topic name now that we know it's loaded.
        // For tests, use level name or assessment title.
        title={isQuiz ? (topic?.name || 'Quiz Topic') : (levelName ? `${levelName} Test` : assessment.title || 'Test')}
        description={assessment.description}
        duration={assessment?.estimatedTime || 60}
        questionsCount={assessment.questions?.length || 0}
        type={isTest ? 'test' : 'quiz'}
        onStart={handleProceedToOverview}
      />
    );
  }
  
  // Render assessment overview after intro
  return (
    <QuizLayout>
      <AssessmentOverview 
        id={assessmentId || ''}
        title={isQuiz ? (topic?.name || assessment.title || 'Quiz') : (levelName ? `${levelName} Test` : assessment.title || 'Test')}
        description={assessment.description}
        duration={assessment?.estimatedTime || 60}
        tasks={formattedTasks}
        submittedCount={submittedCount}
        remainingTime={remainingTime}
        type={isTest ? 'test' : 'quiz'}
        onStartTask={handleStartAssessment}
        onFinishAssessment={handleFinishAssessment}
        onExit={handleExitAssessment}
        showExitDialog={showExitDialog}
        onToggleExitDialog={handleToggleExitDialog}
        onConfirmExit={performExitNavigation}
      />
    </QuizLayout>
  );
} 