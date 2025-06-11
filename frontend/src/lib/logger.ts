/**
 * Production-ready logging utility for CodeLadder frontend
 * 
 * This utility provides environment-aware logging that:
 * - Suppresses debug logs in production
 * - Provides clean error reporting
 * - Maintains development debugging capabilities
 */

// More robust environment detection
const isDevelopment = () => {
  try {
    // First check if we're explicitly in production mode
    if (import.meta.env?.PROD || 
        import.meta.env?.NODE_ENV === 'production' ||
        window.ENV?.NODE_ENV === 'production') {
      return false;
    }
    
    // Check if we're in explicit development mode
    if (import.meta.env?.DEV || 
        import.meta.env?.NODE_ENV === 'development' ||
        window.ENV?.NODE_ENV === 'development') {
      return true;
    }
    
    // For localhost/127.0.0.1, only enable debug if explicitly in dev mode
    // This prevents debug logs when testing production builds locally
    if (location.hostname === 'localhost' || location.hostname === '127.0.0.1') {
      // Only show debug on localhost if we're in Vite dev mode
      return import.meta.env?.DEV === true;
    }
    
    // Default to production mode for safety
    return false;
  } catch (error) {
    // If there's any error in detection, default to production mode
    return false;
  }
};

export const logger = {
  /**
   * Debug logging - only shows in development
   * Use for detailed debugging information that users shouldn't see
   */
  debug: (...args: any[]) => {
    if (isDevelopment()) {
      console.log('[DEBUG]', ...args);
    }
  },

  /**
   * Info logging - shows in development with prefix
   * Use for general information that might be useful for debugging
   */
  info: (...args: any[]) => {
    if (isDevelopment()) {
      console.info('[INFO]', ...args);
    }
  },

  /**
   * Warning logging - shows in both dev and production but clean in production
   * Use for warnings that don't break functionality
   */
  warn: (...args: any[]) => {
    if (isDevelopment()) {
      console.warn('[WARN]', ...args);
    } else {
      // In production, log warnings more quietly
      console.warn('Application warning occurred');
    }
  },

  /**
   * Error logging - always shows but clean in production
   * Use for actual errors that need to be reported
   */
  error: (message: string, error?: any, context?: any) => {
    if (isDevelopment()) {
      console.error('[ERROR]', message, error, context);
    } else {
      // In production, log errors without exposing internals
      console.error('Application error:', message);
      
      // If there's a genuine Error object, we can safely log its message
      if (error instanceof Error) {
        console.error('Error details:', error.message);
      }
    }
  },

  /**
   * API logging - only in development
   * Use for API request/response debugging
   */
  api: {
    request: (method: string, url: string, data?: any) => {
      if (isDevelopment()) {
        console.log(`[API] 🚀 ${method} ${url}`, data ? { data } : '');
      }
    },
    
    response: (method: string, url: string, status: number, data?: any) => {
      if (isDevelopment()) {
        console.log(`[API] 📥 ${method} ${url} (${status})`, data ? { data } : '');
      }
    },
    
    error: (method: string, url: string, error: any) => {
      if (isDevelopment()) {
        console.error(`[API] ❌ ${method} ${url}`, error);
      } else {
        console.error('API request failed');
      }
    }
  },

  /**
   * Performance logging - only in development
   * Use for performance debugging
   */
  perf: (label: string, fn: () => void) => {
    if (isDevelopment()) {
      console.time(label);
      fn();
      console.timeEnd(label);
    } else {
      fn();
    }
  }
};

export default logger; 