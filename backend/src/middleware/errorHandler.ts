/**
 * Error Handling System
 * Provides centralized error handling functionality for the application.
 * Includes custom error types, global error handler, and utility functions
 * for consistent error management across the application.
 */

import { Request, Response, NextFunction } from 'express';
import { Role } from '@prisma/client';

/**
 * Global Type Declaration
 * Extends Express Request interface to include authenticated user information
 * This ensures TypeScript recognizes the user object attached during authentication
 */
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        name: string | null;
        role: Role;
        tokenVersion: number;
      };
    }
  }
}

/**
 * Custom Application Error Class
 * Extends the native Error class to include additional properties needed for
 * proper error handling and client responses.
 * 
 * @property {number} statusCode - HTTP status code to be sent to the client
 * @property {string} message - Human-readable error message
 * @property {boolean} isOperational - Indicates if error is operational (expected) or programming error
 */
export class AppError extends Error {
  constructor(
    public statusCode: number,
    public message: string,
    public isOperational = true
  ) {
    super(message);
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

/**
 * Global Error Handler Middleware
 * Processes all errors that occur during request handling.
 * Features:
 * - Differentiates between operational and programming errors
 * - Provides appropriate error responses based on environment
 * - Logs unexpected errors for debugging
 * - Ensures sensitive error details are not exposed in production
 * 
 * @param {Error | AppError} err - The error object to be handled
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 * @param {NextFunction} _next - Express next function (unused)
 */
export const errorHandler = (
  err: Error | AppError,
  req: Request,
  res: Response,
  _next: NextFunction
) => {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      status: 'error',
      message: err.message,
      // Include stack trace only in development environment
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });
  }

  // Log unexpected errors for debugging and monitoring
  console.error('Unexpected error:', err);

  // Generic error response for unhandled errors
  res.status(500).json({
    status: 'error',
    message: 'Internal server error'
  });
};

/**
 * Async Handler Utility
 * Wraps async route handlers to properly catch and forward errors to the error handler.
 * Eliminates the need for try-catch blocks in route handlers.
 * 
 * @param {Function} fn - The async route handler function to wrap
 * @returns {Function} - Express middleware function that handles async errors
 * 
 * Usage example:
 * ```
 * router.get('/users', asyncHandler(async (req, res) => {
 *   const users = await getUsers();
 *   res.json(users);
 * }));
 * ```
 */
export const asyncHandler = (fn: Function) => (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  Promise.resolve(fn(req, res, next)).catch(next);
}; 