import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
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
  
  // Store quiz state in localStorage instead of creating db attempt immediately
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [startTime] = useState<Date>(new Date());
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const hasInitialized = useRef<boolean>(false);

  // Load quiz state from localStorage on init
  useEffect(() => {
    if (quizId) {
      const savedQuiz = localStorage.getItem(`quiz_${quizId}`);
      if (savedQuiz) {
        try {
          const quizData = JSON.parse(savedQuiz);
          setCurrentQuestionIndex(quizData.currentQuestionIndex || 0);
          setAnswers(quizData.answers || {});
          // Only use saved start time if it exists and is valid
          if (quizData.startTime) {
            const savedStartTime = new Date(quizData.startTime);
            if (!isNaN(savedStartTime.getTime())) {
              // Calculate elapsed time since the saved start
              setElapsedTime(Math.floor((Date.now() - savedStartTime.getTime()) / 1000));
            }
          }
        } catch (e) {
          console.error('Error parsing saved quiz data:', e);
          // Clear invalid data
          localStorage.removeItem(`quiz_${quizId}`);
        }
      }
    }
  }, [quizId]);
  
  // Save quiz state to localStorage when it changes
  useEffect(() => {
    if (quizId) {
      localStorage.setItem(`quiz_${quizId}`, JSON.stringify({
        currentQuestionIndex,
        answers,
        startTime: startTime.toISOString()
      }));
    }
  }, [quizId, currentQuestionIndex, answers, startTime]);
  
  // Timer effect
  useEffect(() => {
    const timer = setInterval(() => {
      setElapsedTime(prev => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch quiz data
  const { data: quiz, isLoading: isQuizLoading, error: quizError } = useQuery({
    queryKey: ['quiz', quizId],
    queryFn: async () => {
      if (!token || !quizId) {
        throw new Error('Token or quiz ID is missing');
      }
      return api.getQuizForAttempt(quizId, token);
    },
    enabled: !!token && !!quizId
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

  // Start the quiz attempt (stored in localStorage only - no API call)
  const startQuizAttempt = useCallback((id: string, forceNew = false) => {
    // If forceNew is true or no saved attempt exists, initialize a new localStorage entry
    if (forceNew || !localStorage.getItem(`quiz_${id}`)) {
      console.log(`Initializing new quiz state in localStorage for: ${id}`);
      
      // Reset state
      setCurrentQuestionIndex(0);
      setAnswers({});
      setElapsedTime(0);
      
      // Initialize localStorage with fresh state
      const newState = {
        currentQuestionIndex: 0,
        answers: {},
        startTime: new Date().toISOString()
      };
      
      localStorage.setItem(`quiz_${id}`, JSON.stringify(newState));
      return;
    }
    
    // If we have saved state, it's already loaded by the useEffect
    console.log(`Using existing quiz state from localStorage for: ${id}`);
  }, []);

  // Format elapsed time
  const formattedTime = useMemo(() => {
    const minutes = Math.floor(elapsedTime / 60);
    const seconds = elapsedTime % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }, [elapsedTime]);

  // Start quiz timer
  const startTimer = useCallback(() => {
    // We don't need to do anything here since we already have a timer effect
    console.log('Timer is already running');
  }, []);

  // Stop quiz timer
  const stopTimer = useCallback(() => {
    // We don't need to do anything here - timer will be cleaned up naturally
    console.log('Timer will be cleaned up automatically');
  }, []);

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
    if (!quiz || !token || !quizId) {
      console.error('Missing required data for quiz submission');
      return { success: false, message: 'Missing required data' };
    }
    
    // Prevent multiple submissions
    if (isSubmitting) {
      console.log('Quiz submission already in progress');
      return { success: false, message: 'Submission in progress' };
    }
    
    setIsSubmitting(true);
    
    try {
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
          return { success: false, message: 'Submission cancelled' };
        }
      }
      
      // Submit the entire quiz at once (create and complete attempt)
      console.log('Submitting entire quiz at once');
      const result = await api.submitCompleteQuiz(
        quizId,
        startTime.toISOString(),
        answers,
        token
      );
      
      console.log('Quiz submission result:', result);
      
      // Store the new attempt ID
      if (result && result.id) {
        setAttemptId(result.id);
      }
      
      // Clear the saved quiz data from localStorage
      localStorage.removeItem(`quiz_${quizId}`);
      
      return { 
        success: true,
        message: 'Quiz submitted successfully',
        attemptId: result?.id
      };
    } catch (error) {
      console.error('Error submitting quiz:', error);
      return { 
        success: false, 
        message: error instanceof Error ? error.message : 'Unknown error'
      };
    } finally {
      setIsSubmitting(false);
    }
  }, [quiz, quizId, token, answers, isSubmitting, startTime]);

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
    formattedTime,
    nextQuestion,
    previousQuestion,
    goToQuestion,
    saveAnswer,
    submitQuiz,
    startQuizAttempt,
    // Helper to clear saved quiz data if needed
    clearSavedQuiz: useCallback(() => {
      if (quizId) {
        localStorage.removeItem(`quiz_${quizId}`);
      }
    }, [quizId])
  };
}
