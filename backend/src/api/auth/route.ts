import { Router } from 'express';
import { login, register, refresh, logout } from './controller';
import { authenticate, authorize } from '../../core/middleware/authMiddleware';
import { RequestHandler } from 'express';

const router = Router();

// Public routes
router.post('/register', register as RequestHandler);
router.post('/login', login as RequestHandler);
router.post('/refresh', refresh as RequestHandler);

// Test endpoints
router.get('/verify', authenticate as RequestHandler, ((req, res) => {
  res.json({
    message: 'Token is valid',
    user: req.user,
    tokenInfo: {
      hasToken: !!req.headers.authorization,
      tokenStart: req.headers.authorization?.split(' ')[1]?.substring(0, 20) + '...',
    }
  });
}) as RequestHandler);

router.get('/verify-admin', 
  authenticate as RequestHandler,
  authorize('ADMIN', 'DEVELOPER') as RequestHandler,
  ((req, res) => {
    res.json({
      message: 'Admin access verified',
      user: req.user
    });
  }) as RequestHandler
);

// Protected route example
router.get('/me', authenticate as RequestHandler, ((req, res) => {
  res.json({ user: req.user });
}) as RequestHandler);

// Developer/Admin only route example
router.get(
  '/users',
  authenticate as RequestHandler,
  authorize('ADMIN', 'DEVELOPER') as RequestHandler,
  (async (req, res) => {
    res.json({ message: 'Access to admin/developer dashboard granted' });
  }) as RequestHandler
);

// Protected routes
router.post('/logout', authenticate as RequestHandler, logout as RequestHandler);

export default router; 