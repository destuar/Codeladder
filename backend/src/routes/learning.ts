import { Router } from 'express';
import type { RequestHandler } from 'express-serve-static-core';
import { prisma } from '../lib/prisma';
import { Role } from '@prisma/client';
import { authenticateToken } from '../middleware/auth';
import { authorizeRoles } from '../middleware/authorize';

const router = Router();

// Public routes
// Get all levels with topics and problems
router.get('/levels', authenticateToken, (async (req, res) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

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
              include: {
                completedBy: {
                  where: { id: userId },
                  select: { id: true }
                },
                progress: {
                  where: { userId },
                  select: { status: true }
                },
                collections: {
                  include: {
                    collection: {
                      select: {
                        id: true,
                        name: true
                      }
                    }
                  }
                }
              }
            },
          },
        },
      },
    });

    // Transform the response to include completion status and collection IDs
    const transformedLevels = levels.map(level => ({
      ...level,
      topics: level.topics.map(topic => ({
        ...topic,
        problems: topic.problems.map(problem => ({
          ...problem,
          completed: problem.completedBy.length > 0 || problem.progress.some(p => p.status === 'COMPLETED'),
          collectionIds: problem.collections.map(pc => pc.collection.id),
          completedBy: undefined,
          progress: undefined,
          collections: undefined
        }))
      }))
    }));

    res.json(transformedLevels);
  } catch (error) {
    console.error('Error fetching levels:', error);
    res.status(500).json({ error: 'Failed to fetch learning path data' });
  }
}) as RequestHandler);

// Protected routes below this line
router.use(authenticateToken);

// Get a single topic by ID
router.get('/topics/:id', (async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const topic = await prisma.topic.findUnique({
      where: { id },
      include: {
        problems: {
          orderBy: {
            reqOrder: 'asc',
          },
          include: {
            completedBy: {
              where: { id: userId },
              select: { id: true }
            },
            progress: {
              where: { userId },
              select: { status: true }
            }
          }
        },
        level: true,
      },
    });

    if (!topic) {
      return res.status(404).json({ error: 'Topic not found' });
    }

    // Transform the response to include completion status
    const transformedTopic = {
      ...topic,
      problems: topic.problems.map(problem => ({
        ...problem,
        completed: problem.completedBy.length > 0 || problem.progress.some(p => p.status === 'COMPLETED'),
        completedBy: undefined,
        progress: undefined
      }))
    };

    res.json(transformedTopic);
  } catch (error) {
    console.error('Error fetching topic:', error);
    res.status(500).json({ error: 'Failed to fetch topic data' });
  }
}) as RequestHandler);

// Admin-only routes below this line
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

// Update topic
router.put('/topics/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, content, order } = req.body;
    
    const topic = await prisma.topic.update({
      where: { id },
      data: {
        name,
        description,
        content,
        order,
      },
    });

    res.json(topic);
  } catch (error) {
    console.error('Error updating topic:', error);
    res.status(500).json({ error: 'Failed to update topic' });
  }
});

// Delete topic
router.delete('/topics/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // First delete all problems associated with this topic
    await prisma.problem.deleteMany({
      where: { topicId: id },
    });
    
    // Then delete the topic
    await prisma.topic.delete({
      where: { id },
    });

    res.json({ message: 'Topic deleted successfully' });
  } catch (error) {
    console.error('Error deleting topic:', error);
    res.status(500).json({ error: 'Failed to delete topic' });
  }
});

// Update problem
router.put('/problems/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, content, difficulty, required, reqOrder } = req.body;
    
    const problem = await prisma.problem.update({
      where: { id },
      data: {
        name,
        content,
        difficulty,
        required,
        reqOrder,
      },
    });

    res.json(problem);
  } catch (error) {
    console.error('Error updating problem:', error);
    res.status(500).json({ error: 'Failed to update problem' });
  }
});

// Delete problem
router.delete('/problems/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    await prisma.problem.delete({
      where: { id },
    });

    res.json({ message: 'Problem deleted successfully' });
  } catch (error) {
    console.error('Error deleting problem:', error);
    res.status(500).json({ error: 'Failed to delete problem' });
  }
});

// Update level
router.put('/levels/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, order } = req.body;
    
    const level = await prisma.level.update({
      where: { id },
      data: {
        name,
        description,
        order,
      },
    });

    res.json(level);
  } catch (error) {
    console.error('Error updating level:', error);
    res.status(500).json({ error: 'Failed to update level' });
  }
});

export default router; 