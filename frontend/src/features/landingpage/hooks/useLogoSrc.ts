import { useEffect, useState } from 'react';

// Import all logo variants
import bannerLogoDark from '../images/codeladder banner logo.svg';
import bannerLogoLight from '../images/codeladder banner logo (light mode).svg';
import singleLogoDark from '../images/codeladder single logo.svg';
import singleLogoLight from '../images/codeladder single logo (light mode).svg';

type LogoType = 'banner' | 'single';

/**
 * Custom hook to get the appropriate logo source based on current theme and scroll state
 */
export function useLogoSrc(type: LogoType = 'single', isScrolled?: boolean) {
  const [isDarkMode, setIsDarkMode] = useState(false);
  
  // Check for dark mode on component mount and when theme changes
  useEffect(() => {
    // Initial check
    const checkDarkMode = () => {
      const isDark = document.documentElement.classList.contains('dark');
      setIsDarkMode(isDark);
    };
    
    // Check immediately on mount
    checkDarkMode();
    
    // Set up a mutation observer to detect theme changes
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.attributeName === 'class') {
          checkDarkMode();
        }
      });
    });
    
    observer.observe(document.documentElement, { attributes: true });
    
    return () => {
      observer.disconnect();
    };
  }, []);
  
  // Determine logo source based on scroll state, type, and theme
  if (isScrolled) {
    return isDarkMode ? singleLogoDark : singleLogoLight;
  }

  return type === 'banner'
    ? (isDarkMode ? bannerLogoDark : bannerLogoLight)
    : (isDarkMode ? singleLogoDark : singleLogoLight);
} 