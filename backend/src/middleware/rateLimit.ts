import { Request, Response } from 'express';
import rateLimit from 'express-rate-limit';
import { AppError } from './errorHandler';

export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later',
  handler: (req: Request, res: Response) => {
    throw new AppError(429, 'Too many requests, please try again later');
  },
});

export const authLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20, // Increased from 5 to 20 attempts per hour
  message: 'Too many login attempts, please try again later',
  handler: (req: Request, res: Response) => {
    throw new AppError(429, 'Too many login attempts, please try again later');
  },
  skipSuccessfulRequests: true, // Don't count successful logins against the limit
});

export const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // Limit each IP to 10 registration attempts per hour
  message: 'Too many registration attempts, please try again later',
  handler: (req: Request, res: Response) => {
    throw new AppError(429, 'Too many registration attempts, please try again later');
  },
}); 