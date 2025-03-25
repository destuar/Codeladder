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
  console.log('Resolving problem:', identifier);
  
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
    // Log the input parameters
    console.log('getProblemId called with:', {
      id: identifier.id || 'not provided',
      slug: identifier.slug || 'not provided',
      typeofId: identifier.id ? typeof identifier.id : 'N/A',
      typeofSlug: identifier.slug ? typeof identifier.slug : 'N/A'
    });
    
    if (!identifier.id && !identifier.slug) {
      console.error('getProblemId called with no id or slug:', identifier);
      return null;
    }
    
    if (identifier.id) {
      // Verify the ID exists
      console.log(`Looking up problem by ID: "${identifier.id}"`);
      const exists = await prisma.problem.findUnique({
        where: { id: identifier.id },
        select: { id: true }
      });
      
      if (!exists) {
        console.error(`No problem found with ID: "${identifier.id}"`);
      }
      
      return exists ? identifier.id : null;
    } else if (identifier.slug) {
      // Handle null, undefined, or empty slug
      if (typeof identifier.slug !== 'string') {
        console.error('getProblemId called with non-string slug:', identifier.slug);
        return null;
      }
      
      // Check for empty string slugs
      if (!identifier.slug.trim()) {
        console.error('getProblemId called with empty slug string');
        return null;
      }
      
      console.log(`Looking up problem by slug: "${identifier.slug}"`);
      
      const problem = await prisma.problem.findUnique({
        where: { slug: identifier.slug },
        select: { id: true }
      });
      
      if (!problem) {
        console.error(`No problem found with slug: "${identifier.slug}"`);
      }
      
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
      console.log('getProgressForProblem: Problem ID could not be resolved');
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
      console.log('getProgressForProblem: Problem or its topic not found');
      return null;
    }
    
    console.log('getProgressForProblem: Looking for progress with', {
      userId,
      problemId: problem.id,
      topicId: problem.topicId
    });
    
    // Find progress record using the composite key
    return await prisma.progress.findUnique({
      where: {
        userId_topicId_problemId: {
          userId,
          topicId: problem.topicId,
          problemId: problem.id
        }
      },
      include: {
        reviews: {
          orderBy: {
            date: 'desc'
          }
        }
      }
    });
  } catch (error) {
    console.error('Error getting progress for problem:', error);
    return null;
  }
} 