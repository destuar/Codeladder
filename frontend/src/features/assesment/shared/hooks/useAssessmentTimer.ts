import { useState, useEffect } from 'react';

interface AssessmentData {
  tasks: any[];
  submittedCount: number;
  remainingTime?: number;
  lastUpdated: string;
}

export function useAssessmentTimer(assessmentId: string | undefined, initialDuration?: number) {
  const [remainingTime, setRemainingTime] = useState<number | undefined>(undefined);

  useEffect(() => {
    if (!assessmentId) return;

    // Function to load time from session storage
    const loadTimeFromStorage = (): number | undefined => {
      try {
        const assessmentData = sessionStorage.getItem(`assessment_${assessmentId}`);
        if (assessmentData) {
          const data = JSON.parse(assessmentData) as AssessmentData;
          return data.remainingTime;
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
    const initialTime = storedTime ?? (initialDuration ? initialDuration * 60 : 3600);
    setRemainingTime(initialTime);

    // Set up interval to decrement time
    const timer = setInterval(() => {
      setRemainingTime(prevTime => {
        if (!prevTime || prevTime <= 0) return 0;
        const newTime = prevTime - 1;
        saveTimeToStorage(newTime);
        return newTime;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [assessmentId, initialDuration]);

  return remainingTime;
} 