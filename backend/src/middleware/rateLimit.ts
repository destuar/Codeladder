/**
 * Rate Limiting System
 * Implements tiered rate limiting for different types of requests to prevent abuse.
 * Uses express-rate-limit to track and limit requests based on IP address.
 * Different limits are applied to various endpoints based on their sensitivity and normal usage patterns.
 */

import { Request, Response } from 'express';
import rateLimit from 'express-rate-limit';
import { AppError } from './errorHandler';

/**
 * General API Rate Limiter
 * Provides basic rate limiting for general API endpoints.
 * 
 * Configuration:
 * - Window: 15 minutes
 * - Max Requests: 100 per IP
 * - Applies to: All general API endpoints
 * 
 * This limit is designed to:
 * - Prevent abuse while allowing normal API usage
 * - Protect server resources from excessive requests
 * - Allow for reasonable burst traffic
 */
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later',
  handler: (req: Request, res: Response) => {
    throw new AppError(429, 'Too many requests, please try again later');
  },
});

/**
 * Authentication Rate Limiter
 * Implements stricter limits for authentication endpoints to prevent brute force attacks.
 * 
 * Configuration:
 * - Window: 1 hour
 * - Max Attempts: 20 per IP
 * - Applies to: Login endpoints
 * 
 * Security features:
 * - Tracks only failed attempts (skipSuccessfulRequests)
 * - Longer window period for better brute force protection
 * - Custom error handling with appropriate status codes
 */
export const authLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20, // Increased from 5 to 20 attempts per hour
  message: 'Too many login attempts, please try again later',
  handler: (req: Request, res: Response) => {
    throw new AppError(429, 'Too many login attempts, please try again later');
  },
  skipSuccessfulRequests: true, // Don't count successful logins against the limit
});

/**
 * Registration Rate Limiter
 * Implements strict limits for user registration to prevent spam accounts.
 * 
 * Configuration:
 * - Window: 1 hour
 * - Max Registrations: 10 per IP
 * - Applies to: User registration endpoints
 * 
 * This limit is designed to:
 * - Prevent automated account creation
 * - Reduce spam registrations
 * - Allow legitimate users to register while blocking potential abuse
 */
export const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // Limit each IP to 10 registration attempts per hour
  message: 'Too many registration attempts, please try again later',
  handler: (req: Request, res: Response) => {
    throw new AppError(429, 'Too many registration attempts, please try again later');
  },
}); 