import { Link } from 'react-router-dom';
import { useAuth } from '@/features/auth/AuthContext';
import { Button } from './ui/button';

export function Navigation() {
  const { user, logout } = useAuth();

  return (
    <nav className="border-b">
      <div className="container flex h-16 items-center px-4">
        <Link to="/" className="font-bold text-xl">
          SmarterStruct
        </Link>

        <div className="ml-auto flex items-center space-x-4">
          {user ? (
            <>
              <Link to="/dashboard" className="text-sm font-medium">
                Dashboard
              </Link>
              <Link to="/profile" className="text-sm font-medium">
                Profile
              </Link>
              {(user.role === 'ADMIN' || user.role === 'DEVELOPER') && (
                <Link to="/admin" className="text-sm font-medium">
                  Admin
                </Link>
              )}
              <Button variant="ghost" onClick={logout}>
                Logout
              </Button>
            </>
          ) : (
            <>
              <Link to="/login">
                <Button variant="ghost">Login</Button>
              </Link>
              <Link to="/register">
                <Button>Sign Up</Button>
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
} 