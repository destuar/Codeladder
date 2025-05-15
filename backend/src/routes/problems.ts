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
  return_type?: string;
  params?: string;
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
  return_type?: string;
  params?: string;
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
  const parsedExpected = safelyParseValue(testCase.expected ?? testCase.expected_out ?? '');
  
  return {
    input: JSON.stringify(parsedInput), // Store consistent JSON string
    expectedOutput: JSON.stringify(parsedExpected), // Store consistent JSON string
    isHidden: testCase.isHidden || (testCase.phase === 'hidden') || false,
    orderNum: testCase.orderNum || testCase.case_id || index + 1
  };
};

/**
 * Prepares language support data for storage
 * @param language Default language (e.g. 'python')
 * @param codeTemplate Template for the default language
 * @param languageSupportJson Optional JSON string with additional language templates
 * @returns Structured language support JSON object
 */
const prepareLanguageSupport = (
  language: string = 'python', 
  codeTemplate?: string, 
  languageSupportJson?: string
): any => {
  // Start with empty object
  let languageSupport: any = {};
  
  // Parse languageSupport if provided
  if (languageSupportJson) {
    try {
      languageSupport = JSON.parse(languageSupportJson);
    } catch (e) {
      console.warn('Error parsing languageSupport JSON:', e);
    }
  }
  
  // Add/update the default language template
  if (codeTemplate) {
    languageSupport[language] = {
      ...(languageSupport[language] || {}),
      template: codeTemplate
    };
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
      // Include same details as the ID route for consistency
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
        }
      }
    });

    // Ensure the problem exists (removed type check)
    if (!problem) {
      return res.status(404).json({ error: 'Problem not found' });
    }

    // --- Replicate logic from GET /:problemId to find next/prev --- 
    const collectionIds = problem.collections 
      ? problem.collections.map((pc: any) => pc.collectionId || (pc.collection && pc.collection.id))
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
  } catch (error) {
    console.error('Error fetching problem by slug:', error);
    res.status(500).json({ error: 'Internal server error' });
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
      testCases: testCasesRaw,
      topicId,
      estimatedTime,
      slug,
      language = 'javascript',
      functionName,
      timeLimit,
      memoryLimit,
      return_type,
      params
    } = req.body as CreateProblemBody;

    // Validate required fields
    if (!name) {
      return res.status(400).json({ error: 'Name is required' });
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
        createData.codeProblem = {
          create: {
            codeTemplate: codeTemplate || undefined,
            language: language || 'javascript',
            functionName: functionName || undefined,
            timeLimit: timeLimit ? Number(timeLimit) : 5000,
            memoryLimit: memoryLimit ? Number(memoryLimit) : undefined,
            return_type: return_type || undefined,
            params: params ? (typeof params === 'string' ? params : JSON.stringify(params)) : undefined,
            testCases: {
              create: parsedTestCases.map((testCase, index) => ({
                input: testCase.input,
                expectedOutput: testCase.expected || testCase.expectedOutput,
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
    testCases: testCasesRaw,
    estimatedTime,
    language,
    functionName,
    timeLimit,
    memoryLimit,
    return_type,
    params
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
      testCases: testCasesRaw ? 'Provided' : undefined,
      estimatedTime,
      language: problemType === 'CODING' ? language : undefined,
      functionName: problemType === 'CODING' ? functionName : undefined,
      timeLimit: problemType === 'CODING' ? timeLimit : undefined,
      memoryLimit: problemType === 'CODING' ? memoryLimit : undefined,
      return_type: return_type ? 'Provided' : undefined,
      params: params ? 'Provided' : undefined
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

    // Parse test cases if provided
    let parsedTestCases: any[] = [];
    if (testCasesRaw) {
      if (typeof testCasesRaw === 'string') {
        try {
          parsedTestCases = JSON.parse(testCasesRaw);
        } catch (error) {
          console.error('Error parsing testCases in update:', error);
          return res.status(400).json({ error: 'Invalid test cases format' });
        }
      } else if (Array.isArray(testCasesRaw)) {
        parsedTestCases = testCasesRaw;
      }
    }

    // Normalize each test case to ensure proper data structures
    parsedTestCases = parsedTestCases.map(normalizeTestCase);

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
          const codeProblemId = codeProblemObj.id; // Use the new id field as primary key
          finalCodeProblemId = codeProblemId;
          
          // Create where clause safely
          const whereClause: any = { id: codeProblemId };
          
          const updateData: any = {
            ...(codeTemplate !== undefined && { codeTemplate }),
            ...(language !== undefined && { language }),
            ...(functionName !== undefined && { functionName }),
            ...(timeLimit !== undefined && { timeLimit: parseInt(timeLimit.toString()) }),
            ...(memoryLimit !== undefined && { memoryLimit: memoryLimit ? parseInt(memoryLimit.toString()) : null }),
          };

          // Add the new JSON fields with type assertion
          if (return_type !== undefined) {
            updateData.return_type = return_type;
          }
          if (params !== undefined) {
            updateData.params = typeof params === 'string' ? params : JSON.stringify(params);
          }
          if (parsedTestCases) {
            updateData.test_cases = JSON.stringify(parsedTestCases);
          }
          
          await tx.codeProblem.update({
            where: whereClause,
            data: updateData
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
                input: tc.input,
                expectedOutput: tc.expectedOutput,
                isHidden: tc.isHidden || false,
                orderNum: tc.orderNum || index + 1
              }));
              await tx.testCase.createMany({ data: testCaseData });
            }
          }
        } else {
          // Create new CodeProblem
          const codeProblemData: any = {
            codeTemplate: codeTemplate ?? null,
            language: language ?? 'javascript',
            functionName: functionName ?? null,
            timeLimit: timeLimit ? parseInt(timeLimit.toString()) : 5000,
            memoryLimit: memoryLimit ? parseInt(memoryLimit.toString()) : null,
            // Use unchecked create to directly reference problemId without question relation
            problemId: problemId,
            testCases: {
              create: parsedTestCases.map((tc: any, index: number) => ({
                input: tc.input,
                expectedOutput: tc.expectedOutput,
                isHidden: tc.isHidden || false,
                orderNum: tc.orderNum || index + 1
              }))
            }
          };

          // Add the new JSON fields outside of the TypeScript type system
          if (return_type) {
            codeProblemData.return_type = return_type;
          }
          if (params) {
            codeProblemData.params = typeof params === 'string' ? params : JSON.stringify(params);
          }
          if (parsedTestCases && parsedTestCases.length > 0) {
            codeProblemData.test_cases = JSON.stringify(parsedTestCases);
          }

          const newCodeProblem = await tx.codeProblem.create({
            data: codeProblemData
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
        // Connect using the id field - use type assertion to work around TS errors
        (problemUpdateData.codeProblem as any) = { 
          connect: { id: finalCodeProblemId } 
        };
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

export default router; 