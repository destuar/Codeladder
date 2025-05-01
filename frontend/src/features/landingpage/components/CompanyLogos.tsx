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
  const logosRow1 = [
    { src: googleLogo, alt: 'Google' },
    { src: metaLogo, alt: 'Meta' },
    { src: amazonLogo, alt: 'Amazon' },
    { src: appleLogo, alt: 'Apple' },
    { src: microsoftLogo, alt: 'Microsoft' },
  ];

  const logosRow2 = [
    { src: netflixLogo, alt: 'Netflix' },
    { src: openaiLogo, alt: 'OpenAI' },
    { src: salesforceLogo, alt: 'Salesforce' },
    { src: spotifyLogo, alt: 'Spotify' },
    { src: airbnbLogo, alt: 'Airbnb' },
  ];

  const sectionRef = useRef(null);
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start 0.75", "center start"]
  });

  const createLogoTransforms = (index: number, totalInRow: number, isSecondRow: boolean) => {
    const baseStart = isSecondRow ? 0.5 : 0.1;
    const totalProgressSpan = isSecondRow ? 0.4 : 0.5;
    const progressPerLogo = totalProgressSpan / totalInRow;
    const start = baseStart + index * progressPerLogo;
    const end = start + progressPerLogo * 2;

    const clampedStart = Math.max(0, Math.min(1, start));
    const clampedEnd = Math.max(0, Math.min(1, end));
    const inputRange = [clampedStart, clampedEnd];

    const grayscale = useTransform(scrollYProgress, inputRange, [100, 0]);
    const opacity = useTransform(scrollYProgress, inputRange, [0.7, 1]);

    const filter = useTransform(grayscale, value => `grayscale(${value}%)`);

    return { filter, opacity };
  };

  return (
    <div ref={sectionRef} className="w-full py-10 bg-background">
      <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8">
        <div className="flex flex-col items-center">
          <div className="mb-12 text-center pt-8">
            <h3 className="text-xl font-medium text-foreground mb-1">
              Learn interview questions from the largest technology companies
            </h3>
            <div className="h-0.5 w-16 bg-[#5b5bf7]/30 mx-auto"></div>
          </div>
          <div className="flex flex-col items-center gap-10 w-full">
            <div className="flex justify-center items-center flex-wrap gap-x-16 gap-y-8">
              {logosRow1.map((logo, index) => {
                const { filter, opacity } = createLogoTransforms(index, logosRow1.length, false);
                return (
                  <motion.img 
                    key={`row1-${index}`}
                    src={logo.src} 
                    alt={`${logo.alt} logo`}
                    className={cn(
                      "w-auto",
                      logo.alt === 'Amazon' ? "h-[7.5rem]" : "h-32"
                    )}
                    style={{ filter, opacity }}
                  />
                );
              })}
            </div>
            <div className="flex justify-center items-center flex-wrap gap-x-16 gap-y-8">
              {logosRow2.map((logo, index) => {
                const { filter, opacity } = createLogoTransforms(index, logosRow2.length, true);
                return (
                  <motion.img 
                    key={`row2-${index}`}
                    src={logo.src} 
                    alt={`${logo.alt} logo`}
                    className="h-32 w-auto"
                    style={{ filter, opacity }}
                  />
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 