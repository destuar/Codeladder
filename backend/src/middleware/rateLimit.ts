/**
 * @file backend/src/middleware/rateLimit.ts
 * 
 * Rate Limiting System
 * Implements tiered rate limiting for different types of requests to prevent abuse.
 * Uses express-rate-limit to track and limit requests based on IP address.
 * Different limits are applied to various endpoints based on their sensitivity and normal usage patterns.
 */

import { Request, Response } from 'express';
import rateLimit from 'express-rate-limit';
import { AppError } from './errorHandler';
import { prisma } from '../lib/prisma';
import { Role } from '@prisma/client';
import jwt from 'jsonwebtoken';
import env from '../config/env';

// Helper function to extract user role from token
const extractUserRole = (req: Request): Role | null => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null;
    }
    
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, env.JWT_SECRET) as any;
    
    return decoded.role || null;
  } catch (error) {
    return null;
  }
};

/**
 * General API Rate Limiter
 * Provides basic rate limiting for general API endpoints.
 * 
 * Configuration:
 * - Window: 15 minutes
 * - Max Requests: 100 per IP for regular users, 500 for admin users
 * - Applies to: All general API endpoints
 * 
 * This limit is designed to:
 * - Prevent abuse while allowing normal API usage
 * - Protect server resources from excessive requests
 * - Allow for reasonable burst traffic
 * - Provide higher limits for admin users who need to make more requests
 */
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: (req: Request) => {
    const role = extractUserRole(req);
    return (role === Role.ADMIN || role === Role.DEVELOPER) ? 500 : 100;
  },
  message: 'Too many requests from this IP, please try again later',
  handler: (req: Request, res: Response) => {
    throw new AppError(429, 'Too many requests, please try again later');
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Admin API Rate Limiter
 * Provides higher rate limits specifically for admin endpoints.
 * 
 * Configuration:
 * - Window: 15 minutes
 * - Max Requests: 1000 per IP for admin users
 * - Applies to: Admin-only API endpoints
 */
export const adminApiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // Higher limit for admin endpoints
  message: 'Too many admin requests, please try again later',
  handler: (req: Request, res: Response) => {
    throw new AppError(429, 'Too many admin requests, please try again later');
  },
  standardHeaders: true,
  legacyHeaders: false,
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
  standardHeaders: true,
  legacyHeaders: false,
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
  standardHeaders: true,
  legacyHeaders: false,
}); 