import React from 'react';
import { Check, X, Minus } from 'lucide-react';
import { cn } from "@/lib/utils";

// Import CodeLadder logos
import codeLadderLightLogo from '../images/codeladder single logo (light mode).svg';
import codeLadderDarkLogo from '../images/codeladder single logo.svg';

interface ComparisonFeature {
  feature: string;
  codeLadder: boolean | 'partial';
  leetCode: boolean | 'partial';
  dataCamp: boolean | 'partial';
  interviewPrep: boolean | 'partial';
  interviewCoder: boolean | 'partial';
}

const comparisonData: ComparisonFeature[] = [
  {
    feature: "Structured mastery-based learning with progressive levels (Beginner → Advanced)",
    codeLadder: true,
    leetCode: false,
    dataCamp: true,
    interviewPrep: true,
    interviewCoder: false,
  },
  {
    feature: "Spaced repetition system with scientific review intervals for long-term retention",
    codeLadder: true,
    leetCode: false,
    dataCamp: false,
    interviewPrep: false,
    interviewCoder: false,
  },
  {
    feature: "Real-time code execution with Judge0 engine supporting 10+ programming languages",
    codeLadder: true,
    leetCode: true,
    dataCamp: true,
    interviewPrep: false,
    interviewCoder: false,
  },
  {
    feature: "Monaco Editor with syntax highlighting, autocomplete, and professional IDE features",
    codeLadder: true,
    leetCode: true,
    dataCamp: false,
    interviewPrep: false,
    interviewCoder: false,
  },
  {
    feature: "Comprehensive DSA curriculum: Arrays, Trees, Graphs, DP, and 15+ core topics",
    codeLadder: true,
    leetCode: true,
    dataCamp: false,
    interviewPrep: true,
    interviewCoder: false,
  },
  {
    feature: "Mixed assessment system: coding problems, quizzes, and conceptual explanations",
    codeLadder: true,
    leetCode: false,
    dataCamp: true,
    interviewPrep: false,
    interviewCoder: false,
  },
  {
    feature: "Curated problem collections organized by company patterns and difficulty",
    codeLadder: true,
    leetCode: true,
    dataCamp: false,
    interviewPrep: false,
    interviewCoder: false,
  },
  {
    feature: "Progress tracking with detailed analytics and performance insights",
    codeLadder: true,
    leetCode: true,
    dataCamp: true,
    interviewPrep: false,
    interviewCoder: false,
  },
];

const StatusIcon = ({ status }: { status: boolean | 'partial' }) => {
  if (status === true) {
    return (
      <div className="w-8 h-8 bg-[#5271FF] rounded-full flex items-center justify-center mx-auto">
        <Check className="h-5 w-5 text-white" />
      </div>
    );
  }
  
  if (status === 'partial') {
    return (
      <div className="w-8 h-8 bg-[#5271FF] rounded-full flex items-center justify-center mx-auto">
        <Check className="h-5 w-5 text-white" />
      </div>
    );
  }
  
  return (
    <div className="w-8 h-8 bg-gray-400 rounded-full flex items-center justify-center mx-auto">
      <X className="h-5 w-5 text-white" />
    </div>
  );
};

export function ComparisonTable() {
  return (
    <div className="w-full">
      {/* Sunken band container */}
      <div className="bg-gray-50/50 dark:bg-gray-950/70 border-y border-gray-200/50 dark:border-gray-800/60 shadow-inner relative min-h-[400px] flex items-center">
        {/* Inner shadow overlay for enhanced sunken effect */}
        <div className="absolute inset-0 shadow-[inset_0_4px_8px_rgba(0,0,0,0.06),inset_0_-4px_8px_rgba(0,0,0,0.06)] dark:shadow-[inset_0_6px_12px_rgba(0,0,0,0.25),inset_0_-6px_12px_rgba(0,0,0,0.25),inset_0_2px_4px_rgba(0,0,0,0.3)]"></div>
        
        <div className="relative z-10 w-full py-16">
          <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8">
            <div className="flex flex-col items-center">
              <div className="mb-12 text-center pt-8">
                <h2 className="mt-3 text-2xl sm:text-3xl lg:text-4xl font-bold font-sans tracking-tight text-foreground leading-tight max-w-4xl mx-auto">
                  What does CodeLadder offer?
                </h2>
                <p className="mt-4 text-lg lg:text-xl text-muted-foreground max-w-3xl mx-auto">
                  Comprehensive offerings when compared to similar platforms
                </p>
                <div className="h-0.5 w-16 bg-[#5271FF] mx-auto mt-6"></div>
              </div>
              
              {/* Comparison Table */}
              <div className="w-full max-w-6xl overflow-x-auto px-4 py-4">
                <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 shadow-lg overflow-hidden">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="border-b border-gray-200 dark:border-gray-700">
                        <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-900">
                          {/* Empty header for features column */}
                        </th>
                                                                   <th className="px-6 py-4 text-center text-sm font-semibold text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-900">
                        <div className="flex items-center justify-center">
                          <img 
                            src={codeLadderLightLogo} 
                            alt="CodeLadder logo" 
                            className="w-8 h-8 mr-1 block dark:hidden" 
                          />
                          <img 
                            src={codeLadderDarkLogo} 
                            alt="CodeLadder logo" 
                            className="w-8 h-8 mr-1 hidden dark:block" 
                          />
                          <span className="font-mono">CodeLadder</span>
                        </div>
                      </th>
                      <th className="px-6 py-4 text-center text-sm font-medium text-gray-600 dark:text-gray-400 bg-white dark:bg-gray-900">
                        LeetCode
                      </th>
                      <th className="px-6 py-4 text-center text-sm font-medium text-gray-600 dark:text-gray-400 bg-white dark:bg-gray-900">
                        DataCamp<br />
                      </th>
                      <th className="px-6 py-4 text-center text-sm font-medium text-gray-600 dark:text-gray-400 bg-white dark:bg-gray-900">
                        Interview Prep<br />Platforms
                      </th>
                      <th className="px-6 py-4 text-center text-sm font-medium text-gray-600 dark:text-gray-400 bg-white dark:bg-gray-900">
                        InterviewCoder
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {comparisonData.map((row, index) => (
                      <tr key={row.feature} className={cn(
                        "border-b border-gray-100 dark:border-gray-800",
                        "hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                      )}>
                        <td className="px-6 py-5 text-sm text-gray-900 dark:text-gray-100 font-medium max-w-xs">
                          {row.feature}
                        </td>
                        <td className="px-6 py-5 text-center">
                          <StatusIcon status={row.codeLadder} />
                        </td>
                        <td className="px-6 py-5 text-center">
                          <StatusIcon status={row.leetCode} />
                        </td>
                        <td className="px-6 py-5 text-center">
                          <StatusIcon status={row.dataCamp} />
                        </td>
                        <td className="px-6 py-5 text-center">
                          <StatusIcon status={row.interviewPrep} />
                        </td>
                        <td className="px-6 py-5 text-center">
                          <StatusIcon status={row.interviewCoder} />
                        </td>
                      </tr>
                    ))}
                                      </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 