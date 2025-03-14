import React, { useEffect, useState } from 'react';
import { ContainerScroll } from "@/components/ui/container-scroll-animation";
import { Card } from "@/components/ui/card";
import { motion } from "motion/react";

// Import the images directly
import dashboardDayImg from '../images/dashboard-day.png';
import dashboardNightImg from '../images/dashboard-night.png';

/**
 * DashboardShowcase component
 * 
 * Uses the ContainerScroll animation to showcase the CodeLadder dashboard.
 * This component creates an engaging, interactive section on the landing page.
 * Displays different dashboard images based on the current theme (light/dark mode).
 * Shows day version in light mode and night version in dark mode.
 */
export function DashboardShowcase() {
  const [isDarkMode, setIsDarkMode] = useState(false);
  
  // Check for dark mode on component mount and when theme changes
  useEffect(() => {
    // Initial check
    const checkDarkMode = () => {
      const isDark = document.documentElement.classList.contains('dark');
      console.log('Dark mode detected:', isDark);
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
    
    // Also listen for system preference changes
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => {
      checkDarkMode();
    };
    
    mediaQuery.addEventListener('change', handleChange);
    
    return () => {
      observer.disconnect();
      mediaQuery.removeEventListener('change', handleChange);
    };
  }, []);
  
  console.log('Current theme:', isDarkMode ? 'dark' : 'light');
  
  return (
    <div className="flex flex-col overflow-hidden mt-0 pt-0 pb-0">
      <ContainerScroll
        titleComponent={
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="mb-8 px-4"
          >
            <p className="text-muted-foreground text-sm max-w-md mx-auto">
              Scroll down to explore the dashboard and see how it helps you track your progress
            </p>
          </motion.div>
        }
      >
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 px-4 mb-0">
          {/* Main Dashboard Card */}
          <div className="col-span-1 md:col-span-2 lg:col-span-3">
            <div className="bg-white dark:bg-black overflow-visible border border-neutral-200 dark:border-white/[0.1] rounded-xl p-4 pb-6 relative">
              <div className="relative">
                {/* Light mode image - show dashboard-day.png */}
                <img 
                  src={dashboardDayImg} 
                  alt="CodeLadder Dashboard - Light Mode" 
                  className={`w-full h-auto rounded-lg ${isDarkMode ? 'hidden' : 'block'}`}
                  style={{ marginBottom: '4px' }}
                />
                
                {/* Dark mode image - show dashboard-night.png */}
                <img 
                  src={dashboardNightImg} 
                  alt="CodeLadder Dashboard - Dark Mode" 
                  className={`w-full h-auto rounded-lg ${isDarkMode ? 'block' : 'hidden'}`}
                  style={{ marginBottom: '4px' }}
                />
              </div>
            </div>
          </div>
          
          {/* Feature Cards */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <Card className="bg-white dark:bg-black overflow-hidden border border-neutral-200 dark:border-white/[0.1] shadow-md rounded-xl p-6 h-full">
              <h3 className="text-xl font-semibold mb-2">Learn with Custom Coding Problems</h3>
              <p className="text-neutral-600 dark:text-neutral-300">
                Practice with tailored coding challenges designed to build your skills progressively.
              </p>
            </Card>
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
          >
            <Card className="bg-white dark:bg-black overflow-hidden border border-neutral-200 dark:border-white/[0.1] shadow-md rounded-xl p-6 h-full">
              <h3 className="text-xl font-semibold mb-2">Complete Leveling Assessments to Unlock</h3>
              <p className="text-neutral-600 dark:text-neutral-300">
                Test your knowledge with comprehensive assessments that unlock new content as you advance.
              </p>
            </Card>
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.5 }}
          >
            <Card className="bg-white dark:bg-black overflow-hidden border border-neutral-200 dark:border-white/[0.1] shadow-md rounded-xl p-6 h-full">
              <h3 className="text-xl font-semibold mb-2">Spaced Repetition Practice Problems</h3>
              <p className="text-neutral-600 dark:text-neutral-300">
                Reinforce your learning with scientifically-proven spaced repetition techniques for long-term retention.
              </p>
            </Card>
          </motion.div>
        </div>
      </ContainerScroll>
    </div>
  );
} 