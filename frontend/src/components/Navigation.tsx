import { Link } from 'react-router-dom';
import { useAuth } from '@/features/auth/AuthContext';
import { useAdmin } from '@/features/admin/AdminContext';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from './ThemeToggle';
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { useProfile } from '@/features/profile/ProfileContext';
import { GlobalSearch } from './GlobalSearch';

export function Navigation() {
  const { user, logout } = useAuth();
  const { isAdminView, setIsAdminView, canAccessAdmin } = useAdmin();
  const { profile } = useProfile();

  return (
    <>
      <nav className="fixed top-0 left-0 right-0 border-b bg-background z-50">
        <div className="container flex items-center justify-between h-16">
          <div className="flex items-center gap-6">
            <Link to="/landing" className="text-xl font-bold" style={{ fontFamily: "'Patrick Hand', cursive" }}>
              CodeLadder
            </Link>
            <div className="w-72">
              <GlobalSearch />
            </div>
            {user && (
              <>
                <Link 
                  to="/dashboard" 
                  className="text-sm font-medium text-muted-foreground hover:text-foreground"
                  onClick={() => {
                    if (isAdminView) {
                      setIsAdminView(false);
                    }
                  }}
                >
                  Dashboard
                </Link>
                <Link 
                  to="/problems" 
                  className="text-sm font-medium text-muted-foreground hover:text-foreground"
                >
                  Problems
                </Link>
              </>
            )}
          </div>
          <div className="flex items-center gap-4">
            <ThemeToggle />
            {user ? (
              <div className="flex items-center gap-4">
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
              <div className="flex items-center gap-4">
                <Link to="/login">
                  <Button variant="outline">Login</Button>
                </Link>
                <Link to="/register">
                  <Button>Register</Button>
                </Link>
              </div>
            )}
          </div>
        </div>
      </nav>
      <div className="h-16" /> {/* Spacer for fixed header */}
    </>
  );
} 