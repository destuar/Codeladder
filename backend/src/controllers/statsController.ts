import { Request, Response } from 'express';
import { prisma } from '../config/db';
import { asyncHandler } from '../middleware/errorHandler';

/**
 * @desc    Get the total number of users
 * @route   GET /api/stats/user-count
 * @access  Public
 */
export const getUserCount = asyncHandler(async (req: Request, res: Response) => {
  const userCount = await prisma.user.count();
  res.status(200).json({ count: userCount });
}); 