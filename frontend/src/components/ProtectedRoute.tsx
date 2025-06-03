import { ReactNode } from 'react';
import { useAuth } from '@/features/auth/AuthContext';
import LoginPage from '@/features/auth/LoginPage';
import { LoadingScreen } from '@/components/ui/loading-spinner';

interface ProtectedRouteProps {
  children: ReactNode;
}

function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <LoadingScreen text="Checking authentication..." />;
  }

  if (!user) {
    return <LoginPage />;
  }

  return <>{children}</>;
}

export default ProtectedRoute; 