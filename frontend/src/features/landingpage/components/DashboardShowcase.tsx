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
    <div className="flex flex-col overflow-hidden">
      <ContainerScroll
        titleComponent={
          <h1 className="text-3xl font-bold text-center mb-8">
            Structured <span className="text-primary">Learning Path</span> for DSA Mastery
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
            <h3 className="text-xl font-semibold mb-2">Progressive Levels</h3>
            <p className="text-neutral-600 dark:text-neutral-300">
              Advance through carefully designed levels that build upon each other, ensuring a solid foundation.
            </p>
          </Card>
          
          <Card className="bg-white dark:bg-black overflow-hidden border border-neutral-200 dark:border-white/[0.1] shadow-xl rounded-xl p-6">
            <h3 className="text-xl font-semibold mb-2">Topic-Based Learning</h3>
            <p className="text-neutral-600 dark:text-neutral-300">
              Each level contains focused topics like Arrays, Hashing, and Linked Lists to master core concepts.
            </p>
          </Card>
          
          <Card className="bg-white dark:bg-black overflow-hidden border border-neutral-200 dark:border-white/[0.1] shadow-xl rounded-xl p-6">
            <h3 className="text-xl font-semibold mb-2">Progress Tracking</h3>
            <p className="text-neutral-600 dark:text-neutral-300">
              Monitor your learning journey with visual progress indicators for each topic and level.
            </p>
          </Card>
        </div>
      </ContainerScroll>
    </div>
  );
} 