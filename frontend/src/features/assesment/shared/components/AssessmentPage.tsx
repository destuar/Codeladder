import React, { useEffect, useState } from 'react';
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
  submitAssessment: () => Promise<{ success: boolean; attemptId?: string; message?: string }>;
  startAttempt: (id: string) => void;
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
  startAttempt,
  forceReset,
  locationState
}: AssessmentPageProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  
  const [localIsSubmitting, setLocalIsSubmitting] = useState(false);
  const [submittedQuestions, setSubmittedQuestions] = useState<string[]>([]);
  
  // Use the shared timer hook
  const remainingTime = useAssessmentTimer(id, assessment?.timeLimit);
  
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
  
  // Initialize assessment state and track submission
  useEffect(() => {
    if (!id) return;
    
    const checkForCompletedAttempt = () => {
      const attemptId = sessionStorage.getItem(`${type}_attempt_${id}`);
      if (attemptId) {
        const completionFlag = sessionStorage.getItem(`${type}_${id}_completed`);
        
        if (completionFlag === 'true') {
          console.log('Assessment was previously completed. Forcing complete reset.');
          forceReset();
          return true;
        }
      }
      return false;
    };
    
    const wasReset = checkForCompletedAttempt();
    
    if (!wasReset) {
      const existingSession = sessionStorage.getItem(`${type}_${id}`);
      if (!existingSession) {
        console.log('Initializing new assessment state in sessionStorage for:', id);
        startAttempt(id);
      }
    }
    
    // Load submitted questions
    const loadSubmittedQuestions = () => {
      const assessmentData = sessionStorage.getItem(`assessment_${id}`);
      if (assessmentData) {
        try {
          const data = JSON.parse(assessmentData);
          if (data.tasks?.length > 0) {
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
    
    // Update assessment progress
    const updateAssessmentProgress = () => {
      if (!assessment?.questions) return;
      
      const assessmentData = sessionStorage.getItem(`assessment_${id}`);
      if (assessmentData) {
        try {
          const data = JSON.parse(assessmentData);
          if (data.tasks?.length > 0) {
            const updatedTasks = data.tasks.map((task: { id: string; isSubmitted?: boolean }) => ({ ...task }));
            
            data.tasks = updatedTasks;
            data.submittedCount = updatedTasks.filter((t: { isSubmitted?: boolean }) => t.isSubmitted).length;
            data.lastUpdated = new Date().toISOString();
            
            sessionStorage.setItem(`assessment_${id}`, JSON.stringify(data));
          }
        } catch (e) {
          console.error('Error updating assessment progress:', e);
        }
      }
    };
    
    if (assessment?.questions && Object.keys(answers).length > 0) {
      updateAssessmentProgress();
    }
  }, [id, type, startAttempt, assessment, answers, forceReset]);
  
  // Get current question
  const currentQuestion = assessment?.questions?.[currentQuestionIndex];
  
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
  const submitQuestion = () => {
    if (!currentQuestion || !id) return;
    
    const assessmentData = sessionStorage.getItem(`assessment_${id}`);
    if (assessmentData) {
      try {
        const data = JSON.parse(assessmentData);
        if (data.tasks?.length > 0) {
          const updatedTasks = data.tasks.map((task: { id: string; isSubmitted?: boolean }) => {
            if (task.id === currentQuestion.id) {
              return { ...task, isSubmitted: true };
            }
            return task;
          });
          
          data.tasks = updatedTasks;
          data.submittedCount = updatedTasks.filter((t: { isSubmitted?: boolean }) => t.isSubmitted).length;
          data.lastUpdated = new Date().toISOString();
          
          sessionStorage.setItem(`assessment_${id}`, JSON.stringify(data));
          
          setSubmittedQuestions(prev => {
            if (!prev.includes(currentQuestion.id)) {
              return [...prev, currentQuestion.id];
            }
            return prev;
          });
          
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
  
  // Handle submitting the entire assessment
  const handleSubmitAssessment = async () => {
    if (!id || !assessment) return;
    
    const confirmMessage = `Are you sure you want to submit this ${type}? 
You have submitted ${submittedQuestions.length} out of ${assessment.questions.length} questions.`;
    
    const confirmed = window.confirm(confirmMessage);
    if (!confirmed) return;
    
    setLocalIsSubmitting(true);
    
    try {
      const result = await submitAssessment();
      
      if (result.success) {
        sessionStorage.setItem(`${type}_${id}_completed`, 'true');
        
        if (result.attemptId) {
          navigate(`/${type}s/attempts/${result.attemptId}/results`);
          
          toast({
            title: `${type.charAt(0).toUpperCase() + type.slice(1)} Submitted`,
            description: `Your ${type} has been submitted successfully!`,
            variant: "default",
          });
        } else {
          console.error('Missing attemptId in successful submit response');
          toast({
            title: "Error",
            description: `Failed to get ${type} results. Please try again.`,
            variant: "destructive",
          });
        }
      } else {
        toast({
          title: "Error",
          description: result.message || `Failed to submit ${type}. Please try again.`,
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error(`Error submitting ${type}:`, error);
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
    if (assessment && currentQuestionIndex < assessment.questions.length - 1) {
      goToQuestion(currentQuestionIndex + 1);
    }
  };

  const handleExit = () => {
    if (id) {
      navigate(`/assessment/${type}/${id}`, { 
        state: { 
          skipIntro: true,
          ...locationState
        } 
      });
    } else {
      navigate('/topics');
    }
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
        elapsedTime={remainingTime || 0}
        quizTitle={assessment.title || type.charAt(0).toUpperCase() + type.slice(1)}
      />
      
      <div className="h-screen w-full flex flex-col pl-10">
        <AssessmentHeader
          currentIndex={currentQuestionIndex}
          totalQuestions={assessment.questions.length}
          elapsedTime={remainingTime || 0}
          answeredCount={submittedQuestions.length}
          isFirstQuestion={isFirstQuestion}
          isLastQuestion={isLastQuestion}
          onPrevious={handlePreviousQuestion}
          onNext={handleNextQuestion}
          onExit={handleExit}
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
                    onSelectOption={(optionId) => saveAnswer(currentQuestion.id, optionId)}
                  />
                  
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