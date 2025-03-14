import React from 'react';
import companyLogosSvg from '../images/company-logos.svg';

/**
 * CompanyLogos component
 * 
 * Displays logos of top tech companies where CodeLadder users now work.
 * Used on the landing page to build credibility and showcase success stories.
 */
export function CompanyLogos() {
  return (
    <div className="w-full py-10 bg-background">
      <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8">
        <div className="flex flex-col items-center">
          <div className="mb-8 text-center pt-8">
            <h3 className="text-xl font-medium text-foreground mb-1">
              Join thousands of engineers at the largest technology companies
            </h3>
            <div className="h-0.5 w-16 bg-[#5b5bf7]/30 mx-auto"></div>
          </div>
          <div className="w-full max-w-3xl mx-auto">
            <div className="flex justify-center items-center">
              <img 
                src={companyLogosSvg} 
                alt="Top tech companies including Meta, Netflix, Amazon, Salesforce, Google, Microsoft, Apple, Uber, Airbnb, and OpenAI" 
                className="w-full max-w-2xl h-auto opacity-85 transition-opacity duration-300 hover:opacity-95"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 