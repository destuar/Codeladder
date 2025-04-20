import { useState, useEffect, useRef, useCallback } from 'react';

// Combined storage key for timer state
const getStorageKey = (assessmentId: string) => `timer_state_${assessmentId}`;

interface TimerState {
  remainingTime: number | null;
  isRunning: boolean;
}

/**
 * Hook for managing assessment timer with persistent state across components.
 * 
 * This hook maintains a countdown timer for quizzes and tests that persists
 * between navigation to different components within the same assessment.
 * Timer state (remaining time and running status) is stored in sessionStorage.
 * 
 * @param assessmentId - Unique ID of the assessment (quiz or test)
 * @param durationMinutes - Duration in minutes (only used for initial setup if no timer exists)
 * @param pause - Whether to pause the timer (e.g., when showing a dialog)
 * @returns The remaining time in seconds
 */
export function useAssessmentTimer(assessmentId?: string, durationMinutes?: number, pause = false) {
  const [remainingTime, setRemainingTime] = useState<number | null>(null);
  const [isRunning, setIsRunning] = useState<boolean>(false); // Local running state
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const initialDurationRef = useRef<number | null>(null);

  // Helper function to save state to sessionStorage
  const saveStateToStorage = useCallback((state: Partial<TimerState>) => {
    if (!assessmentId) return;
    const storageKey = getStorageKey(assessmentId);
    try {
      const currentState = JSON.parse(sessionStorage.getItem(storageKey) || '{}');
      const newState = { ...currentState, ...state };
      sessionStorage.setItem(storageKey, JSON.stringify(newState));
    } catch (e) {
      console.error('Error saving timer state:', e);
    }
  }, [assessmentId]);

  // Function to start the timer
  const startTimer = useCallback(() => {
    if (remainingTime !== null && remainingTime > 0) {
      console.log('Starting timer...');
      setIsRunning(true);
      saveStateToStorage({ isRunning: true });
    }
  }, [remainingTime, saveStateToStorage]);

  // Function to pause the timer
  const pauseTimer = useCallback(() => {
    console.log('Pausing timer...');
    setIsRunning(false);
    saveStateToStorage({ isRunning: false });
  }, [saveStateToStorage]);

  // Function to reset the timer
  const resetTimer = useCallback(() => {
    console.log('Resetting timer...');
    setIsRunning(false);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (assessmentId && initialDurationRef.current !== null) {
      const initialSeconds = initialDurationRef.current * 60;
      setRemainingTime(initialSeconds);
      saveStateToStorage({ remainingTime: initialSeconds, isRunning: false });
    } else {
      setRemainingTime(null);
      if (assessmentId) {
         sessionStorage.removeItem(getStorageKey(assessmentId));
      }
    }
  }, [assessmentId, saveStateToStorage]);

  // Load initial time and running state from storage or props
  useEffect(() => {
    if (!assessmentId) return;

    const storageKey = getStorageKey(assessmentId);
    const storedStateJSON = sessionStorage.getItem(storageKey);
    let loadedTime: number | null = null;
    let loadedIsRunning: boolean = false;

    if (storedStateJSON) {
      try {
        const storedState: TimerState = JSON.parse(storedStateJSON);
        // Load time
        if (typeof storedState.remainingTime === 'number' && storedState.remainingTime >= 0) {
          loadedTime = storedState.remainingTime;
          console.log(`Loaded timer from storage: ${loadedTime} seconds`);
        } else {
           console.log('Invalid stored time found, will re-initialize if possible.');
        }
        // Load running state
        if (typeof storedState.isRunning === 'boolean') {
          loadedIsRunning = storedState.isRunning;
          console.log(`Loaded timer running state from storage: ${loadedIsRunning}`);
        }
      } catch (e) {
         console.error('Error parsing stored timer state, removing invalid data:', e);
         sessionStorage.removeItem(storageKey);
      }
    }

    // Store initial duration if provided
    if (durationMinutes !== undefined && durationMinutes > 0) {
       initialDurationRef.current = durationMinutes; 
    }

    // Initialize time if not loaded from storage
    if (loadedTime === null && initialDurationRef.current !== null) {
      loadedTime = initialDurationRef.current * 60;
      console.log(`Initializing timer with ${initialDurationRef.current} minutes (${loadedTime} seconds)`);
      // Store the initial state (time and running=false) immediately
      saveStateToStorage({ remainingTime: loadedTime, isRunning: false });
    } 

    // Set the initial local state based on loaded values
    setRemainingTime(loadedTime);
    setIsRunning(loadedIsRunning); // Set local running state based on storage
    console.log(`Setting initial timer state: Time=${loadedTime}, IsRunning=${loadedIsRunning}`);

    // Cleanup function
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  // Only depend on assessmentId and durationMinutes for initialization
  }, [assessmentId, durationMinutes, saveStateToStorage]); 

  // Countdown interval effect
  useEffect(() => {
    // Clear existing interval if state changes
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    // Start new interval only if isRunning is true, not paused, and time > 0
    if (isRunning && !pause && remainingTime !== null && remainingTime > 0) {
      console.log('Starting timer interval...');
      intervalRef.current = setInterval(() => {
        setRemainingTime(prev => {
          const newTime = Math.max(0, (prev ?? 0) - 1); // Ensure time doesn't go below 0
          let shouldStop = newTime <= 0;
          
          // Save updated time to storage
          saveStateToStorage({ remainingTime: newTime });
          
          if (shouldStop) {
            clearInterval(intervalRef.current!); 
            intervalRef.current = null;
            setIsRunning(false); // Stop running
            saveStateToStorage({ isRunning: false }); // Update stored running state
            console.log('Timer finished.');
            return 0;
          }
          return newTime;
        });
      }, 1000);
    } else {
        // Log reason for not starting/clearing interval
        if (!isRunning) console.log('Timer interval not started: isRunning is false.');
        if (pause) console.log('Timer interval not started/cleared: Timer is paused.');
        if (remainingTime !== null && remainingTime <= 0) console.log('Timer interval not started: Time is up.');
    }

    // Cleanup interval on unmount or when dependencies change
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
    // Depend on isRunning, pause, remainingTime, and assessmentId (for saveStateToStorage)
  }, [isRunning, pause, remainingTime, assessmentId, saveStateToStorage]); 

  // Format time for display
  const formatTime = (seconds: number | null): string => {
    if (seconds === null || isNaN(seconds) || seconds < 0) return '--:--'; // Added isNaN check
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`; // Use padStart for consistent formatting
  };

  return {
    remainingTime,
    formattedTime: formatTime(remainingTime),
    startTimer, 
    pauseTimer, 
    resetTimer, 
    isRunning 
  };
} 