import { Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../../config/db';

const updateProfileSchema = z.object({
  name: z.string().min(2).optional(),
  avatar: z.string().url('Must be a valid URL').nullable(),
}).partial();

export const getProfile = async (req: Request, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: {
        id: true,
        email: true,
        name: true,
        avatar: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    console.log('Retrieved user profile:', user);
    res.json(user);
  } catch (error) {
    console.error('Error getting profile:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const updateProfile = async (req: Request, res: Response) => {
  try {
    console.log('Received profile update request:', {
      body: req.body,
      userId: req.user?.id
    });
    
    const data = updateProfileSchema.parse(req.body);
    console.log('Validated data:', data);

    // Ensure we're explicitly setting fields to null if they're not provided
    const updateData = {
      avatar: null,
      ...data, // Override defaults with any provided values
    };
    
    const user = await prisma.user.update({
      where: { id: req.user!.id },
      data: updateData,
      select: {
        id: true,
        email: true,
        name: true,
        avatar: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    console.log('Updated user:', user);
    res.json(user);
  } catch (error) {
    console.error('Profile update error:', error);
    if (error instanceof z.ZodError) {
      const errorMessages = error.errors.map(err => {
        const field = err.path.join('.');
        return `${field}: ${err.message}`;
      });
      return res.status(400).json({ error: errorMessages });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
}; 