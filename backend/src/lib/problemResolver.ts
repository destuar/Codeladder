import { prisma } from './prisma';

/**
 * Utility for resolving problem IDs and slugs
 */

interface ProblemIdentifier {
  id?: string;
  slug?: string;
}

/**
 * Resolves a problem by either ID or slug
 * @param identifier Object containing either id or slug
 * @returns Problem data or null if not found
 */
export async function resolveProblem(identifier: ProblemIdentifier) {
  if (!identifier.id && !identifier.slug) {
    throw new Error('Either problem ID or slug must be provided');
  }
  
  try {
    if (identifier.id) {
      return await prisma.problem.findUnique({
        where: { id: identifier.id },
        include: {
          topic: {
            select: {
              id: true,
              name: true,
              slug: true
            }
          }
        }
      });
    } else if (identifier.slug) {
      return await prisma.problem.findUnique({
        where: { slug: identifier.slug },
        include: {
          topic: {
            select: {
              id: true,
              name: true,
              slug: true
            }
          }
        }
      });
    }
    
    return null;
  } catch (error) {
    console.error('Error resolving problem:', error);
    return null;
  }
}

/**
 * Gets a problem ID from either an ID or slug
 * @param identifier Object containing either id or slug
 * @returns Problem ID or null if not found
 */
export async function getProblemId(identifier: ProblemIdentifier): Promise<string | null> {
  try {
    if (identifier.id) {
      // Verify the ID exists
      const exists = await prisma.problem.findUnique({
        where: { id: identifier.id },
        select: { id: true }
      });
      return exists ? identifier.id : null;
    } else if (identifier.slug) {
      const problem = await prisma.problem.findUnique({
        where: { slug: identifier.slug },
        select: { id: true }
      });
      return problem ? problem.id : null;
    }
    return null;
  } catch (error) {
    console.error('Error getting problem ID:', error);
    return null;
  }
}

/**
 * Gets a problem slug from either an ID or slug
 * @param identifier Object containing either id or slug
 * @returns Problem slug or null if not found
 */
export async function getProblemSlug(identifier: ProblemIdentifier): Promise<string | null> {
  try {
    if (identifier.slug) {
      // Verify the slug exists
      const exists = await prisma.problem.findUnique({
        where: { slug: identifier.slug },
        select: { slug: true }
      });
      return exists?.slug ?? null;
    } else if (identifier.id) {
      const problem = await prisma.problem.findUnique({
        where: { id: identifier.id },
        select: { slug: true }
      });
      return problem?.slug ?? null;
    }
    return null;
  } catch (error) {
    console.error('Error getting problem slug:', error);
    return null;
  }
}

/**
 * Gets progress record for a user and problem
 * @param userId User ID
 * @param identifier Problem identifier (id or slug)
 * @returns Progress record or null if not found
 */
export async function getProgressForProblem(userId: string, identifier: ProblemIdentifier) {
  try {
    const problemId = await getProblemId(identifier);
    
    if (!problemId) {
      return null;
    }
    
    // Get the problem to find its topic
    const problem = await prisma.problem.findUnique({
      where: { id: problemId },
      select: { 
        id: true,
        topicId: true
      }
    });
    
    if (!problem || !problem.topicId) {
      return null;
    }
    
    // Find progress record
    return await prisma.progress.findFirst({
      where: {
        userId,
        problemId: problem.id,
        topicId: problem.topicId
      },
      orderBy: {
        updatedAt: 'desc'
      }
    });
  } catch (error) {
    console.error('Error getting progress for problem:', error);
    return null;
  }
} 