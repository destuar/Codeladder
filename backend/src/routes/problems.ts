import { Prisma, Role, ProblemType, ProgressStatus } from '@prisma/client';
import express, { RequestHandler } from 'express';
import { prisma } from '../lib/prisma';
import { authenticateToken } from '../middleware/auth';
import { authorizeRoles } from '../middleware/authorize';
import { calculateNextReviewDate } from '../lib/spacedRepetition';

// Define the request body types
interface CreateProblemBody {
  name: string;
  content: string;
  difficulty: Prisma.ProblemCreateInput['difficulty'];
  required?: boolean;
  reqOrder?: number;
  problemType?: ProblemType;
  collectionIds?: string[];
  codeTemplate?: string;
  testCases?: string;
  topicId?: string;
  estimatedTime?: string | number;
  slug?: string;
  language?: string;
  functionName?: string;
  timeLimit?: number;
  memoryLimit?: number;
}

interface UpdateProblemBody {
  name?: string;
  content?: string;
  difficulty?: Prisma.ProblemCreateInput['difficulty'];
  required?: boolean;
  reqOrder?: number;
  problemType?: ProblemType;
  collectionIds?: string[];
  codeTemplate?: string;
  testCases?: string;
  estimatedTime?: string | number;
  slug?: string;
  language?: string;
  functionName?: string;
  timeLimit?: number;
  memoryLimit?: number;
}

const router = express.Router();

// Get a specific problem
router.get('/:problemId', authenticateToken, (async (req, res) => {
  try {
    const { problemId } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const problem = await prisma.problem.findUnique({
      where: { id: problemId },
      include: {
        completedBy: {
          where: { id: userId },
          select: { id: true }
        },
        progress: {
          where: { userId },
          select: { status: true }
        },
        topic: {
          include: { level: true }
        },
        collections: {
          select: {
            collection: {
              select: {
                id: true,
                name: true
              }
            }
          }
        },
        codeProblem: {
          include: {
            testCases: {
              orderBy: { orderNum: 'asc' } // Optional: Order test cases
            }
          }
        }
      }
    });

    if (!problem) {
      return res.status(404).json({ error: 'Problem not found' });
    }

    // Get collection IDs from problem's collections
    const collectionIds = problem.collections 
      ? problem.collections.map((pc: any) => pc.collectionId || (pc.collection && pc.collection.id))
      : [];

    // Find next and previous problems if this problem belongs to a topic
    let nextProblemId = null;
    let prevProblemId = null;
    let nextProblemSlug = null;
    let prevProblemSlug = null;

    if (problem.topicId) {
      // Get all problems in the same topic, ordered by reqOrder
      const topicProblems = await prisma.problem.findMany({
        where: { 
          topicId: problem.topicId 
        },
        orderBy: { 
          reqOrder: 'asc' 
        },
        select: { 
          id: true, 
          reqOrder: true,
          slug: true
        }
      });

      // Find the current problem's index in the ordered list
      const currentIndex = topicProblems.findIndex((p: { id: string }) => p.id === problemId);
      
      if (currentIndex !== -1) {
        // Get previous problem if not the first
        if (currentIndex > 0) {
          prevProblemId = topicProblems[currentIndex - 1].id;
          prevProblemSlug = topicProblems[currentIndex - 1].slug;
        }
        
        // Get next problem if not the last
        if (currentIndex < topicProblems.length - 1) {
          nextProblemId = topicProblems[currentIndex + 1].id;
          nextProblemSlug = topicProblems[currentIndex + 1].slug;
        }
      }
    }

    // Transform the response to include isCompleted, navigation IDs, and collections
    const response = {
      ...problem,
      // Remove legacy fields if they were included implicitly
      codeTemplate: undefined,
      testCases: undefined,
      // Keep necessary fields
      isCompleted: problem.completedBy.length > 0 || problem.progress.some((p: { status: ProgressStatus }) => p.status === 'COMPLETED'),
      nextProblemId,
      prevProblemId,
      nextProblemSlug,
      prevProblemSlug,
      collectionIds,
      completedBy: undefined, // Remove these from the response
      progress: undefined,
      collections: undefined // Remove raw collections data
    };

    res.json(response);
  } catch (error) {
    console.error('Error fetching problem:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}) as RequestHandler);

// Get submissions for a problem
router.get('/:problemId/submissions', authenticateToken, (async (req, res) => {
  try {
    const { problemId } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    // Get submissions for this problem by the current user
    const submissions = await prisma.submission.findMany({
      where: {
        problemId,
        userId
      },
      orderBy: {
        submittedAt: 'desc'
      },
      select: {
        id: true,
        language: true,
        status: true,
        executionTime: true,
        memory: true,
        passed: true,
        submittedAt: true,
        code: false // Don't include code in the listing to reduce payload size
      }
    });

    res.json(submissions);
  } catch (error) {
    console.error('Error fetching problem submissions:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}) as RequestHandler);

// Get a single submission with full details
router.get('/submissions/:submissionId', authenticateToken, (async (req, res) => {
  try {
    const { submissionId } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    // Get the submission, ensuring it belongs to the current user
    const submission = await prisma.submission.findFirst({
      where: {
        id: submissionId,
        userId
      }
    });

    if (!submission) {
      return res.status(404).json({ error: 'Submission not found' });
    }

    res.json(submission);
  } catch (error) {
    console.error('Error fetching submission details:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}) as RequestHandler);

// Get problems by type
router.get('/', authenticateToken, (async (req, res) => {
  try {
    const { type, search } = req.query;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const where: any = {};
    
    // Add type filter if provided
    if (type) {
      where.problemType = type as ProblemType;
    }

    // Add search filter if provided
    if (search) {
      where.name = { contains: search as string, mode: 'insensitive' };
    }

    const problems = await prisma.problem.findMany({
      where,
      include: {
        topic: {
          include: { level: true }
        },
        collections: true,
        codeProblem: true
      },
      orderBy: { createdAt: "desc" },
    });

    // Transform the response to include completion status and collection IDs
    const transformedProblems = problems.map((problem: any) => {
      const collectionIds = problem.collections?.map((pc: any) => 
        pc.collectionId || (pc.collection && pc.collection.id)
      ).filter(Boolean) || [];
      
      return {
        ...problem,
        completed: problem.completedBy?.length > 0 || problem.progress?.some((p: { status: ProgressStatus }) => p.status === 'COMPLETED'),
        collectionIds,
        completedBy: undefined,
        progress: undefined,
        collections: undefined, // Remove raw collections data
        codeTemplate: undefined, // Remove legacy fields
        testCases: undefined
      };
    });

    res.json(transformedProblems);
  } catch (error) {
    console.error('Error fetching problems:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}) as RequestHandler);

// Create a new problem (admin only)
router.post('/', authenticateToken, authorizeRoles([Role.ADMIN, Role.DEVELOPER]), (async (req, res) => {
  try {
    const { 
      name, 
      content, 
      difficulty, 
      required = false,
      reqOrder,
      problemType = 'INFO' as const,
      collectionIds = [],
      codeTemplate,
      testCases,
      topicId,
      estimatedTime,
      slug,
      language = 'javascript',
      functionName,
      timeLimit,
      memoryLimit
    } = req.body as CreateProblemBody;

    console.log('Creating problem with data:', {
      name,
      content: content ? `${content.substring(0, 20)}...` : undefined,
      difficulty,
      required,
      reqOrder,
      problemType,
      collectionIds,
      codeTemplate: codeTemplate ? 'Provided' : undefined,
      testCases: testCases ? 'Provided' : undefined,
      topicId,
      estimatedTime,
      slug: slug ? 'Provided' : undefined,
      language: problemType === 'CODING' ? language : undefined,
      functionName: problemType === 'CODING' ? functionName : undefined,
      timeLimit: problemType === 'CODING' ? timeLimit : undefined,
      memoryLimit: problemType === 'CODING' ? memoryLimit : undefined
    });

    // Only validate topic if topicId is provided
    if (topicId) {
      const topic = await prisma.topic.findUnique({
        where: { id: topicId }
      });

      if (!topic) {
        console.error('Topic not found:', topicId);
        return res.status(404).json({ error: 'Topic not found' });
      }

      // Check for duplicate order number if reqOrder is provided
      if (reqOrder) {
        const existingProblem = await prisma.problem.findFirst({
          where: {
            topicId,
            reqOrder,
          }
        });

        if (existingProblem) {
          return res.status(400).json({ 
            error: 'Order number already exists',
            details: `Problem "${existingProblem.name}" already has order number ${reqOrder}`
          });
        }
      }
    }

    // Convert estimatedTime to number if provided
    const parsedEstimatedTime = estimatedTime ? parseInt(estimatedTime.toString()) : null;
    if (estimatedTime && isNaN(parsedEstimatedTime!)) {
      return res.status(400).json({ error: 'Estimated time must be a valid number' });
    }

    // Parse testCases if it's a string
    let parsedTestCases = testCases;
    if (typeof testCases === 'string') {
      try {
        parsedTestCases = JSON.parse(testCases);
      } catch (e) {
        console.error('Error parsing testCases:', e);
        return res.status(400).json({ error: 'Invalid testCases JSON format' });
      }
    }

    // Use a transaction for the entire create process
    const prismaAny = prisma as any;
    
    const newProblem = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      // Prepare data for related problem types (CodeProblem)
      let codeProblemCreateData: Prisma.CodeProblemCreateNestedOneWithoutProblemInput | undefined;

      // If problem type is CODING, prepare CodeProblem create data
      if (problemType === 'CODING') {
        // Parse testCases
        let parsedTestCases: Record<string, any>[] = [];
        try {
          if (testCases) parsedTestCases = JSON.parse(testCases as string);
        } catch (e) {
          // Handle invalid JSON
          console.error("Invalid testCases JSON:", e);
          return res.status(400).json({ error: "Invalid testCases JSON" });
        }
        
        // Create code problem with testCases data
        codeProblemCreateData = {
          create: {
            codeTemplate: codeTemplate || '',
            language: language || 'javascript',
            functionName: functionName || 'solution',
            timeLimit: timeLimit ? Number(timeLimit) : 5000,
            memoryLimit: memoryLimit ? Number(memoryLimit) : null,
            testCases: {
              create: parsedTestCases.map((testCase) => ({
                input: testCase.input,
                expectedOutput: testCase.expected,
                isHidden: testCase.isHidden || false
              }))
            }
          }
        };
      }
      
      // Create the base Problem record
      const problem = await tx.problem.create({
        data: {
          name,
          difficulty,
          required,
          reqOrder,
          problemType, // Set the correct type
          estimatedTime: parsedEstimatedTime,
          content: content,
          ...(topicId && {
            topic: {
              connect: { id: topicId }
            }
          }),
          ...(slug && { slug }),
          // Conditionally include create data for related models
          ...(codeProblemCreateData && { codeProblem: codeProblemCreateData }),
        },
         // Include the created CodeProblem relation if it was created
         // to get its generated ID for Test Case creation
         include: {
            codeProblem: problemType === 'CODING' // Only include if type is CODING
         }
      });
      
      // Associate with collections if collectionIds is provided
      if (collectionIds && collectionIds.length > 0) {
        await Promise.all(collectionIds.map((collectionId: string) => 
          prisma.problemToCollection.create({
            data: {
              problem: { connect: { id: problem.id } },
              collection: { connect: { id: collectionId } }
            }
          })
        ));
      }
      
      // Return the problem with collections and code/info problem details
      return await tx.problem.findUnique({
        where: { id: problem.id },
        include: {
          collections: {
            include: {
              collection: true
            }
          },
          codeProblem: {
            include: {
              testCases: true
            }
          },
        }
      });
    });
    
    if (!newProblem) {
      throw new Error('Failed to retrieve created problem');
    }
    
    // Transform the response to include collection IDs for frontend
    // Use any type to work around TypeScript inference issues
    const newProblemResult = newProblem as any;
    const responseData = {
      ...newProblemResult,
      collectionIds: newProblemResult.collections?.map((pc: any) => 
        pc.collectionId || (pc.collection && pc.collection.id)
      ).filter(Boolean) || [],
      collections: undefined // Remove raw collections from response
    };

    res.status(201).json(responseData);
  } catch (error) {
    console.error('Error creating problem:', error);
    res.status(500).json({ error: 'Failed to create problem' });
  }
}) as RequestHandler);

// Update a problem (admin only)
router.put('/:problemId', authenticateToken, authorizeRoles([Role.ADMIN, Role.DEVELOPER]), (async (req, res) => {
  const { problemId } = req.params;
  const {
    name,
    content,
    difficulty,
    required,
    reqOrder,
    problemType, // Type might be updated
    collectionIds,
    codeTemplate,
    testCases,
    estimatedTime,
    language,
    functionName,
    timeLimit,
    memoryLimit
  } = req.body as UpdateProblemBody;

  try {
    // Fetch the current problem state, INCLUDING the codeProblem relation
    const currentProblem = await prisma.problem.findUniqueOrThrow({
      where: { id: problemId },
      include: { 
        collections: true,
        codeProblem: true
      } 
    });

    console.log('Updating problem with ID:', problemId);
    console.log('Request body:', {
      name,
      content: content ? `${content.substring(0, 20)}...` : undefined,
      difficulty,
      required,
      reqOrder,
      problemType,
      collectionIds,
      codeTemplate: codeTemplate ? 'Provided' : undefined,
      testCases: testCases ? 'Provided' : undefined,
      estimatedTime,
      language: problemType === 'CODING' ? language : undefined,
      functionName: problemType === 'CODING' ? functionName : undefined,
      timeLimit: problemType === 'CODING' ? timeLimit : undefined,
      memoryLimit: problemType === 'CODING' ? memoryLimit : undefined
    });

    // Check for duplicate order number if reqOrder is provided and different from current
    if (reqOrder && reqOrder !== currentProblem.reqOrder) {
      const existingProblem = await prisma.problem.findFirst({
        where: {
          topicId: currentProblem.topicId,
          reqOrder,
          id: { not: problemId } // Exclude the current problem from the check
        }
      });

      if (existingProblem) {
        return res.status(400).json({ 
          error: 'Order number already exists',
          details: `Problem "${existingProblem.name}" already has order number ${reqOrder}`
        });
      }
    }

    // Parse testCases if it's a string
    let parsedTestCases = testCases;
    if (typeof testCases === 'string') {
      try {
        parsedTestCases = JSON.parse(testCases);
      } catch (e) {
        console.error('Error parsing testCases:', e);
        return res.status(400).json({ error: 'Invalid testCases JSON format' });
      }
    }

    // Convert estimatedTime to number if provided
    const parsedEstimatedTime = estimatedTime ? parseInt(estimatedTime.toString()) : null;
    if (estimatedTime && isNaN(parsedEstimatedTime!)) {
      return res.status(400).json({ error: 'Estimated time must be a valid number' });
    }

    // Use a transaction to ensure problem and collections are updated atomically
    const prismaAny = prisma as any; // Keep type casting for transaction context if needed
    
    const updatedProblem = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      let finalCodeProblemId: string | null = null;
      let existingCodeProblem: any = null;

      // Determine the effective problem type (use new if provided, else keep current)
      const effectiveProblemType = problemType ?? currentProblem.problemType;

      // --- Handle Type-Specific Relations ---

      // Handle CodeProblem logic if the effective type is CODING
      if (effectiveProblemType === 'CODING') {
        existingCodeProblem = await tx.codeProblem.findUnique({ where: { problemId: problemId }});
        
        if (existingCodeProblem) {
          // Update existing CodeProblem - handle different ID fields with type casting
          const codeProblemObj = existingCodeProblem as any;
          const codeProblemId = codeProblemObj.questionId || codeProblemObj.id || codeProblemObj.problemId;
          finalCodeProblemId = codeProblemId;
          
          // Create where clause safely
          const whereClause: any = {};
          if (codeProblemObj.questionId) whereClause.questionId = codeProblemObj.questionId;
          if (codeProblemObj.id) whereClause.id = codeProblemObj.id;
          if (codeProblemObj.problemId) whereClause.problemId = codeProblemObj.problemId;
          
          await tx.codeProblem.update({
            where: whereClause,
            data: {
              ...(codeTemplate !== undefined && { codeTemplate }),
              ...(language !== undefined && { language }),
              ...(functionName !== undefined && { functionName }),
              ...(timeLimit !== undefined && { timeLimit: parseInt(timeLimit.toString()) }),
              ...(memoryLimit !== undefined && { memoryLimit: memoryLimit ? parseInt(memoryLimit.toString()) : null })
            }
          });
          
          // For test case deletion
          if (finalCodeProblemId) {
            await tx.testCase.deleteMany({ 
              where: { 
                codeProblemId: finalCodeProblemId 
              } 
            });
            
            // Create new test cases if provided
            if (parsedTestCases && Array.isArray(parsedTestCases) && parsedTestCases.length > 0) {
              const testCaseData = parsedTestCases.map((tc: any, index: number) => ({
                codeProblemId: finalCodeProblemId!, 
                input: JSON.stringify(tc.input ?? ''),
                expectedOutput: JSON.stringify(tc.expectedOutput ?? ''),
                isHidden: tc.isHidden || false,
                orderNum: tc.orderNum || index + 1
              }));
              await tx.testCase.createMany({ data: testCaseData });
            }
          }
        } else {
          // Create new CodeProblem
          const newCodeProblem = await tx.codeProblem.create({
            data: {
              problem: { connect: { id: problemId } },
              codeTemplate: codeTemplate ?? null,
              language: language ?? 'javascript',
              functionName: functionName ?? null,
              timeLimit: timeLimit ? parseInt(timeLimit.toString()) : 5000,
              memoryLimit: memoryLimit ? parseInt(memoryLimit.toString()) : null,
              testCases: {
                create: Array.isArray(parsedTestCases) ? parsedTestCases.map((tc: any, index: number) => ({
                  input: JSON.stringify(tc.input ?? ''),
                  expectedOutput: JSON.stringify(tc.expectedOutput ?? ''),
                  isHidden: tc.isHidden || false,
                  orderNum: tc.orderNum || index + 1
                })) : []
              }
            }
          });
          
          // Access ID safely with type casting
          const newCodeProblemObj = newCodeProblem as any;
          finalCodeProblemId = newCodeProblemObj.questionId || newCodeProblemObj.id || newCodeProblemObj.problemId;
        }
      } else if (effectiveProblemType === 'INFO') {
        // Handle InfoProblem logic if the effective type is INFO
        // If type changed TO INFO, delete any existing CodeProblem
        if (currentProblem.codeProblem) {
          // Type cast for safe property access
          const codeProblemObj = currentProblem.codeProblem as any;
          const whereClause: any = {};
          
          // Delete test cases first (use a safe codeProblemId access)
          const codeProblemId = codeProblemObj.questionId || codeProblemObj.id || codeProblemObj.problemId;
          if (codeProblemId) {
            await tx.testCase.deleteMany({ where: { codeProblemId }});
          }
          
          // Build a safe where clause for deletion
          if (codeProblemObj.questionId) whereClause.questionId = codeProblemObj.questionId;
          if (codeProblemObj.id) whereClause.id = codeProblemObj.id;
          if (codeProblemObj.problemId) whereClause.problemId = codeProblemObj.problemId;
          
          // Delete the code problem
          await tx.codeProblem.delete({ where: whereClause });
        }
      } else {
         // If type is neither CODING nor INFO (e.g., STANDALONE_INFO or type removed)
         // Delete both related records if they exist
         if (currentProblem.codeProblem) {
             // Type cast for safe property access
             const codeProblemObj = currentProblem.codeProblem as any;
             const whereClause: any = {};
             
             // Delete test cases first (use a safe codeProblemId access)
             const codeProblemId = codeProblemObj.questionId || codeProblemObj.id || codeProblemObj.problemId;
             if (codeProblemId) {
               await tx.testCase.deleteMany({ where: { codeProblemId }});
             }
             
             // Build a safe where clause for deletion
             if (codeProblemObj.questionId) whereClause.questionId = codeProblemObj.questionId;
             if (codeProblemObj.id) whereClause.id = codeProblemObj.id;
             if (codeProblemObj.problemId) whereClause.problemId = codeProblemObj.problemId;
             
             // Delete the code problem
             await tx.codeProblem.delete({ where: whereClause });
         }
      }
      // --- End of Type-Specific Relations Handling ---

      // --- Prepare Problem Update Data ---
      const problemUpdateData: Prisma.ProblemUpdateInput = {
        ...(name !== undefined && { name }),
        ...(difficulty !== undefined && { difficulty }),
        ...(required !== undefined && { required }),
        ...(reqOrder !== undefined && { reqOrder }),
        ...(problemType !== undefined && { problemType: effectiveProblemType }), // Use effective type
        ...(estimatedTime !== undefined && { estimatedTime: parsedEstimatedTime }),
        ...(req.body.slug !== undefined && { slug: req.body.slug }),
        ...(content !== undefined && { content: content }),
      };

      // --- Handle Connections/Disconnections for Relations ---
      if (effectiveProblemType === 'CODING' && finalCodeProblemId) {
        // Safe-build the connection clause based on available properties
        const connectClause: any = {};
        
        // Type cast existingCodeProblem for safe property access 
        const codeProblemObj = existingCodeProblem as any;
        
        if (codeProblemObj?.questionId) {
          connectClause.questionId = finalCodeProblemId;
        } else if (codeProblemObj?.id) {
          connectClause.id = finalCodeProblemId;
        } else if (codeProblemObj?.problemId) {
          connectClause.problemId = finalCodeProblemId;
        } else {
          // Default if no identifying property found
          connectClause.questionId = finalCodeProblemId;
        }
        
        problemUpdateData.codeProblem = { connect: connectClause };
      } else { 
        // Disconnect codeProblem if type is neither or related record wasn't created/found
        if (currentProblem.codeProblem) problemUpdateData.codeProblem = { disconnect: true };
      }
       
      // Perform the actual Problem update
      const problem = await tx.problem.update({
        where: { id: problemId },
        data: problemUpdateData,
        include: { // Include necessary relations for the response/collection logic
          collections: {
            include: {
              collection: true
            }
          },
          codeProblem: { // Include the potentially updated/connected codeProblem
            include: {
              testCases: true
            }
          },
        }
      });
      
      console.log(`Problem updated successfully. ID: ${problem.id}`);

      // 2. Update collection relationships if collectionIds is provided
      if (collectionIds !== undefined) {
        // Get current collection IDs for comparisons
        const currentCollectionIds = problem.collections.map((pc: { collectionId: string }) => pc.collectionId);
        
        // Find collections to add and remove
        const collectionsToAdd = collectionIds.filter(id => !currentCollectionIds.includes(id));
        const collectionsToRemove = currentCollectionIds.filter((id: string) => !collectionIds.includes(id));
        
        console.log(`Collections to add: ${collectionsToAdd.length}, to remove: ${collectionsToRemove.length}`);
        
        // Remove old relationships
        if (collectionsToRemove.length > 0) {
          await tx.problemToCollection.deleteMany({
            where: {
              problemId,
              collectionId: {
                in: collectionsToRemove
              }
            }
          });
          console.log(`Removed ${collectionsToRemove.length} collection relationships`);
        }
        
        // Add new relationships
        if (collectionsToAdd.length > 0) {
          // Check that all collections exist first
          for (const collectionId of collectionsToAdd) {
            const exists = await tx.collection.findUnique({
              where: { id: collectionId },
              select: { id: true }
            });
            
            if (!exists) {
              throw new Error(`Collection ID ${collectionId} does not exist`);
            }
          }
          
          // Create the new relationships
          await tx.problemToCollection.createMany({
            data: collectionsToAdd.map(collectionId => ({
              problemId,
              collectionId
            })),
            skipDuplicates: true
          });
          console.log(`Added ${collectionsToAdd.length} new collection relationships`);
        }
        
        // Get the updated problem with collections
        return await tx.problem.findUnique({
          where: { id: problem.id },
          include: {
            collections: {
              include: {
                collection: true
              }
            },
            codeProblem: {
              include: {
                testCases: true
              }
            },
          }
        });
      }
      
      // If no collection updates needed, return the problem with collections
      return problem;
    });
    
    // Transform collections for the response
    const responseData = {
      ...updatedProblem,
      collectionIds: updatedProblem?.collections.map((pc: { collection: { id: string } }) => pc.collection.id) || [],
      collections: undefined // Remove collections from the response
    };
    
    res.json(responseData);
  } catch (error) {
    console.error('Error updating problem:', error);
    res.status(500).json({ error: 'Failed to update problem' });
  }
}) as RequestHandler);

// Reorder problems endpoint
router.post('/reorder', authenticateToken, authorizeRoles([Role.ADMIN, Role.DEVELOPER]), (async (req, res) => {
  try {
    const { problemOrders } = req.body;
    // problemOrders should be an array of { id: string, reqOrder: number }

    // Validate input
    if (!Array.isArray(problemOrders)) {
      return res.status(400).json({ error: 'problemOrders must be an array' });
    }

    // Perform all updates in a transaction to ensure consistency
    const result = await prisma.$transaction(
      problemOrders.map(({ id, reqOrder }) =>
        prisma.problem.update({
          where: { id },
          data: { reqOrder }
        })
      )
    );

    res.json(result);
  } catch (error) {
    console.error('Error reordering problems:', error);
    res.status(500).json({ error: 'Failed to reorder problems' });
  }
}) as RequestHandler);

// Mark a problem as completed or uncompleted (toggle)
router.post('/:problemId/complete', authenticateToken, (async (req, res) => {
  try {
    const { problemId } = req.params;
    const userId = req.user?.id;
    const isAdmin = req.user?.role === Role.ADMIN || req.user?.role === Role.DEVELOPER;
    const { preserveReviewData, forceComplete } = req.body; // Added forceComplete parameter

    console.log('Problem completion request:', { 
      problemId, 
      userId, 
      isAdmin, 
      preserveReviewData,
      forceComplete
    });

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    // Get the problem to check if it exists and get its topic
    const problem = await prisma.problem.findUnique({
      where: { id: problemId },
      include: {
        topic: true,
        completedBy: {
          where: { id: userId },
          select: { id: true }
        },
        progress: {
          where: { userId },
          select: { 
            status: true,
            reviewLevel: true,
            reviewScheduledAt: true,
            lastReviewedAt: true,
            id: true
          }
        }
      }
    });

    if (!problem) {
      return res.status(404).json({ error: 'Problem not found' });
    }

    // Check if problem is already completed
    const isCompleted = problem.completedBy.length > 0 || problem.progress.some((p: { status: ProgressStatus }) => p.status === 'COMPLETED');
    
    // Get existing progress with reviews
    const existingProgress = await prisma.progress.findUnique({
      where: {
        userId_topicId_problemId: problem.topicId ? {
          userId,
          topicId: problem.topicId,
          problemId: problemId
        } : undefined
      }, 
      include: {
        reviews: true // Include the reviews relation
      }
    });

    const hasReviewHistory = (existingProgress?.reviews?.length || 0) > 0;

    console.log('Problem state before update:', {
      problemId,
      isCompleted,
      preserveReviewData,
      forceComplete,
      existingProgressId: existingProgress?.id,
      progressStatus: existingProgress?.status,
      reviewLevel: existingProgress?.reviewLevel,
      hasReviewHistory,
      problemHasTopicId: !!problem.topicId
    });

    // If problem is completed and we're not forcing completion, and not admin, return error
    // Otherwise, we either toggle off or force completion
    if (isCompleted && !forceComplete && !isAdmin) {
      return res.status(400).json({ error: 'Problem is already completed' });
    }

    // If the problem doesn't have a topic, we can't track progress properly
    if (!problem.topicId) {
      console.warn('Attempting to complete a problem without a topic ID:', problemId);
      // Just connect the problem to user's completed list without progress tracking
      await prisma.user.update({
        where: { id: userId },
        data: {
          completedProblems: isCompleted && !forceComplete 
            ? { disconnect: { id: problemId } } 
            : { connect: { id: problemId } }
        }
      });

      return res.json({
        message: isCompleted && !forceComplete ? 'Problem marked as uncompleted' : 'Problem marked as completed',
        preservedReviewData: false,
        wasForced: forceComplete || false,
        noTopicId: true
      });
    }

    let result: any; // Use any type for result to avoid TypeScript errors with fallback
    
    // Only uncomplete if explicitly toggling (not in force complete mode) and already completed
    if (isCompleted && !forceComplete) {
      // CHANGED: Update progress record instead of deleting it to preserve ReviewHistory
      try {
        result = await prisma.$transaction(async (tx: any) => {
          let progressToUpdate = existingProgress;
          
          // If we don't have existing progress but have progress records (from old schema)
          if (!progressToUpdate && problem.progress.length > 0) {
            progressToUpdate = await tx.progress.findUnique({
              where: { id: problem.progress[0].id },
              include: { reviews: true }
            });
          }
          
          // If we have progress, update it instead of deleting it
          if (progressToUpdate) {
            await tx.progress.update({
              where: { id: progressToUpdate.id },
              data: {
                status: 'NOT_STARTED' as ProgressStatus,
                // Keep reviewLevel and other review data intact
              }
            });
          }
          
          return await tx.user.update({
            where: { id: userId },
            data: {
              completedProblems: {
                disconnect: { id: problemId }
              }
            }
          });
        });
      } catch (txError: any) {
        console.error('Transaction error when uncompleting problem:', txError);
        // Fall back to a simpler approach if transaction fails
        result = await prisma.user.update({
          where: { id: userId },
          data: {
            completedProblems: {
              disconnect: { id: problemId }
            }
          }
        });
      }
      
      console.log('Problem marked as uncompleted:', {
        problemId,
        userId,
        preservedProgress: true
      });
    } else {
      // Mark as completed (either newly or forced)
      try {
        result = await prisma.$transaction(async (tx: any) => {
          // First, get any existing progress to preserve review data if needed
          const currentProgress = preserveReviewData ? await tx.progress.findFirst({
            where: {
              userId,
              problemId
            },
            include: {
              reviews: true
            }
          }) : null;
          
          console.log('Existing progress in transaction:', currentProgress ? {
            id: currentProgress.id,
            status: currentProgress.status,
            reviewLevel: currentProgress.reviewLevel,
            reviewScheduledAt: currentProgress.reviewScheduledAt
          } : 'No existing progress');
          
          // Determine what review data to use - ONLY if preserveReviewData is true
          // otherwise, don't set any review data to avoid automatically adding to spaced repetition
          const reviewData = preserveReviewData && currentProgress && currentProgress.reviewLevel !== null ? {
            // Copy existing review data for preservation
            reviewLevel: currentProgress.reviewLevel,
            reviewScheduledAt: currentProgress.reviewScheduledAt,
            lastReviewedAt: currentProgress.lastReviewedAt,
          } : {};  // Empty object - don't set any review data
          
          console.log('Review data to be used:', reviewData);
          
          // Update or create progress
          const progressResult = await tx.progress.upsert({
            where: {
              userId_topicId_problemId: {
                userId,
                topicId: problem.topicId!,
                problemId
              }
            },
            create: {
              userId,
              topicId: problem.topicId!,
              problemId,
              status: 'COMPLETED',
              ...reviewData,
              reviewLevel: reviewData.reviewLevel ?? 0 // Ensure reviewLevel has a default value
            },
            update: {
              status: 'COMPLETED',
              // Only update review data if explicitly preserving it
              ...(preserveReviewData && currentProgress && currentProgress.reviewLevel !== null ? reviewData : {})
            }
          });
          
          // Update user's completed problems
          const userResult = await tx.user.update({
            where: { id: userId },
            data: {
              completedProblems: {
                connect: { id: problemId }
              }
            }
          });
          
          // Only add ReviewHistory entry if preserveReviewData is true and we have review data
          if (preserveReviewData && currentProgress && currentProgress.reviewLevel !== null) {
            await tx.reviewHistory.create({
              data: {
                progressId: progressResult.id,
                date: new Date(),
                wasSuccessful: true,
                reviewOption: 'continued-review',  // Use a standard value
                levelBefore: currentProgress.reviewLevel,
                levelAfter: currentProgress.reviewLevel
              }
            });
          }
          
          return { progressResult, userResult };
        });
      } catch (txError: any) {
        // Log detailed error information
        console.error('Transaction error when completing problem:', txError);
        console.error('Error details:', {
          name: txError.name,
          code: txError.code,
          meta: txError.meta,
          stack: txError.stack
        });
        
        // Fall back to a simpler approach if transaction fails
        // Just connect the problem to the user's completed problems
        result = await prisma.user.update({
          where: { id: userId },
          data: {
            completedProblems: {
              connect: { id: problemId }
            }
          }
        });
      }
      
      // Log information about completion status, with optional chaining for safety
      console.log('Problem marked as completed:', {
        problemId,
        userId,
        progressId: result?.progressResult?.id,
        reviewLevel: result?.progressResult?.reviewLevel,
        reviewScheduledAt: result?.progressResult?.reviewScheduledAt
      });
    }

    res.json({ 
      message: isCompleted && !forceComplete ? 'Problem marked as uncompleted' : 'Problem marked as completed',
      preservedReviewData: preserveReviewData || false,
      wasForced: forceComplete || false
    });
  } catch (error) {
    console.error('Error toggling problem completion:', error);
    // Add more detailed error information
    res.status(500).json({ 
      error: 'Failed to toggle problem completion',
      details: error instanceof Error ? error.message : 'Unknown error',
      stack: process.env.NODE_ENV !== 'production' ? (error as Error).stack : undefined
    });
  }
}) as RequestHandler);

// Add a route to remove a problem from its topic
router.put('/:problemId/remove-topic', authenticateToken, authorizeRoles([Role.ADMIN, Role.DEVELOPER]), (async (req, res) => {
  try {
    const { problemId } = req.params;
    
    // Check if problem exists
    const problem = await prisma.problem.findUnique({
      where: { id: problemId },
      include: { topic: true }
    });
    
    if (!problem) {
      return res.status(404).json({ error: 'Problem not found' });
    }
    
    // Update the problem to remove its topic association
    const updatedProblem = await prisma.problem.update({
      where: { id: problemId },
      data: { 
        topicId: null,
        reqOrder: null  // Reset reqOrder as it's only relevant within a topic
      }
    });
    
    res.json({
      ...updatedProblem,
      message: 'Problem removed from topic successfully'
    });
  } catch (error) {
    console.error('Error removing problem from topic:', error);
    res.status(500).json({ 
      error: 'Failed to remove problem from topic',
      details: error instanceof Error ? error.message : 'Unknown error',
      stack: process.env.NODE_ENV !== 'production' ? (error as Error).stack : undefined
    });
  }
}) as RequestHandler);

// Add a new comprehensive endpoint for admin dashboard use
router.get('/admin/dashboard', authenticateToken, authorizeRoles([Role.ADMIN, Role.DEVELOPER]), (async (req, res) => {
  try {
    const { collection, withTopics } = req.query;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    // Build the where clause based on query parameters
    const where: any = {};
    
    // Basic query params for filtering
    if (req.query.search) {
      where.name = { contains: req.query.search as string, mode: 'insensitive' };
    }
    
    if (req.query.type) {
      where.problemType = req.query.type as ProblemType;
    }
    
    // If requesting problems without topics
    if (req.query.noTopic === 'true') {
      where.topicId = null;
    }
    
    // Include detailed information needed for the dashboard
    const problems = await prisma.problem.findMany({
      where,
      include: {
        topic: { select: { id: true, name: true, level: true } },
        codeProblem: true,
        collections: true
      },
      orderBy: { createdAt: "desc" },
    });

    // Transform the response for the frontend
    const transformedProblems = problems.map((problem: any) => {
      // Extract collection details safely
      const collections = problem.collections?.map((pc: any) => {
        if (pc.collection) return pc.collection;
        return pc; // Return the original object if collection property doesn't exist
      }).filter(Boolean) || [];
      
      const collectionIds = collections
        .map((c: any) => c.id)
        .filter(Boolean);
      
      // Format the response
      return {
        ...problem,
        completed: problem.completedBy?.length > 0 || problem.progress?.some((p: any) => p.status === 'COMPLETED'),
        collectionIds,
        collections, // Include full collection objects for the admin dashboard
        completedBy: undefined,
        progress: undefined,
        codeTemplate: undefined,
        testCases: undefined
      };
    });

    // If we're filtering by collection
    if (collection && collection !== 'no-collection') {
      const filteredProblems = transformedProblems.filter((problem: any) => 
        problem.collectionIds.includes(collection as string)
      );
      
      // Further filter by topic status if requested
      if (withTopics === 'false') {
        return res.json(filteredProblems.filter((p: any) => !p.topic));
      }
      
      return res.json(filteredProblems);
    } 
    // If we're getting "no collection" problems
    else if (collection === 'no-collection') {
      const problemsWithoutCollections = transformedProblems.filter(
        (problem: any) => !problem.collectionIds.length
      );
      
      // Further filter by topic status if requested
      if (withTopics === 'false') {
        return res.json(problemsWithoutCollections.filter((p: any) => !p.topic));
      }
      
      return res.json(problemsWithoutCollections);
    }

    // Return all problems
    res.json(transformedProblems);
  } catch (error) {
    console.error('Error fetching admin dashboard problems:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}) as RequestHandler);

// Get a specific problem by slug
router.get('/slug/:slug', authenticateToken, (async (req, res) => {
  try {
    const { slug } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const problem = await prisma.problem.findUnique({
      where: { slug },
      include: {
        completedBy: {
          where: { id: userId },
          select: { id: true }
        },
        progress: {
          where: { userId },
          select: { status: true }
        },
        topic: {
          include: { level: true }
        },
        collections: {
          select: {
            collection: {
              select: {
                id: true,
                name: true
              }
            }
          }
        },
        codeProblem: {
          include: { testCases: true }
        }
      }
    });

    if (!problem) {
      return res.status(404).json({ error: 'Problem not found' });
    }

    // Get collection IDs from problem's collections
    const collectionIds = problem.collections 
      ? problem.collections.map((pc: any) => pc.collectionId || (pc.collection && pc.collection.id))
      : [];

    // Find next and previous problems if this problem belongs to a topic
    let nextProblemId = null;
    let prevProblemId = null;
    let nextProblemSlug = null;
    let prevProblemSlug = null;

    if (problem.topicId) {
      // Get all problems in the same topic, ordered by reqOrder
      const topicProblems = await prisma.problem.findMany({
        where: { 
          topicId: problem.topicId 
        },
        orderBy: { 
          reqOrder: 'asc' 
        },
        select: { 
          id: true, 
          reqOrder: true,
          slug: true
        }
      });

      // Find the current problem's index in the ordered list
      const currentIndex = topicProblems.findIndex((p: { id: string }) => p.id === problem.id);
      
      if (currentIndex !== -1) {
        // Get previous problem if not the first
        if (currentIndex > 0) {
          prevProblemId = topicProblems[currentIndex - 1].id;
          prevProblemSlug = topicProblems[currentIndex - 1].slug;
        }
        
        // Get next problem if not the last
        if (currentIndex < topicProblems.length - 1) {
          nextProblemId = topicProblems[currentIndex + 1].id;
          nextProblemSlug = topicProblems[currentIndex + 1].slug;
        }
      }
    }

    // Transform the response to include isCompleted, navigation IDs, and collections
    const response = {
      ...problem,
      // Remove legacy fields if they were included implicitly
      codeTemplate: undefined,
      testCases: undefined,
      // Keep necessary fields
      isCompleted: problem.completedBy.length > 0 || problem.progress.some((p: { status: ProgressStatus }) => p.status === 'COMPLETED'),
      nextProblemId,
      prevProblemId,
      nextProblemSlug,
      prevProblemSlug,
      collectionIds,
      completedBy: undefined, // Remove these from the response
      progress: undefined,
      collections: undefined // Remove raw collections data
    };

    res.json(response);
  } catch (error) {
    console.error('Error fetching problem by slug:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}) as RequestHandler);

export default router; 