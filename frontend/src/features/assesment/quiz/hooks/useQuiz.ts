import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useAuth } from '@/features/auth/AuthContext';
import { api } from '@/lib/api';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
// Import shared types
import { 
  AssessmentQuestion as QuizQuestion,
  McProblem,
  McOption,
  CodeProblem,
  TestCase,
  McResponse,
  CodeResponse
} from '../../shared/types';

// Quiz-specific interfaces
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

// Export QuizQuestion to be used by quiz components
export type { QuizQuestion };

/**
 * Hook for managing quiz state during quiz-taking
 */
export function useQuiz(quizId?: string) {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  
  // Store quiz state in sessionStorage instead of creating db attempt immediately
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [startTime, setStartTime] = useState<Date>(new Date());
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const hasInitialized = useRef<boolean>(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Save attempt ID to sessionStorage
  useEffect(() => {
    if (quizId && attemptId) {
      sessionStorage.setItem(`quiz_attempt_${quizId}`, attemptId);
      console.log(`Saved attempt ID ${attemptId} to sessionStorage for quiz ${quizId}`);
    }
  }, [quizId, attemptId]);

  // Load quiz state from sessionStorage on init
  useEffect(() => {
    if (!quizId) return;
    
    // Check sessionStorage for existing state
    const savedQuiz = sessionStorage.getItem(`quiz_${quizId}`);
    if (savedQuiz) {
      try {
        const quizData = JSON.parse(savedQuiz);
        
        // Check if the session has expired (older than 24 hours)
        const lastUpdated = quizData.lastUpdated ? new Date(quizData.lastUpdated).getTime() : 0;
        const now = Date.now();
        const hoursElapsed = (now - lastUpdated) / (1000 * 60 * 60);
        
        // If session is older than 24 hours, clear it and start fresh
        if (hoursElapsed > 24) {
          console.log(`Quiz session has expired (${hoursElapsed.toFixed(2)} hours old). Starting fresh.`);
          
          // Clear session data
          sessionStorage.removeItem(`quiz_${quizId}`);
          sessionStorage.removeItem(`quiz_attempt_${quizId}`);
          sessionStorage.removeItem(`assessment_${quizId}`);
          
          // Initialize new state
          const newState = {
            currentQuestionIndex: 0,
            answers: {},
            startTime: new Date().toISOString(),
            elapsedTime: 0,
            lastUpdated: new Date().toISOString()
          };
          
          sessionStorage.setItem(`quiz_${quizId}`, JSON.stringify(newState));
          
          // Set state with fresh values
          setCurrentQuestionIndex(0);
          setAnswers({});
          setElapsedTime(0);
          setStartTime(new Date());
          setAttemptId(null);
          
          return;
        }
        
        // Session is still valid, load state as normal
        setCurrentQuestionIndex(quizData.currentQuestionIndex || 0);
        setAnswers(quizData.answers || {});
        
        // Only use saved start time if it exists and is valid
        if (quizData.startTime) {
          const savedStartTime = new Date(quizData.startTime);
          
          if (!isNaN(savedStartTime.getTime())) {
            setStartTime(savedStartTime);
            // Calculate elapsed time since the saved start
            const elapsed = Math.floor((Date.now() - savedStartTime.getTime()) / 1000);
            setElapsedTime(quizData.elapsedTime ? quizData.elapsedTime + elapsed : elapsed);
          }
        }
        
        // Restore attemptId if available
        if (quizData.attemptId) {
          setAttemptId(quizData.attemptId);
        } else {
          // Check if we have a separate saved attempt ID
          const savedAttemptId = sessionStorage.getItem(`quiz_attempt_${quizId}`);
          if (savedAttemptId) {
            setAttemptId(savedAttemptId);
          }
        }
      } catch (e) {
        console.error('Error parsing saved quiz data:', e);
        // Clear invalid data
        sessionStorage.removeItem(`quiz_${quizId}`);
      }
    } else {
      // Initialize new attempt
      console.log('No saved quiz data found, initializing new attempt');
      const newState = {
        currentQuestionIndex: 0,
        answers: {},
        startTime: new Date().toISOString(),
        elapsedTime: 0,
        lastUpdated: new Date().toISOString()
      };
      
      sessionStorage.setItem(`quiz_${quizId}`, JSON.stringify(newState));
    }
  }, [quizId]);
  
  // Save quiz state to sessionStorage when it changes
  useEffect(() => {
    if (quizId) {
      const stateToSave = {
        currentQuestionIndex,
        answers,
        startTime: startTime.toISOString(),
        elapsedTime,
        attemptId,
        lastUpdated: new Date().toISOString()
      };
      
      sessionStorage.setItem(`quiz_${quizId}`, JSON.stringify(stateToSave));
    }
  }, [quizId, currentQuestionIndex, answers, startTime, elapsedTime, attemptId]);
  
  // Timer effect with better cleanup
  useEffect(() => {
    // Clear any existing timer first
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    
    // Don't start a new timer - we're now handling timing in the QuizPage component
    // to synchronize with the assessment overview timer
    
    /*
    timerRef.current = setInterval(() => {
      setElapsedTime(prev => {
        const newTime = prev + 1;
        // Save the updated time to sessionStorage
        if (quizId) {
          const savedQuiz = sessionStorage.getItem(`quiz_${quizId}`);
          if (savedQuiz) {
            try {
              const quizData = JSON.parse(savedQuiz);
              quizData.elapsedTime = newTime;
              quizData.lastUpdated = new Date().toISOString();
              sessionStorage.setItem(`quiz_${quizId}`, JSON.stringify(quizData));
            } catch (e) {
              console.error('Error updating elapsed time in sessionStorage:', e);
            }
          }
        }
        return newTime;
      });
    }, 1000);
    */
    
    // Clean up timer on component unmount
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [quizId]);

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

  // Check if quiz content has changed and reset session if needed
  useEffect(() => {
    if (!quiz || !quizId) return;
    
    const savedQuiz = sessionStorage.getItem(`quiz_${quizId}`);
    if (!savedQuiz) return;
    
    try {
      const quizData = JSON.parse(savedQuiz);
      
      // If we have a cached version hash, compare it to current quiz
      if (quizData.contentVersionHash) {
        // Create a hash of the current quiz questions to detect changes
        const currentQuestionsHash = JSON.stringify(quiz.questions.map((q: QuizQuestion) => ({
          id: q.id,
          type: q.questionType,
          text: q.questionText,
          orderNum: q.orderNum
        })));
        
        // Use a simple hash calculation for comparison
        const simpleHash = (str: string) => {
          let hash = 0;
          for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32bit integer
          }
          return hash.toString(36);
        };
        
        const currentHash = simpleHash(currentQuestionsHash);
        
        // If hash is different, quiz content has changed
        if (currentHash !== quizData.contentVersionHash) {
          console.log('Quiz content has changed. Resetting session.');
          
          // Create a new reset function to avoid the circular dependency
          const resetQuizSession = () => {
            // Clear all session storage
            sessionStorage.removeItem(`quiz_${quizId}`);
            sessionStorage.removeItem(`quiz_attempt_${quizId}`);
            sessionStorage.removeItem(`assessment_${quizId}`);
            sessionStorage.removeItem(`quiz_${quizId}_completed`);
            
            // Find and clear any other quiz-related items
            Object.keys(sessionStorage).forEach(key => {
              if (key.includes(quizId)) {
                console.log(`Clearing additional quiz session data: ${key}`);
                sessionStorage.removeItem(key);
              }
            });
            
            // Reset state
            setCurrentQuestionIndex(0);
            setAnswers({});
            setElapsedTime(0);
            setStartTime(new Date());
            setAttemptId(null);
          };
          
          // Reset the session
          resetQuizSession();
          
          // Start a new session with the updated hash
          const newState = {
            currentQuestionIndex: 0,
            answers: {},
            startTime: new Date().toISOString(),
            elapsedTime: 0,
            contentVersionHash: currentHash,
            lastUpdated: new Date().toISOString()
          };
          
          sessionStorage.setItem(`quiz_${quizId}`, JSON.stringify(newState));
        }
      } else {
        // No hash exists, store the current hash
        const currentQuestionsHash = JSON.stringify(quiz.questions.map((q: QuizQuestion) => ({
          id: q.id,
          type: q.questionType,
          text: q.questionText,
          orderNum: q.orderNum
        })));
        
        const simpleHash = (str: string) => {
          let hash = 0;
          for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
          }
          return hash.toString(36);
        };
        
        const currentHash = simpleHash(currentQuestionsHash);
        
        // Update the saved quiz data with the hash
        quizData.contentVersionHash = currentHash;
        sessionStorage.setItem(`quiz_${quizId}`, JSON.stringify(quizData));
      }
    } catch (e) {
      console.error('Error checking quiz content version:', e);
    }
  }, [quiz, quizId, setCurrentQuestionIndex, setAnswers, setElapsedTime, setStartTime, setAttemptId]);

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
      
      // Also save it to sessionStorage for persistence
      if (quizId && data.id) {
        sessionStorage.setItem(`quiz_attempt_${quizId}`, data.id);
        console.log(`Saved attempt ID ${data.id} to sessionStorage for quiz ${quizId}`);
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

  // Start the quiz attempt (stored in sessionStorage only - no API call)
  const startQuizAttempt = useCallback((id: string, forceNew = false) => {
    // Check if this quiz was previously completed
    const completedFlag = sessionStorage.getItem(`quiz_${id}_completed`);
    if (completedFlag === 'true') {
      console.log(`Quiz ${id} was previously completed. Starting fresh.`);
      forceNew = true;
      
      // Clear the completion flag and any other data
      sessionStorage.removeItem(`quiz_${id}_completed`);
      sessionStorage.removeItem(`quiz_${id}`);
      sessionStorage.removeItem(`quiz_attempt_${id}`);
      sessionStorage.removeItem(`assessment_${id}`);
      
      // Find and clear any other items
      Object.keys(sessionStorage).forEach(key => {
        if (key.includes(id)) {
          console.log(`Clearing additional quiz session data: ${key}`);
          sessionStorage.removeItem(key);
        }
      });
      
      // Also invalidate any cached data for this quiz
      queryClient.invalidateQueries({ queryKey: ['quiz', id] });
      
      // If we have an attemptId, invalidate that too
      const savedAttemptId = sessionStorage.getItem(`quiz_attempt_${id}`);
      if (savedAttemptId) {
        queryClient.invalidateQueries({ queryKey: ['quizAttempt', savedAttemptId] });
      }
    }
    
    // If forceNew is true or no saved attempt exists, initialize a new sessionStorage entry
    if (forceNew || !sessionStorage.getItem(`quiz_${id}`)) {
      console.log(`Initializing new quiz state in sessionStorage for: ${id}`);
      
      // Reset state
      setCurrentQuestionIndex(0);
      setAnswers({});
      setElapsedTime(0);
      const newStartTime = new Date();
      setStartTime(newStartTime);
      
      // Initialize sessionStorage with fresh state
      const newState = {
        currentQuestionIndex: 0,
        answers: {},
        startTime: newStartTime.toISOString(),
        elapsedTime: 0,
        lastUpdated: new Date().toISOString()
      };
      
      sessionStorage.setItem(`quiz_${id}`, JSON.stringify(newState));
      return;
    }
    
    // If we have saved state, it's already loaded by the useEffect
    console.log(`Using existing quiz state from sessionStorage for: ${id}`);
  }, [queryClient]);

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
    // Clear the timer
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    console.log('Timer stopped');
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

  // Save answer locally
  const saveAnswer = useCallback((questionId: string, answer: any) => {
    // Update local state
    setAnswers(prev => {
      const updatedAnswers = {
        ...prev,
        [questionId]: answer
      };
      
      // Save to sessionStorage immediately
      if (quizId) {
        const savedQuiz = sessionStorage.getItem(`quiz_${quizId}`);
        if (savedQuiz) {
          try {
            const quizData = JSON.parse(savedQuiz);
            quizData.answers = updatedAnswers;
            quizData.lastUpdated = new Date().toISOString();
            sessionStorage.setItem(`quiz_${quizId}`, JSON.stringify(quizData));
          } catch (e) {
            console.error('Error updating answers in sessionStorage:', e);
          }
        }
      }
      
      return updatedAnswers;
    });
    
    // Log the answer selection (for debugging)
    console.log(`Answer selected for question ${questionId}:`, answer);
  }, [quizId]);

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
    console.log('submitQuiz called with:', { quizId, token: !!token, answersCount: Object.keys(answers).length });
    
    if (!quiz || !token || !quizId) {
      console.error('Missing required data for quiz submission:', { 
        quiz: !!quiz, 
        token: !!token, 
        quizId: !!quizId 
      });
      return { success: false, message: 'Missing required data' };
    }
    
    // Prevent multiple submissions
    if (isSubmitting) {
      console.log('Quiz submission already in progress');
      return { success: false, message: 'Submission in progress' };
    }
    
    setIsSubmitting(true);
    console.log('Set isSubmitting to true');
    
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
        
        console.log('Showing confirmation for unanswered questions:', { 
          unansweredCount, 
          isCompletelyEmpty,
          message 
        });
        
        const confirmed = window.confirm(message);
        
        if (!confirmed) {
          console.log('User cancelled quiz submission');
          setIsSubmitting(false);
          return { success: false, message: 'Submission cancelled' };
        }
      }
      
      // Submit the entire quiz at once (create and complete attempt)
      console.log('Making API call to submit complete quiz:', { 
        quizId, 
        startTime: startTime.toISOString(),
        answers: Object.keys(answers).length
      });
      
      const result = await api.submitCompleteQuiz(
        quizId,
        startTime.toISOString(),
        answers,
        token
      );
      
      console.log('Quiz submission API result:', result);
      
      // Store the new attempt ID
      if (result && result.id) {
        console.log(`Setting attemptId to: ${result.id}`);
        setAttemptId(result.id);
      } else {
        console.warn('API response missing attempt ID:', result);
      }
      
      // Clear the saved quiz data from sessionStorage
      console.log('Cleaning up session storage');
      sessionStorage.removeItem(`quiz_${quizId}`);
      sessionStorage.removeItem(`quiz_attempt_${quizId}`);
      
      console.log('Returning success response with attemptId:', result?.id);
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
      console.log('Setting isSubmitting back to false');
      setIsSubmitting(false);
    }
  }, [quiz, quizId, token, answers, isSubmitting, startTime, api, setAttemptId]);

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
        console.log(`Thoroughly clearing all quiz data for: ${quizId}`);
        // Clear direct quiz data
        sessionStorage.removeItem(`quiz_${quizId}`);
        sessionStorage.removeItem(`quiz_attempt_${quizId}`);
        sessionStorage.removeItem(`assessment_${quizId}`);
        sessionStorage.removeItem(`quiz_${quizId}_completed`);
        
        // Find and clear any other quiz-related items
        Object.keys(sessionStorage).forEach(key => {
          if (key.includes(quizId)) {
            console.log(`Clearing additional quiz session data: ${key}`);
            sessionStorage.removeItem(key);
          }
        });
      }
    }, [quizId]),
    // Force a complete reset to start fresh
    forceReset: useCallback(() => {
      if (quizId) {
        console.log(`Forcing complete reset of quiz ${quizId}`);
        
        // Clear all session storage
        sessionStorage.removeItem(`quiz_${quizId}`);
        sessionStorage.removeItem(`quiz_attempt_${quizId}`);
        sessionStorage.removeItem(`assessment_${quizId}`);
        sessionStorage.removeItem(`quiz_${quizId}_completed`);
        
        // Find and clear any other quiz-related items
        Object.keys(sessionStorage).forEach(key => {
          if (key.includes(quizId)) {
            console.log(`Clearing additional quiz session data: ${key}`);
            sessionStorage.removeItem(key);
          }
        });
        
        // Reset state
        setCurrentQuestionIndex(0);
        setAnswers({});
        setElapsedTime(0);
        setStartTime(new Date());
        setAttemptId(null);
        
        // Force a new session to be created
        const newState = {
          currentQuestionIndex: 0,
          answers: {},
          startTime: new Date().toISOString(),
          elapsedTime: 0,
          lastUpdated: new Date().toISOString()
        };
        
        sessionStorage.setItem(`quiz_${quizId}`, JSON.stringify(newState));
        
        // Invalidate queries to force re-fetch
        queryClient.invalidateQueries({ queryKey: ['quiz', quizId] });
        if (attemptId) {
          queryClient.invalidateQueries({ queryKey: ['quizAttempt', attemptId] });
        }
        
        console.log('Quiz state has been completely reset');
      }
    }, [quizId, attemptId, queryClient])
  };
}
