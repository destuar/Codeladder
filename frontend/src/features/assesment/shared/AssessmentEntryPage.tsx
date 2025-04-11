import React, { useState, useEffect } from 'react';
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

export function AssessmentEntryPage() {
  const { assessmentType, assessmentId } = useParams<{ assessmentType: string; assessmentId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { token } = useAuth();
  const { toast } = useToast();
  const [timeRemaining, setTimeRemaining] = useState<number | undefined>(3600); // Default 1 hour
  const [submittedCount, setSubmittedCount] = useState<number>(0);
  const [savedTasks, setSavedTasks] = useState<AssessmentTask[] | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Check if we should skip the intro (when returning from quiz/test)
  const skipIntro = location.state?.skipIntro === true;
  const [showIntro, setShowIntro] = useState(!skipIntro); // Skip intro if flag is set
  
  // Get additional location state (for level context in tests)
  const levelId = location.state?.levelId;
  const levelName = location.state?.levelName;
  
  // Determine if this is a quiz or test
  const isQuiz = assessmentType === 'quiz';
  const isTest = assessmentType === 'test';
  
  const storageKeyPrefix = isTest ? 'test' : 'quiz';
  
  // Check for saved assessment state
  useEffect(() => {
    if (!assessmentId) return;

    // First check if this assessment was already completed
    const completedFlag = sessionStorage.getItem(`${storageKeyPrefix}_${assessmentId}_completed`);
    if (completedFlag === 'true') {
      console.log('This assessment was previously completed. Clearing session data to start fresh.');
      
      // Clear all session storage for this assessment
      sessionStorage.removeItem(`${storageKeyPrefix}_${assessmentId}`);
      sessionStorage.removeItem(`${storageKeyPrefix}_attempt_${assessmentId}`);
      sessionStorage.removeItem(`assessment_${assessmentId}`);
      sessionStorage.removeItem(`${storageKeyPrefix}_${assessmentId}_completed`);
      
      // Find and clear any other assessment-related items
      if (assessmentId) {
        Object.keys(sessionStorage).forEach(key => {
          if (key.includes(assessmentId)) {
            console.log(`Clearing additional assessment session data: ${key}`);
            sessionStorage.removeItem(key);
          }
        });
      }
      
      // Remove any saved tasks so we start fresh
      setSavedTasks(null);
      setSubmittedCount(0);
      
      // Force reload the page with a cache buster
      const currentUrl = window.location.href;
      const cacheBuster = `cache=${Date.now()}`;
      const separator = currentUrl.includes('?') ? '&' : '?';
      
      console.log(`Adding cache buster to force fresh state: ${cacheBuster}`);
      window.location.href = `${currentUrl}${separator}${cacheBuster}`;
      return; // Stop further execution since we're reloading
    }

    // Check sessionStorage for saved assessment state
    const savedAssessment = sessionStorage.getItem(`assessment_${assessmentId}`);
    if (savedAssessment) {
      try {
        const assessmentData = JSON.parse(savedAssessment);
        
        // Restore time if it exists
        if (assessmentData.remainingTime) {
          // Adjust for time passed since last save
          const lastUpdated = new Date(assessmentData.lastUpdated).getTime();
          const now = new Date().getTime();
          const secondsPassed = Math.floor((now - lastUpdated) / 1000);
          
          // Calculate new remaining time (don't go below 0)
          const newRemainingTime = Math.max(0, assessmentData.remainingTime - secondsPassed);
          setTimeRemaining(newRemainingTime);
          
          // Since we have saved data, we should skip the intro
          setShowIntro(false);
        }
        
        // Restore tasks and submitted count
        if (assessmentData.tasks && assessmentData.tasks.length > 0) {
          setSavedTasks(assessmentData.tasks);
          // Count submitted tasks
          const submitted = assessmentData.tasks.filter((task: AssessmentTask) => task.isSubmitted).length;
          setSubmittedCount(submitted);
        }
      } catch (e) {
        console.error('Error parsing saved assessment data:', e);
        // Clear invalid data
        sessionStorage.removeItem(`assessment_${assessmentId}`);
      }
    }
  }, [assessmentId, storageKeyPrefix]);
  
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
  
  // Format assessment data for the AssessmentOverview component
  const formatAssessmentTasks = (): AssessmentTask[] => {
    if (!assessment || !assessment.questions) return [];
    
    // If we have saved tasks, use those to preserve submission state
    if (savedTasks) return savedTasks;
    
    return assessment.questions.map((question: any, index: number) => ({
      id: question.id,
      title: `Question ${index + 1}`,
      type: question.questionType === 'MULTIPLE_CHOICE' ? 'Multiple Choice' : 'Code',
      maxScore: question.pointsPossible || 1,
      isSubmitted: false // In a real app, this would be determined by user progress
    }));
  };
  
  // Handle starting the assessment (quiz or test)
  const handleStartAssessment = (taskId?: string) => {
    if (assessmentId) {
      if (isQuiz) {
        navigate(`/quizzes/${assessmentId}/take`, {
          state: {
            taskId: taskId, // Pass the taskId in state
            skipIntro: true,
            topicName: topic?.name, // Pass topic name to the quiz page
            topicSlug: topic?.slug
          }
        });
      } else if (isTest) {
        navigate(`/tests/${assessmentId}/take`, {
          state: {
            taskId: taskId, // Pass the taskId in state
            skipIntro: true,
            levelId: levelId,
            levelName: levelName
          }
        });
      }
    }
  };
  
  // Handle proceeding from intro to assessment overview
  const handleProceedToOverview = () => {
    setShowIntro(false);
  };
  
  // Handle exiting the assessment
  const handleExitAssessment = () => {
    if (isTest) {
      // For tests, always go to dashboard
      navigate('/dashboard', { replace: true });
    } else if (isQuiz && topic?.slug) {
      // For quizzes with topic slug, go to the topic page
      navigate(`/topic/${topic.slug}`, { replace: true });
    } else if (location.state?.from) {
      // Use previous location if available
      navigate(location.state.from, { replace: true });
    } else {
      // Fallback to dashboard
      navigate('/dashboard', { replace: true });
    }
    
    console.log(`Exiting ${isTest ? 'test' : 'quiz'}. Topic slug: ${topic?.slug || 'none'}`);
  };
  
  // Handle finishing and submitting the assessment
  const handleFinishAssessment = async () => {
    if (!assessmentId || !token) {
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
      
      // Submit the assessment
      console.log(`Submitting ${isTest ? 'test' : 'quiz'} from assessment overview:`, { 
        assessmentId, 
        startTime, 
        answersCount: Object.keys(answers).length 
      });
      
      const result = await api.submitCompleteQuiz(
        assessmentId,
        startTime,
        answers,
        token
      );
      
      console.log(`${isTest ? 'Test' : 'Quiz'} submission result:`, result);
      
      if (result && result.id) {
        // Set a flag to indicate this assessment was completed
        if (assessmentId) {
          sessionStorage.setItem(`${storageKeyPrefix}_${assessmentId}_completed`, 'true');
        }
        
        // Clean up ALL session storage related to this assessment
        console.log('Clearing all session storage data');
        
        // Clear direct data
        sessionStorage.removeItem(`${storageKeyPrefix}_${assessmentId}`);
        sessionStorage.removeItem(`assessment_${assessmentId}`);
        
        // Clear attempt ID
        sessionStorage.removeItem(`${storageKeyPrefix}_attempt_${assessmentId}`);
        
        // Find and clear any other related items
        if (assessmentId) {
          Object.keys(sessionStorage).forEach(key => {
            if (key.includes(assessmentId)) {
              console.log(`Clearing additional session data: ${key}`);
              sessionStorage.removeItem(key);
            }
          });
        }
        
        toast({
          title: `${isTest ? 'Test' : 'Quiz'} Submitted`,
          description: `Your ${isTest ? 'test' : 'quiz'} has been submitted successfully!`,
          variant: "default",
        });
        
        // Navigate to results page - use the appropriate route based on type
        if (isQuiz) {
          navigate(`/quizzes/attempts/${result.id}/results`);
        } else if (isTest) {
          navigate(`/tests/attempts/${result.id}/results`);
        }
      } else {
        toast({
          title: "Error",
          description: `Failed to get ${isTest ? 'test' : 'quiz'} results. Please try again.`,
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error(`Error submitting ${isTest ? 'test' : 'quiz'}:`, error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
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
    return (
      <AssessmentIntro
        id={assessmentId || ''}
        title={isQuiz ? (topic?.name || assessment.title || 'Quiz') : (levelName ? `${levelName} Test` : assessment.title || 'Test')}
        description={assessment.description}
        duration={assessment.timeLimit || 60}
        questionsCount={assessment.questions?.length || 0}
        type={isTest ? 'test' : 'quiz'}
        onStart={handleProceedToOverview}
      />
    );
  }
  
  // Calculate initial time if we don't have a saved session
  const initialRemainingTime = timeRemaining || (assessment.timeLimit ? assessment.timeLimit * 60 : 3600);
  
  // Render assessment overview after intro
  return (
    <QuizLayout>
      <AssessmentOverview 
        id={assessmentId || ''}
        title={isQuiz ? (topic?.name || assessment.title || 'Quiz') : (levelName ? `${levelName} Test` : assessment.title || 'Test')}
        description={assessment.description}
        duration={assessment.timeLimit || 60}
        tasks={formatAssessmentTasks()}
        submittedCount={submittedCount}
        remainingTime={initialRemainingTime}
        type={isTest ? 'test' : 'quiz'}
        onStartTask={handleStartAssessment}
        onFinishAssessment={handleFinishAssessment}
        onExit={handleExitAssessment}
      />
    </QuizLayout>
  );
} 