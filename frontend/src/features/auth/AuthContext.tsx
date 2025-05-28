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

// To prevent duplicate processing from postMessage and localStorage
let oauthInProgress = false;

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshTimeout, setRefreshTimeout] = useState<NodeJS.Timeout>();

  // -----
  // New useEffect for localStorage-based OAuth handling
  useEffect(() => {
    const handleStorageChange = async (event: StorageEvent) => {
      if (event.key === 'oauth_callback_data' && event.newValue) {
        console.log('[AuthContext] localStorage change detected for oauth_callback_data', event.newValue);
        try {
          const data = JSON.parse(event.newValue);
          localStorage.removeItem('oauth_callback_data'); // Clean up immediately

          if (oauthInProgress) return; // Already handled by postMessage or another storage event
          oauthInProgress = true;

          if (data.type === 'oauth_success') {
            console.log('[AuthContext] OAuth Success from localStorage:', data.payload);
            await handleAuthSuccess(data.payload.user, data.payload.token);
            // Potentially redirect here or let the calling page handle it
            // Example: window.location.href = localStorage.getItem('auth_redirect') || '/';
            // localStorage.removeItem('auth_redirect');
          } else if (data.type === 'oauth_error') {
            console.error('[AuthContext] OAuth Error from localStorage:', data.error);
            setError(data.error || 'OAuth authentication failed via localStorage.');
          }
        } catch (e) {
          console.error('[AuthContext] Error processing localStorage oauth_callback_data:', e);
          setError('Failed to process OAuth data.');
        } finally {
          oauthInProgress = false; // Reset flag
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      oauthInProgress = false; // Ensure flag is reset on unmount too
    };
  }, []); // Empty dependency array, runs once on mount
  // -----

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
    console.log('[AuthContext] handleAuthSuccess called with:', userData, authToken ? 'token present' : 'token missing');
    // if (user && user.id === userData.id && token === authToken) {
    //   console.log('[AuthContext] Auth success already processed with same data. Skipping.');
    //   return;
    // }
    try {
      // Set token first
      setToken(authToken);
      localStorage.setItem('token', authToken);
      
      // Load full user profile - this also sets the user state
      // await loadUserProfile(authToken); // This might be redundant if userData from OAuth is complete
                                       // Or ensure userData from OAuth is the source of truth here.
      setUser(userData); // Use userData directly from OAuth payload if it's sufficient
      localStorage.setItem('user', JSON.stringify(userData));
      
      // Set up token refresh
      setupRefreshToken(authToken);
      
      // Finally set the user data and clear any errors
      // setUser(userData); // Already set if using userData directly
      // localStorage.setItem('user', JSON.stringify(userData)); // Already set
      setError(null);
      console.log('[AuthContext] Auth success processed. User:', userData, 'Token:', authToken);
    } catch (err) {
      console.error('Error during auth success:', err);
      setError('Failed to finalize authentication.');
      throw err;
    } finally {
      oauthInProgress = false; // Reset flag after completion or error
      setIsLoading(false); // Ensure loading state is reset
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

  const loginWithProvider = async (provider: 'google' | 'github' | 'apple'): Promise<void> => {
    setIsLoading(true);
    setError(null);
    oauthInProgress = false; // Reset flag at the start of a new OAuth attempt

    try {
      const response = await api.get(`/auth/${provider}/url`);
      const { url } = response;
      localStorage.setItem('auth_redirect', window.location.pathname);

      const width = 500, height = 600;
      const left = window.screenX + (window.outerWidth - width) / 2;
      const top = window.screenY + (window.outerHeight - height) / 2;
      
      const popup = window.open(url, `Login with ${provider}`, `width=${width},height=${height},left=${left},top=${top},noopener=false,noreferrer=false`);

      if (!popup) {
        oauthInProgress = false;
        throw new Error('Popup blocked. Please allow popups for this site.');
      }

      // The Promise setup for postMessage and popup close detection is still useful
      // as a direct communication channel if available, or for cancellation detection.
      // We don't need to await its resolution here directly for the function's primary contract (Promise<void>).
      // The actual auth success is handled by handleAuthSuccess, called by listeners.
      new Promise<{ user: User; token: string }>((resolve, reject) => {
        const handleMessage = async (event: MessageEvent) => {
          console.log('[AuthContext] postMessage received:', event.data, 'from origin:', event.origin);
          if (event.origin !== window.location.origin) { 
            console.warn(`[AuthContext] Message from untrusted origin "${event.origin}" blocked. Expected ${window.location.origin}.`);
            return;
          }

          const { type, payload, error: messageError } = event.data;

          if (type === 'oauth_success') {
            if (oauthInProgress) { // Check if already handled by localStorage or another event
              console.log('[AuthContext] postMessage: OAuth success already in progress or handled. Skipping.');
              window.removeEventListener('message', handleMessage); // Still remove listener
              return; 
            }
            oauthInProgress = true;
            window.removeEventListener('message', handleMessage);
            console.log('[AuthContext] OAuth Success from postMessage, processing...', payload);
            try {
              await handleAuthSuccess(payload.user, payload.token);
              resolve(payload); // Resolve for any specific internal logic that might await this (though the main function is void)
            } catch(authError) {
              setError( (authError as Error).message || 'OAuth failed during postMessage success handling');
              reject(authError);
            } finally {
              // oauthInProgress = false; // Resetting in handleAuthSuccess or global error handlers
            }
          } else if (type === 'oauth_error') {
            if (oauthInProgress) {  // Check if already handled
              console.log('[AuthContext] postMessage: OAuth error already in progress or handled. Skipping.');
              window.removeEventListener('message', handleMessage);
              return;
            }
            oauthInProgress = true;
            window.removeEventListener('message', handleMessage);
            console.error('[AuthContext] OAuth Error from postMessage, rejecting promise.', messageError);
            setError(messageError || 'OAuth failed via postMessage');
            reject(new Error(messageError || 'OAuth authentication failed'));
            oauthInProgress = false; // Reset if error specific to postMessage path
          }
        };

        window.addEventListener('message', handleMessage);

        const checkClosed = setInterval(async () => {
          try {
            if (popup && popup.closed) { // Check if popup exists before accessing .closed
              clearInterval(checkClosed);
              window.removeEventListener('message', handleMessage);
              if (!oauthInProgress) {
                console.log('[AuthContext] Popup closed and OAuth not (yet) handled by message/storage. Setting cancelled error.');
                setError('Authentication cancelled or popup closed.');
                oauthInProgress = false; // Reset if popup closed before completion
              }
            }
          } catch (e: any) {
            // Check if it's a COOP-related error (this check is basic, might need refinement)
            if (e.message && e.message.includes('Cross-Origin-Opener-Policy')) {
              console.warn('[AuthContext] COOP policy prevented checking popup.closed. Relying on message/storage for OAuth completion.', e.message);
              // Don't necessarily set error here, as message/storage might still come through.
              // If it's essential to know about manual closure even with COOP, this strategy needs rethinking.
              // For now, we just log and let the other mechanisms (postMessage, localStorage) try to complete.
              // If after a longer timeout OAuth is still not in progress, then it might be an actual cancellation.
            } else {
              // Different error while checking popup.closed
              console.error('[AuthContext] Error checking popup state:', e);
              clearInterval(checkClosed); // Stop interval on other errors too
              window.removeEventListener('message', handleMessage);
              if (!oauthInProgress) {
                setError('Error during OAuth process.'); // Generic error
                oauthInProgress = false;
              }
            }
          }
        }, 500);
      }).catch(err => {
        // Catch unhandled rejections from the message/popup promise to prevent global unhandledrejection errors.
        // The error should have already been set in the context via setError.
        console.warn('[AuthContext] Internal OAuth promise rejected/cancelled:', err.message);
        if (!oauthInProgress) setIsLoading(false); // Only stop loading if we truly errored out here
      });

    } catch (err: any) {
      console.error('Social auth error in loginWithProvider (initial setup):', err);
      setError(err.message || `Failed to login with ${provider}`);
      oauthInProgress = false;
      setIsLoading(false); // Stop loading on initial setup error
      throw err; // Re-throw for the calling component to catch if needed
    }
    // setIsLoading(false) should typically be handled by the calling component or after auth success/failure
    // For a Promise<void> contract, we might not set it here unless it's an immediate failure.
  };

  const register = async (email: string, password: string, name?: string) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await api.post('/auth/register', { email, password, name });
      await handleAuthSuccess(response.user, response.token);
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
      Object.keys(sessionStorage).forEach(key => {
        if (key.startsWith('quiz_') || key.startsWith('assessment_')) {
          sessionStorage.removeItem(key);
        }
      });
      setUser(null);
      setToken(null);
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      localStorage.removeItem('auth_redirect'); // Clean up auth redirect path
      if (refreshTimeout) {
        clearTimeout(refreshTimeout);
      }
      oauthInProgress = false; // Reset on logout too
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