import React, { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/features/auth/AuthContext';
import { ArrowRight, Code, Dumbbell, Layers, Trophy, CheckCircle } from 'lucide-react';
import { GlowingEffect } from '@/components/ui/glowing-effect';
import { cn } from '@/lib/utils';
import { CompanyLogos } from './components/CompanyLogos';
import { TypeAnimation } from 'react-type-animation';
import { Pricing } from './components/Pricing';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { LandingPageFooter } from './components/LandingPageFooter';
import { Spotlight } from '@/components/ui/spotlight-new';
import { useLogoSrc } from '@/features/landingpage/hooks/useLogoSrc';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";

/**
 * LandingPage component
 * 
 * Serves as the main landing page for CodeLadder, accessible to all users.
 * Provides an introduction to the platform, key features, and calls-to-action.
 * 
 * Available Components:
 * - LinkPreview from Aceternity UI (installed via shadcn) can be used for rich content previews
 *   Usage: import { LinkPreview } from "@/components/ui/link-preview";
 */

export default function LandingPage() {
  const { user } = useAuth();
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [showSecondLine, setShowSecondLine] = useState(false);
  const secondLineRef = useRef(null);
  const [typingSecondLine, setTypingSecondLine] = useState(false);
  const [secondLineText, setSecondLineText] = useState('');
  const fullSecondLineText = 'your preparation should too.';
  const standaloneLogoSrc = useLogoSrc('single');
  
  // Re-add useEffect for dark mode detection
  useEffect(() => {
    const checkDarkMode = () => {
      const isDark = document.documentElement.classList.contains('dark') || 
                    window.matchMedia('(prefers-color-scheme: dark)').matches;
      setIsDarkMode(isDark);
    };
    checkDarkMode();
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.attributeName === 'class') {
          checkDarkMode();
        }
      });
    });
    observer.observe(document.documentElement, { attributes: true });
    return () => observer.disconnect();
  }, []);

  // Handle typing animation for second line
  useEffect(() => {
    let timer;
    
    // First wait some time, then start typing the second line
    timer = setTimeout(() => {
      setTypingSecondLine(true);
      
      let currentIndex = 0;
      const typingInterval = setInterval(() => {
        if (currentIndex <= fullSecondLineText.length) {
          setSecondLineText(fullSecondLineText.substring(0, currentIndex));
          currentIndex++;
        } else {
          clearInterval(typingInterval);
        }
      }, 60); // Typing speed

      return () => {
        clearInterval(typingInterval);
      };
    }, 4000); // Increased time to start typing the second line (was 2500)
    
    return () => {
      clearTimeout(timer);
    };
  }, []);

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-transparent relative overflow-hidden font-mono flex flex-col">
      {/* Background pattern: Positioned to cover navbar area, z-0 */}
      <div className="absolute top-[-4rem] left-0 right-0 bottom-0 z-0 bg-dot-[#5271FF]/[0.2] [mask-image:radial-gradient(ellipse_at_center,transparent_20%,black)]" />
      
      {/* Spotlight Wrapper: Positioned behind pattern/content */}
      <div className="absolute inset-0 -z-10 overflow-hidden">
        {isDarkMode ? (
          <Spotlight
            // ... props ...
          />
        ) : (
          <Spotlight
            // ... props ...
          />
        )}
      </div>
      
      {/* Content Wrapper: Added relative z-10 */}
      <div className="flex-grow relative z-10">
        {/* Large transparent logo backdrop - top-rightish */}
        <img
          src={standaloneLogoSrc}
          alt="" // Decorative image
          className="absolute top-[21%] md:top-[22%] left-[200px] sm:left-[400px] md:left-[600px] lg:left-[900px] -translate-y-1/2 w-[1000px] h-[1000px] opacity-[0.03] pointer-events-none -z-1 select-none"
        />
        {/* Second large transparent logo backdrop - lower left */}
        <img
          src={standaloneLogoSrc}
          alt="" // Decorative image
          className="absolute top-[65%] md:top-[77%] left-[-700px] sm:left-[-600px] md:left-[-450px] -translate-y-1/2 w-[1000px] h-[1000px] opacity-[0.03] pointer-events-none -z-10 select-none"
        />

        {/* 1. Hero Section */}
        <section className="flex items-center justify-center min-h-[calc(100vh-4rem)] px-4 md:px-6 lg:px-8 max-w-7xl mx-auto relative pt-8">
          <div className="flex flex-col items-center text-center py-16">
            <div className="relative">
              <div className="absolute -top-16 -left-16 w-64 h-64 bg-[#5271FF]/10 rounded-full filter blur-3xl opacity-70"></div>
              <div className="absolute -bottom-16 -right-16 w-64 h-64 bg-[#5271FF]/10 rounded-full filter blur-3xl opacity-70"></div>
              
              {/* Updated Hero Text and Scrolling Code Ladder */}
              <div className="flex items-center justify-center text-center relative z-10 mb-12">
                {/* Main Text - Stacked */}
                <div className="flex flex-col items-center">
                  <span className="text-6xl lg:text-7xl font-bold font-mono tracking-tight">Practice</span>
                  <span className="text-6xl lg:text-7xl font-bold font-mono tracking-tight my-1 md:my-2">Interview</span>
                  <span className="text-6xl lg:text-7xl font-bold font-mono tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-[#5271FF] to-[#6B8EFF]">Offered</span>
                </div>

                {/* Right Scrolling Code Ladder - hidden on xs & sm, flex on md+ */}
                <div className="hidden md:flex flex-col h-60 w-72 overflow-hidden relative font-mono text-xs text-muted-foreground/50 ml-16">
                  {/*
                    Container for the scrolling content.
                    To enable continuous upward scrolling, you would typically:
                    1. Define CSS @keyframes (e.g., 'scrollUp').
                    2. Add this animation to your tailwind.config.js.
                    3. Apply the animation class to the div below.
                    The content is duplicated for a seamless loop.
                  */}
                  <div className="flex flex-col items-start space-y-1 animate-vertical-scroll"> {/* This div would get the animation class */}
                    {/* CODE BLOCK 1 (Original Content) */}
                    <span>{'# Binary Tree Max Depth'}</span>
                    <span>{'class TreeNode:'}</span>
                    <span>{'    def __init__(self, val=0, left=None, right=None):'}</span>
                    <span>{'        self.val = val'}</span>
                    <span>{'        self.left = left'}</span>
                    <span>{'        self.right = right'}</span>
                    <span className="py-1 block"> </span> {/* Spacer */}
                    <span>{'def maxDepth(root: TreeNode) -> int:'}</span>
                    <span>{'    if not root:'}</span>
                    <span>{'        return 0'}</span>
                    <span>{'    left_depth = maxDepth(root.left)'}</span>
                    <span>{'    right_depth = maxDepth(root.right)'}</span>
                    <span>{'    return max(left_depth, right_depth) + 1'}</span>
                    <span className="py-1 block"> </span> {/* Spacer */}
                    <span>{'# Two Sum Problem'}</span>
                    <span>{'def twoSum(nums: list[int], target: int) -> list[int]:'}</span>
                    <span>{'    num_map = {}'}</span>
                    <span>{'    for i, num in enumerate(nums):'}</span>
                    <span>{'        complement = target - num'}</span>
                    <span>{'        if complement in num_map:'}</span>
                    <span>{'            return [num_map[complement], i]'}</span>
                    <span>{'        num_map[num] = i'}</span>
                    <span>{'    return []'}</span>
                    <span className="py-1 block"> </span> {/* Spacer */}
                    <span>{'# Quick Sort Partition'}</span>
                    <span>{'def partition(arr: list[int], low: int, high: int) -> int:'}</span>
                    <span>{'    pivot = arr[high]'}</span>
                    <span>{'    i = low - 1'}</span>
                    <span>{'    for j in range(low, high):'}</span>
                    <span>{'        if arr[j] < pivot:'}</span>
                    <span>{'            i += 1'}</span>
                    <span>{'            arr[i], arr[j] = arr[j], arr[i] # Swap'}</span>
                    <span>{'    arr[i + 1], arr[high] = arr[high], arr[i + 1] # Swap pivot'}</span>
                    <span>{'    return i + 1'}</span>
                    
                    {/* Spacer before duplication for smooth transition */}
                    <span className="py-2 block"> </span>

                    {/* CODE BLOCK 2 (Duplicated Content for seamless scroll) */}
                    <span>{'# Binary Tree Max Depth'}</span>
                    <span>{'class TreeNode:'}</span>
                    <span>{'    def __init__(self, val=0, left=None, right=None):'}</span>
                    <span>{'        self.val = val'}</span>
                    <span>{'        self.left = left'}</span>
                    <span>{'        self.right = right'}</span>
                    <span className="py-1 block"> </span> {/* Spacer */}
                    <span>{'def maxDepth(root: TreeNode) -> int:'}</span>
                    <span>{'    if not root:'}</span>
                    <span>{'        return 0'}</span>
                    <span>{'    left_depth = maxDepth(root.left)'}</span>
                    <span>{'    right_depth = maxDepth(root.right)'}</span>
                    <span>{'    return max(left_depth, right_depth) + 1'}</span>
                    <span className="py-1 block"> </span> {/* Spacer */}
                    <span>{'# Two Sum Problem'}</span>
                    <span>{'def twoSum(nums: list[int], target: int) -> list[int]:'}</span>
                    <span>{'    num_map = {}'}</span>
                    <span>{'    for i, num in enumerate(nums):'}</span>
                    <span>{'        complement = target - num'}</span>
                    <span>{'        if complement in num_map:'}</span>
                    <span>{'            return [num_map[complement], i]'}</span>
                    <span>{'        num_map[num] = i'}</span>
                    <span>{'    return []'}</span>
                    <span className="py-1 block"> </span> {/* Spacer */}
                    <span>{'# Quick Sort Partition'}</span>
                    <span>{'def partition(arr: list[int], low: int, high: int) -> int:'}</span>
                    <span>{'    pivot = arr[high]'}</span>
                    <span>{'    i = low - 1'}</span>
                    <span>{'    for j in range(low, high):'}</span>
                    <span>{'        if arr[j] < pivot:'}</span>
                    <span>{'            i += 1'}</span>
                    <span>{'            arr[i], arr[j] = arr[j], arr[i] # Swap'}</span>
                    <span>{'    arr[i + 1], arr[high] = arr[high], arr[i + 1] # Swap pivot'}</span>
                    <span>{'    return i + 1'}</span>
                  </div>
                </div>
              </div>

              <p className="text-lg lg:text-xl text-muted-foreground max-w-3xl mx-auto mb-12 relative z-10">
                Yes, it should be that simple.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-4 mb-12 relative z-10">
              {user ? (
                <Link to={user.role === 'ADMIN' ? "/dashboard" : "/collections"}>
                  <Button
                    size="lg"
                    className="gap-2 bg-[#5271FF] hover:bg-[#415ACC] text-white relative overflow-hidden group shadow-md shadow-[#5271FF]/5 w-full sm:w-auto py-6 px-8 text-lg font-medium hover:scale-105"
                  >
                    <span className="relative z-10 flex items-center">
                      Start Climbing <ArrowRight className="h-5 w-5 ml-2" />
                    </span>
                    <div className="absolute inset-0 opacity-0 group-hover:opacity-100">
                      <div className="absolute inset-0 bg-[#415ACC]"></div>
                      <div className="absolute -inset-[1px] bg-gradient-to-r from-[#5271FF] via-[#6B8EFF] to-[#5271FF] opacity-50 group-hover:opacity-100 transition-opacity duration-500 blur-[2px]"></div>
                    </div>
                  </Button>
                </Link>
              ) : (
                <div className="flex flex-col sm:flex-row gap-4 items-center relative">
                  {/* No glow effect */}

                  <div className="flex flex-col sm:flex-row gap-4 items-center relative z-10">
                    <Link to="/register" className="w-full sm:w-auto">
                      <Button
                        size="lg"
                        className="gap-2 bg-[#5271FF] hover:bg-[#415ACC] text-white relative overflow-hidden group shadow-md shadow-[#5271FF]/5 w-full sm:w-auto py-6 px-8 text-lg font-medium hover:scale-105"
                      >
                        <span className="relative z-10 flex items-center">
                          Get Started Free <ArrowRight className="h-5 w-5 ml-2" />
                        </span>
                        <div className="absolute inset-0 opacity-0 group-hover:opacity-100">
                          <div className="absolute inset-0 bg-[#415ACC]"></div>
                          <div className="absolute -inset-[1px] bg-gradient-to-r from-[#5271FF] via-[#6B8EFF] to-[#5271FF] opacity-50 group-hover:opacity-100 transition-opacity duration-500 blur-[2px]"></div>
                        </div>
                      </Button>
                    </Link>
                    <Link to="/login" className="w-full sm:w-auto">
                      <Button
                        size="lg"
                        variant="outline"
                        className="border-[#5271FF]/50 border-2 text-[#5271FF] hover:text-[#5271FF] hover:bg-white dark:hover:bg-[#5271FF]/10 w-full sm:w-auto py-6 px-8 text-lg font-medium hover:scale-105 shadow-none"
                      >
                        Log In
                      </Button>
                    </Link>
                  </div>
                </div>
              )}
            </div>
            
            {/* 2. Stats Section */}
            {/* <div className="mt-4">
              <StatsSection />
            </div> */}
          </div>
        </section>

        {/* 6. Company Logos Section: Ensure bg-transparent if needed */}
        <div className="py-16">
          <CompanyLogos />
        </div>

        {/* Pricing Section: Ensure bg-transparent if needed */}
        <div className="py-16">
          <Pricing />
        </div>

        {/* FAQ Section: Ensure bg-transparent */}
        <section id="faq" className="pb-16 pt-24 bg-transparent text-foreground">
          <div className="container mx-auto px-4 md:px-6 lg:px-8 max-w-7xl">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Frequently Asked Questions</h2>
            </div>
            <Accordion type="single" collapsible className="w-full max-w-md sm:max-w-3xl mx-auto">
              {
                [
                  {
                    question: "What is CodeLadder?",
                    answer: "CodeLadder is a learning platform designed to help users master Data Structures & Algorithms (DSA) through a structured, mastery-based approach. We focus on preparing you effectively for technical interviews."
                  },
                  {
                    question: "Who is CodeLadder for?",
                    answer: "CodeLadder is ideal for students, recent graduates, and software engineers preparing for technical interviews at tech companies. Whether you're learning DSA for the first time or need a refresher, our platform can help."
                  },
                  {
                    question: "How does the Pro plan differ from the Free plan?",
                    answer: "The Free plan offers access to introductory content and basic features. The Pro plan unlocks all learning levels, the complete problem library, advanced AI assistance features, personalized spaced repetition schedules, and priority support."
                  },
                  {
                    question: "What kind of problems are included?",
                    answer: "We offer a wide range of DSA problems, categorized by topic and difficulty, similar to those found in real technical interviews at major tech companies. This includes coding challenges, multiple-choice questions, and conceptual explanations."
                  },
                  {
                    question: "Is there a free trial for the Pro plan?",
                    answer: "Currently, we offer a comprehensive Free plan that allows you to experience the core platform. The Pro plan requires a subscription, but provides full access to all premium features."
                  }
                ].map((faq, index) => (
                  <AccordionItem value={`item-${index + 1}`} key={index}>
                    <AccordionTrigger className="text-lg text-left font-medium">{faq.question}</AccordionTrigger>
                    <AccordionContent className="text-muted-foreground text-left">
                      {faq.answer}
                    </AccordionContent>
                  </AccordionItem>
                ))
              }
            </Accordion>
          </div>
        </section>
      </div> {/* End flex-grow wrapper */}

      {/* Footer: Keep relative z-10 */} 
      <LandingPageFooter />

    </div>
  );
} 