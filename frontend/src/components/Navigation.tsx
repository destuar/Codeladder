import { Link } from 'react-router-dom';
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

export function Navigation() {
  const { user, logout } = useAuth();
  const { isAdminView, setIsAdminView, canAccessAdmin } = useAdmin();
  const { profile } = useProfile();
  const [isScrolled, setIsScrolled] = useState(false);
  const logoSrc = useLogoSrc('banner', isScrolled);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };

    window.addEventListener('scroll', handleScroll);
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  return (
    <>
      <nav 
        className={cn(
          "fixed top-0 left-0 right-0 z-50 transition-[background-color,top,max-width,box-shadow,backdrop-filter] duration-300 ease-in-out",
          "mx-auto",
          {
            "top-4 max-w-6xl rounded-full shadow-md border-none bg-background/90 backdrop-blur-sm": isScrolled,
            "bg-background max-w-full": !isScrolled
          }
        )}
      >
        <div 
          className={cn(
            "relative flex items-center h-16 transition-[padding] duration-200 ease-in-out",
            isScrolled ? "px-4" : "px-6"
          )}
        >
          <div className="flex items-center flex-shrink-0">
            <Link to="/landing" className="flex items-center gap-2">
              <img 
                src={logoSrc} 
                alt="CodeLadder Logo" 
                className={cn(
                  "w-auto transition-all duration-200 ease-in-out",
                  isScrolled ? "h-12" : "h-14"
                )}
              />
            </Link>
          </div>

          <div 
            className={cn(
              "absolute inset-y-0 left-1/2 -translate-x-1/2",
              "flex items-center justify-center gap-12 transition-opacity duration-200 ease-in-out"
            )}
          >
            {!canAccessAdmin ? (
              <TooltipProvider delayDuration={100}>
                <Tooltip>
                  <TooltipTrigger 
                    asChild
                    onClick={(e) => {
                      e.preventDefault();
                    }}
                  >
                    <span className="text-base font-medium text-muted-foreground hover:text-foreground cursor-pointer">
                      Learn
                    </span>
                  </TooltipTrigger>
                  <TooltipContent className="text-primary">
                    <p>Coming Soon</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
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
              <span className="relative inline-block px-1 py-0.5">
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
            <TooltipProvider delayDuration={100}>
              <Tooltip>
                <TooltipTrigger 
                  asChild
                  onClick={(e) => {
                    e.preventDefault();
                  }}
                >
                  <span className="text-base font-medium text-muted-foreground hover:text-foreground cursor-pointer">
                    Apply
                  </span>
                </TooltipTrigger>
                <TooltipContent className="text-primary">
                  <p>Coming Soon</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>

          <div 
            className={cn(
              "flex items-center flex-shrink-0 ml-auto transition-[gap] duration-200 ease-in-out",
              isScrolled ? "gap-4" : "gap-6"
            )}
          >
            <ThemeToggle />
            {user ? (
              <div className={cn("flex items-center", isScrolled ? "gap-2" : "gap-4")}>
                {canAccessAdmin && (
                  <Button
                    variant="outline"
                    onClick={() => setIsAdminView(!isAdminView)}
                  >
                    {isAdminView ? 'Exit Admin' : 'Admin View'}
                  </Button>
                )}
                <Button variant="outline" onClick={logout}>
                  Logout
                </Button>
                <Link to="/profile">
                  <Avatar className="h-9 w-9 transition-transform hover:scale-105">
                    <AvatarImage src={profile?.avatarUrl} />
                    <AvatarFallback>{user.name?.[0] || user.email?.[0]}</AvatarFallback>
                  </Avatar>
                </Link>
              </div>
            ) : (
              <div className="flex items-center gap-6">
                <Link to="/login" className="text-base font-medium text-muted-foreground hover:text-foreground">
                  Login
                </Link>
                <Link to="/register">
                  <Button 
                    className={cn(
                      "bg-[#5b5bf7] hover:bg-[#4a4af0] text-white transition-[padding] duration-200 ease-in-out",
                      isScrolled ? "px-3 py-1.5 text-sm" : ""
                    )}
                  >
                    Sign up
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </div>
      </nav>
    </>
  );
} 