import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { jwtDecode } from 'jwt-decode';
import { api } from '../../lib/api';
import { User } from '../../types/user';

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  loginWithProvider: (provider: 'google' | 'github' | 'apple') => Promise<void>;
  register: (email: string, password: string, name?: string) => Promise<void>;
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

  // Load saved auth state
  useEffect(() => {
    const savedToken = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');
    
    if (savedToken && savedUser) {
      setToken(savedToken);
      setUser(JSON.parse(savedUser));
    }
  }, []);

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
    const savedToken = localStorage.getItem('token');
    if (!savedToken) {
      console.log('No token found, skipping refresh');
      return;
    }

    try {
      console.log('Refreshing token...', {
        tokenExists: !!savedToken,
        tokenLength: savedToken?.length
      });
      
      const data = await api.post('/auth/refresh', {}, savedToken);
      console.log('Token refresh response:', data);
      
      if (data.accessToken) {
        setToken(data.accessToken);
        localStorage.setItem('token', data.accessToken);
        setupRefreshToken(data.accessToken);
      }
      
      if (data.user) {
        setUser(data.user);
        localStorage.setItem('user', JSON.stringify(data.user));
      }
    } catch (err) {
      console.error('Error refreshing token:', err);
      // Clear tokens on unauthorized
      if (err instanceof Error && err.message === 'Unauthorized') {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setToken(null);
        setUser(null);
      }
      throw err;
    }
  };

  useEffect(() => {
    const checkSession = async () => {
      const savedToken = localStorage.getItem('token');
      if (savedToken) {
        try {
          await refreshToken();
        } catch (err) {
          console.error('Error checking session:', err);
        }
      }
      setIsLoading(false);
    };
    
    checkSession();

    return () => {
      if (refreshTimeout) {
        clearTimeout(refreshTimeout);
      }
    };
  }, []);

  const handleAuthSuccess = async (userData: User, authToken: string) => {
    try {
      // Set token first
      setToken(authToken);
      localStorage.setItem('token', authToken);
      
      // Load full user profile
      await loadUserProfile(authToken);
      
      // Set up token refresh
      setupRefreshToken(authToken);
      
      // Finally set the user data and clear any errors
      setUser(userData);
      localStorage.setItem('user', JSON.stringify(userData));
      setError(null);
    } catch (err) {
      console.error('Error during auth success:', err);
      throw err;
    }
  };

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await api.post('/auth/login', { email, password });
      await handleAuthSuccess(response.user, response.accessToken);
    } catch (err: any) {
      setError(err.message || 'Failed to login');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const loginWithProvider = async (provider: 'google' | 'github' | 'apple') => {
    setIsLoading(true);
    setError(null);

    try {
      // Get the OAuth URL from your backend
      const response = await api.get(`/auth/${provider}/url`);
      const { url } = response;

      // Store current location for redirect after auth
      localStorage.setItem('auth_redirect', window.location.pathname);

      // Open OAuth provider's page in a popup
      const width = 500;
      const height = 600;
      const left = window.screenX + (window.outerWidth - width) / 2;
      const top = window.screenY + (window.outerHeight - height) / 2;
      
      const popup = window.open(
        url,
        `Login with ${provider}`,
        `width=${width},height=${height},left=${left},top=${top}`
      );

      if (!popup) {
        throw new Error('Popup blocked. Please allow popups for this site.');
      }

      // Listen for the OAuth callback
      const result = await new Promise<{ user: User; token: string }>((resolve, reject) => {
        const handleMessage = (event: MessageEvent) => {
          // Only accept messages from your own domain
          if (event.origin !== window.location.origin) return;

          try {
            const data = event.data;
            if (data.type === 'oauth_success') {
              window.removeEventListener('message', handleMessage);
              popup.close();
              resolve(data.payload);
            } else if (data.type === 'oauth_error') {
              window.removeEventListener('message', handleMessage);
              popup.close();
              reject(new Error(data.error));
            }
          } catch (err) {
            console.error('Error processing message:', err);
          }
        };

        window.addEventListener('message', handleMessage);

        // Check if popup was closed
        const checkClosed = setInterval(() => {
          if (popup.closed) {
            clearInterval(checkClosed);
            window.removeEventListener('message', handleMessage);
            reject(new Error('Authentication cancelled'));
          }
        }, 1000);
      });

      handleAuthSuccess(result.user, result.token);
    } catch (err: any) {
      console.error('Social auth error:', err);
      setError(err.message || `Failed to login with ${provider}`);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (email: string, password: string, name?: string) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await api.post('/auth/register', { email, password, name });
      handleAuthSuccess(response.user, response.token);
    } catch (err: any) {
      setError(err.message || 'Failed to register');
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
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      if (refreshTimeout) {
        clearTimeout(refreshTimeout);
      }
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        login,
        loginWithProvider,
        register,
        logout,
        isLoading,
        error,
        setUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}; 