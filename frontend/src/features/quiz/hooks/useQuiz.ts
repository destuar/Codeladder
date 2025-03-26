import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/features/auth/AuthContext';
import { api } from '@/lib/api';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

// Define types based on schema.prisma
export interface QuizQuestion {
  id: string;
  questionText: string;
  questionType: 'MULTIPLE_CHOICE' | 'CODE';
  type: 'MULTIPLE_CHOICE' | 'CODE'; // Alias for compatibility
  points: number;
  orderNum?: number;
  difficulty?: string;
  mcProblem?: McProblem;
  codeProblem?: CodeProblem;
}

export interface McProblem {
  questionId: string;
  explanation?: string;
  shuffleOptions: boolean;
  options: McOption[];
}

export interface McOption {
  id: string;
  questionId: string;
  optionText: string;
  isCorrect: boolean;
  explanation?: string;
  orderNum?: number;
}

export interface CodeProblem {
  questionId: string;
  codeTemplate?: string;
  functionName?: string;
  language: string;
  timeLimit: number;
  memoryLimit?: number;
  testCases: TestCase[];
}

export interface TestCase {
  id: string;
  codeProblemId: string;
  input: string;
  expectedOutput: string;
  isHidden: boolean;
  orderNum?: number;
}

export interface Quiz {
  id: string;
  title: string;
  description?: string;
  topicId: string;
  passingScore: number;
  estimatedTime?: number;
  orderNum?: number;
  questions: QuizQuestion[];
}

export interface QuizAttempt {
  id: string;
  quizId: string;
  userId: string;
  score?: number;
  passed?: boolean;
  startedAt: string;
  completedAt?: string;
  responses: QuizResponse[];
}

export interface QuizResponse {
  id: string;
  attemptId: string;
  questionId: string;
  isCorrect?: boolean;
  points?: number;
  mcResponse?: McResponse;
  codeResponse?: CodeResponse;
}

export interface McResponse {
  responseId: string;
  selectedOptionId?: string;
}

export interface CodeResponse {
  responseId: string;
  codeSubmission?: string;
  compilationError?: string;
  runtimeError?: string;
  testCasesPassed?: number;
  totalTestCases?: number;
  executionTime?: number;
}

/**
 * Hook for managing quiz state during quiz-taking
 */
export function useQuiz(quizId?: string) {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  
  // State
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [timerInterval, setTimerInterval] = useState<NodeJS.Timeout | null>(null);
  const hasInitialized = useRef<boolean>(false);

  // Get quiz data
  const { data: quiz, isLoading: isQuizLoading, error: quizError } = useQuery({
    queryKey: ['quiz', quizId],
    queryFn: async () => {
      if (!token || !quizId) throw new Error('No token or quiz ID available');
      return api.getQuizForAttempt(quizId, token);
    },
    enabled: !!token && !!quizId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: false,
  });

  // Get attempt data if we have an attemptId
  const { data: attempt, isLoading: isAttemptLoading } = useQuery({
    queryKey: ['quizAttempt', attemptId],
    queryFn: async () => {
      if (!token || !attemptId) throw new Error('No token or attempt ID available');
      return api.getQuizAttempt(attemptId, token);
    },
    enabled: !!token && !!attemptId,
    staleTime: 30 * 1000, // 30 seconds
    refetchOnWindowFocus: false,
    refetchInterval: false,
  });

  // Start a quiz attempt
  const startAttemptMutation = useMutation({
    mutationFn: async (quizToStart: string) => {
      if (!token) throw new Error('No token available');
      console.log(`Making API call to start quiz attempt for: ${quizToStart}`);
      return api.startQuizAttempt(quizToStart, token);
    },
    onSuccess: (data) => {
      console.log(`Quiz attempt created successfully with ID: ${data.id}`);
      
      // Save the attempt ID to state
      setAttemptId(data.id);
      
      // Also save it to localStorage for persistence
      if (quizId && data.id) {
        localStorage.setItem(`quiz_attempt_${quizId}`, data.id);
        console.log(`Saved attempt ID ${data.id} to localStorage for quiz ${quizId}`);
      }
      
      // Start timer when attempt is created
      startTimer();
    },
    onError: (error) => {
      toast.error('Failed to start quiz attempt');
      console.error('Start attempt error:', error);
    },
  });

  // Submit a question response
  const submitResponseMutation = useMutation({
    mutationFn: async ({ 
      questionId, 
      responseData 
    }: { 
      questionId: string; 
      responseData: any 
    }) => {
      if (!token || !attemptId) throw new Error('No token or attempt ID available');
      return api.submitQuizResponse(attemptId, questionId, responseData, token);
    },
    onSuccess: (data, variables) => {
      // Don't invalidate queries immediately - this can cause a feedback loop
      // Only update local state and defer invalidation
      console.log('Answer saved successfully');
    },
    onError: (error) => {
      toast.error('Failed to save your answer');
      console.error('Submit response error:', error);
    },
  });

  // Complete a quiz attempt
  const completeAttemptMutation = useMutation({
    mutationFn: async () => {
      if (!token || !attemptId) {
        console.error('Missing required data:', { token: !!token, attemptId });
        throw new Error('No token or attempt ID available');
      }
      
      console.log(`Completing quiz attempt with ID: ${attemptId}`);
      try {
        const result = await api.completeQuizAttempt(attemptId, token);
        console.log('Complete quiz attempt response:', result);
        
        // If the API didn't return an attemptId, add it
        if (result && !result.attemptId) {
          result.attemptId = attemptId;
        }
        
        return result;
      } catch (error) {
        console.error('Error in completeQuizAttempt API call:', error);
        throw error;
      }
    },
    onSuccess: (data) => {
      stopTimer();
      toast.success('Quiz submitted successfully!');
      queryClient.invalidateQueries({ queryKey: ['quizAttempt', attemptId] });
    },
    onError: (error) => {
      toast.error('Failed to submit quiz');
      console.error('Complete attempt error:', error);
    },
    onSettled: () => {
      setIsSubmitting(false);
    },
  });

  // Start the quiz attempt
  const startQuizAttempt = useCallback((id: string, forceNew = false) => {
    // If forceNew is true, clear any existing attempt
    if (forceNew) {
      console.log(`Force creating new attempt for quiz: ${id}`);
      localStorage.removeItem(`quiz_attempt_${id}`);
      setAttemptId(null);
      setAnswers({});
      startAttemptMutation.mutate(id);
      return;
    }
    
    // First check if we have a stored attempt ID in localStorage
    const storedAttemptId = localStorage.getItem(`quiz_attempt_${id}`);
    
    if (storedAttemptId) {
      console.log(`Found stored quiz attempt ID: ${storedAttemptId}`);
      // Set the attempt ID from storage
      setAttemptId(storedAttemptId);
      // Start the timer for the existing attempt
      startTimer();
      return;
    }
    
    if (id && !attemptId && !isQuizLoading) {
      console.log(`Starting new quiz attempt for quiz: ${id}`);
      startAttemptMutation.mutate(id);
    } else {
      console.log('Not starting quiz attempt because:', {
        quizId: id,
        currentAttemptId: attemptId,
        isQuizLoading
      });
    }
  }, [attemptId, isQuizLoading, startAttemptMutation]);

  // Timer management
  const startTimer = () => {
    if (timerInterval) {
      clearInterval(timerInterval);
    }
    
    const interval = setInterval(() => {
      setElapsedTime(prev => prev + 1);
    }, 1000);
    
    setTimerInterval(interval);
  };

  const stopTimer = () => {
    if (timerInterval) {
      clearInterval(timerInterval);
      setTimerInterval(null);
    }
  };

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (timerInterval) {
        clearInterval(timerInterval);
      }
    };
  }, [timerInterval]);

  // Helper functions for navigation
  const nextQuestion = useCallback(() => {
    if (quiz && currentQuestionIndex < quiz.questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    }
  }, [quiz, currentQuestionIndex]);

  const previousQuestion = useCallback(() => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
    }
  }, [currentQuestionIndex]);

  const goToQuestion = useCallback((index: number) => {
    if (quiz && index >= 0 && index < quiz.questions.length) {
      setCurrentQuestionIndex(index);
    }
  }, [quiz]);

  // Save answer locally only - no immediate server submission
  const saveAnswer = useCallback((questionId: string, answer: any) => {
    // Update local state only
    setAnswers(prev => ({
      ...prev,
      [questionId]: answer
    }));
    
    // Log the answer selection (for debugging)
    console.log(`Answer selected for question ${questionId}:`, answer);
  }, []);

  // Helper function to handle the actual submission with a valid attempt ID
  const submitWithAttemptId = useCallback(async (attemptId: string) => {
    // Prevent multiple submissions
    if (isSubmitting) {
      console.log('Quiz submission already in progress');
      return { attemptId };
    }

    setIsSubmitting(true);
    
    try {
      // First check if the attempt is already completed
      if (attempt?.completedAt) {
        console.log(`Attempt ${attemptId} has already been completed at ${attempt.completedAt}`);
        
        // Return success with the existing attempt
        return {
          attemptId,
          result: {
            success: true,
            message: "Quiz was already completed",
            alreadyCompleted: true
          }
        };
      }
      
      // Check for unanswered questions
      const unansweredCount = quiz ? 
        quiz.questions.filter((q: QuizQuestion) => !answers[q.id]).length : 0;
      
      if (unansweredCount > 0) {
        // Check if the quiz is completely empty (no answers at all)
        const isCompletelyEmpty = Object.keys(answers).length === 0;
        
        const message = isCompletelyEmpty
          ? `You haven't answered any questions. Are you sure you want to submit an empty quiz?`
          : `You have ${unansweredCount} unanswered question${unansweredCount > 1 ? 's' : ''}. Are you sure you want to submit?`;
        
        const confirmed = window.confirm(message);
        
        if (!confirmed) {
          setIsSubmitting(false);
          return { attemptId };
        }
      }
      
      // First, submit all answers that have been saved locally
      if (quiz && quiz.questions && token) {
        console.log(`Submitting all answers before completing quiz attempt ${attemptId}`);
        
        // Create an array of promises for all answer submissions
        const submissionPromises = Object.entries(answers).map(async ([questionId, answer]) => {
          // Find the question to determine its type
          const question = quiz.questions.find((q: QuizQuestion) => q.id === questionId);
          if (!question) return null;
          
          // Prepare the response data based on question type
          const responseData = question.questionType === 'MULTIPLE_CHOICE' 
            ? { type: 'MULTIPLE_CHOICE', selectedOptionId: answer }
            : { type: 'CODE', codeSubmission: answer };
            
          // Submit the response
          try {
            const response = await api.submitQuizResponse(attemptId, questionId, responseData, token);
            console.log(`Answer for question ${questionId} saved:`, response);
            return response;
          } catch (error) {
            // Handle different types of errors
            if (error instanceof Error) {
              // If attempt is already completed, we can ignore these errors
              if (error.message.includes('already been completed')) {
                console.warn(`Attempt ${attemptId} has already been completed. Skipping answer submission.`);
                return { 
                  questionId, 
                  attemptId,
                  submitted: false, 
                  alreadyCompleted: true
                };
              } else if (error.message.includes('404')) {
                console.warn(`Response submission endpoint returned 404 for question ${questionId}. Continuing with quiz completion.`);
              } else {
                console.error(`Error submitting answer for question ${questionId}:`, error);
              }
            } else {
              console.error(`Unknown error submitting answer for question ${questionId}:`, error);
            }
            
            // Return a basic object with the essential data so the submission can continue
            return { 
              questionId, 
              attemptId,
              submitted: false, 
              error: error instanceof Error ? error.message : String(error)
            };
          }
        });
        
        try {
          // Wait for all submissions to complete, but don't let any failures stop the process
          const results = await Promise.allSettled(submissionPromises);
          console.log("All answer submissions complete:", results);
          
          // Check if all responses failed because the attempt is already completed
          const allCompletedErrors = results.every(r => 
            r.status === 'fulfilled' && 
            r.value && 
            (r.value.alreadyCompleted === true || 
             (r.value.error && r.value.error.includes('already been completed')))
          );
          
          if (allCompletedErrors) {
            console.log('All responses failed because the attempt is already completed');
            // Return the existing attempt ID so the user can navigate to results
            return {
              attemptId,
              result: {
                success: true,
                message: "Quiz was already completed",
                alreadyCompleted: true
              }
            };
          }
          
          // Log any errors
          results.forEach((result, index) => {
            if (result.status === 'rejected') {
              console.warn(`Answer submission ${index} failed:`, result.reason);
            }
          });
        } catch (error) {
          // This catch block will only trigger if Promise.allSettled itself fails
          console.error("Fatal error in answer submissions:", error);
        }
      }
      
      // Then complete the quiz attempt
      console.log('About to complete quiz attempt, attemptId:', attemptId);
      try {
        // Always update attemptId in state to ensure consistency
        setAttemptId(attemptId);
        
        const result = await completeAttemptMutation.mutateAsync();
        console.log('Quiz completion successful, result:', result);
        
        // Always return the attemptId at the root level
        return { 
          attemptId, 
          result 
        };
      } catch (error) {
        console.error("Error completing quiz attempt:", error);
        
        // If the attempt is already completed, treat it as success
        if (error instanceof Error && error.message.includes('already been completed')) {
          console.log('Attempt was already completed. Returning success response.');
          return {
            attemptId,
            result: {
              success: true,
              alreadyCompleted: true
            }
          };
        }
        
        // If the API isn't fully implemented, it might throw a 404 error
        // In that case, still treat it as a successful submission
        if (error instanceof Error && 
            (error.message.includes('404') || error.message.includes('not found'))) {
          console.warn('Quiz completion endpoint returned error, using fallback.');
          // Return a valid result with the attemptId so the frontend can navigate to results
          return { 
            attemptId,
            result: { success: true, fallback: true } 
          };
        }
        
        // Even for other errors, include the attemptId so navigation can continue
        return { 
          attemptId,
          error: error instanceof Error ? error.message : String(error),
          result: null 
        };
      }
    } catch (error) {
      console.error("Error submitting quiz:", error);
      setIsSubmitting(false);
      toast.error("Failed to submit quiz");
      // Still return the attemptId even in case of error
      return { 
        attemptId,
        error: error instanceof Error ? error.message : String(error),
        result: null 
      };
    }
  }, [isSubmitting, quiz, answers, token, api, setIsSubmitting, setAttemptId, completeAttemptMutation, attempt]);

  // Submit the entire quiz
  const submitQuiz = useCallback(async () => {
    // If attemptId is not in state, try to recover it from localStorage
    const currentAttemptId = attemptId || (quizId ? localStorage.getItem(`quiz_attempt_${quizId}`) : null);
    
    if (!currentAttemptId) {
      console.error('No active quiz attempt ID found in state or localStorage');
      
      // If we don't have an attempt ID, but we have a quiz ID, try to create a new attempt as a fallback
      if (quizId && token) {
        try {
          console.log('Attempting to create a new quiz attempt as fallback');
          const newAttempt = await api.startQuizAttempt(quizId, token);
          console.log('Created emergency quiz attempt:', newAttempt);
          
          // Save the new attempt ID
          setAttemptId(newAttempt.id);
          localStorage.setItem(`quiz_attempt_${quizId}`, newAttempt.id);
          
          // Continue with submission using the new attempt
          return await submitWithAttemptId(newAttempt.id);
        } catch (err) {
          console.error('Failed to create emergency attempt:', err);
          toast.error('Could not create a quiz attempt');
          return null;
        }
      }
      
      toast.error('No active quiz attempt');
      return null;
    }

    // Save the recovered attempt ID to state if needed
    if (!attemptId && currentAttemptId) {
      console.log(`Recovered attempt ID from localStorage: ${currentAttemptId}`);
      setAttemptId(currentAttemptId);
    }
    
    // Continue with the submission using the found attempt ID
    return await submitWithAttemptId(currentAttemptId);
  }, [attemptId, quizId, token, api, setAttemptId, submitWithAttemptId]);

  // Format time for display
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  // Check localStorage for existing attempt on mount and start a new one if needed
  useEffect(() => {
    if (quizId && !hasInitialized.current) {
      const storedAttemptId = localStorage.getItem(`quiz_attempt_${quizId}`);
      
      if (storedAttemptId) {
        console.log(`Found stored quiz attempt ID on initialization: ${storedAttemptId}`);
        
        // Set the attempt ID from storage so we can load it
        setAttemptId(storedAttemptId);
        
        // Don't start timer here - we'll wait until we verify the attempt is still valid
      } else if (!attemptId) {
        // No stored attempt and no current attempt, create a new one
        console.log(`No stored attempt found for quiz ${quizId}, creating a new one`);
        startAttemptMutation.mutate(quizId);
      }
      
      hasInitialized.current = true;
    }
  }, [quizId, attemptId, startAttemptMutation]);
  
  // Check if loaded attempt is valid (not completed) and create a new one if needed
  useEffect(() => {
    if (attempt && attempt.completedAt) {
      console.log(`Attempt ${attempt.id} is already completed at ${attempt.completedAt}. Creating a new attempt.`);
      
      // Clear the stored attempt
      if (quizId) {
        localStorage.removeItem(`quiz_attempt_${quizId}`);
      }
      
      // Reset state
      setAttemptId(null);
      setAnswers({});
      
      // Create a new attempt if we have a quiz ID
      if (quizId && token) {
        startAttemptMutation.mutate(quizId);
      }
    } else if (attempt && !attempt.completedAt) {
      // Start timer for valid attempts
      startTimer();
    }
  }, [attempt, quizId, token, startAttemptMutation]);

  return {
    quiz,
    attempt,
    currentQuestionIndex,
    currentQuestion: quiz?.questions?.[currentQuestionIndex],
    isLoading: isQuizLoading || isAttemptLoading || startAttemptMutation.isPending,
    isSubmitting,
    error: quizError,
    progress: quiz ? ((Object.keys(answers).length / quiz.questions.length) * 100) : 0,
    answers,
    elapsedTime,
    formattedTime: formatTime(elapsedTime),
    nextQuestion,
    previousQuestion,
    goToQuestion,
    saveAnswer,
    submitQuiz,
    startQuizAttempt
  };
}
