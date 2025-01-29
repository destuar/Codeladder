import { Router } from 'express';
import { login, register, refresh, logout } from './controller';
import { authenticate, authorize } from '../../core/middleware/authMiddleware';
import { RequestHandler } from 'express';

const router = Router();

// Public routes
router.post('/register', register as RequestHandler);
router.post('/login', login as RequestHandler);
router.post('/refresh', refresh as RequestHandler);

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