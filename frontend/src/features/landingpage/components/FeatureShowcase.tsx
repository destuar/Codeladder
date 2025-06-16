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
    title: 'Climb the learning ladder and complete personalized career pathways',
    description: 'Begin your DSA learning journey as an Intern; progresssing through adaptive modules, quizzes, and leveling assessments at your own pace. Once you reach L7, you\'ll be prepared for interviews at any level.',
    imageLight: learnLightImg, // Use imported variable
    imageDark: learnDarkImg,   // Use imported variable
    imageAlt: 'Learn feature illustration'
  },
  {
    title: 'Practice real interview questions from hundreds of companies',
    description: 'Once you are ready, start working through a library of 1,000+ problems. Prepare with the company-specific questions that you are most likely to encounter during your interviews.',
    imageLight: practiceLightImg, // Use imported variable
    imageDark: practiceDarkImg,   // Use imported variable
    imageAlt: 'Practice feature illustration'
  },
  {
    title: 'Expedite your review process with the latest cognitive science research',
    description: 'You are likely to forget ~50% of newly learned information within an hour, and 70–80% within the first 24 hours. Instead, retain knowledge long-term with your personal review calendar.',
    imageLight: reviewLightImg, // Use imported variable
    imageDark: reviewDarkImg,   // Use imported variable
    imageAlt: 'Review feature illustration'
  },
  {
    title: 'Be the first to see new opportunities and get better interview results',
    description: 'After all your preparation, you should be the first to apply. Discover your curated list of relevant job opportunities and apply directly through your integrated job feed, updated by the minute.',
    imageLight: applyLightImg, // Use imported variable
    imageDark: applyDarkImg,   // Use imported variable
    imageAlt: 'Apply feature illustration'
  }
];

export function FeatureShowcase() {
  return (
    <section className="pt-16 md:pt-24 pb-16 md:pb-24 bg-transparent font-sans">
      <div className="container mx-auto px-4 md:px-6">
        <div className="text-center mb-12 md:mb-16">
          <h2 className="mt-3 text-2xl sm:text-3xl lg:text-4xl font-bold font-sans tracking-tight text-foreground leading-tight max-w-4xl mx-auto">
          Your roadmap to a role that’s worth it.
          </h2>
          <div className="h-0.5 w-16 bg-[#5271FF] mx-auto mt-6"></div>
        </div>

        <div className="space-y-12 md:space-y-20">
          {features.map((feature, index) => (
            <div
              key={feature.title}
              className={cn(
                'flex flex-col md:grid md:grid-cols-2 gap-8 md:gap-12 items-center',
              )}
            >
              {/* Image Container */}
              <div
                className={cn(
                  'rounded-lg aspect-video flex items-center justify-center p-0 overflow-hidden', // Changed padding to p-0 and added overflow-hidden
                  'order-2', // Image is second on mobile
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
                  'space-y-4 text-left',
                  'order-1', // Text is first on mobile
                  index % 2 === 0 ? 'md:order-2' : 'md:order-1' // Text on right for even, left for odd on md+
                )}
              >
                <h3 className="text-2xl md:text-3xl font-bold text-foreground font-sans">{feature.title}</h3>
                <p className="text-lg md:text-xl text-muted-foreground leading-relaxed font-sans">
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