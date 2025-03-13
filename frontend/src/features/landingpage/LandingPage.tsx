import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/features/auth/AuthContext';
import { ArrowRight, Code, Brain, Layers, Trophy } from 'lucide-react';

/**
 * LandingPage component
 * 
 * Serves as the main landing page for CodeLadder, accessible to all users.
 * Provides an introduction to the platform, key features, and calls-to-action.
 */
export default function LandingPage() {
  const { user } = useAuth();

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-background">
      {/* Hero Section */}
      <section className="py-20 px-4 md:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="flex flex-col items-center text-center">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight mb-6">
            Master Data Structures & Algorithms
          </h1>
          <p className="text-xl text-muted-foreground max-w-3xl mb-10">
            A structured learning path to help you build strong foundations in DSA through
            progressive challenges and mastery-based learning.
          </p>
          <div className="flex flex-col sm:flex-row gap-4">
            {user ? (
              <Link to="/dashboard">
                <Button size="lg" className="gap-2">
                  Go to Dashboard <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            ) : (
              <>
                <Link to="/register">
                  <Button size="lg" className="gap-2">
                    Get Started <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
                <Link to="/login">
                  <Button size="lg" variant="outline">
                    Log In
                  </Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 px-4 md:px-6 lg:px-8 bg-muted/50">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">Why CodeLadder?</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="bg-card p-6 rounded-lg shadow-sm border">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <Layers className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Progressive Learning</h3>
              <p className="text-muted-foreground">
                Structured levels that build upon each other, ensuring you master fundamentals before tackling complex topics.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="bg-card p-6 rounded-lg shadow-sm border">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <Code className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Interactive Coding</h3>
              <p className="text-muted-foreground">
                Practice with real coding challenges that test your understanding and implementation skills.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="bg-card p-6 rounded-lg shadow-sm border">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <Brain className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Mastery-Based Model</h3>
              <p className="text-muted-foreground">
                Our approach ensures you truly understand concepts before moving on, building lasting knowledge.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 md:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="bg-primary/5 border border-primary/20 rounded-xl p-8 md:p-12 flex flex-col items-center text-center">
          <Trophy className="h-12 w-12 text-primary mb-6" />
          <h2 className="text-3xl font-bold mb-4">Ready to start your DSA journey?</h2>
          <p className="text-xl text-muted-foreground max-w-2xl mb-8">
            Join thousands of developers who have improved their algorithmic thinking and problem-solving skills with CodeLadder.
          </p>
          {user ? (
            <Link to="/dashboard">
              <Button size="lg">
                Continue Learning
              </Button>
            </Link>
          ) : (
            <Link to="/register">
              <Button size="lg">
                Start Free
              </Button>
            </Link>
          )}
        </div>
      </section>
    </div>
  );
} 