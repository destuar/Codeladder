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

export function AssessmentEntryPage() {
  const { quizId } = useParams<{ quizId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { token } = useAuth();
  const [timeRemaining, setTimeRemaining] = useState<number | undefined>(3600); // Default 1 hour
  
  // Check if we should skip the intro (when returning from quiz)
  const skipIntro = location.state?.skipIntro === true;
  const [showIntro, setShowIntro] = useState(!skipIntro); // Skip intro if flag is set
  
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
  
  // Mock timer (in real app, this would be server-synced)
  useEffect(() => {
    if (!quiz || showIntro) return; // Don't start timer if showing intro
    
    // Set initial time based on quiz duration
    const initialTime = quiz.timeLimit ? quiz.timeLimit * 60 : 3600; // Convert minutes to seconds
    setTimeRemaining(initialTime);
    
    // Decrement timer every second (in real app would be synced with server)
    const timer = setInterval(() => {
      setTimeRemaining(prevTime => {
        if (prevTime && prevTime > 0) {
          return prevTime - 1;
        } else {
          clearInterval(timer);
          return 0;
        }
      });
    }, 1000);
    
    return () => clearInterval(timer);
  }, [quiz, showIntro]);
  
  // Format quiz data for the AssessmentOverview component
  const formatQuizTasks = (): AssessmentTask[] => {
    if (!quiz || !quiz.questions) return [];
    
    return quiz.questions.map((question: any, index: number) => ({
      id: question.id,
      title: `Question ${index + 1}`,
      type: question.questionType === 'MULTIPLE_CHOICE' ? 'Multiple Choice' : 'Code',
      maxScore: question.pointsPossible || 1,
      isSubmitted: false // In a real app, this would be determined by user progress
    }));
  };
  
  // Handle starting the quiz
  const handleStartQuiz = () => {
    if (quizId) {
      navigate(`/quizzes/${quizId}/take`);
    }
  };
  
  // Handle proceeding from intro to assessment overview
  const handleProceedToOverview = () => {
    setShowIntro(false);
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
  
  // Show intro view first (unless skipIntro is true)
  if (showIntro) {
    return (
      <AssessmentIntro
        id={quizId || ''}
        title={quiz.title || 'Assessment'}
        description={quiz.description}
        duration={quiz.timeLimit || 60}
        questionsCount={quiz.questions?.length || 0}
        type={quiz.type === 'QUIZ' ? 'quiz' : 'test'}
        onStart={handleProceedToOverview}
      />
    );
  }
  
  // Render assessment overview after intro
  return (
    <QuizLayout>
      <AssessmentOverview 
        id={quizId || ''}
        title={quiz.title || 'Assessment'}
        description={quiz.description}
        duration={quiz.timeLimit || 60}
        tasks={formatQuizTasks()}
        submittedCount={0}
        remainingTime={timeRemaining}
        type={quiz.type === 'QUIZ' ? 'quiz' : 'test'}
        onStartTask={handleStartQuiz}
      />
    </QuizLayout>
  );
} 