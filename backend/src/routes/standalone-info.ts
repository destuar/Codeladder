import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken } from '../middleware/auth';
import { requireAdmin } from '../middleware/admin';

const prisma = new PrismaClient();
const router = Router();

// Get all standalone info pages
router.get('/', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const searchQuery = req.query.search as string;

    const pages = await prisma.standaloneInfoPage.findMany({
      where: searchQuery ? {
        OR: [
          { name: { contains: searchQuery, mode: 'insensitive' } },
          { description: { contains: searchQuery, mode: 'insensitive' } },
          { content: { contains: searchQuery, mode: 'insensitive' } },
        ],
      } : undefined,
      orderBy: { createdAt: 'desc' },
    });
    res.json(pages);
  } catch (error) {
    console.error('Error fetching standalone info pages:', error);
    res.status(500).json({ error: 'Failed to fetch standalone info pages' });
  }
});

// Get a single standalone info page by ID
router.get('/:id', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;

  try {
    const page = await prisma.standaloneInfoPage.findUnique({
      where: { id },
    });

    if (!page) {
      res.status(404).json({ error: 'Info page not found' });
      return;
    }

    res.json(page);
  } catch (error) {
    console.error('Error fetching info page:', error);
    res.status(500).json({ error: 'Failed to fetch info page' });
  }
});

// Create a new standalone info page (admin only)
router.post('/', authenticateToken, requireAdmin, async (req: Request, res: Response): Promise<void> => {
  const { name, content, description, estimatedTime } = req.body;

  if (!name || !content) {
    res.status(400).json({ error: 'Name and content are required' });
    return;
  }

  // Convert estimatedTime to number if provided
  const parsedEstimatedTime = estimatedTime ? parseInt(estimatedTime.toString()) : null;
  if (estimatedTime && isNaN(parsedEstimatedTime!)) {
    res.status(400).json({ error: 'Estimated time must be a valid number' });
    return;
  }

  try {
    const page = await prisma.standaloneInfoPage.create({
      data: {
        name,
        content,
        description,
        estimatedTime: parsedEstimatedTime
      },
    });
    res.status(201).json(page);
  } catch (error) {
    console.error('Error creating standalone info page:', error);
    res.status(500).json({ error: 'Failed to create standalone info page' });
  }
});

// Update a standalone info page (admin only)
router.put('/:id', authenticateToken, requireAdmin, async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const { name, content, description, estimatedTime } = req.body;

  // Convert estimatedTime to number if provided
  const parsedEstimatedTime = estimatedTime ? parseInt(estimatedTime.toString()) : null;
  if (estimatedTime && isNaN(parsedEstimatedTime!)) {
    res.status(400).json({ error: 'Estimated time must be a valid number' });
    return;
  }

  try {
    const page = await prisma.standaloneInfoPage.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(content && { content }),
        ...(description !== undefined && { description }),
        ...(estimatedTime !== undefined && { estimatedTime: parsedEstimatedTime })
      },
    });
    res.json(page);
  } catch (error) {
    console.error('Error updating standalone info page:', error);
    res.status(500).json({ error: 'Failed to update standalone info page' });
  }
});

// Delete a standalone info page (admin only)
router.delete('/:id', authenticateToken, requireAdmin, async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;

  try {
    await prisma.standaloneInfoPage.delete({
      where: { id },
    });
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting standalone info page:', error);
    res.status(500).json({ error: 'Failed to delete standalone info page' });
  }
});

// Search standalone info pages
router.get('/search', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  const { query } = req.query;

  if (!query || typeof query !== 'string') {
    res.status(400).json({ error: 'Search query is required' });
    return;
  }

  try {
    const pages = await prisma.standaloneInfoPage.findMany({
      where: {
        OR: [
          { name: { contains: query, mode: 'insensitive' } },
          { description: { contains: query, mode: 'insensitive' } },
        ],
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(pages);
  } catch (error) {
    console.error('Error searching standalone info pages:', error);
    res.status(500).json({ error: 'Failed to search standalone info pages' });
  }
});

export default router; 