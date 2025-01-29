import { RequestHandler } from 'express';
import { Role } from '@prisma/client';
import { prisma } from '../../config/db';

export const getUsers: RequestHandler = async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    res.json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const updateUserRole: RequestHandler = async (req, res) => {
  const { userId } = req.params;
  const { role } = req.body;

  // Validate role
  if (!Object.values(Role).includes(role)) {
    res.status(400).json({ error: 'Invalid role' });
    return;
  }

  try {
    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!existingUser) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    // Prevent self-demotion for admins
    if (req.user?.id === userId && req.user?.role === Role.ADMIN && role !== Role.ADMIN) {
      res.status(403).json({ error: 'Cannot demote yourself from admin role' });
      return;
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: { role: role as Role },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    res.json(user);
  } catch (error) {
    console.error('Error updating user role:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const deleteUser: RequestHandler = async (req, res) => {
  const { userId } = req.params;

  try {
    // Prevent self-deletion for admins
    if (req.user?.id === userId) {
      res.status(403).json({ error: 'Cannot delete your own account' });
      return;
    }

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!existingUser) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    await prisma.user.delete({
      where: { id: userId },
    });

    res.status(204).send();
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}; 