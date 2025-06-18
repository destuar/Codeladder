import React, { useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { cn } from "@/lib/utils";

// Import individual logos
import airbnbLogo from '../images/company_logos/airbnb.svg';
import amazonLogo from '../images/company_logos/amazon.svg';
import appleLogo from '../images/company_logos/apple.svg';
import googleLogo from '../images/company_logos/google.svg';
import metaLogo from '../images/company_logos/meta.svg';
import microsoftLogo from '../images/company_logos/microsoft.svg';
import netflixLogo from '../images/company_logos/netflix.svg';
import openaiLogo from '../images/company_logos/openai.svg';
import salesforceLogo from '../images/company_logos/salesforce.svg';
import spotifyLogo from '../images/company_logos/spotify.svg';

/**
 * CompanyLogos component
 * 
 * Displays logos of top tech companies where CodeLadder users now work.
 * Used on the landing page to build credibility and showcase success stories.
 */
export function CompanyLogos() {
  const allLogos = [
    { src: googleLogo, alt: 'Google' },
    { src: metaLogo, alt: 'Meta' },
    { src: amazonLogo, alt: 'Amazon' },
    { src: appleLogo, alt: 'Apple' },
    { src: microsoftLogo, alt: 'Microsoft' },
    { src: netflixLogo, alt: 'Netflix' },
    { src: salesforceLogo, alt: 'Salesforce' },
    { src: spotifyLogo, alt: 'Spotify' },
    { src: openaiLogo, alt: 'OpenAI' },
    { src: airbnbLogo, alt: 'Airbnb' },
  ];

  const sectionRef = useRef(null);
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start 0.75", "center start"]
  });



  return (
    <div className="w-full">
      {/* Sunken band container */}
      <div className="bg-gray-50/50 dark:bg-gray-950/70 border-y border-gray-200/50 dark:border-gray-800/60 shadow-inner relative min-h-[400px] flex items-center">
        {/* Inner shadow overlay for enhanced sunken effect */}
        <div className="absolute inset-0 shadow-[inset_0_4px_8px_rgba(0,0,0,0.06),inset_0_-4px_8px_rgba(0,0,0,0.06)] dark:shadow-[inset_0_6px_12px_rgba(0,0,0,0.25),inset_0_-6px_12px_rgba(0,0,0,0.25),inset_0_2px_4px_rgba(0,0,0,0.3)]"></div>
        
        <div ref={sectionRef} className="relative z-10 w-full py-12">
          <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8">
            <div className="flex flex-col items-center">
              <div className="mb-12 text-center pt-8">
                <h2 className="mt-3 text-2xl sm:text-3xl lg:text-4xl font-bold font-sans tracking-tight text-foreground leading-tight max-w-4xl mx-auto">
                  With CodeLadder, you'll know what to expect.
                </h2>
                <p className="mt-4 text-lg lg:text-xl text-muted-foreground max-w-3xl mx-auto">
                  Access insider interview questions from the largest companies
                </p>
                <div className="h-0.5 w-16 bg-[#5271FF] mx-auto mt-6"></div>
              </div>
              {/* Single grid for all logos - 4 cols on mobile, 5 on sm+ */}
              <div className="grid grid-cols-4 sm:grid-cols-5 items-center justify-items-center gap-x-4 gap-y-6 sm:gap-x-8 sm:gap-y-4 md:gap-x-2 md:gap-y-16 lg:gap-x-4 w-full">
                {allLogos.map((logo, index) => {
                  // Determine if this logo should be hidden on mobile
                  // We hide the 9th and 10th items (OpenAI and Airbnb which are now at index 8 and 9)
                  const isHiddenOnMobile = index === 8 || index === 9;
                  return (
                    <motion.img 
                      key={`logo-${index}`}
                      src={logo.src} 
                      alt={`${logo.alt} logo`}
                      className={cn(
                        "w-auto",
                        // Responsive height classes - base size increased for mobile
                        logo.alt === 'Amazon' 
                          ? "h-20 sm:h-16 md:h-20 lg:h-[7.5rem]"  // Mobile: h-20, sm: h-16, md: h-20, lg: h-[7.5rem]
                          : "h-24 sm:h-20 md:h-24 lg:h-32",        // Mobile: h-24, sm: h-20, md: h-24, lg: h-32
                        isHiddenOnMobile ? "hidden sm:block" : "block" // Hide specific logos on mobile
                      )}
                    />
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 