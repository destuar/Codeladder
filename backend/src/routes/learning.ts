import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { Role } from '@prisma/client';
import { authenticateToken } from '../middleware/auth';
import { authorizeRoles } from '../middleware/authorize';

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

// Protected routes - only for admins
router.use(authenticateToken);
router.use(authorizeRoles([Role.ADMIN, Role.DEVELOPER]));

// Create new level
router.post('/levels', async (req, res) => {
  try {
    console.log('Received request to create level:', req.body);
    const { name, description, order } = req.body;
    
    const level = await prisma.level.create({
      data: {
        name,
        description,
        order,
      },
    });
    console.log('Created level:', level);

    res.status(201).json(level);
  } catch (error) {
    console.error('Error creating level:', error);
    res.status(500).json({ error: 'Failed to create level' });
  }
});

// Create new topic
router.post('/levels/:levelId/topics', async (req, res) => {
  try {
    const { levelId } = req.params;
    const { name, description, content, order } = req.body;

    const topic = await prisma.topic.create({
      data: {
        name,
        description,
        content,
        order,
        level: {
          connect: { id: levelId },
        },
      },
    });

    res.status(201).json(topic);
  } catch (error) {
    console.error('Error creating topic:', error);
    res.status(500).json({ error: 'Failed to create topic' });
  }
});

export default router; 