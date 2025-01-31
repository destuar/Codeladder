import { Router } from 'express';
import { prisma } from '../lib/prisma';

const router = Router();

// Get all levels with topics and problems
router.get('/levels', async (req, res) => {
  try {
    const levels = await prisma.level.findMany({
      orderBy: {
        order: 'asc',
      },
      include: {
        topics: {
          orderBy: {
            order: 'asc',
          },
          include: {
            problems: {
              orderBy: {
                reqOrder: 'asc',
              },
            },
          },
        },
      },
    });

    res.json(levels);
  } catch (error) {
    console.error('Error fetching levels:', error);
    res.status(500).json({ error: 'Failed to fetch learning path data' });
  }
});

export default router; 