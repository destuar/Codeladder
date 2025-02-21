import express from 'express';
import { Role } from '@prisma/client';
import { getUsers, updateUserRole, deleteUser } from '../api/admin/controller';
import { authenticateToken } from '../middleware/auth';
import { authorizeRoles } from '../middleware/authorize';

const router = express.Router();

// Protect all admin routes
router.use(authenticateToken);
router.use(authorizeRoles([Role.ADMIN, Role.DEVELOPER]));

// Admin routes
router.get('/users', getUsers);
router.put('/users/:userId/role', updateUserRole);
router.delete('/users/:userId', deleteUser);

export default router;