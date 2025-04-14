import { useState, useEffect, useRef } from 'react';

interface AssessmentData {
  tasks: any[];
  submittedCount: number;
  remainingTime?: number;
  lastUpdated: string;
}

/**
 * Hook for managing assessment timer with persistent state across components.
 * 
 * This hook maintains a countdown timer for quizzes and tests that persists
 * between navigation to different components within the same assessment.
 * Timer state is stored in sessionStorage to prevent resets when navigating.
 * 
 * @param assessmentId - Unique ID of the assessment (quiz or test)
 * @param initialDuration - Duration in minutes (only used for initial setup if no timer exists)
 * @param pauseTimer - Whether to pause the timer (e.g., when showing a dialog)
 * @returns The remaining time in seconds
 */
export function useAssessmentTimer(
  assessmentId: string | undefined, 
  initialDuration?: number,
  pauseTimer: boolean = false
) {
  const [remainingTime, setRemainingTime] = useState<number | undefined>(undefined);
  const initialDurationRef = useRef<number | undefined>(initialDuration);

  // Effect to track changes in initialDuration and log them
  useEffect(() => {
    if (initialDuration !== initialDurationRef.current) {
      console.log(`Assessment timer: initialDuration changed from ${initialDurationRef.current} to ${initialDuration} minutes`);
      initialDurationRef.current = initialDuration;
    }
  }, [initialDuration]);

  useEffect(() => {
    if (!assessmentId) return;

    // Function to load time from session storage
    const loadTimeFromStorage = (): number | undefined => {
      try {
        const assessmentData = sessionStorage.getItem(`assessment_${assessmentId}`);
        if (assessmentData) {
          const data = JSON.parse(assessmentData) as AssessmentData;
          if (typeof data.remainingTime === 'number') {
            console.log(`Loaded timer from storage: ${data.remainingTime} seconds`);
            return data.remainingTime;
          }
        }
      } catch (e) {
        console.error('Error loading time from storage:', e);
      }
      return undefined;
    };

    // Function to save time to session storage
    const saveTimeToStorage = (time: number) => {
      try {
        const assessmentData = sessionStorage.getItem(`assessment_${assessmentId}`);
        if (assessmentData) {
          const data = JSON.parse(assessmentData) as AssessmentData;
          data.remainingTime = time;
          data.lastUpdated = new Date().toISOString();
          sessionStorage.setItem(`assessment_${assessmentId}`, JSON.stringify(data));
        }
      } catch (e) {
        console.error('Error saving time to storage:', e);
      }
    };

    // Initialize timer from storage or props
    const storedTime = loadTimeFromStorage();
    
    // Prioritize stored time. If found, set it and we're done initializing for this run.
    if (storedTime !== undefined) {
      if (remainingTime === undefined || remainingTime !== storedTime) {
        console.log(`Setting timer from stored value: ${storedTime} seconds`);
        setRemainingTime(storedTime);
        // *** Stop further initialization logic for this effect run ***
        // The interval setup will happen below based on the now-set remainingTime
      }
    } 
    // --- Only proceed below if storedTime was undefined --- 
    
    // Use initialDuration ONLY if no stored time exists AND initialDuration is valid
    else if (initialDuration !== undefined && initialDuration > 0 && remainingTime === undefined) {
      const newTime = initialDuration * 60;
      console.log(`Initializing timer with ${initialDuration} minutes (${newTime} seconds)`);
      setRemainingTime(newTime);
      // Save this initial time immediately if it wasn't loaded from storage
      saveTimeToStorage(newTime);
    } 
    // Do NOT set a default 60 mins here if initialDuration is not ready yet.
    // The component using the hook should show a loading state.
    else if (remainingTime === undefined && initialDuration === undefined) {
      // Only log if we are truly stuck without a duration
      console.log('Waiting for initial duration or stored time...');
    }

    // Set up interval to decrement time - only if not paused AND remainingTime is set
    let timer: NodeJS.Timeout | null = null;
    
    if (!pauseTimer && remainingTime !== undefined && remainingTime > 0) {
      timer = setInterval(() => {
        setRemainingTime(prevTime => {
          if (!prevTime || prevTime <= 0) return 0;
          const newTime = prevTime - 1;
          saveTimeToStorage(newTime);
          return newTime;
        });
      }, 1000);
    } else if (pauseTimer) {
      console.log('Timer paused');
    }

    return () => {
      if (timer) clearInterval(timer);
    };
  }, [assessmentId, initialDuration, pauseTimer, remainingTime]);

  return remainingTime || 0; // Return 0 instead of undefined if timer isn't initialized yet
} 