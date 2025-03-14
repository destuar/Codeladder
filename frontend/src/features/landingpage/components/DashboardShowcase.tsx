import React from 'react';
import { ContainerScroll } from "@/components/ui/container-scroll-animation";
import { Card } from "@/components/ui/card";

/**
 * DashboardShowcase component
 * 
 * Uses the ContainerScroll animation to showcase the CodeLadder dashboard.
 * This component creates an engaging, interactive section on the landing page.
 */
export function DashboardShowcase() {
  // Import the image directly to ensure proper bundling
  const dashboardImage = new URL('../images/screenshot of dashboard.png', import.meta.url).href;
  
  return (
    <div className="flex flex-col overflow-hidden -mt-8">
      <ContainerScroll
        titleComponent={
          <h1 className="text-3xl font-bold text-center mb-6">
            <span className="text-primary">Track Your Progress</span> on the Leveling Dashboard
          </h1>
        }
      >
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 px-4">
          {/* Main Dashboard Card */}
          <div className="col-span-1 md:col-span-2 lg:col-span-3">
            <Card className="bg-white dark:bg-black overflow-hidden border border-neutral-200 dark:border-white/[0.1] shadow-xl rounded-xl p-4">
              <img 
                src={dashboardImage} 
                alt="CodeLadder Dashboard" 
                className="w-full h-auto rounded-lg shadow-md"
              />
            </Card>
          </div>
          
          {/* Feature Cards */}
          <Card className="bg-white dark:bg-black overflow-hidden border border-neutral-200 dark:border-white/[0.1] shadow-xl rounded-xl p-6">
            <h3 className="text-xl font-semibold mb-2">Learn with Custom Coding Problems</h3>
            <p className="text-neutral-600 dark:text-neutral-300">
              Practice with tailored coding challenges designed to build your skills progressively.
            </p>
          </Card>
          
          <Card className="bg-white dark:bg-black overflow-hidden border border-neutral-200 dark:border-white/[0.1] shadow-xl rounded-xl p-6">
            <h3 className="text-xl font-semibold mb-2">Complete Leveling Assessments to Unlock</h3>
            <p className="text-neutral-600 dark:text-neutral-300">
              Test your knowledge with comprehensive assessments that unlock new content as you advance.
            </p>
          </Card>
          
          <Card className="bg-white dark:bg-black overflow-hidden border border-neutral-200 dark:border-white/[0.1] shadow-xl rounded-xl p-6">
            <h3 className="text-xl font-semibold mb-2">Spaced Repetition Practice Problems</h3>
            <p className="text-neutral-600 dark:text-neutral-300">
              Reinforce your learning with scientifically-proven spaced repetition techniques for long-term retention.
            </p>
          </Card>
        </div>
      </ContainerScroll>
    </div>
  );
} 