import React from 'react';
import { Trophy, Rocket, CheckCircle } from 'lucide-react';

/**
 * StatsSection component
 * 
 * Displays key platform metrics with icons in a visually appealing way.
 * Used on the landing page to highlight the platform's strengths.
 */
export function StatsSection() {
  return (
    <div className="w-full max-w-4xl mx-auto mt-16">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
        {/* Custom Levels Stat */}
        <div className="flex flex-col items-center">
          <div className="mb-4">
            <Trophy className="h-12 w-12 text-primary" />
          </div>
          <h3 className="text-4xl font-bold text-foreground">7</h3>
          <p className="text-xl text-muted-foreground">Custom Levels</p>
        </div>

        {/* DSA Topics Stat */}
        <div className="flex flex-col items-center">
          <div className="mb-4">
            <Rocket className="h-12 w-12 text-primary" />
          </div>
          <h3 className="text-4xl font-bold text-foreground">15+</h3>
          <p className="text-xl text-muted-foreground">DSA Topics</p>
        </div>

        {/* Learning Efficiency Stat */}
        <div className="flex flex-col items-center">
          <div className="mb-4">
            <CheckCircle className="h-12 w-12 text-primary" />
          </div>
          <h3 className="text-4xl font-bold text-foreground">3x</h3>
          <p className="text-xl text-muted-foreground">Learning Efficiency</p>
        </div>
      </div>
    </div>
  );
}
