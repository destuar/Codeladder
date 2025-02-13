import { Request, Response, NextFunction, RequestHandler } from 'express';

export const requireAdmin: RequestHandler = (req: Request, res: Response, next: NextFunction) => {
  if (!req.user || (req.user.role !== 'ADMIN' && req.user.role !== 'DEVELOPER')) {
    res.status(403).json({ error: 'Admin access required' });
    return;
  }
  next();
}; 