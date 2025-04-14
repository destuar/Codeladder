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
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const hasInitialized = useRef<boolean>(false);
  const initialTaskIdRef = useRef<string | null>(location.state?.taskId || null);

  // Save attempt ID to sessionStorage
  useEffect(() => {
    if (testId && attemptId) {
      sessionStorage.setItem(`test_attempt_${testId}`, attemptId);
      console.log(`Saved attempt ID ${attemptId} to sessionStorage for test ${testId}`);
    }
  }, [testId, attemptId]);

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
      setAttemptId(null);
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
          setAttemptId(null);
          
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
        
        // Restore attemptId if available
        if (testData.attemptId) {
          setAttemptId(testData.attemptId);
        } else {
          // Check if we have a separate saved attempt ID
          const savedAttemptId = sessionStorage.getItem(`test_attempt_${testId}`);
          if (savedAttemptId) {
            setAttemptId(savedAttemptId);
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
      attemptId,
      lastUpdated: new Date().toISOString()
    };
    
    console.log('Saving test state to session storage:', stateToSave);
    sessionStorage.setItem(`test_${testId}`, JSON.stringify(stateToSave));
  }, [testId, currentQuestionIndex, answers, startTime, attemptId]); // hasInitialized removed, logic handled inside
  
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

  // Check if we have a taskId in location state and update the currentQuestionIndex
  // This needs to run after the test data has been loaded
  useEffect(() => {
    // Only run once after test data is loaded and if initialTaskId exists
    if (test?.questions && initialTaskIdRef.current && !hasInitialized.current) {
      const taskId = initialTaskIdRef.current;
      const questionIndex = test.questions.findIndex((q: TestQuestion) => q.id === taskId);
      
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
      // Mark initialized *after* potentially setting index from taskId
      // hasInitialized.current = true; // Moved to the end of the hook
    }
  }, [test, testId]); // Dependencies: test data and testId

  // Check if test content has changed and reset session if needed
  useEffect(() => {
    if (!test || !testId) return;
    
    const savedTest = sessionStorage.getItem(`test_${testId}`);
    if (!savedTest) return;
    
    // Define resetTestSession helper function *before* the try block
    const resetTestSession = () => {
      // Clear all session storage related to this test
      sessionStorage.removeItem(`test_${testId}`);
      sessionStorage.removeItem(`test_attempt_${testId}`);
      sessionStorage.removeItem(`assessment_${testId}`);
      sessionStorage.removeItem(`test_${testId}_completed`);
      
      // Find and clear any other test-related items
      Object.keys(sessionStorage).forEach(key => {
        if (key.includes(testId)) {
          console.log(`Clearing additional test session data: ${key}`);
          sessionStorage.removeItem(key);
        }
      });
      
      // Reset state setters directly
      setCurrentQuestionIndex(0);
      setAnswers({});
      setStartTime(new Date());
      setAttemptId(null);
    };
    
    try {
      const testData = JSON.parse(savedTest);
      
      // Simple hash function
      const simpleHash = (str: string) => {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
          const char = str.charCodeAt(i);
          hash = ((hash << 5) - hash) + char;
          hash = hash & hash; // Convert to 32bit integer
        }
        return hash.toString(36);
      };
      
      // Create a hash of the current test questions to detect changes
      const currentQuestionsHash = JSON.stringify(test.questions.map((q: TestQuestion) => ({
        id: q.id,
        type: q.questionType,
        text: q.questionText,
        orderNum: q.orderNum
      })));
      const currentHash = simpleHash(currentQuestionsHash);

      // If we have a cached version hash, compare it
      if (testData.contentVersionHash) {
        // If hash is different, test content has changed
        if (currentHash !== testData.contentVersionHash) {
          console.log('Test content has changed. Resetting session.');
          
          // Call the reset function defined above
          resetTestSession();
          
          // Start a new session with the updated hash
          const newState = {
            currentQuestionIndex: 0,
            answers: {},
            startTime: new Date().toISOString(),
            contentVersionHash: currentHash,
            lastUpdated: new Date().toISOString()
          };
          sessionStorage.setItem(`test_${testId}`, JSON.stringify(newState));
        }
      } else {
        // No hash exists, store the current hash
        console.log('Storing initial content hash for test.');
        testData.contentVersionHash = currentHash;
        testData.lastUpdated = new Date().toISOString();
        sessionStorage.setItem(`test_${testId}`, JSON.stringify(testData));
      }
    } catch (e) {
      console.error('Error checking test content version:', e);
    }

    // Moved helper function definition above the try block
    /*
    const resetTestSession = () => {
      // ... implementation ...
    };
    */

  }, [test, testId]); // Dependencies: test data and testId

  // Get attempt data if we have an attemptId
  // Uses shared getQuizAttempt which should fetch generic attempt details
  const { data: attempt, isLoading: isAttemptLoading } = useQuery({
    queryKey: ['testAttempt', attemptId], // Changed from 'quizAttempt'
    queryFn: async () => {
      if (!token || !attemptId) throw new Error('No token or attempt ID available');
      return api.getAttemptDetails(attemptId, token); // Use generic getAttemptDetails
    },
    enabled: !!token && !!attemptId,
    staleTime: 30 * 1000, // 30 seconds
    refetchOnWindowFocus: false,
    refetchInterval: false,
  });

  // Start test attempt (API call)
  // Uses shared startQuizAttempt
  const startAttemptMutation = useMutation({
    mutationFn: async (testToStart: string) => {
      if (!token) throw new Error('No token available');
      console.log(`Making API call to start test attempt for: ${testToStart}`);
      return api.startQuizAttempt(testToStart, token); // Use shared API function
    },
    onSuccess: (data) => {
      console.log(`Test attempt created successfully with ID: ${data.id}`);
      
      // Save the attempt ID to state
      setAttemptId(data.id);
      
      // Also save it to sessionStorage for persistence
      if (testId && data.id) {
        sessionStorage.setItem(`test_attempt_${testId}`, data.id);
        console.log(`Saved attempt ID ${data.id} to sessionStorage for test ${testId}`);
      }
    },
    onError: (error) => {
      toast.error('Failed to start test attempt');
      console.error('Start attempt error:', error);
    },
  });

  // Start the test attempt (initializes state in sessionStorage)
  const startTestAttempt = useCallback((id: string) => {
    if (!id) return;

    // Check for completion *before* deciding to initialize or resume
    if (isAssessmentCompleted(id, 'test')) {
      console.log(`Test ${id} was completed. Clearing session before starting new attempt.`);
      clearAssessmentSession(id, 'test');
    }

    const existingSession = sessionStorage.getItem(`test_${id}`);
    const existingAttemptId = sessionStorage.getItem(`test_attempt_${id}`);

    if (!existingSession || !existingAttemptId) {
      console.log(`Initializing new test state in sessionStorage for: ${id}`);
      
      // Reset state locally
      setCurrentQuestionIndex(0);
      setAnswers({});
      const newStartTime = new Date();
      setStartTime(newStartTime);
      setAttemptId(null);
      
      // Initialize sessionStorage
      const newState = {
        currentQuestionIndex: 0,
        answers: {},
        startTime: newStartTime.toISOString(),
        lastUpdated: new Date().toISOString()
      };
      sessionStorage.setItem(`test_${id}`, JSON.stringify(newState));

      // Call API to create attempt record
      console.log(`Calling API to start test attempt for ID: ${id}`);
      startAttemptMutation.mutate(id);

    } else {
      console.log(`Resuming existing test state from sessionStorage for: ${id}`);
      // Ensure local state matches sessionStorage if resuming
      try {
        const sessionData = JSON.parse(existingSession);
        setCurrentQuestionIndex(sessionData.currentQuestionIndex || 0);
        setAnswers(sessionData.answers || {});
        if (sessionData.startTime) setStartTime(new Date(sessionData.startTime));
        setAttemptId(existingAttemptId || sessionData.attemptId || null);
      } catch (e) {
        console.error("Error synchronizing state with existing session:", e);
        clearAssessmentSession(id, 'test');
        startTestAttempt(id); // Re-initialize
      }
    }
  }, [queryClient, startAttemptMutation]); // attemptId removed

  // Submit a question response (API call)
  // Uses shared submitQuizResponse
  const submitResponseMutation = useMutation({
    mutationFn: async ({ 
      questionId, 
      responseData 
    }: { 
      questionId: string; 
      responseData: any 
    }) => {
      if (!token || !attemptId) throw new Error('No token or attempt ID available');
      return api.submitQuizResponse(attemptId, questionId, responseData, token); // Use shared API function
    },
    onSuccess: (data, variables) => {
      console.log('Answer saved successfully via API');
    },
    onError: (error) => {
      toast.error('Failed to save your answer');
      console.error('Submit response error:', error);
    },
  });

  // Complete a test attempt (API call)
  // Uses shared completeQuizAttempt
  const completeAttemptMutation = useMutation({
    mutationFn: async () => {
      if (!token || !attemptId) {
        console.error('Missing required data:', { token: !!token, attemptId });
        throw new Error('No token or attempt ID available');
      }
      
      console.log(`Completing test attempt with ID: ${attemptId}`);
      try {
        const result = await api.completeQuizAttempt(attemptId, token); // Use shared API function
        console.log('Complete test attempt response:', result);
        
        // Ensure result includes attemptId for consistency
        if (result && !result.attemptId && attemptId) {
          result.attemptId = attemptId;
        }
        
        return result;
      } catch (error) {
        console.error('Error in completeTestAttempt API call:', error);
        throw error;
      }
    },
    onSuccess: (data) => {
      toast.success('Test submitted successfully!');
      queryClient.invalidateQueries({ queryKey: ['testAttempt', attemptId] }); // Invalidate test attempt cache
      queryClient.invalidateQueries({ queryKey: ['learningPath'] }); // Invalidate learning path
    },
    onError: (error) => {
      toast.error('Failed to submit test');
      console.error('Complete attempt error:', error);
    },
    onSettled: () => {
      setIsSubmitting(false);
    },
  });

  // Helper functions for navigation
  const nextQuestion = useCallback(() => {
    if (test && currentQuestionIndex < test.questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    }
  }, [test, currentQuestionIndex]);

  const previousQuestion = useCallback(() => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
    }
  }, [currentQuestionIndex]);

  const goToQuestion = useCallback((index: number) => {
    if (test && index >= 0 && index < test.questions.length) {
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
  }, [test, testId]);

  // Save answer locally and update sessionStorage
  const saveAnswer = useCallback((questionId: string, answer: any) => {
    setAnswers(prev => {
      const updatedAnswers = { ...prev, [questionId]: answer };
      
      // Save to sessionStorage immediately
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

  // Submit the entire test (API call)
  const submitTest = useCallback(async () => {
    if (!test || !token || !testId) {
      return { success: false, message: 'Missing required data' };
    }
    
    setIsSubmitting(true);
    try {
      // Use the shared submitCompleteQuiz endpoint
      const result = await api.submitCompleteQuiz(
        testId,
        startTime.toISOString(),
        answers,
        token
      );
      
      // Mark completed and clear session on success
      markAssessmentCompleted(testId, 'test');
      clearAssessmentSession(testId, 'test');
      
      return { 
        success: true,
        message: 'Test submitted successfully',
        attemptId: result?.id // Return attemptId for navigation
      };
    } catch (error) {
      console.error('Error submitting complete test:', error);
      return { 
        success: false, 
        message: error instanceof Error ? error.message : 'Unknown error submitting test'
      };
    } finally {
      setIsSubmitting(false);
    }
  }, [test, testId, token, answers, startTime, api, queryClient]);

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
      setAttemptId(null);
      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: ['test', testId] });
      if (attemptId) {
        queryClient.invalidateQueries({ queryKey: ['testAttempt', attemptId] });
      }
      console.log('Test state has been completely reset');
    }
  }, [testId, attemptId, queryClient, clearSavedTest]); // Added clearSavedTest


  // Return the state and functions
  return {
    test,
    attempt,
    currentQuestionIndex,
    currentQuestion: test?.questions?.[currentQuestionIndex],
    isLoading,
    isSubmitting,
    error,
    // Ensure progress calculation handles potential division by zero
    progress: test?.questions?.length ? ((Object.keys(answers).length / test.questions.length) * 100) : 0, 
    answers,
    nextQuestion,
    previousQuestion,
    goToQuestion,
    saveAnswer,
    submitTest, // Changed from submitQuiz
    startTestAttempt, // Changed from startQuizAttempt
    clearSavedTest, // Changed from clearSavedQuiz
    forceReset,
  };
}
