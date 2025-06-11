import React, { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/features/auth/AuthContext';
import { ArrowRight, Code, Dumbbell, Layers, Trophy, CheckCircle, Star } from 'lucide-react';
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
import { FeatureShowcase } from './components';
import axios from 'axios';
import DottedBackground from '@/components/DottedBackground';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';

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

// Interface for the API response
interface UserCountResponse {
  count: number;
}

export default function LandingPage() {
  const { user } = useAuth();
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [showSecondLine, setShowSecondLine] = useState(false);
  const secondLineRef = useRef(null);
  const [typingSecondLine, setTypingSecondLine] = useState(false);
  const [secondLineText, setSecondLineText] = useState('');
  const fullSecondLineText = 'your preparation should too.';
  const standaloneLogoSrc = useLogoSrc('single');
  const [userCount, setUserCount] = useState<number | null>(null);
  const [isLoadingUserCount, setIsLoadingUserCount] = useState(true);
  
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

  // Fetch user count
  useEffect(() => {
    const fetchUserCount = async () => {
      setIsLoadingUserCount(true);
      try {
        const response = await axios.get<UserCountResponse>('/api/stats/user-count');
        setUserCount(response.data.count);
      } catch (error) {
        console.error('Failed to fetch user count:', error);
        setUserCount(7000); // Fallback to a static number on error, or handle differently
      }
      setIsLoadingUserCount(false);
    };

    fetchUserCount();
  }, []);

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-transparent relative overflow-hidden font-mono flex flex-col">
      {/* Background pattern: Positioned to cover navbar area, z-0 */}
      <DottedBackground />
      
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
          className="absolute top-[12%] md:top-[12%] left-[200px] sm:left-[400px] md:left-[600px] lg:left-[900px] -translate-y-1/2 w-[1000px] h-[1000px] opacity-[0.03] pointer-events-none -z-1 select-none"
        />
        {/* Second large transparent logo backdrop - lower left */}
        <img
          src={standaloneLogoSrc}
          alt="" // Decorative image
          className="absolute top-[65%] md:top-[77%] left-[-700px] sm:left-[-600px] md:left-[-450px] -translate-y-1/2 w-[1000px] h-[1000px] opacity-[0.03] pointer-events-none -z-10 select-none"
        />

        {/* 1. Hero Section */}
        <section className="flex items-center justify-center min-h-[calc(100vh-4rem)] px-4 md:px-6 lg:px-8 max-w-7xl mx-auto relative pt-0 md:pt-8 -mt-8 md:mt-0">
          {/* This div becomes the two-column container - adjusted padding for mobile */}
          <div className="flex flex-col md:flex-row items-center md:items-start md:justify-between w-full pt-0 pb-16 md:py-16 gap-8 lg:gap-16">

            {/* Left Column - Slightly adjusted vertical alignment and added social proof */}
            <div className="relative flex flex-col items-center md:items-start text-center md:text-left md:w-5/12 lg:w-1/2 justify-center space-y-6 md:space-y-8 order-1 md:-mt-4 lg:-mt-6">
              {/* Blur effects */}
              <div className="absolute -top-16 -left-16 w-64 h-64 bg-[#5271FF]/10 rounded-full filter blur-3xl opacity-70 pointer-events-none"></div>
              <div className="absolute -bottom-16 -right-16 w-64 h-64 bg-[#5271FF]/10 rounded-full filter blur-3xl opacity-70 pointer-events-none md:hidden"></div> {/* Hidden on medium+ screens */}
              <div className="absolute top-1/4 -right-24 w-72 h-72 bg-[#6B8EFF]/10 rounded-full filter blur-3xl opacity-60 pointer-events-none hidden md:block"></div> {/* Visible on medium+ screens */}

              {/* Updated Heading */}
              <div className="relative z-10 flex flex-col items-center md:items-start">
                <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold font-mono tracking-tight text-foreground leading-tight">
                  Everything you need
                  <br />
                  to{" "}
                  <span className="bg-clip-text text-transparent bg-gradient-to-r from-[#5271FF] to-[#6B8EFF]">
                  land your next technical role
                  </span>
                  , all
                  <br />
                  in one place.
                </h1>
              </div>

              {/* Subtitle */}
              <p className="relative z-10 text-lg lg:text-xl text-muted-foreground max-w-md lg:max-w-lg xl:max-w-xl">
                Yes, it should be that simple.
              </p>

              {/* Login/Start buttons */}
              <div className="relative z-10 flex flex-col sm:flex-row gap-4">
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
                        variant="outline"
                        size="lg"
                        className="gap-2 w-full sm:w-auto py-6 px-8 text-lg font-medium hover:scale-105 border-[#5271FF]/50 border-2 text-[#5271FF] hover:text-[#5271FF] hover:bg-white dark:hover:bg-[#5271FF]/10 shadow-none"
                      >
                        Log In
                      </Button>
                    </Link>
                  </div>
                </div>
              )}
              </div>

              {/* Social Proof Section - Updated Layout using CSS Grid */}
              <div className="relative z-10 grid grid-cols-[auto_auto] md:grid-cols-[auto_1fr] grid-rows-[auto_auto] gap-x-2 gap-y-1 md:gap-x-4 items-center md:items-start pt-4 md:pt-6">
                {/* User Profile Pictures - Grid Item */}
                <div className="flex -space-x-2 overflow-hidden col-start-1 row-start-1 md:row-span-2 md:self-center">
                  {/* Using realistic stock photos for more authentic social proof */}
                  <Avatar className="h-8 w-8 ring-2 ring-background">
                    <AvatarImage src="https://images.unsplash.com/photo-1494790108755-2616b612b47c?w=64&h=64&fit=crop&crop=face&auto=format&q=80" alt="Sarah M." />
                    <AvatarFallback>SM</AvatarFallback>
                  </Avatar>
                  <Avatar className="h-8 w-8 ring-2 ring-background">
                    <AvatarImage src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=64&h=64&fit=crop&crop=face&auto=format&q=80" alt="David K." />
                    <AvatarFallback>DK</AvatarFallback>
                  </Avatar>
                  <Avatar className="h-8 w-8 ring-2 ring-background">
                    <AvatarImage src="https://images.unsplash.com/photo-1517841905240-472988babdf9?w=64&h=64&fit=crop&crop=face&auto=format&q=80" alt="Maya P." />
                    <AvatarFallback>MP</AvatarFallback>
                  </Avatar>
                  <Avatar className="h-8 w-8 ring-2 ring-background">
                    <AvatarImage src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=64&h=64&fit=crop&crop=face&auto=format&q=80" alt="Alex R." />
                    <AvatarFallback>AR</AvatarFallback>
                  </Avatar>
                  <Avatar className="h-8 w-8 ring-2 ring-background">
                    <AvatarImage src="https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=64&h=64&fit=crop&crop=face&auto=format&q=80" alt="Priya S." />
                    <AvatarFallback>PS</AvatarFallback>
                  </Avatar>
                </div>

                {/* Stars - Grid Item */}
                <div className="flex col-start-2 row-start-1 md:col-start-2 md:row-start-1 justify-self-start">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="h-5 w-5 text-yellow-400 fill-yellow-400" />
                  ))}
                </div>

                {/* Text - Grid Item */}
                <p className="text-sm text-muted-foreground col-start-1 col-span-2 row-start-2 md:col-start-2 md:col-span-1 md:row-start-2 text-center md:text-left md:mt-1">
                  {isLoadingUserCount ? (
                    <LoadingSpinner size="md" />
                  ) : (
                    <>
                      Join <span className="font-semibold text-foreground">{userCount?.toLocaleString() ?? '7,000+'}</span> others already landing offers.
                    </>
                  )}
                </p>
              </div>

            </div>

            {/* Right Column - Adjusted alignment, height, and top margin */}
            <div className="order-2 hidden md:flex justify-center items-start md:w-1/2 lg:w-2/5 mt-12 md:-mt-8">
              {/* Scrolling code - Increased height, font, and left margin */}
              <div className="flex flex-col h-[34rem] w-[30rem] overflow-hidden relative font-mono text-sm text-muted-foreground/50 ml-8">
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

          </div>
        </section>

        {/* 2. Company Logos Section */}
        <CompanyLogos />

        {/* NEW: Feature Showcase Section */}
        <FeatureShowcase />

        {/* 3. Pricing Section */}
        <Pricing />

        {/* FAQ Section: Ensure bg-transparent */}
        <section id="faq" className="pb-16 pt-32 bg-transparent text-foreground">
          <div className="container mx-auto px-4 md:px-6 lg:px-8 max-w-7xl">
            <div className="text-center mb-6 md:mb-12">
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
                <span className="sm:hidden">FAQ</span>
                <span className="hidden sm:inline">Frequently Asked Questions</span>
              </h2>
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
                    <AccordionTrigger className="text-lg text-left font-medium font-sans">{faq.question}</AccordionTrigger>
                    <AccordionContent className="text-muted-foreground text-left font-sans">
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