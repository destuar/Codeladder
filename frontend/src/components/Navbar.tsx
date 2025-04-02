import { Link } from 'react-router-dom';
import { ThemeToggle } from "./ThemeToggle";
import { useLogoSrc } from '@/features/landingpage/hooks/useLogoSrc';

export function Navbar() {
  const logoSrc = useLogoSrc('banner');
  
  return (
    <nav className="border-b">
      <div className="container flex items-center justify-between h-16">
        <div className="flex items-center gap-6">
          <Link to="/landing" className="flex items-center">
            <img src={logoSrc} alt="CodeLadder Logo" className="h-14 w-auto" />
          </Link>
        </div>
        <div className="flex items-center gap-4">
          <ThemeToggle />
        </div>
      </div>
    </nav>
  );
} 