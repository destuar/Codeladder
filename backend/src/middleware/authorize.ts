import { RequestHandler } from 'express';
import { Role } from '@prisma/client';

export const authorizeRoles = (roles: Role[]): RequestHandler => (req, res, next) => {
  if (!req.user) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  if (!roles.includes(req.user.role as Role)) {
    res.status(403).json({ error: 'Forbidden - Insufficient permissions' });
    return;
  }

  next();
}; 