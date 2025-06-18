import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/features/auth/AuthContext';
import { useAdmin } from '@/features/admin/AdminContext';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from './ThemeToggle';
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { useProfile } from '@/features/profile/ProfileContext';
import { GlobalSearch } from './GlobalSearch';
import { useLogoSrc } from '@/features/landingpage/hooks/useLogoSrc';
import { useState, useEffect } from 'react';
import { cn } from "@/lib/utils";
import { 
  Tooltip, 
  TooltipContent, 
  TooltipProvider, 
  TooltipTrigger 
} from "@/components/ui/tooltip";
import { Dialog, DialogTrigger, DialogContent, DialogClose, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Menu } from "lucide-react";
import { useMediaQuery } from '@/hooks/useMediaQuery';

export function Navigation() {
  const location = useLocation();
  const { user, logout } = useAuth();
  const { isAdminView, setIsAdminView, canAccessAdmin } = useAdmin();
  const { profile } = useProfile();
  const [isScrolled, setIsScrolled] = useState(false);
  const isDesktop = useMediaQuery('(min-width: 1024px)');
  
  const isLandingPage = location.pathname === '/landing';
  const shouldApplyScrollStyles = isLandingPage && isScrolled;
  const shouldApplyDesktopScrollStyles = isDesktop && shouldApplyScrollStyles;
  
  const logoSrc = useLogoSrc('banner', shouldApplyDesktopScrollStyles);

  useEffect(() => {
    // Reset scroll state when path changes *away* from landing page
    if (!isLandingPage) {
      setIsScrolled(false);
    }

    if (isLandingPage) {
      const handleScroll = () => {
        setIsScrolled(window.scrollY > 50);
      };
      window.addEventListener('scroll', handleScroll);
      handleScroll(); // Initial check
      return () => {
        window.removeEventListener('scroll', handleScroll);
        // No need to reset isScrolled here, handled by path change or initial state
      };
    }
    // No listener needed if not on landing page
    return () => {};
  }, [location.pathname, isLandingPage]); // Depend on isLandingPage as well

  return (
    <>
      <nav 
        className={cn(
          "fixed left-0 right-0 top-0 z-50", // Always fixed on mobile
          "border-b bg-background dark:border-transparent", // Default mobile background/border, dark mode border transparent
          isLandingPage
            ? "lg:fixed lg:bg-transparent lg:border-none lg:transition-[top] lg:duration-700 lg:ease-in-out" // Desktop Landing: fixed, transparent, transitions
            : "lg:relative", // Desktop Other: relative (keeps bg/border from base)
          { // Desktop Landing scroll effects ONLY
            "lg:top-4": shouldApplyScrollStyles
          }
        )}
      >
        <div
          className={cn(
            "mx-auto max-w-full", // Base styles for mobile (always max-w)
            isLandingPage
              ? "lg:transition-[background-color,max-width,box-shadow,backdrop-filter,border-radius] lg:duration-700 lg:ease-in-out" // Desktop Landing: Apply transitions
              : "",
            { // Desktop Landing scroll effects ONLY
              "lg:max-w-5xl lg:rounded-full lg:shadow-md lg:border-none lg:bg-background/95 lg:backdrop-blur-sm": shouldApplyScrollStyles,
              "lg:bg-transparent lg:backdrop-blur-none": isLandingPage && !isScrolled,
              // Mobile defaults to max-w-full, desktop handled above
            }
          )}
        >
          <div 
            className={cn(
              "relative flex items-center justify-between h-16", // Added justify-between
              "px-6", // Default mobile padding
              isLandingPage
                ? "lg:transition-[padding] lg:duration-700 lg:ease-in-out" // Desktop Landing: Apply transition
                : "lg:px-12", // Desktop Other: Apply padding
              { // Desktop Landing scroll effects ONLY
                "lg:px-4": shouldApplyScrollStyles, // Desktop Landing Scrolled state
                "lg:px-12": isLandingPage && !isScrolled // Desktop Landing Initial state
              }
            )}
          >
            <div className="flex items-center flex-shrink-0">
              <Link to="/landing" className="flex items-center gap-2">
                <img 
                  src={logoSrc} 
                  alt="CodeLadder Logo" 
                  className={cn(
                    "w-auto h-14", // Default mobile height, no transition needed for mobile
                    "lg:transition-all lg:duration-200 lg:ease-in-out", // Desktop height transition
                    {
                      "lg:h-[3.25rem]": shouldApplyScrollStyles // Desktop Landing Scrolled height ONLY
                    }
                  )}
                />
              </Link>
            </div>

            <div 
              className={cn(
                "absolute inset-y-0 left-1/2 -translate-x-1/2",
                "hidden lg:flex items-center justify-center gap-12 transition-opacity duration-200 ease-in-out"
              )}
            >
              {user ? (
                <Link 
                  to="/dashboard" 
                  className="text-base font-medium text-muted-foreground hover:text-foreground"
                  onClick={() => {
                    if (isAdminView) {
                      setIsAdminView(false);
                    }
                  }}
                >
                  Learn
                </Link>
              ) : (
                <Link 
                  to="/login" 
                  className="text-base font-medium text-muted-foreground hover:text-foreground"
                >
                  Learn
                </Link>
              )}
              <Link 
                to={user ? "/collections" : "/login"}
                className="text-base font-medium text-muted-foreground hover:text-foreground"
              >
                Practice
              </Link>
              <Link
                to="/review"
                className="text-base font-medium text-muted-foreground hover:text-foreground"
                onClick={() => {
                  if (isAdminView) {
                    setIsAdminView(false);
                  }
                }}
              >
                Review
              </Link>
              <Link
                to="/apply"
                className="text-base font-medium text-muted-foreground hover:text-foreground"
              >
                Apply
              </Link>
            </div>

            <div 
              className={cn(
                "flex items-center flex-shrink-0", // Base styles, removed ml-auto
                "gap-3", // Default mobile gap
                isLandingPage
                  ? "lg:transition-[gap] lg:duration-700 lg:ease-in-out" // Desktop Landing: Apply transition
                  : "lg:gap-6", // Desktop Other: Apply specific gap
                { // Desktop Conditional overrides
                  "lg:gap-4": isLandingPage && isScrolled, // Desktop Landing scrolled gap
                  "lg:gap-6": isLandingPage && !isScrolled // Desktop Landing initial gap (redundant but clear)
                }
              )}
            >
              {/* Always-visible Theme Toggle */}
              <ThemeToggle />
              {/* Add desktop user controls for large screens */}
              <div className="hidden lg:flex items-center gap-4">
                {user && canAccessAdmin && (
                  <Button variant="outline" onClick={() => setIsAdminView(!isAdminView)}>
                    {isAdminView ? 'Exit Admin' : 'Admin View'}
                  </Button>
                )}
                {user && (
                  <span onClick={logout} className="text-base font-medium text-muted-foreground hover:text-foreground cursor-pointer">
                    Logout
                  </span>
                )}
                {user && (
                  <Link to="/profile">
                    <Avatar className="h-9 w-9 transition-transform hover:scale-105">
                      <AvatarImage src={profile?.avatarUrl} />
                      <AvatarFallback>{user.name?.[0] || user.email?.[0]}</AvatarFallback>
                    </Avatar>
                  </Link>
                )}
                {!user && (
                  <Link to="/login" className="text-base font-medium text-muted-foreground hover:text-foreground">
                    Login
                  </Link>
                )}
                {!user && (
                  <Link to="/register">
                    <Button className="bg-[#5271FF] hover:bg-[#415ACC] text-white text-base rounded-full px-5">
                      Sign up
                    </Button>
                  </Link>
                )}
              </div>
              {/* Mobile Hamburger Menu Trigger */}
              <Dialog>
                <DialogTrigger asChild>
                  <button className="p-2 lg:hidden">
                    <Menu className="h-6 w-6 text-foreground" />
                    <span className="sr-only">Open navigation menu</span>
                  </button>
                </DialogTrigger>
                <DialogContent className="lg:hidden fixed inset-x-0 top-0 z-50 bg-background p-4 !left-0 !top-0 !translate-x-0 !translate-y-0 !max-w-none">
                  <DialogHeader className="sr-only">
                    <DialogTitle>Navigation Menu</DialogTitle>
                    <DialogDescription>Mobile navigation options and user controls</DialogDescription>
                  </DialogHeader>
                  <div className="flex flex-col space-y-4">
                    {/* Top Row: Conditional based on login status */}
                    {!user && (
                      <div className="flex items-center gap-4">
                        <DialogClose asChild>
                          <Link to="/login" className="text-base font-medium text-foreground">
                            Login
                          </Link>
                        </DialogClose>
                        <DialogClose asChild>
                          <Link to="/register">
                            <Button className="bg-[#5271FF] hover:bg-[#415ACC] text-white text-base rounded-full px-5">
                              Sign up
                            </Button>
                          </Link>
                        </DialogClose>
                      </div>
                    )}

                    {/* Separator */}
                    {!user && <hr className="border-divider" />}

                    {/* Navigation Links */}
                    {user ? (
                      <DialogClose asChild>
                        <Link
                          to="/dashboard"
                          className="text-base font-medium text-muted-foreground hover:text-foreground"
                          onClick={() => {
                            if (isAdminView) setIsAdminView(false);
                          }}
                        >
                          Learn
                        </Link>
                      </DialogClose>
                    ) : (
                      <DialogClose asChild>
                        <Link
                          to="/login"
                          className="text-base font-medium text-muted-foreground hover:text-foreground"
                        >
                          Learn
                        </Link>
                      </DialogClose>
                    )}
                    <DialogClose asChild>
                      <Link
                        to={user ? "/collections" : "/login"}
                        className="text-base font-medium text-muted-foreground hover:text-foreground"
                      >
                        Practice
                      </Link>
                    </DialogClose>
                    <DialogClose asChild>
                      <Link
                        to="/review"
                        className="text-base font-medium text-muted-foreground hover:text-foreground"
                        onClick={() => {
                          if (isAdminView) {
                            setIsAdminView(false);
                          }
                        }}
                      >
                        Review
                      </Link>
                    </DialogClose>
                    <DialogClose asChild>
                      <Link
                        to="/apply"
                        className="text-base font-medium text-muted-foreground hover:text-foreground"
                      >
                        Apply
                      </Link>
                    </DialogClose>
                    <hr className="border-divider" />
                    {/* User/Auth Controls (Main List - Profile and Logout) */}
                    {user && (
                      <DialogClose asChild>
                        <Link to="/profile" className="text-base font-medium text-muted-foreground hover:text-foreground">
                          Profile
                        </Link>
                      </DialogClose>
                    )}
                    {user && (
                      <DialogClose asChild>
                        <span onClick={logout} className="text-base font-medium text-muted-foreground hover:text-foreground cursor-pointer">
                          Logout
                        </span>
                      </DialogClose>
                    )}
                    {user && canAccessAdmin && (
                      <DialogClose asChild>
                        <Button variant="outline" onClick={() => setIsAdminView(!isAdminView)}>
                          {isAdminView ? "Exit Admin" : "Admin View"}
                        </Button>
                      </DialogClose>
                    )}
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </div>
      </nav>
    </>
  );
} 