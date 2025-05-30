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

  // Updated createLogoTransforms for a single grid
  const createLogoTransforms = (index: number) => {
    const NUM_LOGOS = allLogos.length;
    const ANIMATION_START_SCROLL_PROGRESS = 0.0; // Start animations from the beginning of scrollYProgress
    const TOTAL_SCROLL_PROGRESS_FOR_ANIMATION_STARTS = 0.6; // Spread out logo animation start times over this portion of scrollYProgress
    
    // Calculate stagger ensuring it's valid even if NUM_LOGOS is 0 or 1 (though NUM_LOGOS is 10 here)
    const STAGGER_PER_LOGO = NUM_LOGOS > 1 
      ? TOTAL_SCROLL_PROGRESS_FOR_ANIMATION_STARTS / (NUM_LOGOS - 1)
      : TOTAL_SCROLL_PROGRESS_FOR_ANIMATION_STARTS;
      
    const DURATION_OF_INDIVIDUAL_LOGO_ANIMATION_SCROLL = 0.2; // Each logo animates over this duration of scroll progress

    const start = ANIMATION_START_SCROLL_PROGRESS + index * STAGGER_PER_LOGO;
    const end = start + DURATION_OF_INDIVIDUAL_LOGO_ANIMATION_SCROLL;

    // Clamp values to ensure they are within [0, 1] and start < end
    const clampedStart = Math.max(0, Math.min(1 - 0.001, start)); // Ensure start is not 1
    const clampedEnd = Math.max(clampedStart + 0.001, Math.min(1, end)); // Ensure end is > start and not > 1
    
    const inputRange = [clampedStart, clampedEnd];

    const grayscale = useTransform(scrollYProgress, inputRange, [100, 0]);
    const opacity = useTransform(scrollYProgress, inputRange, [0.5, 1]); // Start with a bit more opacity

    const filter = useTransform(grayscale, value => `grayscale(${value}%)`);

    return { filter, opacity };
  };

  return (
    <div ref={sectionRef} className="w-full py-10">
      <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8">
        <div className="flex flex-col items-center">
          <div className="mb-12 text-center pt-8">
            <h3 className="mt-3 text-lg md:text-xl text-muted-foreground max-w-2xl lg:max-w-none mx-auto">
              Learn interview questions from the largest technology companies
            </h3>
            <div className="h-0.5 w-16 bg-[#5b5bf7]/30 mx-auto"></div>
          </div>
          {/* Single grid for all logos - 4 cols on mobile, 5 on sm+ */}
          <div className="grid grid-cols-4 sm:grid-cols-5 items-center justify-items-center gap-x-4 gap-y-6 sm:gap-x-8 sm:gap-y-4 md:gap-x-2 md:gap-y-16 lg:gap-x-4 w-full">
            {allLogos.map((logo, index) => {
              const { filter, opacity } = createLogoTransforms(index);
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
                  style={{ filter, opacity }}
                />
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
} 