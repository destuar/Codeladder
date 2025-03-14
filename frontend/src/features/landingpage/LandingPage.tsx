import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/features/auth/AuthContext';
import { ArrowRight, Code, Brain, Layers, Trophy, CheckCircle } from 'lucide-react';
import { DashboardShowcase } from './components/DashboardShowcase';
import { StatsSection } from './components/StatsSection';
import { FeatureCard } from './components/FeatureCard';
import { GlowingEffect } from '@/components/ui/glowing-effect';
import { cn } from '@/lib/utils';
import { RotatingFeatureCards } from './components/RotatingFeatureCards';
import { CompanyLogos } from './components/CompanyLogos';

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

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-background relative">
      {/* Background patterns */}
      <div className="absolute inset-0 bg-dot-[#5b5bf7]/[0.2] [mask-image:radial-gradient(ellipse_at_center,transparent_20%,black)]" />
      
      {/* Hero Section */}
      <section className="pt-28 pb-16 px-4 md:px-6 lg:px-8 max-w-7xl mx-auto relative">
        <div className="flex flex-col items-center text-center">
          <div className="relative">
            <div className="absolute -top-16 -left-16 w-64 h-64 bg-[#5b5bf7]/10 rounded-full filter blur-3xl opacity-70"></div>
            <div className="absolute -bottom-16 -right-16 w-64 h-64 bg-[#5b5bf7]/10 rounded-full filter blur-3xl opacity-70"></div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight mb-6 relative z-10">
              Technical interviews are adapting— <br />
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-[#5b5bf7] to-[#7a7aff]">your preparation should too.</span>
            </h1>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto mb-10 relative z-10">
              Start climbing with CodeLadder.
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
                    Go to Dashboard <ArrowRight className="h-5 w-5 ml-2" />
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
                      className="border-[#5b5bf7]/50 border-2 text-[#5b5bf7] hover:text-[#5b5bf7] hover:bg-white w-full sm:w-auto py-6 px-8 text-lg font-medium transition-all duration-300 ease-in-out hover:scale-105 shadow-none"
                    >
                      Log In
                    </Button>
                  </Link>
                </div>
              </div>
            )}
          </div>
          
          {/* Stats Section */}
          <div className="mt-4">
            <StatsSection />
          </div>
        </div>
      </section>

      {/* Dashboard Showcase Section */}
      <section className="py-16 relative z-10 bg-background/80 backdrop-blur-sm">
        <DashboardShowcase />
      </section>

      {/* Features Section */}
      <section className="py-24 px-4 md:px-6 lg:px-8 bg-muted/50 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-background/20 pointer-events-none"></div>
        <div className="max-w-7xl mx-auto relative z-10">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-[#5b5bf7] to-[#7a7aff]">Why CodeLadder?</h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              The technical interview is changing with the development of AI-tools. We are getting ahead, saving hours by prioritizing only the most important skills to crack the coding interview.
            </p>
          </div>
          
          {/* Rotating Feature Cards */}
          <RotatingFeatureCards />
        </div>
      </section>

      {/* Company Logos Section - Wrapped with custom spacing */}
      <div className="py-16">
        <CompanyLogos />
      </div>

      {/* Enhanced CTA Section */}
      <section className="pb-24 pt-8 px-4 md:px-6 lg:px-8 max-w-7xl mx-auto relative z-10">
        <div className="bg-gradient-to-br from-[#5b5bf7]/10 via-[#6e6ef8]/5 to-[#5b5bf7]/10 border border-[#5b5bf7]/20 rounded-2xl overflow-hidden relative">
          {/* Background elements */}
          <div className="absolute -top-24 -left-24 w-96 h-96 bg-[#5b5bf7]/10 rounded-full filter blur-3xl opacity-60"></div>
          <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-[#5b5bf7]/10 rounded-full filter blur-3xl opacity-60"></div>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-[url('/grid-pattern.svg')] opacity-5"></div>
          
          <div className="grid md:grid-cols-2 gap-8 p-8 md:p-12 relative z-10">
            {/* Left column - Content */}
            <div className="flex flex-col justify-center">
              <div className="inline-flex items-center px-3 py-1 rounded-full bg-[#5b5bf7]/10 text-[#5b5bf7] text-sm font-medium mb-6 self-start">
                <Trophy className="h-4 w-4 mr-2" />
                <span>Join 10,000+ developers</span>
              </div>
              
              <h2 className="text-4xl md:text-5xl font-bold mb-6 tracking-tight">
                Level up your <span className="bg-clip-text text-transparent bg-gradient-to-r from-[#5b5bf7] to-[#7a7aff]">interview skills</span> today
              </h2>
              
              <div className="space-y-4 mb-8">
                <p className="text-xl text-muted-foreground">
                  Join thousands of developers who have improved their algorithmic thinking and problem-solving skills with CodeLadder.
                </p>
                
                {/* Social proof */}
                <div className="flex items-center space-x-2 mt-6">
                  <div className="flex -space-x-3">
                    <div className="w-8 h-8 rounded-full bg-[#5b5bf7] flex items-center justify-center text-white text-xs">JD</div>
                    <div className="w-8 h-8 rounded-full bg-[#7a7aff] flex items-center justify-center text-white text-xs">KL</div>
                    <div className="w-8 h-8 rounded-full bg-[#4a4af0] flex items-center justify-center text-white text-xs">MN</div>
                    <div className="w-8 h-8 rounded-full bg-[#5b5bf7] flex items-center justify-center text-white text-xs">+</div>
                  </div>
                  <span className="text-sm text-muted-foreground">
                    <span className="font-medium text-foreground">4.9/5</span> from over 500 reviews
                  </span>
                </div>
              </div>
              
              {user ? (
                <Link to="/dashboard">
                  <Button 
                    size="lg"
                    className="gap-2 bg-[#5b5bf7] hover:bg-[#4a4af0] text-white relative overflow-hidden group shadow-md shadow-[#5b5bf7]/5 w-full sm:w-auto py-6 px-8 text-lg font-medium transition-all duration-300 ease-in-out hover:scale-105"
                  >
                    <span className="relative z-10 flex items-center">
                      Continue Learning <ArrowRight className="h-5 w-5 ml-2" />
                    </span>
                    <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      <div className="absolute inset-0 bg-[#4a4af0]"></div>
                      <div className="absolute -inset-[1px] bg-gradient-to-r from-[#5b5bf7] via-[#7a7aff] to-[#5b5bf7] opacity-50 group-hover:opacity-100 transition-opacity duration-500 blur-[2px]"></div>
                    </div>
                  </Button>
                </Link>
              ) : (
                <div className="flex flex-col sm:flex-row gap-4">
                  <Link to="/register" className="w-full sm:w-auto">
                    <Button 
                      size="lg"
                      className="gap-2 bg-[#5b5bf7] hover:bg-[#4a4af0] text-white relative overflow-hidden group shadow-md shadow-[#5b5bf7]/5 w-full sm:w-auto py-6 px-8 text-lg font-medium transition-all duration-300 ease-in-out hover:scale-105"
                    >
                      <span className="relative z-10 flex items-center">
                        Start Free <ArrowRight className="h-5 w-5 ml-2" />
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
                      className="border-[#5b5bf7]/50 border-2 text-[#5b5bf7] hover:text-[#5b5bf7] hover:bg-white w-full sm:w-auto py-6 px-8 text-lg font-medium transition-all duration-300 ease-in-out hover:scale-105 shadow-none"
                    >
                      Log In
                    </Button>
                  </Link>
                </div>
              )}
            </div>
            
            {/* Right column - Feature highlights */}
            <div className="bg-background/40 backdrop-blur-sm rounded-xl p-6 border border-[#5b5bf7]/10 flex flex-col justify-center">
              <h3 className="text-xl font-semibold mb-6">What you'll get:</h3>
              
              <div className="space-y-4">
                <div className="flex items-start">
                  <div className="flex-shrink-0 h-6 w-6 rounded-full bg-[#5b5bf7]/10 flex items-center justify-center mt-1">
                    <CheckCircle className="h-4 w-4 text-[#5b5bf7]" />
                  </div>
                  <div className="ml-3">
                    <h4 className="text-base font-medium">Structured Learning Path</h4>
                    <p className="text-sm text-muted-foreground">7 custom levels designed to progressively build your skills</p>
                  </div>
                </div>
                
                <div className="flex items-start">
                  <div className="flex-shrink-0 h-6 w-6 rounded-full bg-[#5b5bf7]/10 flex items-center justify-center mt-1">
                    <CheckCircle className="h-4 w-4 text-[#5b5bf7]" />
                  </div>
                  <div className="ml-3">
                    <h4 className="text-base font-medium">15+ DSA Topics</h4>
                    <p className="text-sm text-muted-foreground">Comprehensive coverage of all essential algorithms and data structures</p>
                  </div>
                </div>
                
                <div className="flex items-start">
                  <div className="flex-shrink-0 h-6 w-6 rounded-full bg-[#5b5bf7]/10 flex items-center justify-center mt-1">
                    <CheckCircle className="h-4 w-4 text-[#5b5bf7]" />
                  </div>
                  <div className="ml-3">
                    <h4 className="text-base font-medium">70% Better Retention</h4>
                    <p className="text-sm text-muted-foreground">Our spaced repetition approach ensures you remember what you learn</p>
                  </div>
                </div>
                
                <div className="flex items-start">
                  <div className="flex-shrink-0 h-6 w-6 rounded-full bg-[#5b5bf7]/10 flex items-center justify-center mt-1">
                    <CheckCircle className="h-4 w-4 text-[#5b5bf7]" />
                  </div>
                  <div className="ml-3">
                    <h4 className="text-base font-medium">AI-Enhanced Learning</h4>
                    <p className="text-sm text-muted-foreground">Personalized guidance and feedback to accelerate your progress</p>
                  </div>
                </div>
              </div>
              
              <div className="mt-8 pt-6 border-t border-[#5b5bf7]/10">
                <div className="flex items-center">
                  <div className="text-sm text-muted-foreground">
                    <span className="font-medium text-foreground">Free access</span> during beta
                  </div>
                  <div className="ml-auto">
                    <div className="inline-flex items-center px-3 py-1 rounded-full bg-[#5b5bf7]/10 text-[#5b5bf7] text-xs font-medium">
                      Limited time offer
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
} 