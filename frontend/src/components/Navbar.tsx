import { Link } from 'react-router-dom';
import { ThemeToggle } from "./ThemeToggle";

export function Navbar() {
  return (
    <nav className="border-b">
      <div className="container flex items-center justify-between h-16">
        <div className="flex items-center gap-6">
          <Link to="/landing" className="text-xl font-bold" style={{ fontFamily: "'Patrick Hand', cursive" }}>
            CodeLadder
          </Link>
        </div>
        <div className="flex items-center gap-4">
          <ThemeToggle />
        </div>
      </div>
    </nav>
  );
} 