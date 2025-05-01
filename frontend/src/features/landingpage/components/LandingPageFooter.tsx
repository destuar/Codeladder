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
      <div className="container mx-auto max-w-7xl flex flex-col md:flex-row justify-between items-start gap-4">
        {/* Group Logo and Copyright */}
        <div className="flex flex-col items-center md:items-start gap-2">
          {/* Logo */}
          <img 
            src={logoSrc} 
            alt="CodeLadder Logo" 
            className="h-12 w-auto"
          />
          {/* Copyright */}
          <div className="text-sm text-muted-foreground text-center md:text-left">
            © {currentYear} CodeLadder. All rights reserved.
          </div>
          {/* Social Icons */}
          <div className="flex gap-4 mt-2">
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
              href="#"
              target="_blank" 
              rel="noopener noreferrer" 
              aria-label="X (formerly Twitter)"
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <FaXTwitter className="h-5 w-5" />
            </a>
          </div>
        </div>

        {/* Right Side Links (Legal & Pages) */}
        <div className="flex flex-col md:flex-row gap-16 text-sm">
          {/* Legal Section */}
          <div className="flex flex-col gap-2 items-center md:items-start">
            <p className="font-semibold text-foreground mb-1">Legal</p>
            <Link to="/privacy" className="text-muted-foreground hover:text-foreground transition-colors">Privacy Policy</Link>
            <Link to="/terms" className="text-muted-foreground hover:text-foreground transition-colors">Terms of Service</Link>
          </div>

          {/* Pages Section */}
          <div className="flex flex-col gap-2 items-center md:items-start">
            <p className="font-semibold text-foreground mb-1">Pages</p>
            {/* Always show all links, adjust Practice/Review target based on auth */}
            <Link to="/login" className="text-muted-foreground hover:text-foreground transition-colors">Login</Link>
            <Link to="/register" className="text-muted-foreground hover:text-foreground transition-colors">Sign Up</Link>
            <Link 
              to={user ? "/dashboard" : "/login"} 
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              Practice
            </Link>
            <Link 
              to={user ? "/dashboard" : "/login"} 
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              Review
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
} 