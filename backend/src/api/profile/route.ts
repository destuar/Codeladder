import { Router } from 'express';
import { getProfile, updateProfile } from './controller';
import { authenticate } from '../../core/middleware/authMiddleware';
import { RequestHandler } from 'express';

const router = Router();

// Protected routes - require authentication
router.get('/me', authenticate as RequestHandler, getProfile as RequestHandler);
router.put('/me', authenticate as RequestHandler, updateProfile as RequestHandler);

export default router; 