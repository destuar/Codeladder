import { useState, useRef, useEffect } from 'react';

interface UseTimerResult {
  time: number;
  isRunning: boolean;
  isExpanded: boolean;
  formattedTime: string;
  start: () => void;
  pause: () => void;
  reset: () => void;
  toggle: () => void;
  toggleExpanded: () => void;
}

/**
 * Custom hook for managing a problem timer with start, pause, reset functionality
 */
export function useTimer(): UseTimerResult {
  const [time, setTime] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const timerRef = useRef<NodeJS.Timeout>();

  const start = () => {
    setIsRunning(true);
    timerRef.current = setInterval(() => {
      setTime(prev => prev + 1);
    }, 1000);
  };

  const pause = () => {
    setIsRunning(false);
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
  };

  const reset = () => {
    pause();
    setTime(0);
  };

  const toggle = () => {
    if (!isExpanded) {
      setIsExpanded(true);
      if (!isRunning) {
        start();
      }
    } else {
      if (isRunning) {
        pause();
      } else {
        start();
      }
    }
  };

  const toggleExpanded = () => {
    setIsExpanded(!isExpanded);
  };

  // Format time as HH:MM:SS
  const formattedTime = (() => {
    const hours = Math.floor(time / 3600);
    const minutes = Math.floor((time % 3600) / 60);
    const seconds = time % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  })();

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  return {
    time,
    isRunning,
    isExpanded,
    formattedTime,
    start,
    pause,
    reset,
    toggle,
    toggleExpanded,
  };
} 