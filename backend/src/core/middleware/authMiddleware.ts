import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import env from '../../config/env';
import { prisma } from '../../config/db';
import { Role } from '@prisma/client';

interface JwtPayload {
  userId: string;
  tokenVersion: number;
}

export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, env.JWT_SECRET) as JwtPayload;

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
      return res.status(401).json({ error: 'User not found' });
    }

    // Check token version
    // if (user.tokenVersion !== decoded.tokenVersion) {
    //   return res.status(401).json({ error: 'Token has been revoked' });
    // }

    // The selected Prisma user object should now be assignable to Express.User (PassportUser)
    req.user = user;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

export const authorize = (...roles: Role[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // req.user.role is PrismaRole (type Role from @prisma/client)
    // which is compatible with the 'roles: Role[]' parameter.
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    next();
  };
}; 