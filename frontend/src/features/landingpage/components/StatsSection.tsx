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
    <div className="w-full max-w-4xl mx-auto mt-24">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Custom Levels Stat */}
        <div className="flex flex-col items-center">
          <div className="flex items-center justify-center">
            <Trophy className="h-8 w-8 text-primary mr-3" />
            <span className="text-3xl font-bold text-foreground">7</span>
          </div>
          <p className="text-lg text-muted-foreground mt-1">Custom Levels</p>
        </div>

        {/* DSA Topics Stat */}
        <div className="flex flex-col items-center">
          <div className="flex items-center justify-center">
            <Rocket className="h-8 w-8 text-primary mr-3" />
            <span className="text-3xl font-bold text-foreground">15+</span>
          </div>
          <p className="text-lg text-muted-foreground mt-1">DSA Topics</p>
        </div>

        {/* Learning Efficiency Stat */}
        <div className="flex flex-col items-center">
          <div className="flex items-center justify-center">
            <CheckCircle className="h-8 w-8 text-primary mr-3" />
            <span className="text-3xl font-bold text-foreground">70%</span>
          </div>
          <p className="text-lg text-muted-foreground mt-1">Better Retention</p>
        </div>
      </div>
    </div>
  );
}
