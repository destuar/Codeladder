import React from 'react';
import { Link } from 'react-router-dom';
import { useLogoSrc } from '@/features/landingpage/hooks/useLogoSrc';
import { FaLinkedin, FaXTwitter } from 'react-icons/fa6';
import { useAuth } from '@/features/auth/AuthContext';

export function LandingPageFooter() {
  const currentYear = new Date().getFullYear();
  const logoSrc = useLogoSrc('banner');
  const { user } = useAuth();

  return (
    <footer className="w-full bg-transparent pt-4 pb-4 px-4 md:px-6 lg:px-8 mt-12 relative z-10">
      <div className="container mx-auto max-w-7xl flex flex-col items-center md:flex-row md:justify-between md:items-end gap-8 md:gap-4">
        
        {/* Legal & Pages Group - Order 1 on mobile, Order 2 on md+ */}
        {/* On mobile: centered row, Legal & Pages are columns within it */}
        {/* On desktop: pushed to the right, Legal & Pages are columns with larger gap */}
        <div className="flex flex-row justify-center items-start gap-20 md:order-2 md:w-auto md:justify-between md:gap-16 text-sm">
          {/* Legal Section - Text always left-aligned */}
          <div className="flex flex-col gap-2 items-start">
            <p className="font-semibold text-foreground mb-1">Legal</p>
            <Link to="/info/privacy" className="text-muted-foreground hover:text-foreground transition-colors">Privacy Policy</Link>
            <Link to="/info/terms" className="text-muted-foreground hover:text-foreground transition-colors">Terms of Service</Link>
          </div>

          {/* Pages Section - Text always left-aligned */}
          <div className="flex flex-col gap-2 items-start">
            <p className="font-semibold text-foreground mb-1">Pages</p>
            <Link to="/login" className="text-muted-foreground hover:text-foreground transition-colors">Login</Link>
            <Link to="/register" className="text-muted-foreground hover:text-foreground transition-colors">Sign Up</Link>
          </div>
        </div>

        {/* Logo, Social Icons, and Copyright Group - Order 2 on mobile, Order 1 on md+ */}
        {/* Reduced top margin on mobile (mt-6) */}
        <div className="flex flex-col items-center md:items-start gap-2 md:order-1 mt-6 md:mt-0">
          {/* Logo and Social Icons container */}
          <div className="flex flex-row items-center gap-4">
            <img 
              src={logoSrc} 
              alt="CodeLadder Logo" 
              className="h-12 w-auto"
            />
            <div className="flex gap-4">
              <a 
                href="https://www.linkedin.com/company/codeladderio"
                target="_blank" 
                rel="noopener noreferrer" 
                aria-label="LinkedIn"
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <FaLinkedin className="h-5 w-5" />
              </a>
              <a 
                href="#" // Placeholder for X/Twitter link
                target="_blank" 
                rel="noopener noreferrer" 
                aria-label="X (formerly Twitter)"
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <FaXTwitter className="h-5 w-5" />
              </a>
            </div>
          </div>
          {/* Copyright (Now below Logo + Social group) */} 
          <div className="text-sm text-muted-foreground text-center md:text-left mt-4 md:mt-2">
            © {currentYear} CodeLadder. All rights reserved.
          </div>
        </div>

      </div>
    </footer>
  );
} 