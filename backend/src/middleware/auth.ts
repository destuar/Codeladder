import { Request, Response, NextFunction, RequestHandler } from 'express';
import jwt from 'jsonwebtoken';
import env from '../config/env';
import { prisma } from '../config/db';
import { User, Role } from '@prisma/client';
import { AppError } from './errorHandler';

interface JWTPayload {
  userId: string;
  tokenVersion: number;
}

declare module 'express' {
  interface Request {
    user?: Pick<User, 'id' | 'email' | 'name' | 'role' | 'tokenVersion'>;
  }
}

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
      },
    });

    if (!user) {
      throw new AppError(401, 'User not found');
    }

    // Check if token version matches
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

// Middleware to require authentication
export const requireAuth: RequestHandler = (req, res, next) => {
  if (!req.user) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }
  next();
};

// Middleware to require admin role
export const requireAdmin: RequestHandler = (req, res, next) => {
  if (!req.user || (req.user.role !== 'ADMIN' && req.user.role !== 'DEVELOPER')) {
    res.status(403).json({ error: 'Admin access required' });
    return;
  }
  next();
}; 