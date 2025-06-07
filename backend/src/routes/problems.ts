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
  testCases?: string;
  topicId?: string;
  estimatedTime?: string | number;
  slug?: string;
  functionName?: string;
  timeLimit?: number;
  memoryLimit?: number;
  return_type?: string;
  params?: string;
  defaultLanguage?: string;
  languageSupport?: string;
  coding?: any;
}

interface UpdateProblemBody {
  name?: string;
  content?: string;
  difficulty?: Prisma.ProblemCreateInput['difficulty'];
  required?: boolean;
  reqOrder?: number;
  problemType?: ProblemType;
  collectionIds?: string[];
  testCases?: string;
  estimatedTime?: string | number;
  slug?: string;
  functionName?: string;
  timeLimit?: number;
  memoryLimit?: number;
  return_type?: string;
  params?: string;
  defaultLanguage?: string;
  languageSupport?: string;
}

const router = express.Router();

/**
 * Safely parses a value that might be a string representation of JSON
 * Removes multiple layers of escaping if present
 * 
 * @param value The value to parse
 * @returns Parsed value or original value if parsing fails
 */
const safelyParseValue = (value: any): any => {
  if (value === undefined || value === null) return value;
  
  // If it's not a string, we're already done
  if (typeof value !== 'string') return value;
  
  // Attempt to handle excessive JSON escaping by repeatedly parsing
  let result = value;
  let iterations = 0;
  const MAX_ITERATIONS = 5; // Limit iterations to avoid infinite loop
  
  while (typeof result === 'string' && 
         (result.startsWith('"') && result.endsWith('"')) && 
         result.includes('\\') && 
         iterations < MAX_ITERATIONS) {
    try {
      result = JSON.parse(result);
      iterations++;
    } catch (e) {
      break; // Stop if parsing fails
    }
  }
  
  // Try one more parse if it looks like JSON
  if (typeof result === 'string' && 
      ((result.startsWith('{') && result.endsWith('}')) || 
       (result.startsWith('[') && result.endsWith(']')))) {
    try {
      return JSON.parse(result);
    } catch (e) {
      // Return the current result if this parse fails
      return result;
    }
  }
  
  return result;
};

/**
 * Normalizes a test case by ensuring proper data structures
 * 
 * @param testCase The input test case to normalize
 * @returns A normalized test case ready for database storage
 */
const normalizeTestCase = (testCase: any, index: number): any => {
  // Parse and clean the input
  const parsedInput = safelyParseValue(testCase.input ?? testCase.input_args ?? '');
  
  // Parse and clean the expected output
  const parsedExpected = safelyParseValue(testCase.expectedOutput ?? testCase.expected ?? testCase.expected_out ?? '');
  
  return {
    input: JSON.stringify(parsedInput), // Store consistent JSON string
    expectedOutput: JSON.stringify(parsedExpected), // Store consistent JSON string
    isHidden: testCase.isHidden || (testCase.phase === 'hidden') || false,
    orderNum: testCase.orderNum || testCase.case_id || index + 1
  };
};

/**
 * Prepares language support data for storage
 * @param languageSupportJson A JSON string or object with language data
 * @param defaultLanguage The default language to use if not specified
 * @returns Structured language support JSON object
 */
const prepareLanguageSupport = (
  languageSupportInput: string | object,
  defaultLanguage: string = 'python'
): any => {
  let languageSupport: any = {};

  // 1. Parse the input if it's a string
  if (typeof languageSupportInput === 'string') {
    try {
      languageSupport = JSON.parse(languageSupportInput);
    } catch (e) {
      console.warn('Error parsing languageSupport JSON, starting with empty object.', e);
      languageSupport = {};
    }
  } else if (typeof languageSupportInput === 'object' && languageSupportInput !== null) {
    languageSupport = { ...languageSupportInput };
  }

  // 2. Ensure all enabled languages have the required fields
  for (const lang in languageSupport) {
    if (languageSupport.hasOwnProperty(lang)) {
      const langData = languageSupport[lang];
      // Ensure the essential fields exist, even if null
      languageSupport[lang] = {
        template: langData.template || '',
        reference: langData.reference || null,
        solution: langData.solution || null,
      };
    }
  }

  return languageSupport;
};

// Get a specific problem by SLUG
router.get('/slug/:slug', authenticateToken, (async (req, res) => {
  try {
    const { slug } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    if (!slug) {
      return res.status(400).json({ error: 'Slug parameter is required' });
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
          include: {
            testCases: {
              orderBy: { orderNum: 'asc' }
            }
          }
        },
        spacedRepetitionItems: {
          where: {
            userId: userId,
            isActive: true
          },
          select: {
            id: true,
            reviewLevel: true,
            reviewScheduledAt: true
          }
        }
      }
    });

    // Ensure the problem exists (removed type check)
    if (!problem) {
      return res.status(404).json({ error: 'Problem not found' });
    }

    // --- Replicate logic from GET /:problemId to find next/prev --- 
    const collectionIds = problem.collections
      ? problem.collections
          .map((pc: any) => pc.collection?.id) // USE OPTIONAL CHAINING
          .filter(Boolean) // Filter out any null or undefined IDs
      : [];

    let nextProblemId = null;
    let prevProblemId = null;
    let nextProblemSlug = null;
    let prevProblemSlug = null;

    if (problem.topicId) {
      const topicProblems = await prisma.problem.findMany({
        where: { topicId: problem.topicId },
        orderBy: { reqOrder: 'asc' },
        select: { id: true, reqOrder: true, slug: true }
      });

      const currentIndex = topicProblems.findIndex((p: { id: string }) => p.id === problem.id);
      
      if (currentIndex !== -1) {
        if (currentIndex > 0) {
          prevProblemId = topicProblems[currentIndex - 1].id;
          prevProblemSlug = topicProblems[currentIndex - 1].slug;
        }
        if (currentIndex < topicProblems.length - 1) {
          nextProblemId = topicProblems[currentIndex + 1].id;
          nextProblemSlug = topicProblems[currentIndex + 1].slug;
        }
      }
    }
    // --- End of next/prev logic --- 

    // Return full problem data, similar to GET /:problemId
    const response = {
      ...problem,
      codeTemplate: undefined, // Remove legacy fields
      testCases: undefined,
      isCompleted: problem.completedBy.length > 0 || problem.progress.some((p: { status: ProgressStatus }) => p.status === 'COMPLETED'),
      nextProblemId,
      prevProblemId,
      nextProblemSlug,
      prevProblemSlug,
      collectionIds,
      completedBy: undefined, // Remove from response
      progress: undefined,
      collections: undefined // Remove raw collections data
    };

    res.json(response);
  } catch (err) {
    // Log specific error properties for robustness and better diagnostics
    const error = err as Error; // Type assertion
    console.error('Error fetching problem by slug:', {
      message: error.message,
      name: error.name,
      stack: error.stack
      // Avoid logging the entire 'err' object directly if it's complex
    });
    res.status(500).json({ 
      error: 'Internal server error while fetching problem by slug.', 
      details: error.message // Send the error message in the response
    });
  }
}) as RequestHandler);

// Get a specific problem
router.get('/:problemId', authenticateToken, (async (req, res) => {
  try {
    const { problemId } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    if (!problemId) {
      return res.status(400).json({ error: 'Problem ID is required' });
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
              orderBy: { orderNum: 'asc' }
            }
          }
        },
        spacedRepetitionItems: {
          where: {
            userId: userId,
            isActive: true
          },
          select: {
            id: true,
            reviewLevel: true,
            reviewScheduledAt: true
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
        codeProblem: true,
        progress: {
          where: { userId },
          select: { status: true }
        },
        completedBy: {
          where: { id: userId },
          select: { id: true }
        }
      },
      orderBy: { createdAt: "desc" },
    });

    // Transform the response to include completion status and collection IDs
    const transformedProblems = problems.map((problem: any) => {
      const collectionIds = problem.collections?.map((pc: any) =>
        pc.collectionId || (pc.collection && pc.collection.id)
      ).filter(Boolean) || [];

      // Correctly determine isCompleted based on fetched progress and completedBy
      const isCompleted = (problem.completedBy && problem.completedBy.length > 0) ||
                          (problem.progress && problem.progress.some((p: { status: ProgressStatus }) => p.status === 'COMPLETED'));

      return {
        ...problem,
        isCompleted,
        collectionIds,
        completedBy: undefined,
        progress: undefined,
        collections: undefined,
        codeTemplate: undefined,
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
      testCases: testCasesRaw,
      topicId,
      estimatedTime,
      slug,
      functionName,
      timeLimit,
      memoryLimit,
      return_type,
      params,
      defaultLanguage,
      languageSupport: languageSupportRaw,
      coding
    } = req.body as CreateProblemBody & { coding?: any };

    // Validate required fields
    if (!name) {
      return res.status(400).json({ error: 'Name is required' });
    }

    // Add a check to see if a problem with this slug already exists
    if (slug) {
      const existingProblem = await prisma.problem.findUnique({
        where: { slug },
      });
      if (existingProblem) {
        return res.status(409).json({ error: `A problem with the slug '${slug}' already exists.` });
      }
    }

    // Only validate topic if topicId is provided
    if (topicId) {
      const topic = await prisma.topic.findUnique({
        where: { id: topicId }
      });

      if (!topic) {
        return res.status(404).json({ error: 'Topic not found' });
      }
    }

    // Parse test cases if provided
    let parsedTestCases: any[] = [];
    if (testCasesRaw) {
      try {
        parsedTestCases = typeof testCasesRaw === 'string' ? JSON.parse(testCasesRaw) : testCasesRaw;
      } catch (error) {
        console.error('Error parsing testCases:', error);
        return res.status(400).json({ error: 'Invalid test cases format' });
      }
    }

    // Convert estimatedTime to number if provided
    const parsedEstimatedTime = estimatedTime ? parseInt(estimatedTime.toString()) : null;
    if (estimatedTime && isNaN(parsedEstimatedTime!)) {
      return res.status(400).json({ error: 'Estimated time must be a valid number' });
    }

    // Use a transaction for the entire create process
    const newProblem = await prisma.$transaction(async (tx) => {
      // Prepare the problem create data
      const createData: Prisma.ProblemCreateInput = {
        name,
        content: content || '',
        difficulty,
        required,
        reqOrder: reqOrder || null,
        problemType,
        estimatedTime: parsedEstimatedTime,
        slug: slug || undefined,
        ...(topicId && {
          topic: {
            connect: { id: topicId }
          }
        })
      };

      // For coding problems, add the codeProblem relation
      if (problemType === 'CODING') {
        // --- Start: Handle different request body structures ---
        let codeProblemData: any = {};
        let finalTestCases: any[] = [];
        
        // Structure from "Add from JSON" feature
        if (coding) { 
          finalTestCases = coding.testCases || [];
          codeProblemData = {
            defaultLanguage: coding.defaultLanguage || 'python',
            languageSupport: coding.supported || {},
            functionName: coding.functionName,
            timeLimit: coding.timeLimit,
            memoryLimit: coding.memoryLimit,
            return_type: coding.returnType,
            params: coding.parameters || [],
          };
        } 
        // Structure from manual form submission
        else {
          const finalLanguageSupport = prepareLanguageSupport(languageSupportRaw || '{}', defaultLanguage);
          
          let parsedParams: any[] | object | undefined = undefined;
          if (params) {
            try {
              parsedParams = JSON.parse(params as string);
            } catch (e) {
              console.warn('Failed to parse params JSON on create:', e);
            }
          }
          if (testCasesRaw) {
              try {
                  finalTestCases = typeof testCasesRaw === 'string' ? JSON.parse(testCasesRaw) : testCasesRaw;
              } catch (e) {
                  console.warn('Failed to parse testCasesRaw on create:', e);
              }
          }
          
          codeProblemData = {
            defaultLanguage: defaultLanguage || 'python',
            languageSupport: finalLanguageSupport,
            functionName: functionName || undefined,
            timeLimit: timeLimit ? Number(timeLimit) : 5000,
            memoryLimit: memoryLimit ? Number(memoryLimit) : undefined,
            return_type: return_type || undefined,
            params: parsedParams,
          };
        }
        // --- End: Handle different request body structures ---

        createData.codeProblem = {
          create: {
            ...codeProblemData,
            testCases: {
              create: finalTestCases.map((testCase: any, index: number) => ({
                input: String(testCase.input),
                expectedOutput: String(testCase.expectedOutput),
                isHidden: testCase.isHidden || false,
                orderNum: testCase.orderNum || index + 1
              }))
            }
          }
        };
      }

      // Create the problem with all relations
      const problem = await tx.problem.create({
        data: createData,
        include: {
          codeProblem: {
            include: {
              testCases: true
            }
          }
        }
      });

      // Associate with collections if provided
      if (collectionIds.length > 0) {
        await Promise.all(collectionIds.map(collectionId => 
          tx.problemToCollection.create({
            data: {
              problemId: problem.id,
              collectionId
            }
          })
        ));
      }

      return problem;
    });

    // Transform the response for the frontend
    const responseData = {
      ...newProblem,
      collectionIds: collectionIds
    };

    res.status(201).json(responseData);
  } catch (error) {
    console.error('Error creating problem:', error);
    res.status(500).json({ error: 'Failed to create problem' });
  }
}) as RequestHandler);

// Update a problem (admin only)
router.put('/:problemId', authenticateToken, authorizeRoles([Role.ADMIN, Role.DEVELOPER]), (async (req, res) => {
  try {
    const { problemId } = req.params;
    const {
      collectionIds,
      topicId,
      codeProblem: codeProblemPayload,
      ...rest
    } = req.body;

    const existingProblem = await prisma.problem.findUnique({
      where: { id: problemId },
      include: { codeProblem: true }
    });

    if (!existingProblem) {
      return res.status(404).json({ error: 'Problem not found' });
    }

    const problemData: Prisma.ProblemUpdateInput = {
      name: rest.name,
      content: rest.content,
      difficulty: rest.difficulty,
      required: rest.required,
      reqOrder: rest.reqOrder,
      problemType: rest.problemType,
      estimatedTime: rest.estimatedTime ? parseInt(String(rest.estimatedTime)) : undefined,
      slug: rest.slug,
    };
    
    Object.keys(problemData).forEach(key => {
      const k = key as keyof Prisma.ProblemUpdateInput;
      if (problemData[k] === undefined) {
        delete problemData[k];
      }
    });

    let codeProblemUpdateData: Prisma.CodeProblemUpdateInput | undefined = undefined;

    if (existingProblem.problemType === ProblemType.CODING && codeProblemPayload) {
      const testCasesRaw = codeProblemPayload.testCases || [];
      const parsedTestCases = (Array.isArray(testCasesRaw) ? testCasesRaw : []).map(normalizeTestCase);
      
      const languageSupport = prepareLanguageSupport(
        codeProblemPayload.languageSupport || {},
        codeProblemPayload.defaultLanguage
      );

      codeProblemUpdateData = {
        functionName: codeProblemPayload.functionName,
        timeLimit: codeProblemPayload.timeLimit ? parseInt(String(codeProblemPayload.timeLimit)) : undefined,
        memoryLimit: codeProblemPayload.memoryLimit ? parseInt(String(codeProblemPayload.memoryLimit)) : undefined,
        return_type: codeProblemPayload.return_type,
        params: typeof codeProblemPayload.params === 'object' ? JSON.stringify(codeProblemPayload.params) : codeProblemPayload.params,
        defaultLanguage: codeProblemPayload.defaultLanguage,
        languageSupport: languageSupport,
        testCases: {
          deleteMany: {},
          create: parsedTestCases,
        },
      };
    }

    await prisma.$transaction(async (tx) => {
      await tx.problem.update({
        where: { id: problemId },
        data: problemData,
      });

      if (codeProblemUpdateData && existingProblem.codeProblem) {
        await tx.codeProblem.update({
          where: { id: existingProblem.codeProblem.id },
          data: codeProblemUpdateData,
        });
      }
      
      if (collectionIds && Array.isArray(collectionIds)) {
        await tx.problemToCollection.deleteMany({
          where: { problemId: problemId },
        });

        if (collectionIds.length > 0) {
          await tx.problemToCollection.createMany({
            data: collectionIds.map((id: string) => ({
              problemId: problemId,
              collectionId: id,
            })),
          });
        }
      }

      if (topicId !== undefined) {
        await tx.problem.update({
          where: { id: problemId },
          data: { topic: topicId ? { connect: { id: topicId } } : { disconnect: true } },
        });
      }
    });

    const finalProblem = await prisma.problem.findUnique({
      where: { id: problemId },
      include: {
        topic: true,
        collections: { include: { collection: true } },
        codeProblem: { include: { testCases: true } },
      },
    });

    res.status(200).json(finalProblem);
  } catch (error) {
    console.error("Detailed error updating problem:", error);
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        return res.status(409).json({ error: 'A problem with this slug already exists.', details: error.meta });
      }
      return res.status(500).json({
        error: 'Failed to update problem due to a database constraint.',
        details: { code: error.code, meta: error.meta }
      });
    }
    res.status(500).json({ error: 'Failed to update problem', details: String(error) });
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
            id: true,
            userId: true,
            problemId: true,
            topicId: true
          }
        }
      }
    });

    if (!problem) {
      return res.status(404).json({ error: 'Problem not found' });
    }

    // MOVED UP: If the problem doesn't have a topic, we handle it separately.
    if (!problem.topicId) {
      console.warn('Attempting to toggle completion for a problem without a topic ID:', problemId);
      const isCurrentlyCompletedInUserTable = problem.completedBy.length > 0;
      
      // Determine the new completion state (toggle or force)
      let newCompletionState;
      if (forceComplete) {
        newCompletionState = true; // Force to complete
      } else {
        newCompletionState = !isCurrentlyCompletedInUserTable; // Toggle
      }

      await prisma.user.update({
        where: { id: userId },
        data: {
          completedProblems: newCompletionState
            ? { connect: { id: problemId } }
            : { disconnect: { id: problemId } }
        }
      });

      return res.json({
        message: newCompletionState ? 'Problem marked as completed' : 'Problem marked as uncompleted',
        preservedReviewData: false, // No progress record for review data
        wasForced: forceComplete || false,
        noTopicId: true
      });
    }

    // If we reach here, problem.topicId IS DEFINED.

    // Check if problem is already completed (based on Progress or legacy completedBy)
    // This check now assumes problem.topicId is present for reliable Progress checking.
    const existingProgressForStatus = problem.progress.find(p => p.userId === userId && p.problemId === problemId && p.topicId === problem.topicId);
    const isCompleted = existingProgressForStatus?.status === 'COMPLETED' || problem.completedBy.length > 0;
    
    // Get existing progress with reviews, now safely using problem.topicId
    const existingProgress = await prisma.progress.findUnique({
      where: {
        userId_topicId_problemId: { // This is now safe
          userId,
          topicId: problem.topicId, // problem.topicId is guaranteed to be non-null here
          problemId: problemId
        }
      }, 
      include: {
        reviews: true // Include the reviews relation
      }
    });

    const hasReviewHistory = (existingProgress?.reviews?.length || 0) > 0;

    console.log('Problem state before update (with topicId):', {
      problemId,
      isCompleted,
      preserveReviewData,
      forceComplete,
      existingProgressId: existingProgress?.id,
      progressStatus: existingProgress?.status,
      reviewLevel: existingProgress?.reviewLevel,
      hasReviewHistory
    });

    // If problem is completed and we're not forcing completion, and not admin, return error (original logic)
    // This logic needs to be careful if isCompleted was true due to legacy completedBy but no progress record.
    // However, the main toggle logic below handles upserting progress.
    // Consider if this check is still perfectly accurate or needed if upsert handles states correctly.
    // For now, keeping original intent if admin override is not used.
    if (isCompleted && !forceComplete && !isAdmin) {
      // If it is completed, the intention of non-admin, non-force request is to un-complete
      // The logic below will handle this. This block might be redundant or lead to incorrect early exit.
      // Let's adjust this to allow un-completing.
      // The current structure implies user cannot un-complete if this block is hit.
      // This condition effectively means "if already completed, and user is trying to complete it again (not force, not admin), then error".
      // This should be: "if user wants to complete an already completed problem (and not forcing/admin)"
      // The actual toggle happens below.
      // Let's refine this after the main fix. For now, the critical part is the findUnique.
    }

    // The block for "If problem is completed and we're not forcing completion, and not admin, return error"
    // has been commented out or needs careful review. The primary goal here is to fix the crash.
    // The existing logic for toggling (un-completing or completing) follows.

    let result: any;
    let finalMessage: string;

    // Determine target completion state
    const targetStateIsComplete = forceComplete ? true : !isCompleted;

    if (!targetStateIsComplete) { // User wants to mark as UNCOMPLETED
      finalMessage = 'Problem marked as uncompleted';
      try {
        result = await prisma.$transaction(async (tx) => {
          const progressToUpdate = existingProgress || await tx.progress.findFirst({ // Ensure we have a progress record to update
            where: { userId, topicId: problem.topicId!, problemId }
          });
          
          if (progressToUpdate) {
            await tx.progress.update({
              where: { id: progressToUpdate.id },
              data: {
                status: 'NOT_STARTED', // Explicitly set to an incomplete status
                // Spaced repetition fields like reviewScheduledAt, reviewLevel might need resetting here
                // if un-completing means "restart from scratch" for reviews.
                // For now, just changing status as per original logic's implication for "disconnect".
              }
            });
          }
          
          // Also disconnect from the legacy completedBy relation if it exists
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
        // Fallback
        result = await prisma.user.update({
          where: { id: userId },
          data: { completedProblems: { disconnect: { id: problemId } } }
        });
      }
      console.log('Problem marked as uncompleted:', { problemId, userId, preservedProgress: !!existingProgress });

    } else { // User wants to mark as COMPLETED
      finalMessage = 'Problem marked as completed';
      try {
        result = await prisma.$transaction(async (tx) => {
          const currentProgressForReview = existingProgress; // From the findUnique above
          
          let reviewData: any = {};
          if (preserveReviewData && currentProgressForReview) {
            reviewData = {
              reviewLevel: currentProgressForReview.reviewLevel,
              lastReviewedAt: currentProgressForReview.lastReviewedAt,
              reviewScheduledAt: currentProgressForReview.reviewScheduledAt
            };
          } else if (!preserveReviewData) {
            // If not preserving, explicitly reset review fields for a fresh completion
            reviewData = {
              reviewLevel: 0,
              lastReviewedAt: null,
              reviewScheduledAt: null, // Or logic to schedule initial review
            };
          }

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
              reviewLevel: reviewData.reviewLevel ?? 0,
              lastReviewedAt: reviewData.lastReviewedAt,
              reviewScheduledAt: reviewData.reviewScheduledAt
            },
            update: {
              status: 'COMPLETED',
              reviewLevel: reviewData.reviewLevel ?? (currentProgressForReview?.reviewLevel ?? 0),
              lastReviewedAt: reviewData.lastReviewedAt ?? (currentProgressForReview?.lastReviewedAt),
              reviewScheduledAt: reviewData.reviewScheduledAt ?? (currentProgressForReview?.reviewScheduledAt)
            }
          });
          
          const userResult = await tx.user.update({
            where: { id: userId },
            data: {
              completedProblems: {
                connect: { id: problemId }
              }
            }
          });
          
          // Original logic for adding ReviewHistory if preserving data was here.
          // This might need adjustment based on whether "preserveReviewData" means
          // "continue current review track" or just "don't wipe if it existed".
          // For now, focusing on the main completion logic.

          return { progressResult, userResult };
        });
      } catch (txError: any) {
        console.error('Transaction error when completing problem:', txError);
        // Fallback
        result = await prisma.user.update({
          where: { id: userId },
          data: { completedProblems: { connect: { id: problemId } } }
        });
      }
      console.log('Problem marked as completed:', {
        problemId, userId, progressId: result?.progressResult?.id,
        reviewLevel: result?.progressResult?.reviewLevel,
        reviewScheduledAt: result?.progressResult?.reviewScheduledAt
      });
    }

    res.json({ 
      message: finalMessage,
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

export default router; 