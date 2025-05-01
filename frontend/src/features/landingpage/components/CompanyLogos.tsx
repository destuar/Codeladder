import React from 'react';

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

  return (
    <div className="w-full py-10 bg-background">
      <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8">
        <div className="flex flex-col items-center">
          <div className="mb-12 text-center pt-8">
            <h3 className="text-xl font-medium text-foreground mb-1">
              Join thousands of engineers at the largest technology companies
            </h3>
            <div className="h-0.5 w-16 bg-[#5b5bf7]/30 mx-auto"></div>
          </div>
          <div className="flex flex-col items-center gap-10 w-full">
            <div className="flex justify-center items-center flex-wrap gap-x-16 gap-y-8">
              {logosRow1.map((logo, index) => (
                <div key={index} className="relative group before:content-[''] before:-inset-1 before:-z-10 before:bg-[radial-gradient(ellipse_at_center,rgba(255,255,255,0.5)_30%,transparent_80%)] before:opacity-0 group-hover:before:opacity-100 before:transition-opacity before:duration-300 before:blur-md">
                  <img 
                    src={logo.src} 
                    alt={`${logo.alt} logo`}
                    className="h-32 w-auto opacity-70 filter grayscale transition-all duration-300 group-hover:opacity-100 group-hover:grayscale-0"
                  />
                </div>
              ))}
            </div>
            <div className="flex justify-center items-center flex-wrap gap-x-16 gap-y-8">
              {logosRow2.map((logo, index) => (
                <div key={index} className="relative group before:content-[''] before:-inset-1 before:-z-10 before:bg-[radial-gradient(ellipse_at_center,rgba(255,255,255,0.5)_30%,transparent_80%)] before:opacity-0 group-hover:before:opacity-100 before:transition-opacity before:duration-300 before:blur-md">
                  <img 
                    src={logo.src} 
                    alt={`${logo.alt} logo`}
                    className="h-32 w-auto opacity-70 filter grayscale transition-all duration-300 group-hover:opacity-100 group-hover:grayscale-0"
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 