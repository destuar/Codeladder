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

export function Navigation() {
  const location = useLocation();
  const { user, logout } = useAuth();
  const { isAdminView, setIsAdminView, canAccessAdmin } = useAdmin();
  const { profile } = useProfile();
  const [isScrolled, setIsScrolled] = useState(false);
  
  const isLandingPage = location.pathname === '/landing';
  const shouldApplyScrollStyles = isLandingPage && isScrolled;
  
  const logoSrc = useLogoSrc('banner', shouldApplyScrollStyles); // Use combined state

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
          "left-0 right-0 z-50", // Base styles
          isLandingPage 
            ? "fixed transition-[top] duration-700 ease-in-out" // Landing page: fixed positioning and transition
            : "relative border-b bg-background", // Other pages: relative positioning, border, background
          {
            // These only have effect if fixed positioning is applied (i.e., on landing page)
            "top-0": isLandingPage && !isScrolled, // Initial top position for landing page
            "top-4": shouldApplyScrollStyles,     // Scrolled top position for landing page
          }
        )}
      >
        <div
          className={cn(
            "mx-auto", // Base styles
            isLandingPage 
              ? "transition-[background-color,max-width,box-shadow,backdrop-filter,border-radius] duration-700 ease-in-out" // Apply transitions only on landing page
              : "", // No transitions needed for other pages
            {
              // Styles for scrolled state on landing page
              "max-w-5xl rounded-full shadow-md border-none bg-background/95 backdrop-blur-sm": shouldApplyScrollStyles,
              // Styles for initial state on landing page (transparent background)
              "max-w-full bg-transparent backdrop-blur-none": isLandingPage && !isScrolled,
              // Styles for non-landing pages (ensure full width, standard background handled by nav)
              "max-w-full": !isLandingPage 
            }
          )}
        >
          <div 
            className={cn(
              "relative flex items-center justify-between h-16", // Added justify-between
              isLandingPage 
                ? "transition-[padding] duration-700 ease-in-out" // Apply transition only on landing page
                : "px-6 lg:px-12", // Adjusted padding for mobile and lg+ non-landing pages
              {
                // Padding variations for landing page
                "px-4": shouldApplyScrollStyles, // Scrolled state (remains px-4 for mobile and desktop)
                "px-6 lg:px-12": isLandingPage && !isScrolled // Initial state (mobile and lg+)
              }
            )}
          >
            <div className="flex items-center flex-shrink-0">
              <Link to="/landing" className="flex items-center gap-2">
                <img 
                  src={logoSrc} 
                  alt="CodeLadder Logo" 
                  className={cn(
                    "w-auto transition-all duration-200 ease-in-out", // Logo height transition
                    {
                      "h-[3.25rem]": shouldApplyScrollStyles, // Scrolled height on landing page
                      "h-14": !shouldApplyScrollStyles // Default height (initial landing or other pages)
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
              {!canAccessAdmin ? (
                <Dialog>
                  <DialogTrigger asChild>
                    <span className="text-base font-medium text-muted-foreground hover:text-foreground cursor-pointer">
                      Learn
                    </span>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                      <DialogTitle>Feature Coming Soon</DialogTitle>
                      <DialogDescription>
                        The full 'Learn' section featuring the mastery-based learning dashboard is currently under development. Check back later!
                      </DialogDescription>
                    </DialogHeader>
                  </DialogContent>
                </Dialog>
              ) : (
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
              )}
              <Link 
                to={user ? "/collections" : "/login"}
                className="text-base font-medium text-muted-foreground hover:text-foreground"
              >
                <span className="relative inline-block py-0.5">
                  Practice
                  <span 
                    className="absolute top-0 right-0 translate-x-3/4 -translate-y-1/4 rotate-[15deg] text-[0.6rem] font-bold leading-none text-[#5b5bf7] bg-[#5b5bf7]/10 px-0.5 py-0.5 rounded-sm shadow-[0_0_6px_#5b5bf7]"
                  >
                    NEW
                  </span>
                </span>
              </Link>
              <Link 
                to={user ? "/review" : "/login"}
                className="text-base font-medium text-muted-foreground hover:text-foreground"
              >
                Review
              </Link>
              <Dialog>
                <DialogTrigger asChild>
                  <span className="text-base font-medium text-muted-foreground hover:text-foreground cursor-pointer">
                    Apply
                  </span>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[425px]">
                  <DialogHeader>
                    <DialogTitle>Feature Coming Soon</DialogTitle>
                    <DialogDescription>
                      The 'Apply' section featuring projects and challenges is currently under development. Check back later!
                    </DialogDescription>
                  </DialogHeader>
                </DialogContent>
              </Dialog>
            </div>

            <div 
              className={cn(
                "flex items-center flex-shrink-0", // Base styles, removed ml-auto
                "gap-3 lg:gap-6", // Slightly increased mobile gap, larger desktop gap
                isLandingPage ? "transition-[gap] duration-700 ease-in-out" : "", // Apply transition only on landing page
                { // Conditional overrides
                  "gap-4 lg:gap-4": isLandingPage && isScrolled // Smaller gap when landing page is scrolled (applies to both mobile/desktop)
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
                    <Button className="bg-[#5b5bf7] hover:bg-[#4a4af0] text-white text-base rounded-full px-5">
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
                  <div className="flex flex-col space-y-4">
                    {/* Top Row: Login/Sign up (only if logged out) */}
                    {!user && (
                      <div className="flex items-center gap-4">
                        <DialogClose asChild>
                          <Link to="/login" className="text-base font-medium text-foreground">
                            Login
                          </Link>
                        </DialogClose>
                        <DialogClose asChild>
                          <Link to="/register">
                            <Button className="bg-[#5b5bf7] hover:bg-[#4a4af0] text-white text-base rounded-full px-5">
                              Sign up
                            </Button>
                          </Link>
                        </DialogClose>
                      </div>
                    )}

                    {/* Separator (only if logged out) */}
                    {!user && <hr className="border-divider" />}

                    {/* Navigation Links */}
                    {!canAccessAdmin ? (
                      <DialogClose asChild>
                        <Dialog>
                          <DialogTrigger asChild>
                            <span className="text-base font-medium text-muted-foreground hover:text-foreground cursor-pointer">
                              Learn
                            </span>
                          </DialogTrigger>
                          <DialogContent className="sm:max-w-[425px]">
                            <DialogHeader>
                              <DialogTitle>Feature Coming Soon</DialogTitle>
                              <DialogDescription>
                                The full 'Learn' section featuring the mastery-based learning dashboard is currently under development. Check back later!
                              </DialogDescription>
                            </DialogHeader>
                          </DialogContent>
                        </Dialog>
                      </DialogClose>
                    ) : (
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
                    )}
                    <DialogClose asChild>
                      <Link
                        to={user ? "/collections" : "/login"}
                        className="text-base font-medium text-muted-foreground hover:text-foreground"
                      >
                        <span className="relative inline-block py-0.5">
                          Practice
                          <span className="absolute top-0 right-0 translate-x-3/4 -translate-y-1/4 rotate-[15deg] text-[0.6rem] font-bold leading-none text-[#5b5bf7] bg-[#5b5bf7]/10 px-0.5 py-0.5 rounded-sm shadow-[0_0_6px_#5b5bf7]">
                            NEW
                          </span>
                        </span>
                      </Link>
                    </DialogClose>
                    <DialogClose asChild>
                      <Link
                        to={user ? "/review" : "/login"}
                        className="text-base font-medium text-muted-foreground hover:text-foreground"
                      >
                        Review
                      </Link>
                    </DialogClose>
                    <DialogClose asChild>
                      <Dialog>
                        <DialogTrigger asChild>
                          <span className="text-base font-medium text-muted-foreground hover:text-foreground cursor-pointer">
                            Apply
                          </span>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[425px]">
                          <DialogHeader>
                            <DialogTitle>Feature Coming Soon</DialogTitle>
                            <DialogDescription>
                              The 'Apply' section featuring projects and challenges is currently under development. Check back later!
                            </DialogDescription>
                          </DialogHeader>
                        </DialogContent>
                      </Dialog>
                    </DialogClose>
                    <hr className="border-divider" />
                    {/* User/Auth Controls */}
                    {user && canAccessAdmin && (
                      <DialogClose asChild>
                        <Button variant="outline" onClick={() => setIsAdminView(!isAdminView)}>
                          {isAdminView ? "Exit Admin" : "Admin View"}
                        </Button>
                      </DialogClose>
                    )}
                    {user && (
                      <DialogClose asChild>
                        <span onClick={logout} className="text-base font-medium text-foreground cursor-pointer">
                          Logout
                        </span>
                      </DialogClose>
                    )}
                    {user && (
                      <DialogClose asChild>
                        <Link to="/profile">
                          <Avatar className="h-9 w-9 transition-transform hover:scale-105">
                            <AvatarImage src={profile?.avatarUrl} />
                            <AvatarFallback>{user.name?.[0] || user.email?.[0]}</AvatarFallback>
                          </Avatar>
                        </Link>
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