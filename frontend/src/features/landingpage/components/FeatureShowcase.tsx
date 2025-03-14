import React from 'react';
import { StickyScroll } from '@/components/ui/sticky-scroll-reveal';
import { cn } from '@/lib/utils';

/**
 * FeatureShowcase component
 * 
 * Uses the StickyScroll component to showcase key features of CodeLadder:
 * 1. Interactive IDE - Code editor with real-time feedback
 * 2. Spaced Repetition - Scientific approach to learning retention
 * 3. Problem Library - Comprehensive collection of coding challenges
 */
export function FeatureShowcase() {
  // Content for the sticky scroll component
  const features = [
    {
      title: "Interactive IDE Experience",
      description: "Our custom-built IDE provides a seamless coding experience with real-time feedback, syntax highlighting, and intelligent code suggestions. Practice in an environment that mirrors real-world development tools.",
      content: (
        <div className="w-full h-full bg-black rounded-lg overflow-hidden flex flex-col">
          <div className="bg-[#1e1e1e] p-2 flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-red-500"></div>
            <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
            <div className="w-3 h-3 rounded-full bg-green-500"></div>
            <div className="ml-2 text-xs text-white/70">CodeLadder IDE</div>
          </div>
          <div className="flex-1 p-4 text-[#d4d4d4] text-sm font-mono overflow-hidden">
            <div className="text-[#569cd6]">function</div>
            <div className="pl-2">
              <span className="text-[#dcdcaa]">findMaxSubarraySum</span>
              <span className="text-white">(</span>
              <span className="text-[#9cdcfe]">nums</span>
              <span className="text-white">: </span>
              <span className="text-[#4ec9b0]">number[]</span>
              <span className="text-white">): </span>
              <span className="text-[#4ec9b0]">number</span>
              <span className="text-white"> {'{'}</span>
            </div>
            <div className="pl-4">
              <span className="text-[#c586c0]">if</span>
              <span className="text-white"> (nums.length === 0) </span>
              <span className="text-[#c586c0]">return</span>
              <span className="text-white"> 0;</span>
            </div>
            <div className="pl-4">
              <span className="text-[#569cd6]">let</span>
              <span className="text-white"> maxSum = nums[0];</span>
            </div>
            <div className="pl-4">
              <span className="text-[#569cd6]">let</span>
              <span className="text-white"> currentSum = nums[0];</span>
            </div>
            <div className="pl-4 text-[#6a9955]">// Kadane&apos;s algorithm</div>
            <div className="pl-4">
              <span className="text-[#c586c0]">for</span>
              <span className="text-white"> (</span>
              <span className="text-[#569cd6]">let</span>
              <span className="text-white"> i = 1; i &lt; nums.length; i++) {'{'}</span>
            </div>
            <div className="pl-6">
              <span className="text-white">currentSum = </span>
              <span className="text-[#4ec9b0]">Math</span>
              <span className="text-white">.max(nums[i], currentSum + nums[i]);</span>
            </div>
            <div className="pl-6">
              <span className="text-white">maxSum = </span>
              <span className="text-[#4ec9b0]">Math</span>
              <span className="text-white">.max(maxSum, currentSum);</span>
            </div>
            <div className="pl-4 text-white">{'}'}</div>
            <div className="pl-4">
              <span className="text-[#c586c0]">return</span>
              <span className="text-white"> maxSum;</span>
            </div>
            <div className="text-white">{'}'}</div>
          </div>
        </div>
      ),
    },
    {
      title: "Spaced Repetition Learning",
      description: "Our platform implements scientifically-proven spaced repetition techniques to optimize your learning and retention. Review concepts and problems at strategic intervals to ensure long-term memory retention and skill mastery.",
      content: (
        <div className="w-full h-full bg-white dark:bg-black rounded-lg overflow-hidden flex flex-col">
          <div className="bg-[#f3f4f6] dark:bg-[#1e1e1e] p-3 border-b border-gray-200 dark:border-gray-800">
            <div className="text-sm font-medium text-center">Spaced Repetition Schedule</div>
          </div>
          <div className="flex-1 p-4 flex flex-col gap-3">
            <div className="flex items-center gap-3 p-2 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800">
              <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold">1</div>
              <div>
                <div className="text-sm font-medium">Initial Learning</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">Today</div>
              </div>
            </div>
            <div className="flex items-center gap-3 p-2 rounded-lg bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800">
              <div className="w-10 h-10 rounded-full bg-indigo-500 flex items-center justify-center text-white font-bold">2</div>
              <div>
                <div className="text-sm font-medium">First Review</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">Tomorrow</div>
              </div>
            </div>
            <div className="flex items-center gap-3 p-2 rounded-lg bg-purple-50 dark:bg-purple-900/20 border border-purple-100 dark:border-purple-800">
              <div className="w-10 h-10 rounded-full bg-purple-500 flex items-center justify-center text-white font-bold">3</div>
              <div>
                <div className="text-sm font-medium">Second Review</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">3 days later</div>
              </div>
            </div>
            <div className="flex items-center gap-3 p-2 rounded-lg bg-pink-50 dark:bg-pink-900/20 border border-pink-100 dark:border-pink-800">
              <div className="w-10 h-10 rounded-full bg-pink-500 flex items-center justify-center text-white font-bold">4</div>
              <div>
                <div className="text-sm font-medium">Final Review</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">7 days later</div>
              </div>
            </div>
          </div>
        </div>
      ),
    },
    {
      title: "Comprehensive Problem Library",
      description: "Access a vast collection of carefully curated coding problems organized by difficulty, topic, and company. From array manipulation to dynamic programming, our problem library covers all the essential concepts you need to master for technical interviews.",
      content: (
        <div className="w-full h-full bg-white dark:bg-black rounded-lg overflow-hidden flex flex-col">
          <div className="bg-[#f3f4f6] dark:bg-[#1e1e1e] p-3 border-b border-gray-200 dark:border-gray-800">
            <div className="text-sm font-medium text-center">Problem Categories</div>
          </div>
          <div className="flex-1 p-4 flex flex-col gap-2">
            <div className="flex items-center justify-between p-2 rounded-lg bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-[#5b5bf7] flex items-center justify-center text-white">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="9" y1="3" x2="9" y2="21"></line></svg>
                </div>
                <span className="text-sm font-medium">Arrays & Strings</span>
              </div>
              <span className="text-xs text-gray-500 dark:text-gray-400">42 problems</span>
            </div>
            <div className="flex items-center justify-between p-2 rounded-lg bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-[#5b5bf7] flex items-center justify-center text-white">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg>
                </div>
                <span className="text-sm font-medium">Linked Lists</span>
              </div>
              <span className="text-xs text-gray-500 dark:text-gray-400">28 problems</span>
            </div>
            <div className="flex items-center justify-between p-2 rounded-lg bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-[#5b5bf7] flex items-center justify-center text-white">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3L1 9L12 15L21 10.09V17H23V9M5 13.18V17.18L12 21L19 17.18V13.18L12 17L5 13.18Z"></path></svg>
                </div>
                <span className="text-sm font-medium">Dynamic Programming</span>
              </div>
              <span className="text-xs text-gray-500 dark:text-gray-400">35 problems</span>
            </div>
            <div className="flex items-center justify-between p-2 rounded-lg bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-[#5b5bf7] flex items-center justify-center text-white">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
                </div>
                <span className="text-sm font-medium">Trees & Graphs</span>
              </div>
              <span className="text-xs text-gray-500 dark:text-gray-400">47 problems</span>
            </div>
          </div>
        </div>
      ),
    },
  ];

  return (
    <div className="py-10 pb-32">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-10">
          <h2 className="text-3xl md:text-4xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-[#5b5bf7] to-[#7a7aff]">
            Powerful Features for Effective Learning
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Learn faster, retain more, and solve smarter
          </p>
        </div>
        
        <div className="mt-8 rounded-xl overflow-hidden border border-[#5b5bf7]/20 relative">
          {/* Custom background that matches the main page but with subtle scroll indicators */}
          <div className="absolute inset-0 bg-dot-[#5b5bf7]/[0.1] [mask-image:radial-gradient(ellipse_at_center,transparent_20%,black)]" />
          
          {/* Subtle scroll indicators */}
          <div className="absolute top-4 left-1/2 -translate-x-1/2 flex gap-1 z-10">
            <div className="w-8 h-1 rounded-full bg-[#5b5bf7]/30"></div>
            <div className="w-8 h-1 rounded-full bg-[#5b5bf7]/10"></div>
            <div className="w-8 h-1 rounded-full bg-[#5b5bf7]/10"></div>
          </div>
          
          {/* Subtle gradient overlay to indicate scrollable area */}
          <div className="absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-background/80 to-transparent pointer-events-none z-[1]"></div>
          <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-background/80 to-transparent pointer-events-none z-[1]"></div>
          
          <div className="relative z-[2]">
            <StickyScroll 
              content={features}
              contentClassName="w-[350px] h-[350px] sm:w-[450px] sm:h-[450px] lg:w-[550px] lg:h-[550px]"
            />
          </div>
        </div>
      </div>
    </div>
  );
} 