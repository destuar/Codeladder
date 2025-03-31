import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useAuth } from '@/features/auth/AuthContext';
import { api } from '@/lib/api';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
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

// Test-specific interfaces
export interface Test {
  id: string;
  title: string;
  description?: string;
  levelId: string;
  passingScore: number;
  estimatedTime?: number;
  orderNum?: number;
  questions: TestQuestion[];
}

export interface TestAttempt {
  id: string;
  testId: string;
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
 */
export function useTest(testId?: string) {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  
  // Store test state in sessionStorage instead of creating db attempt immediately
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
    if (testId && attemptId) {
      sessionStorage.setItem(`test_attempt_${testId}`, attemptId);
      console.log(`Saved attempt ID ${attemptId} to sessionStorage for test ${testId}`);
    }
  }, [testId, attemptId]);

  // Load test state from sessionStorage on init
  useEffect(() => {
    if (!testId) return;
    
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
            elapsedTime: 0,
            lastUpdated: new Date().toISOString()
          };
          
          sessionStorage.setItem(`test_${testId}`, JSON.stringify(newState));
          
          // Set state with fresh values
          setCurrentQuestionIndex(0);
          setAnswers({});
          setElapsedTime(0);
          setStartTime(new Date());
          setAttemptId(null);
          
          return;
        }
        
        // Session is still valid, load state as normal
        setCurrentQuestionIndex(testData.currentQuestionIndex || 0);
        setAnswers(testData.answers || {});
        
        // Only use saved start time if it exists and is valid
        if (testData.startTime) {
          const savedStartTime = new Date(testData.startTime);
          
          if (!isNaN(savedStartTime.getTime())) {
            setStartTime(savedStartTime);
            // Calculate elapsed time since the saved start
            const elapsed = Math.floor((Date.now() - savedStartTime.getTime()) / 1000);
            setElapsedTime(testData.elapsedTime ? testData.elapsedTime + elapsed : elapsed);
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
        // Clear invalid data
        sessionStorage.removeItem(`test_${testId}`);
      }
    } else {
      // Initialize new attempt
      console.log('No saved test data found, initializing new attempt');
      const newState = {
        currentQuestionIndex: 0,
        answers: {},
        startTime: new Date().toISOString(),
        elapsedTime: 0,
        lastUpdated: new Date().toISOString()
      };
      
      sessionStorage.setItem(`test_${testId}`, JSON.stringify(newState));
    }
  }, [testId]);
  
  // Save test state to sessionStorage when it changes
  useEffect(() => {
    if (testId) {
      const stateToSave = {
        currentQuestionIndex,
        answers,
        startTime: startTime.toISOString(),
        elapsedTime,
        attemptId,
        lastUpdated: new Date().toISOString()
      };
      
      sessionStorage.setItem(`test_${testId}`, JSON.stringify(stateToSave));
    }
  }, [testId, currentQuestionIndex, answers, startTime, elapsedTime, attemptId]);
  
  // Timer effect with better cleanup
  useEffect(() => {
    // Clear any existing timer first
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    
    // Don't start a new timer - we're now handling timing in the TestPage component
    // to synchronize with the assessment overview timer
    
    /*
    timerRef.current = setInterval(() => {
      setElapsedTime(prev => {
        const newTime = prev + 1;
        // Save the updated time to sessionStorage
        if (testId) {
          const savedTest = sessionStorage.getItem(`test_${testId}`);
          if (savedTest) {
            try {
              const testData = JSON.parse(savedTest);
              testData.elapsedTime = newTime;
              testData.lastUpdated = new Date().toISOString();
              sessionStorage.setItem(`test_${testId}`, JSON.stringify(testData));
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
  }, [testId]);

  // Fetch test data
  const { data: test, isLoading: isTestLoading, error: testError } = useQuery({
    queryKey: ['test', testId],
    queryFn: async () => {
      if (!token || !testId) {
        throw new Error('Token or test ID is missing');
      }
      console.log(`Fetching test data for test ID: ${testId}`);
      // Pass TEST assessment type to ensure correct data fetching
      return api.getQuizForAttempt(testId, token, 'TEST');
    },
    enabled: !!token && !!testId,
    // Add retry logic to handle potential failures
    retry: 2,
    retryDelay: 1000,
  });

  // Check if test content has changed and reset session if needed
  useEffect(() => {
    if (!test || !testId) return;
    
    const savedTest = sessionStorage.getItem(`test_${testId}`);
    if (!savedTest) return;
    
    try {
      const testData = JSON.parse(savedTest);
      
      // If we have a cached version hash, compare it to current test
      if (testData.contentVersionHash) {
        // Create a hash of the current test questions to detect changes
        const currentQuestionsHash = JSON.stringify(test.questions.map((q: TestQuestion) => ({
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
        
        // If hash is different, test content has changed
        if (currentHash !== testData.contentVersionHash) {
          console.log('Test content has changed. Resetting session.');
          
          // Create a new reset function to avoid the circular dependency
          const resetTestSession = () => {
            // Clear all session storage
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
            
            // Reset state
            setCurrentQuestionIndex(0);
            setAnswers({});
            setElapsedTime(0);
            setStartTime(new Date());
            setAttemptId(null);
          };
          
          // Reset the session
          resetTestSession();
          
          // Start a new session with the updated hash
          const newState = {
            currentQuestionIndex: 0,
            answers: {},
            startTime: new Date().toISOString(),
            elapsedTime: 0,
            contentVersionHash: currentHash,
            lastUpdated: new Date().toISOString()
          };
          
          sessionStorage.setItem(`test_${testId}`, JSON.stringify(newState));
        }
      } else {
        // No hash exists, store the current hash
        const currentQuestionsHash = JSON.stringify(test.questions.map((q: TestQuestion) => ({
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
        
        // Update the saved test data with the hash
        testData.contentVersionHash = currentHash;
        sessionStorage.setItem(`test_${testId}`, JSON.stringify(testData));
      }
    } catch (e) {
      console.error('Error checking test content version:', e);
    }
  }, [test, testId, setCurrentQuestionIndex, setAnswers, setElapsedTime, setStartTime, setAttemptId]);

  // Get attempt data if we have an attemptId
  const { data: attempt, isLoading: isAttemptLoading } = useQuery({
    queryKey: ['testAttempt', attemptId],
    queryFn: async () => {
      if (!token || !attemptId) throw new Error('No token or attempt ID available');
      // Use existing quiz API function
      return api.getQuizAttempt(attemptId, token);
    },
    enabled: !!token && !!attemptId,
    staleTime: 10 * 1000 // 10 seconds
  });

  // Start a test attempt
  const startAttemptMutation = useMutation({
    mutationFn: async (testToStart: string) => {
      if (!token) throw new Error('No token available');
      console.log(`Making API call to start test attempt for: ${testToStart}`);
      // Use existing quiz API function
      return api.startQuizAttempt(testToStart, token);
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
      
      // Start the timer (if we hadn't already)
      startTimer();
    },
    onError: (error) => {
      toast.error('Failed to start test attempt');
      console.error('Start attempt error:', error);
    },
  });

  // Submit response for a single question
  const submitResponseMutation = useMutation({
    mutationFn: async ({ 
      attemptId, 
      questionId, 
      responseData 
    }: { 
      attemptId: string; 
      questionId: string; 
      responseData: any 
    }) => {
      if (!token || !attemptId) throw new Error('No token or attempt ID available');
      // Use existing quiz API function
      return api.submitQuizResponse(attemptId, questionId, responseData, token);
    },
    onSuccess: (data, variables) => {
      // Do nothing - successful submissions are tracked in state already
    },
    onError: (error, variables) => {
      console.error(`Error submitting response for question ${variables.questionId}:`, error);
    },
  });

  // Complete a test attempt
  const completeAttemptMutation = useMutation({
    mutationFn: async () => {
      if (!token || !attemptId) {
        throw new Error(`Cannot complete test: ${!token ? 'No token available' : 'No attempt ID'}`);
      }
      
      console.log(`Completing test attempt with ID: ${attemptId}`);
      try {
        // Use existing quiz API function
        const result = await api.completeQuizAttempt(attemptId, token);
        console.log('Complete test attempt response:', result);
        
        // If the API didn't return an attemptId, add it
        if (!result.attemptId && result.id) {
          result.attemptId = result.id;
        } else if (!result.attemptId && attemptId) {
          result.attemptId = attemptId;
        }
        
        return result;
      } catch (error) {
        console.error('Error in completeTestAttempt API call:', error);
        throw error;
      }
    },
    onSuccess: (data) => {
      stopTimer();
      toast.success('Test submitted successfully!');
      queryClient.invalidateQueries({ queryKey: ['testAttempt', attemptId] });
    },
    onError: (error) => {
      toast.error('Failed to submit test');
      console.error('Complete attempt error:', error);
    },
  });

  // Start the test attempt (stored in sessionStorage only - no API call)
  const startTestAttempt = useCallback((id: string, forceNew = false) => {
    // Check if this test was previously completed
    const completedFlag = sessionStorage.getItem(`test_${id}_completed`);
    if (completedFlag === 'true') {
      console.log(`Test ${id} was previously completed. Starting fresh.`);
      forceNew = true;
      
      // Clear the completion flag and any other data
      sessionStorage.removeItem(`test_${id}_completed`);
      sessionStorage.removeItem(`test_${id}`);
      sessionStorage.removeItem(`test_attempt_${id}`);
      sessionStorage.removeItem(`assessment_${id}`);
      
      // Find and clear any other items
      Object.keys(sessionStorage).forEach(key => {
        if (key.includes(id)) {
          console.log(`Clearing additional test session data: ${key}`);
          sessionStorage.removeItem(key);
        }
      });
      
      // Also invalidate any cached data for this test
      queryClient.invalidateQueries({ queryKey: ['test', id] });
      
      // If we have an attemptId, invalidate that too
      const savedAttemptId = sessionStorage.getItem(`test_attempt_${id}`);
      if (savedAttemptId) {
        queryClient.invalidateQueries({ queryKey: ['testAttempt', savedAttemptId] });
      }
    }
    
    // If forceNew is true or no saved attempt exists, initialize a new sessionStorage entry
    if (forceNew || !sessionStorage.getItem(`test_${id}`)) {
      console.log(`Initializing new test state in sessionStorage for: ${id}`);
      
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
      
      sessionStorage.setItem(`test_${id}`, JSON.stringify(newState));
      return;
    }
    
    // If we have saved state, it's already loaded by the useEffect
    console.log(`Using existing test state from sessionStorage for: ${id}`);
  }, [queryClient]);

  // Format elapsed time
  const formattedTime = useMemo(() => {
    const minutes = Math.floor(elapsedTime / 60);
    const seconds = elapsedTime % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }, [elapsedTime]);

  // Start test timer
  const startTimer = useCallback(() => {
    // We don't need to do anything here since we already have a timer effect
    console.log('Timer is already running');
  }, []);

  // Stop test timer
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
    }
  }, [test]);

  // Save answer locally
  const saveAnswer = useCallback((questionId: string, answer: any) => {
    // Update local state
    setAnswers(prev => {
      const updatedAnswers = {
        ...prev,
        [questionId]: answer
      };
      
      // Save to sessionStorage immediately
      if (testId) {
        const savedTest = sessionStorage.getItem(`test_${testId}`);
        if (savedTest) {
          try {
            const testData = JSON.parse(savedTest);
            testData.answers = updatedAnswers;
            testData.lastUpdated = new Date().toISOString();
            sessionStorage.setItem(`test_${testId}`, JSON.stringify(testData));
          } catch (e) {
            console.error('Error updating answers in sessionStorage:', e);
          }
        }
      }
      
      return updatedAnswers;
    });
    
    // Log the answer selection (for debugging)
    console.log(`Answer selected for question ${questionId}:`, answer);
  }, [testId]);

  // Helper function to handle the actual submission with a valid attempt ID
  const submitWithAttemptId = useCallback(async (attemptId: string) => {
    // Prevent multiple submissions
    if (isSubmitting) {
      console.log('Test submission already in progress');
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
            message: "Test was already completed",
            alreadyCompleted: true
          }
        };
      }
      
      // Check for unanswered questions
      const unansweredCount = test ? 
        test.questions.filter((q: TestQuestion) => !answers[q.id]).length : 0;
      
      if (unansweredCount > 0) {
        // Check if the test is completely empty (no answers at all)
        const isCompletelyEmpty = Object.keys(answers).length === 0;
        
        const message = isCompletelyEmpty
          ? `You haven't answered any questions. Are you sure you want to submit an empty test?`
          : `You have ${unansweredCount} unanswered question${unansweredCount > 1 ? 's' : ''}. Are you sure you want to submit?`;
        
        const confirmed = window.confirm(message);
        
        if (!confirmed) {
          setIsSubmitting(false);
          return { attemptId };
        }
      }
      
      // First, submit all answers that have been saved locally
      if (test && test.questions && token) {
        console.log(`Submitting all answers before completing test attempt ${attemptId}`);
        
        // Create an array of promises for all answer submissions
        const submissionPromises = Object.entries(answers).map(async ([questionId, answer]) => {
          // Find the question to determine its type
          const question = test.questions.find((q: TestQuestion) => q.id === questionId);
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
                console.warn(`Response submission endpoint returned 404 for question ${questionId}. Continuing with test completion.`);
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
                message: "Test was already completed",
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
      
      // Then complete the test attempt
      console.log('About to complete test attempt, attemptId:', attemptId);
      try {
        // Always update attemptId in state to ensure consistency
        setAttemptId(attemptId);
        
        const result = await completeAttemptMutation.mutateAsync();
        console.log('Test completion successful, result:', result);
        
        // Always return the attemptId at the root level
        return { 
          attemptId, 
          result 
        };
      } catch (error) {
        console.error("Error completing test attempt:", error);
        
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
          console.warn('Test completion endpoint returned error, using fallback.');
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
      console.error("Error submitting test:", error);
      setIsSubmitting(false);
      toast.error("Failed to submit test");
      // Still return the attemptId even in case of error
      return { 
        attemptId,
        error: error instanceof Error ? error.message : String(error),
        result: null 
      };
    }
  }, [isSubmitting, test, answers, token, api, setIsSubmitting, setAttemptId, completeAttemptMutation, attempt]);

  // Submit the entire test
  const submitTest = useCallback(async () => {
    console.log('submitTest called with:', { testId, token: !!token, answersCount: Object.keys(answers).length });
    
    if (!test || !token || !testId) {
      console.error('Missing required data for test submission:', { 
        test: !!test, 
        token: !!token, 
        testId: !!testId 
      });
      return { success: false, message: 'Missing required data' };
    }
    
    // Prevent multiple submissions
    if (isSubmitting) {
      console.log('Test submission already in progress');
      return { success: false, message: 'Submission in progress' };
    }
    
    setIsSubmitting(true);
    console.log('Set isSubmitting to true');
    
    try {
      // Check for unanswered questions
      const unansweredCount = test ? 
        test.questions.filter((q: TestQuestion) => !answers[q.id]).length : 0;
      
      if (unansweredCount > 0) {
        // Check if the test is completely empty (no answers at all)
        const isCompletelyEmpty = Object.keys(answers).length === 0;
        
        const message = isCompletelyEmpty
          ? `You haven't answered any questions. Are you sure you want to submit an empty test?`
          : `You have ${unansweredCount} unanswered question${unansweredCount > 1 ? 's' : ''}. Are you sure you want to submit?`;
        
        console.log('Showing confirmation for unanswered questions:', { 
          unansweredCount, 
          isCompletelyEmpty,
          message 
        });
        
        const confirmed = window.confirm(message);
        
        if (!confirmed) {
          console.log('User cancelled test submission');
          setIsSubmitting(false);
          return { success: false, message: 'Submission cancelled' };
        }
      }
      
      // Submit the entire test at once (create and complete attempt)
      console.log('Making API call to submit complete test:', { 
        testId, 
        startTime: startTime.toISOString(),
        answers: Object.keys(answers).length
      });
      
      // Use existing quiz API function
      const result = await api.submitCompleteQuiz(
        testId,
        startTime.toISOString(),
        answers,
        token
      );
      
      console.log('Test submission API result:', result);
      
      // Store the new attempt ID
      if (result && result.id) {
        console.log(`Setting attemptId to: ${result.id}`);
        setAttemptId(result.id);
      } else {
        console.warn('API response missing attempt ID:', result);
      }
      
      // Clear the saved test data from sessionStorage
      console.log('Cleaning up session storage');
      sessionStorage.removeItem(`test_${testId}`);
      sessionStorage.removeItem(`test_attempt_${testId}`);
      
      console.log('Returning success response with attemptId:', result?.id);
      return { 
        success: true,
        message: 'Test submitted successfully',
        attemptId: result?.id
      };
    } catch (error) {
      console.error('Error submitting test:', error);
      return { 
        success: false, 
        message: error instanceof Error ? error.message : 'Unknown error'
      };
    } finally {
      console.log('Setting isSubmitting back to false');
      setIsSubmitting(false);
    }
  }, [test, testId, token, answers, isSubmitting, startTime, api, setAttemptId]);

  return {
    test,
    attempt,
    currentQuestionIndex,
    currentQuestion: test?.questions?.[currentQuestionIndex],
    isLoading: isTestLoading || isAttemptLoading || startAttemptMutation.isPending,
    isSubmitting,
    error: testError,
    progress: test ? ((Object.keys(answers).length / test.questions.length) * 100) : 0,
    answers,
    elapsedTime,
    formattedTime,
    nextQuestion,
    previousQuestion,
    goToQuestion,
    saveAnswer,
    submitTest,
    startTestAttempt,
    // Helper to clear saved test data if needed
    clearSavedTest: useCallback(() => {
      if (testId) {
        console.log(`Thoroughly clearing all test data for: ${testId}`);
        // Clear direct test data
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
      }
    }, [testId]),
    // Force a complete reset to start fresh
    forceReset: useCallback(() => {
      if (testId) {
        console.log(`Forcing complete reset of test ${testId}`);
        
        // Clear all session storage
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
        
        sessionStorage.setItem(`test_${testId}`, JSON.stringify(newState));
        
        // Invalidate queries to force re-fetch
        queryClient.invalidateQueries({ queryKey: ['test', testId] });
        if (attemptId) {
          queryClient.invalidateQueries({ queryKey: ['testAttempt', attemptId] });
        }
        
        console.log('Test state has been completely reset');
      }
    }, [testId, attemptId, queryClient])
  };
}
