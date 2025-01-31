import { PrismaClient, Difficulty } from '@prisma/client';
import type { Difficulty as DifficultyType } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Clean existing data
  await prisma.$transaction([
    prisma.problem.deleteMany(),
    prisma.topic.deleteMany(),
    prisma.level.deleteMany(),
  ]);

  // Create Levels
  const levelI = await prisma.level.create({
    data: {
      name: 'I',
      order: 1,
      description: 'Introduction to Programming Fundamentals',
    },
  });

  const levelL3 = await prisma.level.create({
    data: {
      name: 'L3',
      order: 2,
      description: 'Basic Data Structures',
    },
  });

  const levelL4 = await prisma.level.create({
    data: {
      name: 'L4',
      order: 3,
      description: 'Advanced Data Structures I',
    },
  });

  // Create Topics with Problems
  await prisma.topic.create({
    data: {
      name: 'Methodology',
      description: 'Learn about problem-solving methodologies in programming',
      content: 'Content for methodology...',
      order: 1,
      levelId: levelI.id,
      problems: {
        create: [
          {
            name: 'Problem Breakdown Practice',
            difficulty: 'EASY_IIII' as DifficultyType,
            required: true,
            reqOrder: 1,
            content: 'Practice breaking down complex problems into smaller steps',
          },
          {
            name: 'Algorithm Design Steps',
            difficulty: 'EASY_III' as DifficultyType,
            required: true,
            reqOrder: 2,
            content: 'Learn the steps to design an efficient algorithm',
          },
          {
            name: 'Time Complexity Analysis',
            difficulty: 'MEDIUM' as DifficultyType,
            required: false,
            content: 'Analyze the time complexity of different algorithms',
          },
        ],
      },
    },
  });

  await prisma.topic.create({
    data: {
      name: 'Arrays',
      description: 'Understanding array data structures and operations',
      content: 'Content for arrays...',
      order: 1,
      levelId: levelL3.id,
      problems: {
        create: [
          {
            name: 'Array Rotation',
            difficulty: 'EASY_III' as DifficultyType,
            required: true,
            reqOrder: 1,
            content: 'Implement array rotation algorithms',
          },
          {
            name: 'Two Sum Problem',
            difficulty: 'EASY_II' as DifficultyType,
            required: true,
            reqOrder: 2,
            content: 'Find two numbers in an array that add up to a target',
          },
        ],
      },
    },
  });

  console.log('Seed data created successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  }); 