/**
 * Script to populate missing slugs for problems in the database.
 * This is important for the new spaced repetition system that relies on slugs.
 */

import { PrismaClient } from '@prisma/client';
import slugify from 'slugify';

const prisma = new PrismaClient();

/**
 * Generate a slug from a string by:
 * 1. Removing special characters
 * 2. Converting to lowercase
 * 3. Replacing spaces with hyphens
 */
function generateSlug(str: string): string {
  return slugify(str, {
    lower: true,
    strict: true,
    trim: true
  });
}

/**
 * Ensures a slug is unique by appending a suffix if needed
 */
async function ensureUniqueSlug(baseSlug: string): Promise<string> {
  let finalSlug = baseSlug;
  let counter = 1;
  
  // Keep checking until we find a unique slug
  while (true) {
    const existingProblem = await prisma.problem.findUnique({
      where: { slug: finalSlug }
    });
    
    if (!existingProblem) {
      return finalSlug;
    }
    
    // If slug exists, append counter and try again
    finalSlug = `${baseSlug}-${counter}`;
    counter++;
  }
}

/**
 * Main function to populate missing slugs
 */
async function populateMissingSlugs() {
  try {
    console.log('Starting to populate missing slugs...');
    
    // Find all problems with missing slugs
    const problemsWithoutSlugs = await prisma.problem.findMany({
      where: { slug: null }
    });
    
    console.log(`Found ${problemsWithoutSlugs.length} problems without slugs`);
    
    // Update each problem with a generated slug
    for (const problem of problemsWithoutSlugs) {
      const baseSlug = generateSlug(problem.name);
      const uniqueSlug = await ensureUniqueSlug(baseSlug);
      
      await prisma.problem.update({
        where: { id: problem.id },
        data: { slug: uniqueSlug }
      });
      
      console.log(`Updated problem "${problem.name}" with slug: ${uniqueSlug}`);
    }
    
    console.log('Finished populating missing slugs');
  } catch (error) {
    console.error('Error populating slugs:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
populateMissingSlugs(); 