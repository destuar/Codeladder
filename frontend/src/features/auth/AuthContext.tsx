import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { jwtDecode } from 'jwt-decode';
import { api } from '../../lib/api';

interface User {
  id: string;
  email: string;
  name?: string;
  role: 'USER' | 'ADMIN' | 'DEVELOPER';
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name?: string) => Promise<void>;
  logout: () => Promise<void>;
  isLoading: boolean;
  error: string | null;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshTimeout, setRefreshTimeout] = useState<NodeJS.Timeout>();

  const setupRefreshToken = (accessToken: string) => {
    if (refreshTimeout) {
      clearTimeout(refreshTimeout);
    }

    try {
      const decoded = jwtDecode(accessToken);
      const exp = decoded.exp;

      if (!exp) return;

      const timeUntilRefresh = (exp * 1000) - Date.now() - (60 * 1000);
      const timeout = setTimeout(refreshToken, timeUntilRefresh);
      setRefreshTimeout(timeout);
    } catch (err) {
      console.error('Error setting up token refresh:', err);
    }
  };

  const refreshToken = async () => {
    if (!user) return;
    
    try {
      const data = await api.post('/auth/refresh', {});
      setToken(data.accessToken);
      setUser(data.user);
      setupRefreshToken(data.accessToken);
    } catch (err) {
      if (user) {
        await logout();
      }
    }
  };

  useEffect(() => {
    const checkSession = async () => {
      try {
        await refreshToken();
      } catch (err) {
        // Ignore refresh errors on initial load
      } finally {
        setIsLoading(false);
      }
    };
    
    checkSession();

    return () => {
      if (refreshTimeout) {
        clearTimeout(refreshTimeout);
      }
    };
  }, []);

  const login = async (email: string, password: string) => {
    try {
      setError(null);
      setIsLoading(true);

      const data = await api.post('/auth/login', { email, password });
      setToken(data.accessToken);
      setUser(data.user);
      setupRefreshToken(data.accessToken);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (email: string, password: string, name?: string) => {
    try {
      setError(null);
      setIsLoading(true);

      const data = await api.post('/auth/register', { email, password, name });
      setToken(data.accessToken);
      setUser(data.user);
      setupRefreshToken(data.accessToken);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      if (token) {
        await api.post('/auth/logout', {}, token);
      }
    } catch (err) {
      console.error('Error during logout:', err);
    } finally {
      setUser(null);
      setToken(null);
      if (refreshTimeout) {
        clearTimeout(refreshTimeout);
      }
    }
  };

  return (
    <AuthContext.Provider
      value={{ user, token, login, register, logout, isLoading, error }}
    >
      {children}
    </AuthContext.Provider>
  );
}; 