import { Request, Response, NextFunction, RequestHandler } from 'express';
import jwt from 'jsonwebtoken';
import env from '../config/env';
import { prisma } from '../config/db';

declare module 'express' {
  interface Request {
    user?: any;
  }
}

export const authenticateToken: RequestHandler = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      res.status(401).json({ error: 'No token provided' });
      return;
    }

    const decoded = jwt.verify(token, env.JWT_SECRET) as jwt.JwtPayload;
    
    // Get user from database
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
      },
    });

    if (!user) {
      res.status(401).json({ error: 'User not found' });
      return;
    }

    // Add user to request object
    req.user = user;
    next();
  } catch (err) {
    res.status(401).json({ error: 'Invalid token' });
    return;
  }
}; 