import React from 'react';
import { cn } from '@/lib/utils';

// Import feature images
import learnLightImg from '../images/landing_ss/Learn (Light).svg';
import learnDarkImg from '../images/landing_ss/Learn (Dark).svg';
import practiceLightImg from '../images/landing_ss/Practice (Light).svg';
import practiceDarkImg from '../images/landing_ss/Practice (Dark).svg';
import reviewLightImg from '../images/landing_ss/Review (Light).svg';
import reviewDarkImg from '../images/landing_ss/Review (Dark).svg';
import applyLightImg from '../images/landing_ss/Apply (Light).svg';
import applyDarkImg from '../images/landing_ss/Apply (Dark).svg';

interface FeatureItem {
  title: string;
  description: string;
  imageLight: string; // Path to light mode image
  imageDark: string;  // Path to dark mode image
  imageAlt: string;
}

const features: FeatureItem[] = [
  {
    title: 'Learn',
    description: 'Begin your DSA learning journey as an Intern—progresssing through modules, quizzes, and leveling exams at your own pace. When you reach L7, you\'ll be prepared for interviews at any level.',
    imageLight: learnLightImg, // Use imported variable
    imageDark: learnDarkImg,   // Use imported variable
    imageAlt: 'Learn feature illustration'
  },
  {
    title: 'Practice',
    description: 'Once you are ready, start working through a vast library of hundreds of coding problems. Prepare with the company-specific problems that you are most likely to encounter during your interviews.',
    imageLight: practiceLightImg, // Use imported variable
    imageDark: practiceDarkImg,   // Use imported variable
    imageAlt: 'Practice feature illustration'
  },
  {
    title: 'Review',
    description: 'The latest memory research shows us that you forget roughly 50% of newly learned information within an hour, and 70–80% within the first 24 hours. Instead, review concepts at optimal intervals to retain knowledge long-term.',
    imageLight: reviewLightImg, // Use imported variable
    imageDark: reviewDarkImg,   // Use imported variable
    imageAlt: 'Review feature illustration'
  },
  {
    title: 'Apply',
    description: 'After all your preparation, you can be the first to apply. Discover your curated list of relevant job opportunities and apply directly through your integrated job feed. Powered by Built In, this list is updated by the minute.',
    imageLight: applyLightImg, // Use imported variable
    imageDark: applyDarkImg,   // Use imported variable
    imageAlt: 'Apply feature illustration'
  }
];

export function FeatureShowcase() {
  return (
    <section className="pt-32 md:pt-48 pb-16 md:pb-24 bg-transparent font-mono">
      <div className="container mx-auto px-4 md:px-6">
        <div className="text-center mb-12 md:mb-16">
          <p className="mt-3 text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
            Learn, Practice, Review, and Apply... all in one place.
          </p>
          <div className="h-0.5 w-16 bg-[#5b5bf7]/30 mx-auto"></div>
        </div>

        <div className="space-y-12 md:space-y-20">
          {features.map((feature, index) => (
            <div
              key={feature.title}
              className={cn(
                'grid md:grid-cols-2 gap-8 md:gap-12 items-center',
              )}
            >
              {/* Image Container */}
              <div
                className={cn(
                  'rounded-lg aspect-video flex items-center justify-center p-0 overflow-hidden', // Changed padding to p-0 and added overflow-hidden
                  index % 2 === 0 ? 'md:order-1' : 'md:order-2' // Image on left for even, right for odd on md+
                )}
              >
                <img 
                  src={feature.imageLight} 
                  alt={feature.imageAlt} 
                  className="block dark:hidden w-full h-full object-contain rounded-md" 
                />
                <img 
                  src={feature.imageDark} 
                  alt={feature.imageAlt} 
                  className="hidden dark:block w-full h-full object-contain rounded-md" 
                />
              </div>

              {/* Text Content */}
              <div
                className={cn(
                  'space-y-4 text-center',
                  index % 2 === 0 ? 'md:order-2' : 'md:order-1' // Text on right for even, left for odd on md+
                )}
              >
                <h3 className="text-2xl md:text-3xl font-bold text-[#5271FF] font-sans">{feature.title}</h3>
                <p className="text-base md:text-lg text-muted-foreground leading-relaxed font-sans">
                  {feature.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
} 