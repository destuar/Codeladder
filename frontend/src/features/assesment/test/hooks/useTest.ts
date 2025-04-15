import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useAuth } from '@/features/auth/AuthContext';
import { api } from '@/lib/api';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useLocation } from 'react-router-dom';
import { clearAssessmentSession, markAssessmentCompleted, isAssessmentCompleted } from '@/lib/sessionUtils';
// Import shared types
import { 
  AssessmentQuestion as TestQuestion,
  McProblem,
  McOption,
  CodeProblem,
  TestCase,
  McResponse,
  CodeResponse
} from '../../shared/types';

// Test-specific interfaces (Mirrors Quiz interfaces)
export interface Test {
  id: string;
  title: string;
  description?: string;
  levelId: string; // Changed from topicId
  passingScore: number;
  estimatedTime?: number;
  orderNum?: number;
  questions: TestQuestion[];
}

export interface TestAttempt {
  id: string;
  testId: string; // Changed from quizId
  userId: string;
  score?: number;
  passed?: boolean;
  startedAt: string;
  completedAt?: string;
  responses: TestResponse[];
}

export interface TestResponse {
  id: string;
  attemptId: string;
  questionId: string;
  isCorrect?: boolean;
  points?: number;
  mcResponse?: McResponse;
  codeResponse?: CodeResponse;
}

// Export TestQuestion to be used by test components
export type { TestQuestion };

// Helper function to shuffle an array (Fisher-Yates) - Copied from useQuiz
const shuffleArray = <T,>(array: T[]): T[] => {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

/**
 * Hook for managing test state during test-taking
 * (Mirrors useQuiz logic)
 * 
 * NOTE: Timer functionality is now handled by the shared useAssessmentTimer hook
 * to ensure consistent behavior across pages and components.
 */
export function useTest(testId?: string) {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const location = useLocation();
  
  // Store test state in sessionStorage instead of creating db attempt immediately
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  // Timer state removed - now handled by useAssessmentTimer
  const [startTime, setStartTime] = useState<Date>(new Date());
  const hasInitialized = useRef<boolean>(false);
  const initialTaskIdRef = useRef<string | null>(location.state?.taskId || null);

  // Load test state from sessionStorage on init
  useEffect(() => {
    if (!testId) return;

    // Check if this test was previously completed
    if (isAssessmentCompleted(testId, 'test')) {
      console.log(`Test ${testId} was previously completed. Clearing session.`);
      clearAssessmentSession(testId, 'test');
      // Reset local state
      setCurrentQuestionIndex(0);
      setAnswers({});
      setStartTime(new Date());
      return; // Don't load old data
    }
    
    // Check sessionStorage for existing state
    const savedTest = sessionStorage.getItem(`test_${testId}`);
    if (savedTest) {
      try {
        const testData = JSON.parse(savedTest);
        
        // Check if the session has expired (older than 24 hours)
        const lastUpdated = testData.lastUpdated ? new Date(testData.lastUpdated).getTime() : 0;
        const now = Date.now();
        const hoursElapsed = (now - lastUpdated) / (1000 * 60 * 60);
        
        // If session is older than 24 hours, clear it and start fresh
        if (hoursElapsed > 24) {
          console.log(`Test session has expired (${hoursElapsed.toFixed(2)} hours old). Starting fresh.`);
          
          // Clear session data
          sessionStorage.removeItem(`test_${testId}`);
          sessionStorage.removeItem(`test_attempt_${testId}`);
          sessionStorage.removeItem(`assessment_${testId}`);
          
          // Initialize new state
          const newState = {
            currentQuestionIndex: 0,
            answers: {},
            startTime: new Date().toISOString(),
            lastUpdated: new Date().toISOString()
          };
          
          sessionStorage.setItem(`test_${testId}`, JSON.stringify(newState));
          
          // Set state with fresh values
          setCurrentQuestionIndex(0);
          setAnswers({});
          setStartTime(new Date());
          
          return;
        }
        
        // Session is still valid, load state as normal
        setCurrentQuestionIndex(testData.currentQuestionIndex || 0);
        
        // Always load saved answers if they exist, even if empty object
        if (testData.answers) {
          console.log('Loading saved answers from session storage:', testData.answers);
          setAnswers(testData.answers);
        }
        
        // Only use saved start time if it exists and is valid
        if (testData.startTime) {
          const savedStartTime = new Date(testData.startTime);
          
          if (!isNaN(savedStartTime.getTime())) {
            setStartTime(savedStartTime);
          }
        }
      } catch (e) {
        console.error('Error parsing saved test data:', e);
        // Don't clear invalid data immediately, try to recover answers
        try {
          const savedAnswers = JSON.parse(savedTest).answers;
          if (savedAnswers) {
            console.log('Recovered answers from invalid session data:', savedAnswers);
            setAnswers(savedAnswers);
          }
        } catch (e) {
          console.error('Could not recover answers from invalid session data:', e);
          sessionStorage.removeItem(`test_${testId}`);
        }
      }
    } else {
      // Initialize new attempt
      console.log('No saved test data found, initializing new attempt');
      const newState = {
        currentQuestionIndex: 0,
        answers: {},
        startTime: new Date().toISOString(),
        lastUpdated: new Date().toISOString()
      };
      
      sessionStorage.setItem(`test_${testId}`, JSON.stringify(newState));
    }
  }, [testId]);
  
  // Save test state to sessionStorage when it changes
  useEffect(() => {
    // Only save after the initial load is complete to avoid overwriting loaded state
    if (!testId || !hasInitialized.current) return; 
    
    const stateToSave = {
      currentQuestionIndex,
      answers,
      startTime: startTime.toISOString(),
      lastUpdated: new Date().toISOString()
    };
    
    console.log('Saving test state to session storage:', stateToSave);
    sessionStorage.setItem(`test_${testId}`, JSON.stringify(stateToSave));
  }, [testId, currentQuestionIndex, answers, startTime]);
  
  // Timer effect removed - now handled by useAssessmentTimer

  // Fetch test data
  const { data: test, isLoading, error } = useQuery<any, Error>({ // Use 'any' for now, replace with 'Test' if safe
    queryKey: ['test', testId], // Changed from 'quiz'
    queryFn: async () => {
      if (!token || !testId) throw new Error('No token or test ID');
      // Use the new function
      return api.getAssessmentStructure(testId, token, 'TEST'); // Specify TEST type
    },
    enabled: !!token && !!testId,
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 10,
  });

  // Memoize and process the test data to shuffle options if needed
  const processedTest = useMemo(() => {
    if (!test) return undefined;

    // Deep clone to avoid modifying the original data from react-query cache
    const clonedTest = JSON.parse(JSON.stringify(test));

    // Check if questions exist and shuffle options if necessary
    if (clonedTest.questions && Array.isArray(clonedTest.questions)) {
      clonedTest.questions = clonedTest.questions.map((q: TestQuestion) => {
        if (q.questionType === 'MULTIPLE_CHOICE' && q.mcProblem?.shuffleOptions) {
          // Shuffle options only if shuffleOptions is true
          if (q.mcProblem.options && Array.isArray(q.mcProblem.options)) {
            q.mcProblem.options = shuffleArray(q.mcProblem.options);
            console.log(`Shuffled options for test question ID: ${q.id}`); // Log for test
          }
        }
        return q;
      });
    } else {
      console.warn("Test data fetched, but questions array is missing or not an array:", clonedTest);
      // Ensure questions is an array even if empty/missing
      clonedTest.questions = []; 
    }
    
    return clonedTest;
  }, [test]); // Re-run only when the raw test data changes

  // Check if we have a taskId in location state and update the currentQuestionIndex
  // This needs to run after the test data has been loaded
  useEffect(() => {
    // Only run once after test data is loaded and if initialTaskId exists
    if (processedTest?.questions && initialTaskIdRef.current && !hasInitialized.current) {
      const taskId = initialTaskIdRef.current;
      const questionIndex = processedTest.questions.findIndex((q: TestQuestion) => q.id === taskId);
      
      if (questionIndex !== -1) {
        console.log(`Setting initial question index to ${questionIndex} based on taskId ${taskId}`);
        setCurrentQuestionIndex(questionIndex);
        
        // Update the stored test state with the new index
        if (testId) {
          const savedTest = sessionStorage.getItem(`test_${testId}`);
          if (savedTest) {
            try {
              const testData = JSON.parse(savedTest);
              testData.currentQuestionIndex = questionIndex;
              testData.lastUpdated = new Date().toISOString();
              sessionStorage.setItem(`test_${testId}`, JSON.stringify(testData));
            } catch (e) {
              console.error('Error updating current question index in sessionStorage:', e);
            }
          }
        }
      } else {
        console.warn(`Could not find question with ID ${taskId} in test questions`);
      }
      
      // Clear the taskId ref so we don't process it again
      initialTaskIdRef.current = null;
      hasInitialized.current = true; // Mark as initialized
    } else if (!hasInitialized.current && processedTest?.questions) {
      // If there was no taskId but we have loaded questions, mark as initialized
      hasInitialized.current = true;
    }
  }, [processedTest, testId]); // Dependencies: processedTest and testId

  // Check if test content has changed and reset session if needed
  useEffect(() => {
    if (!processedTest || !testId) return;
    
    const savedTest = sessionStorage.getItem(`test_${testId}`);
    if (!savedTest) return;
    
    try {
      const testData = JSON.parse(savedTest);
      const savedContentHash = testData.contentHash;
      
      // Generate hash of current test content (questions)
      const currentContent = JSON.stringify(processedTest.questions.map((q: { id: string }) => q.id).sort());
      
      // Simple hash function (replace with something more robust if needed)
      const simpleHash = (str: string) => {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
          const char = str.charCodeAt(i);
          hash = ((hash << 5) - hash) + char;
          hash |= 0; // Convert to 32bit integer
        }
        return hash;
      };
      
      const currentContentHash = simpleHash(currentContent);

      if (savedContentHash && savedContentHash !== currentContentHash) {
        console.warn('Test content has changed since the last session. Resetting session.');
        toast.warning('Test content has been updated', {
          description: 'Your previous progress for this test has been cleared.',
        });

        // Function to clear session and reset state
        const resetTestSession = () => {
          // Clear all session storage
          sessionStorage.removeItem(`test_${testId}`);
          sessionStorage.removeItem(`assessment_${testId}`);
          sessionStorage.removeItem(`test_${testId}_completed`); // Also clear completion flag

          // Reset state
          setCurrentQuestionIndex(0);
          setAnswers({});
          setStartTime(new Date());
        };

        resetTestSession();
      } else if (!savedContentHash) {
          // If no hash saved previously, save the current one
          testData.contentHash = currentContentHash;
          testData.lastUpdated = new Date().toISOString();
          sessionStorage.setItem(`test_${testId}`, JSON.stringify(testData));
      }
    } catch (e) {
      console.error('Error checking test content version:', e);
    }
  }, [processedTest, testId]); // Removed state setters from deps

  // Helper functions for navigation
  const nextQuestion = useCallback(() => {
    if (processedTest && currentQuestionIndex < processedTest.questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    }
  }, [processedTest, currentQuestionIndex]);

  const previousQuestion = useCallback(() => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
    }
  }, [currentQuestionIndex]);

  const goToQuestion = useCallback((index: number) => {
    if (processedTest && index >= 0 && index < processedTest.questions.length) {
      setCurrentQuestionIndex(index);
      
      // Update sessionStorage immediately with new index
      if (testId) {
        const savedTest = sessionStorage.getItem(`test_${testId}`);
        if (savedTest) {
          try {
            const testData = JSON.parse(savedTest);
            testData.currentQuestionIndex = index;
            testData.lastUpdated = new Date().toISOString();
            sessionStorage.setItem(`test_${testId}`, JSON.stringify(testData));
          } catch (e) {
            console.error('Error updating current question index in sessionStorage:', e);
          }
        }
      }
    }
  }, [processedTest, testId]);

  // Save answer locally and update sessionStorage
  const saveAnswer = useCallback((questionId: string, answer: any) => {
    setAnswers(prev => {
      const updatedAnswers = { ...prev, [questionId]: answer };
      
      // Save to sessionStorage immediately (handled by useEffect now, but explicit save here for safety)
      if (testId) {
        const savedTest = sessionStorage.getItem(`test_${testId}`);
        if (savedTest) {
          try {
            const testData = JSON.parse(savedTest);
            testData.answers = updatedAnswers;
            testData.lastUpdated = new Date().toISOString();
            sessionStorage.setItem(`test_${testId}`, JSON.stringify(testData));
            console.log(`Answer for ${questionId} saved to sessionStorage.`);
          } catch (e) {
            console.error('Error updating answers in sessionStorage:', e);
          }
        }
      }
      return updatedAnswers;
    });
    
    console.log(`Answer selected locally for question ${questionId}:`, answer);
  }, [testId]);

  // Submit test mutation
  const testSubmissionMutation = useMutation({
    mutationFn: async () => {
      // Ensure all necessary data is available before proceeding
      if (!processedTest || !token || !testId || !startTime) {
        throw new Error('Missing required data for test submission.');
      }

      // Prepare responses payload (using the structure expected by submitCompleteQuiz)
      // The submitCompleteQuiz function seems to expect the raw answers object
      const answersPayload = answers; 

      console.log('Submitting test attempt with answers:', answersPayload);
      // Assume submitCompleteQuiz handles tests via the ID/endpoint routing
      return api.submitCompleteQuiz(
        testId, // Pass testId as quizId 
        startTime.toISOString(),
        answersPayload,
        token
      );
    },
    onSuccess: (data) => { // data is the result from submitCompleteQuiz
      console.log('Test submission successful:', data);
      toast.success('Test submitted successfully!');
      
      // Mark completed in session
      if (testId) {
        markAssessmentCompleted(testId, 'test');
      }
      
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['test', testId] });
      queryClient.invalidateQueries({ queryKey: ['userProgress'] });
      if (processedTest?.levelId) { 
        queryClient.invalidateQueries({ queryKey: ['testAttempts', processedTest.levelId] });
      }
      
      // Clear session storage
      if (testId) {
        clearAssessmentSession(testId, 'test');
      }
      
      setIsSubmitting(false); // Reset submitting state
      
      // Optionally return data if needed by the component calling submitTest
      return data; 
    },
    onError: (error: Error) => {
      console.error('Test submission failed:', error);
      toast.error(`Test submission failed: ${error.message}`);
      setIsSubmitting(false); // Reset submitting state
    },
  });

  // Submit test (calls the mutation)
  const submitTest = useCallback(async () => {
    // Guard clause: Ensure test data is loaded before attempting submission
    if (!processedTest) {
      toast.error('Test data is not loaded yet.');
      throw new Error('Test data not loaded');
    }
    // Guard clause: Ensure startTime is valid
    if (!startTime || isNaN(startTime.getTime())) {
      console.error('Invalid start time before submission, attempting to reset...');
      const now = new Date();
      setStartTime(now); // Try setting a valid time
      // Add a small delay or check if the state update is synchronous enough?
      // For now, throw error if still invalid after attempt.
      if(isNaN(now.getTime())) { 
        toast.error('Failed to set a valid start time. Cannot submit.');
        throw new Error('Invalid start time for submission');
      }
      // Re-fetch startTime from state in case of async update?
      // Better to ensure startTime is always valid before this point.
      console.warn('Start time was invalid, reset to now. Proceeding with caution.');
    }

    setIsSubmitting(true); // Set submitting state before calling mutate
    try {
      // Use mutateAsync to handle promise-based flow
      const result = await testSubmissionMutation.mutateAsync(); 
      // No need to manually call setIsSubmitting(false) on success, onSuccess handles it
      return result; // Return result on success
    } catch (error) {
      // Error is already handled by mutation's onError
      console.error("Error caught during submitTest execution:", error);
      // No need to setIsSubmitting(false) here, onError handles it
      throw error; // Re-throw to be caught by the component calling submitTest
    }
  // Dependencies for the useCallback hook
  }, [processedTest, answers, startTime, testId, token, api, queryClient, testSubmissionMutation, setIsSubmitting, setStartTime]); 

  // Mark that we've initialized after the first render cycle
  useEffect(() => {
     if (!hasInitialized.current) {
       console.log('useTest hook initialized.');
       hasInitialized.current = true;
     }
  }, []); // Empty dependency array ensures this runs only once

  // Helper function to clear saved test data
  const clearSavedTest = useCallback(() => {
    if (testId) {
      clearAssessmentSession(testId, 'test');
    }
  }, [testId]);

  // Force a complete reset to start fresh
  const forceReset = useCallback(() => {
    if (testId) {
      clearAssessmentSession(testId, 'test');
      // Reset local state
      setCurrentQuestionIndex(0);
      setAnswers({});
      setStartTime(new Date());
      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: ['test', testId] });
      if (testId) {
        queryClient.invalidateQueries({ queryKey: ['testAttempt', testId] });
      }
      console.log('Test state has been completely reset');
    }
  }, [testId, queryClient, clearSavedTest]); // Added clearSavedTest


  // Return the state and functions
  return {
    test: processedTest,
    currentQuestionIndex,
    currentQuestion: processedTest?.questions?.[currentQuestionIndex],
    isLoading,
    isSubmitting,
    error,
    // Ensure progress calculation handles potential division by zero
    progress: processedTest ? ((Object.keys(answers).length / processedTest.questions.length) * 100) : 0, 
    answers,
    nextQuestion,
    previousQuestion,
    goToQuestion,
    saveAnswer,
    submitTest, // Changed from submitQuiz
    clearSavedTest, // Changed from clearSavedQuiz
    forceReset,
  };
}
