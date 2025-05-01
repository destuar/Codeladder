import React, { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/features/auth/AuthContext';
import { ArrowRight, Code, Dumbbell, Layers, Trophy, CheckCircle } from 'lucide-react';
import { DashboardShowcase } from './components/DashboardShowcase';
import { StatsSection } from './components/StatsSection';
import { FeatureCard } from './components/FeatureCard';
import { GlowingEffect } from '@/components/ui/glowing-effect';
import { cn } from '@/lib/utils';
import { RotatingFeatureCards } from './components/RotatingFeatureCards';
import { CompanyLogos } from './components/CompanyLogos';
import { Spotlight } from '@/components/ui/spotlight-new';
import { FeatureShowcase } from './components/FeatureShowcase';
import { TypeAnimation } from 'react-type-animation';
import { Pricing } from './components/Pricing';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { LandingPageFooter } from './components/LandingPageFooter';

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
  
  // Check for dark mode on component mount and when theme changes
  useEffect(() => {
    // Initial check
    const checkDarkMode = () => {
      const isDark = document.documentElement.classList.contains('dark') || 
                    window.matchMedia('(prefers-color-scheme: dark)').matches;
      setIsDarkMode(isDark);
    };
    
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
    <div className="min-h-[calc(100vh-4rem)] bg-background relative overflow-visible font-mono">
      {/* Background patterns */}
      <div className="absolute -inset-32 bg-dot-[#5b5bf7]/[0.2] [mask-image:radial-gradient(ellipse_at_center,transparent_20%,black)]" />
      
      {/* Spotlight effect - Only visible in dark mode */}
      {isDarkMode ? (
        <Spotlight
          gradientFirst="radial-gradient(68.54% 68.72% at 55.02% 31.46%, hsla(240, 100%, 85%, .08) 0, hsla(240, 100%, 55%, .02) 50%, hsla(240, 100%, 45%, 0) 80%)"
          gradientSecond="radial-gradient(50% 50% at 50% 50%, hsla(240, 100%, 85%, .06) 0, hsla(240, 100%, 55%, .02) 80%, transparent 100%)"
          gradientThird="radial-gradient(50% 50% at 50% 50%, hsla(240, 100%, 85%, .04) 0, hsla(240, 100%, 45%, .02) 80%, transparent 100%)"
          translateY={-300}
          width={600}
          height={1200}
          duration={10}
        />
      ) : (
        <Spotlight
          gradientFirst="radial-gradient(68.54% 68.72% at 55.02% 31.46%, hsla(240, 100%, 85%, .02) 0, hsla(240, 100%, 55%, .005) 50%, hsla(240, 100%, 45%, 0) 80%)"
          gradientSecond="radial-gradient(50% 50% at 50% 50%, hsla(240, 100%, 85%, .015) 0, hsla(240, 100%, 55%, .005) 80%, transparent 100%)"
          gradientThird="radial-gradient(50% 50% at 50% 50%, hsla(240, 100%, 85%, .01) 0, hsla(240, 100%, 45%, .005) 80%, transparent 100%)"
          translateY={-300}
          width={600}
          height={1200}
          duration={10}
        />
      )}
      
      {/* 1. Hero Section */}
      <section className="flex items-center justify-center min-h-[calc(100vh-4rem)] px-4 md:px-6 lg:px-8 max-w-7xl mx-auto relative">
        <div className="flex flex-col items-center text-center py-16">
          <div className="relative">
            <div className="absolute -top-16 -left-16 w-64 h-64 bg-[#5b5bf7]/10 rounded-full filter blur-3xl opacity-70"></div>
            <div className="absolute -bottom-16 -right-16 w-64 h-64 bg-[#5b5bf7]/10 rounded-full filter blur-3xl opacity-70"></div>
            
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold font-mono tracking-tight mb-12 relative z-10">
              <span>Practice</span> 
              <ArrowRight className="inline-block h-6 w-6 mx-4 text-muted-foreground" /> 
              <span>Interview</span> 
              <ArrowRight className="inline-block h-6 w-6 mx-4 text-muted-foreground" /> 
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-[#5b5bf7] to-[#7a7aff]">Get Hired</span>
            </h1>

            <p className="text-xl text-muted-foreground max-w-3xl mx-auto mb-12 relative z-10">
              Yes, it should be that simple.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-4 mb-12 relative z-10">
            {user ? (
              <Link to="/dashboard">
                <Button 
                  size="lg" 
                  className="gap-2 bg-[#5b5bf7] hover:bg-[#4a4af0] text-white relative overflow-hidden group shadow-md shadow-[#5b5bf7]/5 w-full sm:w-auto py-6 px-8 text-lg font-medium transition-all duration-300 ease-in-out hover:scale-105"
                >
                  <span className="relative z-10 flex items-center">
                    Start Climbing <ArrowRight className="h-5 w-5 ml-2" />
                  </span>
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <div className="absolute inset-0 bg-[#4a4af0]"></div>
                    <div className="absolute -inset-[1px] bg-gradient-to-r from-[#5b5bf7] via-[#7a7aff] to-[#5b5bf7] opacity-50 group-hover:opacity-100 transition-opacity duration-500 blur-[2px]"></div>
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
                      className="gap-2 bg-[#5b5bf7] hover:bg-[#4a4af0] text-white relative overflow-hidden group shadow-md shadow-[#5b5bf7]/5 w-full sm:w-auto py-6 px-8 text-lg font-medium transition-all duration-300 ease-in-out hover:scale-105"
                    >
                      <span className="relative z-10 flex items-center">
                        Get Started <ArrowRight className="h-5 w-5 ml-2" />
                      </span>
                      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                        <div className="absolute inset-0 bg-[#4a4af0]"></div>
                        <div className="absolute -inset-[1px] bg-gradient-to-r from-[#5b5bf7] via-[#7a7aff] to-[#5b5bf7] opacity-50 group-hover:opacity-100 transition-opacity duration-500 blur-[2px]"></div>
                      </div>
                    </Button>
                  </Link>
                  <Link to="/login" className="w-full sm:w-auto">
                    <Button 
                      size="lg" 
                      variant="outline"
                      className="border-[#5b5bf7]/50 border-2 text-[#5b5bf7] hover:text-[#5b5bf7] hover:bg-white dark:hover:bg-[#5b5bf7]/10 w-full sm:w-auto py-6 px-8 text-lg font-medium transition-all duration-300 ease-in-out hover:scale-105 shadow-none"
                    >
                      Log In
                    </Button>
                  </Link>
                </div>
              </div>
            )}
          </div>
          
          {/* 2. Stats Section */}
          <div className="mt-4">
            <StatsSection />
          </div>
        </div>
      </section>

      {/* 6. Company Logos Section */}
      <div className="py-16">
        <CompanyLogos />
      </div>

      {/* Pricing Section */}
      <div className="py-16 relative z-10">
        <Pricing />
      </div>

      {/* FAQ Section */}
      <section id="faq" className="pb-16 pt-24 bg-background text-foreground relative z-10">
        <div className="container mx-auto px-4 md:px-6 lg:px-8 max-w-7xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Frequently Asked Questions</h2>
          </div>
          <Accordion type="single" collapsible className="w-full max-w-3xl mx-auto">
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

      {/* Footer */}
      <LandingPageFooter />

    </div>
  );
} 