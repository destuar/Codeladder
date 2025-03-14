import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/features/auth/AuthContext';
import { ArrowRight, Code, Brain, Layers, Trophy } from 'lucide-react';
import { DashboardShowcase } from './components/DashboardShowcase';
import { StatsSection } from './components/StatsSection';
import { FeatureCard } from './components/FeatureCard';
import { GlowingEffect } from '@/components/ui/glowing-effect';
import { cn } from '@/lib/utils';

/**
 * LandingPage component
 * 
 * Serves as the main landing page for CodeLadder, accessible to all users.
 * Provides an introduction to the platform, key features, and calls-to-action.
 */
export default function LandingPage() {
  const { user } = useAuth();

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-background relative">
      {/* Background patterns */}
      <div className="absolute inset-0 bg-dot-[#5b5bf7]/[0.2] [mask-image:radial-gradient(ellipse_at_center,transparent_20%,black)]" />
      
      {/* Hero Section */}
      <section className="pt-28 pb-20 px-4 md:px-6 lg:px-8 max-w-7xl mx-auto relative">
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
          <div className="flex flex-col sm:flex-row gap-4 mb-8 relative z-10">
            {user ? (
              <Link to="/dashboard">
                <Button 
                  size="lg" 
                  className="gap-2 bg-[#5b5bf7] hover:bg-[#4a4af0] text-white relative overflow-hidden group"
                >
                  <span className="relative z-10">Go to Dashboard <ArrowRight className="h-4 w-4 inline-block" /></span>
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <div className="absolute inset-0 bg-[#4a4af0]"></div>
                    <div className="absolute -inset-[1px] bg-gradient-to-r from-[#5b5bf7] via-[#7a7aff] to-[#5b5bf7] opacity-50 group-hover:opacity-100 transition-opacity duration-500 blur-[2px]"></div>
                  </div>
                </Button>
              </Link>
            ) : (
              <>
                <Link to="/register">
                  <Button 
                    size="lg" 
                    className="gap-2 bg-[#5b5bf7] hover:bg-[#4a4af0] text-white relative overflow-hidden group"
                  >
                    <span className="relative z-10">Get Started <ArrowRight className="h-4 w-4 inline-block" /></span>
                    <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      <div className="absolute inset-0 bg-[#4a4af0]"></div>
                      <div className="absolute -inset-[1px] bg-gradient-to-r from-[#5b5bf7] via-[#7a7aff] to-[#5b5bf7] opacity-50 group-hover:opacity-100 transition-opacity duration-500 blur-[2px]"></div>
                    </div>
                  </Button>
                </Link>
                <Link to="/login">
                  <Button 
                    size="lg" 
                    variant="outline"
                    className="border-[#5b5bf7]/30 text-[#5b5bf7] hover:bg-[#5b5bf7]/5"
                  >
                    Log In
                  </Button>
                </Link>
              </>
            )}
          </div>
          
          {/* Stats Section */}
          <StatsSection />
        </div>
      </section>

      {/* Dashboard Showcase Section */}
      <section className="py-8 relative z-10 bg-background/80 backdrop-blur-sm">
        <DashboardShowcase />
      </section>

      {/* Features Section */}
      <section className="py-24 px-4 md:px-6 lg:px-8 bg-muted/50 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-background/20 pointer-events-none"></div>
        <div className="max-w-7xl mx-auto relative z-10">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-[#5b5bf7] to-[#7a7aff]">Why CodeLadder?</h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Our platform is designed to help you master DSA concepts efficiently and effectively.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <FeatureCard 
              icon={<Layers className="h-6 w-6 text-[#5b5bf7]" />}
              title="Progressive Learning"
              description="Structured levels that build upon each other, ensuring you master fundamentals before tackling complex topics."
            />
            
            <FeatureCard 
              icon={<Code className="h-6 w-6 text-[#5b5bf7]" />}
              title="Interactive Coding"
              description="Practice with real coding challenges that test your understanding and implementation skills."
            />
            
            <FeatureCard 
              icon={<Brain className="h-6 w-6 text-[#5b5bf7]" />}
              title="Mastery-Based Model"
              description="Our approach ensures you truly understand concepts before moving on, building lasting knowledge."
            />
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 md:px-6 lg:px-8 max-w-7xl mx-auto relative z-10">
        <div className="bg-[#5b5bf7]/5 border border-[#5b5bf7]/20 rounded-xl p-8 md:p-12 flex flex-col items-center text-center relative overflow-hidden">
          <div className="absolute -top-24 -left-24 w-64 h-64 bg-[#5b5bf7]/10 rounded-full filter blur-3xl opacity-50"></div>
          <div className="absolute -bottom-24 -right-24 w-64 h-64 bg-[#5b5bf7]/10 rounded-full filter blur-3xl opacity-50"></div>
          
          <Trophy className="h-12 w-12 text-[#5b5bf7] mb-6 relative z-10" />
          <h2 className="text-3xl font-bold mb-4 relative z-10">Ready to start your DSA journey?</h2>
          <p className="text-xl text-muted-foreground max-w-2xl mb-8 relative z-10">
            Join thousands of developers who have improved their algorithmic thinking and problem-solving skills with CodeLadder.
          </p>
          {user ? (
            <Link to="/dashboard" className="relative z-10">
              <Button 
                size="lg"
                className="bg-[#5b5bf7] hover:bg-[#4a4af0] text-white relative overflow-hidden group"
              >
                <span className="relative z-10">Continue Learning</span>
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <div className="absolute inset-0 bg-[#4a4af0]"></div>
                  <div className="absolute -inset-[1px] bg-gradient-to-r from-[#5b5bf7] via-[#7a7aff] to-[#5b5bf7] opacity-50 group-hover:opacity-100 transition-opacity duration-500 blur-[2px]"></div>
                </div>
              </Button>
            </Link>
          ) : (
            <Link to="/register" className="relative z-10">
              <Button 
                size="lg"
                className="bg-[#5b5bf7] hover:bg-[#4a4af0] text-white relative overflow-hidden group"
              >
                <span className="relative z-10">Start Free</span>
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <div className="absolute inset-0 bg-[#4a4af0]"></div>
                  <div className="absolute -inset-[1px] bg-gradient-to-r from-[#5b5bf7] via-[#7a7aff] to-[#5b5bf7] opacity-50 group-hover:opacity-100 transition-opacity duration-500 blur-[2px]"></div>
                </div>
              </Button>
            </Link>
          )}
        </div>
      </section>
    </div>
  );
} 