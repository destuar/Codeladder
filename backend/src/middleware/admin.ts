/**
 * Admin Authorization Middleware
 * Provides role-based access control (RBAC) for administrative endpoints.
 * 
 * Features:
 * - Verifies user authentication status
 * - Checks for admin or developer role permissions
 * - Prevents unauthorized access to admin-only routes
 * - Returns appropriate HTTP 403 Forbidden response for unauthorized access
 * 
 * Usage:
 * ```typescript
 * router.get('/admin/users', requireAdmin, async (req, res) => {
 *   // Only admins and developers can access this route
 * });
 * ```
 * 
 * Note: This middleware should be used after authentication middleware
 * to ensure req.user is properly populated.
 */

import { Request, Response, NextFunction, RequestHandler } from 'express';

export const requireAdmin: RequestHandler = (req: Request, res: Response, next: NextFunction) => {
  // Check if user is authenticated and has appropriate role
  if (!req.user || (req.user.role !== 'ADMIN' && req.user.role !== 'DEVELOPER')) {
    res.status(403).json({ error: 'Admin access required' });
    return;
  }
  next();
}; 