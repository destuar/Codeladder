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
  const { quizId } = useParams<{ quizId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { token } = useAuth();
  const { toast } = useToast();
  const [timeRemaining, setTimeRemaining] = useState<number | undefined>(3600); // Default 1 hour
  const [submittedCount, setSubmittedCount] = useState<number>(0);
  const [savedTasks, setSavedTasks] = useState<AssessmentTask[] | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Check if we should skip the intro (when returning from quiz)
  const skipIntro = location.state?.skipIntro === true;
  const [showIntro, setShowIntro] = useState(!skipIntro); // Skip intro if flag is set
  
  // Check for saved assessment state
  useEffect(() => {
    if (!quizId) return;

    // First check if this quiz was already completed
    const completedFlag = sessionStorage.getItem(`quiz_${quizId}_completed`);
    if (completedFlag === 'true') {
      console.log('This quiz was previously completed. Clearing session data to start fresh.');
      
      // Clear all session storage for this quiz
      sessionStorage.removeItem(`quiz_${quizId}`);
      sessionStorage.removeItem(`quiz_attempt_${quizId}`);
      sessionStorage.removeItem(`assessment_${quizId}`);
      sessionStorage.removeItem(`quiz_${quizId}_completed`);
      
      // Find and clear any other quiz-related items
      if (quizId) {
        Object.keys(sessionStorage).forEach(key => {
          if (key.includes(quizId)) {
            console.log(`Clearing additional quiz session data: ${key}`);
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
    const savedAssessment = sessionStorage.getItem(`assessment_${quizId}`);
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
        sessionStorage.removeItem(`assessment_${quizId}`);
      }
    }
  }, [quizId]);
  
  // Fetch quiz data
  const { 
    data: quiz,
    isLoading: quizLoading,
    isError: quizError,
    error,
    status
  } = useQuery({
    queryKey: ['quiz', quizId],
    queryFn: async () => {
      if (!token || !quizId) throw new Error('No token or quiz ID available');
      return api.getQuizForAttempt(quizId, token);
    },
    enabled: !!token && !!quizId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
  
  // Fetch topic data for the quiz
  const {
    data: topic,
    isLoading: topicLoading
  } = useQuery({
    queryKey: ['topic', quiz?.topicId],
    queryFn: async () => {
      if (!token || !quiz?.topicId) throw new Error('No token or topic ID available');
      return api.get(`/learning/topics/${quiz.topicId}`, token);
    },
    enabled: !!token && !!quiz?.topicId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
  
  // Format quiz data for the AssessmentOverview component
  const formatQuizTasks = (): AssessmentTask[] => {
    if (!quiz || !quiz.questions) return [];
    
    // If we have saved tasks, use those to preserve submission state
    if (savedTasks) return savedTasks;
    
    return quiz.questions.map((question: any, index: number) => ({
      id: question.id,
      title: `Question ${index + 1}`,
      type: question.questionType === 'MULTIPLE_CHOICE' ? 'Multiple Choice' : 'Code',
      maxScore: question.pointsPossible || 1,
      isSubmitted: false // In a real app, this would be determined by user progress
    }));
  };
  
  // Handle starting the quiz
  const handleStartQuiz = (taskId?: string) => {
    if (quizId) {
      navigate(`/quizzes/${quizId}/take`, {
        state: {
          taskId: taskId, // Pass the taskId in state
          skipIntro: true,
          topicName: topic?.name, // Pass topic name to the quiz page
          topicSlug: topic?.slug
        }
      });
    }
  };
  
  // Handle proceeding from intro to assessment overview
  const handleProceedToOverview = () => {
    setShowIntro(false);
  };
  
  // Handle finishing and submitting the assessment
  const handleFinishAssessment = async () => {
    if (!quizId || !token) {
      toast({
        title: "Error",
        description: "Missing required data to submit quiz.",
        variant: "destructive",
      });
      return;
    }
    
    try {
      setIsSubmitting(true);
      
      // Confirm submission
      const confirmMessage = `Are you sure you want to submit this quiz? 
This will finalize your answers and end the quiz session.`;
      
      const shouldSubmit = window.confirm(confirmMessage);
      if (!shouldSubmit) {
        setIsSubmitting(false);
        return;
      }
      
      // Need to load answers and quiz session data
      const quizSessionData = sessionStorage.getItem(`quiz_${quizId}`);
      if (!quizSessionData) {
        toast({
          title: "Error",
          description: "No quiz session found. Please try again.",
          variant: "destructive",
        });
        setIsSubmitting(false);
        return;
      }
      
      const sessionData = JSON.parse(quizSessionData);
      const { answers, startTime } = sessionData;
      
      if (!answers || !startTime) {
        toast({
          title: "Error",
          description: "Invalid quiz session data. Please try again.",
          variant: "destructive",
        });
        setIsSubmitting(false);
        return;
      }
      
      // Submit the quiz
      console.log('Submitting quiz from assessment overview:', { 
        quizId, 
        startTime, 
        answersCount: Object.keys(answers).length 
      });
      
      const result = await api.submitCompleteQuiz(
        quizId,
        startTime,
        answers,
        token
      );
      
      console.log('Quiz submission result:', result);
      
      if (result && result.id) {
        // Set a flag to indicate this quiz was completed
        if (quizId) {
          sessionStorage.setItem(`quiz_${quizId}_completed`, 'true');
        }
        
        // Clean up ALL session storage related to this quiz
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
        
        toast({
          title: "Quiz Submitted",
          description: "Your quiz has been submitted successfully!",
          variant: "default",
        });
        
        // Navigate to results page
        navigate(`/quizzes/attempts/${result.id}/results`);
      } else {
        toast({
          title: "Error",
          description: "Failed to get quiz results. Please try again.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error submitting quiz:', error);
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
  if (quizLoading) {
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
  if (quizError || !quiz) {
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
        id={quizId || ''}
        title={topic?.name || quiz.title || 'Assessment'}
        description={quiz.description}
        duration={quiz.timeLimit || 60}
        questionsCount={quiz.questions?.length || 0}
        type={quiz.type === 'QUIZ' ? 'quiz' : 'test'}
        onStart={handleProceedToOverview}
      />
    );
  }
  
  // Calculate initial time if we don't have a saved session
  const initialRemainingTime = timeRemaining || (quiz.timeLimit ? quiz.timeLimit * 60 : 3600);
  
  // Render assessment overview after intro
  return (
    <QuizLayout>
      <AssessmentOverview 
        id={quizId || ''}
        title={topic?.name || quiz.title || 'Assessment'}
        description={quiz.description}
        duration={quiz.timeLimit || 60}
        tasks={formatQuizTasks()}
        submittedCount={submittedCount}
        remainingTime={initialRemainingTime}
        type="quiz"
        onStartTask={handleStartQuiz}
        onFinishAssessment={handleFinishAssessment}
      />
    </QuizLayout>
  );
} 