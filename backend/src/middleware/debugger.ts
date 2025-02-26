/**
 * Request/Response Debugging System
 * Provides comprehensive logging and debugging capabilities for HTTP requests and responses.
 * Only logs detailed information in non-production environments for security and performance.
 */

import { Request, Response, NextFunction } from 'express';
import env from '../config/env';

/**
 * Debug Utility Object
 * Contains methods for different types of logging and debugging operations.
 * 
 * Features:
 * - Environment-aware logging (development vs production)
 * - Formatted console output with visual indicators
 * - Structured logging for requests and responses
 * - Error logging that works in all environments
 */
const debug = {
  /**
   * General purpose logging function
   * Only logs in non-production environments
   */
  log: (...args: any[]) => {
    if (env.NODE_ENV !== 'production') {
      console.log('[Backend]', ...args);
    }
  },

  /**
   * Error logging function
   * Always logs errors regardless of environment
   */
  error: (...args: any[]) => console.error('[Backend Error]', ...args),

  /**
   * Request logging function
   * Logs detailed information about incoming HTTP requests
   * Includes:
   * - HTTP method and URL
   * - Headers
   * - Query parameters
   * - Request body
   * - Cookies
   * - Client IP
   */
  request: (req: Request) => {
    debug.log(`📥 ${req.method} Request to ${req.originalUrl}:`, {
      headers: req.headers,
      query: req.query,
      body: req.body,
      cookies: req.cookies,
      ip: req.ip,
    });
  },

  /**
   * Response logging function
   * Logs information about outgoing HTTP responses
   * Includes:
   * - Status code
   * - Response headers
   * - Response body
   */
  response: (res: Response, body: any) => {
    debug.log(`📤 Response ${res.statusCode}:`, {
      headers: res.getHeaders(),
      body,
    });
  }
};

/**
 * Request Debugger Middleware
 * Intercepts and logs all HTTP requests and responses passing through the application.
 * 
 * Implementation:
 * 1. Logs incoming request details immediately
 * 2. Intercepts the response by monkey-patching res.json
 * 3. Logs response details before sending
 * 4. Maintains the original response functionality
 * 
 * Note: This middleware should be placed early in the middleware chain
 * to catch all requests and their complete processing cycle.
 */
export const requestDebugger = (req: Request, res: Response, next: NextFunction) => {
  // Log incoming request details
  debug.request(req);

  // Intercept JSON responses by monkey-patching res.json
  const originalJson = res.json;
  res.json = function(body: any) {
    debug.response(res, body);
    return originalJson.call(this, body);
  };

  next();
}; 