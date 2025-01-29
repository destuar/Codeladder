import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { jwtDecode } from 'jwt-decode';
import { api } from '../../lib/api';
import { User } from '../../types/user';

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
  error: string | null;
  setUser: (user: User | null) => void;
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
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshTimeout, setRefreshTimeout] = useState<NodeJS.Timeout>();

  // Load user profile
  const loadUserProfile = async (accessToken: string) => {
    try {
      const userData = await api.get('/profile/me', accessToken);
      console.log('Loaded user profile:', userData);
      setUser(userData);
    } catch (err) {
      console.error('Error loading user profile:', err);
      setError('Failed to load user profile');
    }
  };

  const setupRefreshToken = (accessToken: string) => {
    if (refreshTimeout) {
      clearTimeout(refreshTimeout);
    }

    try {
      const decoded = jwtDecode(accessToken);
      const exp = decoded.exp;

      if (!exp) return;

      // Refresh 1 minute before expiration
      const timeUntilRefresh = (exp * 1000) - Date.now() - (60 * 1000);
      
      // Don't set up refresh if token is already expired
      if (timeUntilRefresh <= 0) {
        console.log('Token already expired, refreshing now...');
        refreshToken();
        return;
      }

      console.log('Setting up refresh timeout for', timeUntilRefresh, 'ms');
      const timeout = setTimeout(refreshToken, timeUntilRefresh);
      setRefreshTimeout(timeout);
    } catch (err) {
      console.error('Error setting up token refresh:', err);
    }
  };

  const refreshToken = async () => {
    try {
      console.log('Refreshing token...');
      const data = await api.post('/auth/refresh', {});
      console.log('Token refreshed successfully');
      setToken(data.accessToken);
      await loadUserProfile(data.accessToken);
      setupRefreshToken(data.accessToken);
    } catch (err) {
      console.error('Error refreshing token:', err);
      if (err instanceof Error && err.message === 'Unauthorized') {
        if (user) {
          console.log('Unauthorized during refresh, logging out');
          await logout();
        }
      }
    }
  };

  useEffect(() => {
    const checkSession = async () => {
      try {
        await refreshToken();
      } catch (err) {
        console.error('Error checking session:', err);
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

  const register = async (email: string, password: string, name: string) => {
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
      value={{ user, token, login, register, logout, isLoading, error, setUser }}
    >
      {children}
    </AuthContext.Provider>
  );
}; 