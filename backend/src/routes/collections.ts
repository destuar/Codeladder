import express from 'express';
import { prisma } from '../lib/prisma';
import { authenticateToken } from '../middleware/auth';
import { authorizeRoles } from '../middleware/authorize';
import { Role } from '@prisma/client';
import type { RequestHandler } from 'express-serve-static-core';

const router = express.Router();

// Get all collections
router.get('/', authenticateToken, authorizeRoles([Role.ADMIN, Role.DEVELOPER]), (async (req, res) => {
  try {
    // Using a type assertion to handle the missing type in the Prisma client
    // This is temporary until Prisma is updated with the new model
    const prismaAny = prisma as any;
    const collections = await prismaAny.collection.findMany({
      orderBy: { name: 'asc' }
    });
    
    res.json(collections);
  } catch (error) {
    console.error('Error fetching collections:', error);
    res.status(500).json({ error: 'Failed to fetch collections' });
  }
}) as RequestHandler);

// Get a single collection by ID
router.get('/:id', authenticateToken, authorizeRoles([Role.ADMIN, Role.DEVELOPER]), (async (req, res) => {
  const { id } = req.params;
  
  try {
    const prismaAny = prisma as any;
    const collection = await prismaAny.collection.findUnique({
      where: { id },
      include: {
        problems: {
          include: {
            problem: true
          }
        }
      }
    });
    
    if (!collection) {
      return res.status(404).json({ error: 'Collection not found' });
    }
    
    // Transform the response to include problem details
    const problems = collection.problems.map((pc: any) => pc.problem);
    
    res.json({
      ...collection,
      problems
    });
  } catch (error) {
    console.error('Error fetching collection:', error);
    res.status(500).json({ error: 'Failed to fetch collection' });
  }
}) as RequestHandler);

// Create a new collection
router.post('/', authenticateToken, authorizeRoles([Role.ADMIN, Role.DEVELOPER]), (async (req, res) => {
  const { name, description } = req.body;
  
  if (!name) {
    return res.status(400).json({ error: 'Collection name is required' });
  }
  
  try {
    const prismaAny = prisma as any;
    // Check if a collection with this name already exists
    const existing = await prismaAny.collection.findFirst({
      where: { name }
    });
    
    if (existing) {
      return res.status(400).json({ error: 'A collection with this name already exists' });
    }
    
    const collection = await prismaAny.collection.create({
      data: {
        name,
        description
      }
    });
    
    res.status(201).json(collection);
  } catch (error) {
    console.error('Error creating collection:', error);
    res.status(500).json({ error: 'Failed to create collection' });
  }
}) as RequestHandler);

// Update a collection
router.put('/:id', authenticateToken, authorizeRoles([Role.ADMIN, Role.DEVELOPER]), (async (req, res) => {
  const { id } = req.params;
  const { name, description } = req.body;
  
  if (!name) {
    return res.status(400).json({ error: 'Collection name is required' });
  }
  
  try {
    const prismaAny = prisma as any;
    // Check if another collection with this name already exists
    const existing = await prismaAny.collection.findFirst({
      where: {
        name,
        id: { not: id }
      }
    });
    
    if (existing) {
      return res.status(400).json({ error: 'Another collection with this name already exists' });
    }
    
    const collection = await prismaAny.collection.update({
      where: { id },
      data: {
        name,
        description
      }
    });
    
    res.json(collection);
  } catch (error) {
    console.error('Error updating collection:', error);
    res.status(500).json({ error: 'Failed to update collection' });
  }
}) as RequestHandler);

// Delete a collection
router.delete('/:id', authenticateToken, authorizeRoles([Role.ADMIN, Role.DEVELOPER]), (async (req, res) => {
  const { id } = req.params;
  
  try {
    const prismaAny = prisma as any;
    await prismaAny.collection.delete({
      where: { id }
    });
    
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting collection:', error);
    res.status(500).json({ error: 'Failed to delete collection' });
  }
}) as RequestHandler);

// Add a problem to a collection
router.post('/:id/problems', authenticateToken, authorizeRoles([Role.ADMIN, Role.DEVELOPER]), (async (req, res) => {
  const { id } = req.params;
  const { problemId } = req.body;
  
  if (!problemId) {
    return res.status(400).json({ error: 'Problem ID is required' });
  }
  
  try {
    const prismaAny = prisma as any;
    // Check if collection exists
    const collection = await prismaAny.collection.findUnique({
      where: { id }
    });
    
    if (!collection) {
      return res.status(404).json({ error: 'Collection not found' });
    }
    
    // Check if problem exists
    const problem = await prisma.problem.findUnique({
      where: { id: problemId }
    });
    
    if (!problem) {
      return res.status(404).json({ error: 'Problem not found' });
    }
    
    // Add problem to collection (or do nothing if it's already there)
    await prismaAny.problemToCollection.upsert({
      where: {
        problemId_collectionId: {
          problemId,
          collectionId: id
        }
      },
      update: {},
      create: {
        problemId,
        collectionId: id
      }
    });
    
    res.status(204).send();
  } catch (error) {
    console.error('Error adding problem to collection:', error);
    res.status(500).json({ error: 'Failed to add problem to collection' });
  }
}) as RequestHandler);

// Remove a problem from a collection
router.delete('/:id/problems/:problemId', authenticateToken, authorizeRoles([Role.ADMIN, Role.DEVELOPER]), (async (req, res) => {
  const { id, problemId } = req.params;
  
  try {
    const prismaAny = prisma as any;
    await prismaAny.problemToCollection.delete({
      where: {
        problemId_collectionId: {
          problemId,
          collectionId: id
        }
      }
    });
    
    res.status(204).send();
  } catch (error) {
    console.error('Error removing problem from collection:', error);
    res.status(500).json({ error: 'Failed to remove problem from collection' });
  }
}) as RequestHandler);

// Get all problems in a collection
router.get('/:id/problems', authenticateToken, authorizeRoles([Role.ADMIN, Role.DEVELOPER]), (async (req, res) => {
  const { id } = req.params;
  
  try {
    console.log(`Fetching problems for collection ID: ${id}`);
    const prismaAny = prisma as any;
    
    // Step 1: Verify the collection exists
    const collection = await prismaAny.collection.findUnique({
      where: { id }
    });
    
    if (!collection) {
      console.log(`Collection with ID ${id} not found`);
      return res.status(404).json({ error: 'Collection not found' });
    }
    
    console.log(`Found collection: ${collection.name}`);
    
    // Step 2: Get problem IDs associated with this collection from the junction table
    const problemRelations = await prismaAny.problemToCollection.findMany({
      where: { 
        collectionId: id 
      },
      select: {
        problemId: true
      }
    });
    
    // If no problems are associated, return empty array
    if (problemRelations.length === 0) {
      console.log(`No problems found for collection: ${collection.name}`);
      return res.json([]);
    }
    
    // Extract problem IDs from the relations
    const problemIds = problemRelations.map((relation: any) => relation.problemId);
    console.log(`Found ${problemIds.length} problem IDs for collection`);
    
    // Step 3: Get the full problem details
    const problems = await prisma.problem.findMany({
      where: {
        id: { 
          in: problemIds 
        }
      },
      select: {
        id: true,
        name: true,
        description: true,
        difficulty: true,
        problemType: true,
        createdAt: true
      }
    });
    
    console.log(`Successfully fetched ${problems.length} problems for collection`);
    return res.json(problems);
    
  } catch (error) {
    console.error('Error in collection problems endpoint:', error);
    if (error instanceof Error) {
      console.error(`Error details: ${error.message}`);
      console.error(`Error stack: ${error.stack}`);
    }
    res.status(500).json({ error: 'Failed to fetch collection problems' });
  }
}) as RequestHandler);

export default router; 