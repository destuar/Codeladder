import { useState, useEffect } from 'react';

/**
 * Custom hook to track whether a CSS media query matches.
 * @param query The media query string (e.g., '(min-width: 1024px)').
 * @returns `true` if the query matches, `false` otherwise.
 */
export function useMediaQuery(query: string): boolean {
  // Initialize state based on the current match status
  const [matches, setMatches] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.matchMedia(query).matches;
    }
    return false; // Default for SSR or environments without window
  });

  useEffect(() => {
    // Ensure window is defined (for environments like SSR)
    if (typeof window === 'undefined') {
      return;
    }

    const media = window.matchMedia(query);

    // Update state if the initial state was incorrect (e.g., during hydration)
    if (media.matches !== matches) {
      setMatches(media.matches);
    }

    // Listener to update state on resize
    const listener = () => setMatches(media.matches);

    // Use addEventListener for modern browsers
    media.addEventListener('change', listener);

    // Cleanup function to remove the listener
    return () => media.removeEventListener('change', listener);

  }, [matches, query]); // Re-run effect if query changes

  return matches;
} 