import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useAuth } from '@/features/auth/AuthContext';
import { api } from '@/lib/api';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useLocation } from 'react-router-dom';
import { clearAssessmentSession, markAssessmentCompleted, isAssessmentCompleted } from '@/lib/sessionUtils';
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
  const location = useLocation();
  
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [startTime, setStartTime] = useState<Date>(new Date());
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const hasInitialized = useRef<boolean>(false);
  const initialTaskIdRef = useRef<string | null>(location.state?.taskId || null);

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

    // Check if this quiz was previously completed
    if (isAssessmentCompleted(quizId, 'quiz')) {
      console.log(`Quiz ${quizId} was previously completed. Clearing session.`);
      clearAssessmentSession(quizId, 'quiz');
      // Reset local state
      setCurrentQuestionIndex(0);
      setAnswers({});
      setStartTime(new Date());
      setAttemptId(null);
      return; // Don't load old data
    }
    
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
          
          // Reset state
          setCurrentQuestionIndex(0);
          setAnswers({});
          setStartTime(new Date());
          setAttemptId(null);
          
          return;
        }
        
        // Session is still valid, load state as normal
        setCurrentQuestionIndex(quizData.currentQuestionIndex || 0);
        
        // Always load saved answers if they exist, even if empty object
        if (quizData.answers) {
          console.log('Loading saved answers from session storage:', quizData.answers);
          setAnswers(quizData.answers);
        }
        
        // Only use saved start time if it exists and is valid
        if (quizData.startTime) {
          const savedStartTime = new Date(quizData.startTime);
          
          if (!isNaN(savedStartTime.getTime())) {
            setStartTime(savedStartTime);
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
        // Don't clear invalid data immediately, try to recover answers
        try {
          const savedAnswers = JSON.parse(savedQuiz).answers;
          if (savedAnswers) {
            console.log('Recovered answers from invalid session data:', savedAnswers);
            setAnswers(savedAnswers);
          }
        } catch (e) {
          console.error('Could not recover answers from invalid session data:', e);
          sessionStorage.removeItem(`quiz_${quizId}`);
        }
      }
    } else {
      // Initialize new attempt
      console.log('No saved quiz data found, initializing new attempt');
      const newState = {
        currentQuestionIndex: 0,
        answers: {},
        startTime: new Date().toISOString(),
        lastUpdated: new Date().toISOString()
      };
      
      sessionStorage.setItem(`quiz_${quizId}`, JSON.stringify(newState));
    }
  }, [quizId]);
  
  // Save quiz state to sessionStorage when it changes
  useEffect(() => {
    if (!quizId || !hasInitialized.current) return;
    
    const stateToSave = {
      currentQuestionIndex,
      answers,
      startTime: startTime.toISOString(),
      attemptId,
      lastUpdated: new Date().toISOString()
    };
    
    console.log('Saving quiz state to session storage:', stateToSave);
    sessionStorage.setItem(`quiz_${quizId}`, JSON.stringify(stateToSave));
  }, [quizId, currentQuestionIndex, answers, startTime, attemptId]);
  
  // Fetch quiz data
  const { data: quiz, isLoading, error } = useQuery<any, Error>({
    queryKey: ['quiz', quizId],
    queryFn: async () => {
      if (!token || !quizId) throw new Error('No token or quiz ID');
      // Use the new function
      return api.getAssessmentStructure(quizId, token, 'QUIZ');
    },
    enabled: !!token && !!quizId,
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 10,
  });

  // Check if we have a taskId in location state and update the currentQuestionIndex
  // This needs to run after the quiz data has been loaded
  useEffect(() => {
    if (quiz?.questions && initialTaskIdRef.current && !hasInitialized.current) {
      const taskId = initialTaskIdRef.current;
      const questionIndex = quiz.questions.findIndex((q: QuizQuestion) => q.id === taskId);
      
      if (questionIndex !== -1) {
        console.log(`Setting initial question index to ${questionIndex} based on taskId ${taskId}`);
        setCurrentQuestionIndex(questionIndex);
        
        // Update the stored quiz state with the new index
        if (quizId) {
          const savedQuiz = sessionStorage.getItem(`quiz_${quizId}`);
          if (savedQuiz) {
            try {
              const quizData = JSON.parse(savedQuiz);
              quizData.currentQuestionIndex = questionIndex;
              quizData.lastUpdated = new Date().toISOString();
              sessionStorage.setItem(`quiz_${quizId}`, JSON.stringify(quizData));
            } catch (e) {
              console.error('Error updating current question index in sessionStorage:', e);
            }
          }
        }
      } else {
        console.warn(`Could not find question with ID ${taskId} in quiz questions`);
      }
      
      // Clear the taskId ref so we don't process it again
      initialTaskIdRef.current = null;
      hasInitialized.current = true;
    }
  }, [quiz, quizId]);

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
  }, [quiz, quizId, setCurrentQuestionIndex, setAnswers, setStartTime, setAttemptId]);

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
    },
    onError: (error) => {
      toast.error('Failed to start quiz attempt');
      console.error('Start attempt error:', error);
    },
  });

  // Submit a single question (likely unused now, but keep for potential partial submissions)
  const submitQuestionMutation = useMutation({
    mutationFn: async ({ questionId, answer }: { questionId: string, answer: any }) => {
      if (!token || !attemptId) throw new Error('No token or attempt ID');
      // Prepare response data based on question type (assuming MC for simplicity here)
      // You might need to fetch the question type if it's not readily available
      const responseData = { type: 'MULTIPLE_CHOICE', selectedOptionId: answer }; // Example
      // Use the correct API function: submitQuizResponse
      return api.submitQuizResponse(attemptId, questionId, responseData, token);
    },
    onSuccess: (data, variables) => {
      console.log(`Answer submitted for question ${variables.questionId}:`, data);
      // Optionally update UI or state based on response
    },
    onError: (error, variables) => {
      console.error(`Error submitting answer for question ${variables.questionId}:`, error);
      toast.error('Failed to submit answer');
    },
  });

  // Submit the entire quiz (API call)
  const submitQuiz = useCallback(async () => {
    if (!quiz || !token || !quizId) {
      return { success: false, message: 'Missing required data' };
    }
    
    setIsSubmitting(true);
    try {
      const result = await api.submitCompleteQuiz(
        quizId,
        startTime.toISOString(),
        answers,
        token
      );
      
      // Mark completed and clear session on success
      markAssessmentCompleted(quizId, 'quiz');
      clearAssessmentSession(quizId, 'quiz');
      
      return { 
        success: true,
        message: 'Quiz submitted successfully',
        attemptId: result?.id // Return attemptId for navigation
      };
    } catch (error) {
      console.error('Error submitting complete quiz:', error);
      // Consider more specific error messages based on API response if available
      return { 
        success: false, 
        message: error instanceof Error ? error.message : 'Unknown error submitting quiz'
      };
    } finally {
      setIsSubmitting(false);
    }
  }, [quiz, quizId, token, answers, startTime, api, queryClient]);

  // Start the quiz attempt (initializes state in sessionStorage)
  const startQuizAttempt = useCallback((id: string) => {
    if (!id) return;

    // Check for completion *before* deciding to initialize or resume
    if (isAssessmentCompleted(id, 'quiz')) {
      console.log(`Quiz ${id} was completed. Clearing session before starting new attempt.`);
      clearAssessmentSession(id, 'quiz');
    }

    const existingSession = sessionStorage.getItem(`quiz_${id}`);
    const existingAttemptId = sessionStorage.getItem(`quiz_attempt_${id}`);
    
    if (!existingSession || !existingAttemptId) {
      console.log(`Initializing new quiz state in sessionStorage for: ${id}`);
      
      // Reset state locally
      setCurrentQuestionIndex(0);
      setAnswers({});
      const newStartTime = new Date();
      setStartTime(newStartTime);
      setAttemptId(null); // Ensure attemptId is null initially
      
      // Initialize sessionStorage with fresh state
      const newState = {
        currentQuestionIndex: 0,
        answers: {},
        startTime: newStartTime.toISOString(),
        lastUpdated: new Date().toISOString()
        // attemptId will be set by the mutation
      };
      sessionStorage.setItem(`quiz_${id}`, JSON.stringify(newState));

      // Call the API to create the attempt record
      console.log(`Calling API to start quiz attempt for ID: ${id}`);
      startAttemptMutation.mutate(id);

    } else {
      console.log(`Resuming existing quiz state from sessionStorage for: ${id}`);
      // Ensure local state matches sessionStorage if resuming
      // (Initial useEffect already handles loading, this is more of a safeguard)
      try {
        const sessionData = JSON.parse(existingSession);
        setCurrentQuestionIndex(sessionData.currentQuestionIndex || 0);
        setAnswers(sessionData.answers || {});
        if (sessionData.startTime) setStartTime(new Date(sessionData.startTime));
        setAttemptId(existingAttemptId || sessionData.attemptId || null);
      } catch (e) {
        console.error("Error synchronizing state with existing session:", e);
        // If session is corrupted, clear and start fresh
        clearAssessmentSession(id, 'quiz');
        startQuizAttempt(id); // Re-call to initialize properly
      }
    }
  }, [queryClient, startAttemptMutation]); // attemptId removed as dependency to avoid loops

  // Helper function to clear saved quiz data
  const clearSavedQuiz = useCallback(() => {
    if (quizId) {
      clearAssessmentSession(quizId, 'quiz');
    }
  }, [quizId]);

  // Force a complete reset to start fresh
  const forceReset = useCallback(() => {
    if (quizId) {
      clearAssessmentSession(quizId, 'quiz');
      // Reset local state
      setCurrentQuestionIndex(0);
      setAnswers({});
      setStartTime(new Date());
      setAttemptId(null);
      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: ['quiz', quizId] });
      if (attemptId) {
        queryClient.invalidateQueries({ queryKey: ['quizAttempt', attemptId] });
      }
      console.log('Quiz state has been completely reset');
    }
  }, [quizId, attemptId, queryClient]);

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
      
      // Update sessionStorage with new current question index
      if (quizId) {
        const savedQuiz = sessionStorage.getItem(`quiz_${quizId}`);
        if (savedQuiz) {
          try {
            const quizData = JSON.parse(savedQuiz);
            quizData.currentQuestionIndex = index;
            quizData.lastUpdated = new Date().toISOString();
            sessionStorage.setItem(`quiz_${quizId}`, JSON.stringify(quizData));
          } catch (e) {
            console.error('Error updating current question index in sessionStorage:', e);
          }
        }
      }
    }
  }, [quiz, quizId]);

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

  // Mark that we've initialized after the first render
  useEffect(() => {
    hasInitialized.current = true;
  }, []);

  return {
    quiz,
    attempt,
    currentQuestionIndex,
    currentQuestion: quiz?.questions?.[currentQuestionIndex],
    isLoading,
    isSubmitting,
    error,
    progress: quiz ? ((Object.keys(answers).length / quiz.questions.length) * 100) : 0,
    answers,
    nextQuestion,
    previousQuestion,
    goToQuestion,
    saveAnswer,
    submitQuiz,
    startQuizAttempt,
    // Helper to clear saved quiz data if needed
    clearSavedQuiz,
    // Force a complete reset to start fresh
    forceReset
  };
}
