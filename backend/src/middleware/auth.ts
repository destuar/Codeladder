/**
 * @file backend/src/middleware/auth.ts
 * 
 * Authentication Middleware
 * Provides JWT-based authentication and authorization functionality for the application.
 * Includes token verification, user authentication, and role-based access control.
 */

import { Request, Response, NextFunction, RequestHandler } from 'express';
import jwt from 'jsonwebtoken';
import env from '../config/env';
import { prisma } from '../config/db';
import { User, Role } from '@prisma/client';
import { AppError } from './errorHandler';

/**
 * JWT Payload Interface
 * Defines the structure of the data encoded in the JWT token:
 * - userId: Unique identifier for the user
 * - tokenVersion: Version number to handle token revocation
 */
interface JWTPayload {
  userId: string;
  tokenVersion: number;
}

/**
 * Token Authentication Middleware
 * Verifies the JWT token and attaches the user object to the request.
 * Process:
 * 1. Extracts token from Authorization header
 * 2. Verifies token signature and expiration
 * 3. Retrieves user from database
 * 4. Validates token version to handle revocation
 * 5. Attaches user object to request for downstream middleware
 * 
 * @throws {AppError} 401 - If token is missing, invalid, or user not found
 * @throws {AppError} 500 - For unexpected authentication errors
 */
export const authenticateToken: RequestHandler = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      throw new AppError(401, 'No token provided');
    }

    const decoded = jwt.verify(token, env.JWT_SECRET) as JWTPayload;
    
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        tokenVersion: true,
        googleId: true,
        githubId: true
      },
    });

    if (!user) {
      throw new AppError(401, 'User not found');
    }

    // Check if token version matches to handle token revocation
    if (user.tokenVersion !== decoded.tokenVersion) {
      throw new AppError(401, 'Token has been revoked');
    }

    req.user = user;
    next();
  } catch (err) {
    if (err instanceof AppError) {
      next(err);
    } else if (err instanceof jwt.JsonWebTokenError) {
      next(new AppError(401, 'Invalid token'));
    } else {
      next(new AppError(500, 'Authentication error'));
    }
  }
};

/**
 * Authentication Requirement Middleware
 * Simple middleware to ensure a user is authenticated before proceeding.
 * Used as a basic guard for protected routes.
 * 
 * @throws {Response} 401 - If no authenticated user is present
 */
export const requireAuth: RequestHandler = (req, res, next) => {
  if (!req.user) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }
  next();
};

/**
 * Admin Authorization Middleware
 * Ensures the authenticated user has admin privileges.
 * Allows both ADMIN and DEVELOPER roles to access protected routes.
 * 
 * @throws {Response} 403 - If user lacks admin privileges
 */
export const requireAdmin: RequestHandler = (req, res, next) => {
  if (!req.user || (req.user.role !== 'ADMIN' && req.user.role !== 'DEVELOPER')) {
    res.status(403).json({ error: 'Admin access required' });
    return;
  }
  next();
}; 