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

// Helper function to shuffle an array (Fisher-Yates)
const shuffleArray = <T,>(array: T[]): T[] => {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

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
  const hasInitialized = useRef<boolean>(false);
  const initialTaskIdRef = useRef<string | null>(location.state?.taskId || null);

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
          sessionStorage.removeItem(`assessment_${quizId}`);
          
          // Reset state
          setCurrentQuestionIndex(0);
          setAnswers({});
          setStartTime(new Date());
          
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
      lastUpdated: new Date().toISOString()
    };
    
    console.log('Saving quiz state to session storage:', stateToSave);
    sessionStorage.setItem(`quiz_${quizId}`, JSON.stringify(stateToSave));
  }, [quizId, currentQuestionIndex, answers, startTime]);
  
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

  // Memoize and process the quiz data to shuffle options if needed
  const processedQuiz = useMemo(() => {
    if (!quiz) return undefined;

    // Deep clone to avoid modifying the original data from react-query cache
    const clonedQuiz = JSON.parse(JSON.stringify(quiz));

    // Check if questions exist and shuffle options if necessary
    if (clonedQuiz.questions && Array.isArray(clonedQuiz.questions)) {
      clonedQuiz.questions = clonedQuiz.questions.map((q: QuizQuestion) => {
        if (q.questionType === 'MULTIPLE_CHOICE' && q.mcProblem?.shuffleOptions) {
          // Shuffle options only if shuffleOptions is true
          if (q.mcProblem.options && Array.isArray(q.mcProblem.options)) {
            q.mcProblem.options = shuffleArray(q.mcProblem.options);
            console.log(`Shuffled options for question ID: ${q.id}`);
          }
        }
        return q;
      });
    } else {
      console.warn("Quiz data fetched, but questions array is missing or not an array:", clonedQuiz);
      // Ensure questions is an array even if empty/missing
      clonedQuiz.questions = []; 
    }
    
    return clonedQuiz;
  }, [quiz]); // Re-run only when the raw quiz data changes

  // Check if we have a taskId in location state and update the currentQuestionIndex
  // This needs to run after the quiz data has been loaded
  useEffect(() => {
    if (processedQuiz?.questions && initialTaskIdRef.current && !hasInitialized.current) {
      const taskId = initialTaskIdRef.current;
      const questionIndex = processedQuiz.questions.findIndex((q: QuizQuestion) => q.id === taskId);
      
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
  }, [processedQuiz, quizId]);

  // Check if quiz content has changed and reset session if needed
  useEffect(() => {
    if (!processedQuiz || !quizId) return;
    
    const savedQuiz = sessionStorage.getItem(`quiz_${quizId}`);
    if (!savedQuiz) return;
    
    try {
      const quizData = JSON.parse(savedQuiz);
      
      // If we have a cached version hash, compare it to current quiz
      if (quizData.contentVersionHash) {
        // Create a hash of the current quiz questions to detect changes
        const currentQuestionsHash = JSON.stringify(processedQuiz.questions.map((q: QuizQuestion) => ({
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
        const currentQuestionsHash = JSON.stringify(processedQuiz.questions.map((q: QuizQuestion) => ({
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
  }, [processedQuiz, quizId, setCurrentQuestionIndex, setAnswers, setStartTime]);

  // Function to submit the entire quiz
  const submitQuiz = useCallback(async () => {
    if (!quizId || !token) {
      toast.error('Cannot submit quiz: Missing quiz ID or token.');
      return;
    }

    setIsSubmitting(true);
    console.log('Submitting quiz with answers:', answers);
    console.log('Quiz start time:', startTime);

    try {
      // Use the new submitCompleteQuiz API function
      const result = await api.submitCompleteQuiz(
        quizId,
        startTime.toISOString(),
        answers,
        token
      );

      console.log('Quiz submission successful:', result);
      toast.success('Quiz submitted successfully!');

      // Clear the session state for this quiz upon successful submission
      clearAssessmentSession(quizId, 'quiz');
      markAssessmentCompleted(quizId, 'quiz'); // Mark as completed to prevent accidental reload

      // Invalidate queries to refetch history, etc.
      queryClient.invalidateQueries({ queryKey: ['quizAttempts', quiz?.topicId] });
      queryClient.invalidateQueries({ queryKey: ['quiz', quizId] }); // Maybe refetch quiz details?

      // Navigate to results page using the returned attempt ID (result.id)
      // Need the navigate function from react-router-dom
      // This might need to be passed into the hook or handled by the calling component
      // For now, just log the intention
      console.log(`Need to navigate to results page for attempt ID: ${result.id}`);
      // Example: navigate(`/assessment/results/${result.id}?type=quiz`);
      
      // Return the result for the calling component to handle navigation
      return result;

    } catch (err) {
      console.error('Error submitting quiz:', err);
      toast.error('Failed to submit quiz.', {
        description: err instanceof Error ? err.message : 'An unknown error occurred.',
      });
      // Potentially re-throw or return an error indicator
      throw err; 
    } finally {
      setIsSubmitting(false);
    }
  }, [quizId, token, answers, startTime, api, queryClient, quiz?.topicId]); // Added quiz?.topicId

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
      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: ['quiz', quizId] });
      console.log('Quiz state has been completely reset');
    }
  }, [quizId, queryClient]);

  // Helper functions for navigation
  const nextQuestion = useCallback(() => {
    if (processedQuiz && currentQuestionIndex < processedQuiz.questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    }
  }, [processedQuiz, currentQuestionIndex]);

  const previousQuestion = useCallback(() => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
    }
  }, [currentQuestionIndex]);

  const goToQuestion = useCallback((index: number) => {
    if (processedQuiz && index >= 0 && index < processedQuiz.questions.length) {
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
  }, [processedQuiz, quizId]);

  // Save answer locally
  const saveAnswer = useCallback((questionId: string, answer: any) => {
    // Update local state immediately
    setAnswers(prevAnswers => ({
      ...prevAnswers,
      [questionId]: answer
    }));
    // Persist to session storage (handled by useEffect)
    
    // Optionally, could add debounced API call here to save progress incrementally,
    // but for now, we only save the full attempt on submit.
    
    // Example of calling submitQuestionMutation (if needed, but we removed attemptId)
    // submitQuestionMutation.mutate({ questionId, answer });
  }, []); // No dependencies needed as it only uses setAnswers

  // Mark that we've initialized after the first render
  useEffect(() => {
    hasInitialized.current = true;
  }, []);

  return {
    quiz: processedQuiz,
    currentQuestionIndex,
    currentQuestion: processedQuiz?.questions?.[currentQuestionIndex],
    isLoading,
    isSubmitting,
    error,
    progress: processedQuiz ? ((Object.keys(answers).length / processedQuiz.questions.length) * 100) : 0,
    answers,
    nextQuestion,
    previousQuestion,
    goToQuestion,
    saveAnswer,
    submitQuiz,
    // Helper to clear saved quiz data if needed
    clearSavedQuiz,
    // Force a complete reset to start fresh
    forceReset
  };
}
