import express from 'express';
import { Router } from 'express';
import type { RequestHandler } from 'express-serve-static-core';
import { prisma } from '../lib/prisma';
import { Role } from '@prisma/client';
import { authenticateToken } from '../middleware/auth';
import { authorizeRoles } from '../middleware/authorize';

const router = Router();

/**
 * @route GET /api/quizzes/topic/:topicId
 * @desc Get all quizzes for a topic
 * @access Private
 */
router.get('/topic/:topicId', authenticateToken, (async (req, res) => {
  try {
    const { topicId } = req.params;
    
    if (!topicId) {
      return res.status(400).json({ error: 'Topic ID is required' });
    }

    // First check if topic exists
    const topicExists = await prisma.topic.findUnique({
      where: { id: topicId }
    });

    if (!topicExists) {
      return res.status(404).json({ error: `Topic not found with ID: ${topicId}` });
    }
    
    // Query with proper field mappings
    const quizzes = await prisma.quiz.findMany({
      where: { topicId },
      orderBy: [
        { orderNum: 'asc' }, 
        { createdAt: 'desc' }
      ],
      include: {
        _count: {
          select: { questions: true }
        }
      }
    });
    
    // Return quizzes
    res.json(quizzes || []);
  } catch (error) {
    console.error('Error fetching quizzes:', error);
    
    res.status(500).json({ 
      error: 'Failed to fetch quizzes',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}) as RequestHandler);

// Define utility function to validate quiz problem structure
function validateQuizProblem(problem: any, index: number): string[] {
  const errors: string[] = [];
  
  // Check required fields
  if (!problem) {
    return [`Problem at index ${index} is undefined or null`];
  }
  
  if (!problem.questionText?.trim()) {
    errors.push(`Problem at index ${index} is missing question text`);
  }
  
  if (!['MULTIPLE_CHOICE', 'CODE'].includes(problem.questionType)) {
    errors.push(`Problem at index ${index} has invalid question type: ${problem.questionType}`);
  }
  
  // Type-specific validation
  if (problem.questionType === 'MULTIPLE_CHOICE') {
    if (!Array.isArray(problem.options)) {
      errors.push(`Multiple choice problem at index ${index} is missing options array`);
    } else if (problem.options.length < 2) {
      errors.push(`Multiple choice problem at index ${index} has fewer than 2 options`);
    } else {
      // Validate each option
      const hasValidOption = problem.options.some((opt: any) => opt && typeof opt === 'object');
      if (!hasValidOption) {
        errors.push(`Multiple choice problem at index ${index} has no valid options`);
      }
      
      const hasCorrectOption = problem.options.some((opt: any) => opt && opt.isCorrect);
      if (!hasCorrectOption) {
        errors.push(`Multiple choice problem at index ${index} has no correct options`);
      }
      
      // Check each option for required fields
      problem.options.forEach((option: any, optIndex: number) => {
        if (!option || typeof option !== 'object') {
          errors.push(`Option ${optIndex} of problem ${index} is not a valid object`);
        } else if (!option.text?.trim()) {
          errors.push(`Option ${optIndex} of problem ${index} is missing text`);
        }
      });
    }
  } else if (problem.questionType === 'CODE') {
    if (!Array.isArray(problem.testCases)) {
      errors.push(`Code problem at index ${index} is missing testCases array`);
    } else if (problem.testCases.length < 1) {
      errors.push(`Code problem at index ${index} has no test cases`);
    } else {
      // Validate each test case
      problem.testCases.forEach((tc: any, tcIndex: number) => {
        if (!tc || typeof tc !== 'object') {
          errors.push(`Test case ${tcIndex} of problem ${index} is not a valid object`);
        } else {
          // Check if either input or expectedOutput is empty
          if (!tc.input?.trim() && !tc.expectedOutput?.trim()) {
            errors.push(`Test case ${tcIndex} of problem ${index} has empty input and expected output`);
          }
        }
      });
    }
    
    if (!problem.language) {
      errors.push(`Code problem at index ${index} is missing language`);
    }
  }
  
  return errors;
}

/**
 * @route POST /api/quizzes/validate
 * @desc Validate quiz data without creating it
 * @access Private (Admin only)
 */
router.post('/validate', authenticateToken, authorizeRoles([Role.ADMIN, Role.DEVELOPER]), (async (req, res) => {
  try {
    const { 
      name, 
      description, 
      topicId, 
      passingScore, 
      estimatedTime, 
      orderNum,
      problems 
    } = req.body;
    
    console.log('Received quiz validation request', { 
      name, topicId, problemCount: Array.isArray(problems) ? problems.length : 0 
    });
    
    // Validation results
    const validationResults = {
      isValid: true,
      generalErrors: [] as string[],
      problemErrors: [] as {index: number; errors: string[]}[],
      data: {
        quizStructure: { name, topicId, problemCount: Array.isArray(problems) ? problems.length : 0 },
        problemTypes: Array.isArray(problems) 
          ? problems.map(p => ({ type: p.questionType, optionsCount: p.options?.length, testCasesCount: p.testCases?.length }))
          : []
      }
    };
    
    // Basic validation
    if (!name?.trim()) {
      validationResults.generalErrors.push('Quiz name is required');
      validationResults.isValid = false;
    }
    
    if (!topicId?.trim()) {
      validationResults.generalErrors.push('Topic ID is required');
      validationResults.isValid = false;
    } else {
      // Check if topic exists
      const topic = await prisma.topic.findUnique({
        where: { id: topicId }
      });
      
      if (!topic) {
        validationResults.generalErrors.push(`Topic with ID ${topicId} not found`);
        validationResults.isValid = false;
      }
    }
    
    // Validate problem array
    if (!Array.isArray(problems)) {
      validationResults.generalErrors.push('Problems must be an array');
      validationResults.isValid = false;
    } else if (problems.length === 0) {
      validationResults.generalErrors.push('Quiz must have at least one problem');
      validationResults.isValid = false;
    } else {
      // Validate each problem
      problems.forEach((problem, index) => {
        const problemErrors = validateQuizProblem(problem, index);
        
        if (problemErrors.length > 0) {
          validationResults.problemErrors.push({ index, errors: problemErrors });
          validationResults.isValid = false;
        }
      });
    }
    
    // Return validation results
    res.json(validationResults);
  } catch (error) {
    console.error('Error validating quiz:', error);
    res.status(500).json({ 
      error: 'Failed to validate quiz',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}) as RequestHandler);

/**
 * @route POST /api/quizzes
 * @desc Create a new quiz
 * @access Private (Admin only)
 */
router.post('/', authenticateToken, authorizeRoles([Role.ADMIN, Role.DEVELOPER]), (async (req, res) => {
  try {
    const { 
      name, 
      description, 
      topicId, 
      passingScore, 
      estimatedTime, 
      orderNum,
      problems 
    } = req.body;

    console.log('Received quiz creation request', { 
      name, topicId, problemCount: Array.isArray(problems) ? problems.length : 0 
    });

    // Input validation
    if (!name?.trim()) {
      return res.status(400).json({ error: 'Quiz name is required' });
    }
    
    if (!topicId?.trim()) {
      return res.status(400).json({ error: 'Topic ID is required' });
    }

    // Validate problems array if provided
    if (problems && !Array.isArray(problems)) {
      return res.status(400).json({ error: 'Problems must be an array' });
    }

    // Validate each problem if provided
    if (Array.isArray(problems)) {
      for (const [idx, problem] of problems.entries()) {
        if (!problem.questionText?.trim()) {
          return res.status(400).json({ error: `Problem at index ${idx} is missing question text` });
        }
        
        if (!['MULTIPLE_CHOICE', 'CODE'].includes(problem.questionType)) {
          return res.status(400).json({ 
            error: `Problem at index ${idx} has invalid question type: ${problem.questionType}` 
          });
        }

        if (problem.questionType === 'MULTIPLE_CHOICE' && 
            (!Array.isArray(problem.options) || problem.options.length < 2)) {
          return res.status(400).json({ 
            error: `Multiple choice problem at index ${idx} must have at least 2 options` 
          });
        }

        if (problem.questionType === 'CODE' && 
            (!Array.isArray(problem.testCases) || problem.testCases.length < 1)) {
          return res.status(400).json({ 
            error: `Code problem at index ${idx} must have at least 1 test case` 
          });
        }
      }
    }

    // Check if topic exists
    const topic = await prisma.topic.findUnique({
      where: { id: topicId }
    });

    if (!topic) {
      return res.status(404).json({ error: `Topic with ID ${topicId} not found` });
    }

    // Log Prisma schema info for debugging
    try {
      // Get the quiz related tables from Prisma
      console.log('Checking model structure before creating quiz...');
      
      const quizTable = await prisma.$queryRaw`
        SELECT 
          table_name, 
          column_name, 
          data_type 
        FROM 
          information_schema.columns 
        WHERE 
          table_schema = 'public' 
          AND table_name IN ('quizzes', 'quiz_questions', 'mc_problems', 'code_problems')
        ORDER BY 
          table_name, ordinal_position
      `;
      
      console.log('Database table structure:', quizTable);
    } catch (schemaErr) {
      console.error('Error fetching schema info:', schemaErr);
    }

    // Try to create just the quiz first, not the problems
    try {
      console.log('Creating quiz:', { name, topicId });
      const quiz = await prisma.quiz.create({
        data: {
          name,
          description: description || null,
          topicId,
          passingScore: passingScore ? parseInt(String(passingScore)) : 70,
          estimatedTime: estimatedTime ? parseInt(String(estimatedTime)) : null,
          orderNum: orderNum ? parseInt(String(orderNum)) : null
        }
      });
      
      console.log('Created quiz:', { id: quiz.id });
      
      // Return the quiz without problems if there are none to process
      if (!Array.isArray(problems) || problems.length === 0) {
        return res.status(201).json(quiz);
      }
      
      // Process each problem separately without transaction to isolate errors
      const createdProblems = [];
      const errorDetails = [];
      
      for (const [index, problem] of problems.entries()) {
        try {
          // Create the base question
          console.log(`Creating question ${index}...`);
          const question = await prisma.quizQuestion.create({
            data: {
              quizId: quiz.id,
              questionText: problem.questionText.trim(),
              questionType: problem.questionType,
              points: problem.points || 1,
              orderNum: problem.orderNum || index + 1,
              difficulty: problem.difficulty || 'MEDIUM'
            }
          });
          
          console.log(`Created question ${index}:`, { id: question.id });
          
          if (problem.questionType === 'MULTIPLE_CHOICE') {
            try {
              // Create the MC problem with explicit schema inspection
              console.log(`Creating MC problem with questionId: ${question.id}`);
              const mcProblem = await prisma.mcProblem.create({
                data: {
                  questionId: question.id,
                  explanation: problem.explanation || null,
                  shuffleOptions: problem.shuffleOptions !== false
                }
              });
              console.log('MC problem created:', mcProblem);
              
              // Create options for the MC problem
              const options = Array.isArray(problem.options) ? problem.options : [];
              for (const [optIndex, option] of options.entries()) {
                await prisma.mcOption.create({
                  data: {
                    questionId: question.id,
                    optionText: option.text?.trim() || `Option ${optIndex + 1}`,
                    isCorrect: Boolean(option.isCorrect),
                    explanation: option.explanation || null,
                    orderNum: option.orderNum || optIndex + 1
                  }
                });
              }
              console.log(`Created ${options.length} options for MC problem`);
            } catch (mcError) {
              console.error('MC Problem creation failed:', mcError);
              errorDetails.push({
                index,
                type: 'MULTIPLE_CHOICE',
                error: mcError instanceof Error ? mcError.message : 'Unknown error',
                stage: 'Creating MC problem'
              });
              
              // Try to delete the question since we couldn't create the MC problem
              try {
                await prisma.quizQuestion.delete({
                  where: { id: question.id }
                });
              } catch (delError) {
                console.error('Failed to clean up question after MC problem error:', delError);
              }
              continue;
            }
          } else if (problem.questionType === 'CODE') {
            try {
              // Create the Code problem with explicit schema inspection
              console.log(`Creating Code problem with questionId: ${question.id}`);
              const codeProblem = await prisma.codeProblem.create({
                data: {
                  questionId: question.id,
                  codeTemplate: problem.codeTemplate || null,
                  functionName: problem.functionName || null,
                  language: problem.language || 'javascript',
                  timeLimit: problem.timeLimit || 5000,
                  memoryLimit: problem.memoryLimit || null
                }
              });
              console.log('Code problem created:', codeProblem);
              
              // Create test cases for the Code problem
              const testCases = Array.isArray(problem.testCases) ? problem.testCases : [];
              for (const [tcIndex, tc] of testCases.entries()) {
                await prisma.testCase.create({
                  data: {
                    codeProblemId: question.id,
                    input: tc.input || '',
                    expectedOutput: tc.expectedOutput || '',
                    isHidden: Boolean(tc.isHidden),
                    orderNum: tc.orderNum || tcIndex + 1
                  }
                });
              }
              console.log(`Created ${testCases.length} test cases for Code problem`);
            } catch (codeError) {
              console.error('Code Problem creation failed:', codeError);
              errorDetails.push({
                index,
                type: 'CODE',
                error: codeError instanceof Error ? codeError.message : 'Unknown error',
                stage: 'Creating Code problem'
              });
              
              // Try to delete the question since we couldn't create the Code problem
              try {
                await prisma.quizQuestion.delete({
                  where: { id: question.id }
                });
              } catch (delError) {
                console.error('Failed to clean up question after Code problem error:', delError);
              }
              continue;
            }
          }
          
          createdProblems.push(question.id);
        } catch (problemError) {
          console.error(`Error creating problem ${index}:`, problemError);
          errorDetails.push({
            index,
            type: problem.questionType,
            error: problemError instanceof Error ? problemError.message : 'Unknown error',
            stage: 'Creating question'
          });
        }
      }
      
      // Return the quiz with information about created and failed problems
      const finalQuiz = await prisma.quiz.findUnique({
        where: { id: quiz.id },
        include: {
          questions: true,
          _count: {
            select: { questions: true }
          }
        }
      });
      
      if (errorDetails.length > 0) {
        return res.status(207).json({
          quiz: finalQuiz,
          createdProblems: createdProblems.length,
          errors: errorDetails,
          message: 'Quiz created but some problems failed'
        });
      }
      
      return res.status(201).json(finalQuiz);
    } catch (quizError) {
      console.error('Failed to create quiz:', quizError);
      throw quizError; // Re-throw to be caught by outer catch
    }
  } catch (error: unknown) {
    console.error('Error creating quiz:', error);
    
    // Extract meaningful error message
    let errorMessage = 'Failed to create quiz';
    let errorDetails = error instanceof Error ? error.message : 'Unknown error';
    
    // Handle Prisma-specific errors
    if (error && typeof error === 'object' && 'code' in error) {
      const prismaError = error as {code: string; meta?: {field_name?: string; target?: string}};
      switch (prismaError.code) {
        case 'P2002':
          errorMessage = 'A quiz with this name already exists';
          break;
        case 'P2003':
          errorMessage = 'Foreign key constraint failed';
          errorDetails = prismaError.meta?.field_name 
            ? `Invalid reference: ${prismaError.meta.field_name}` 
            : 'Invalid reference';
          break;
        case 'P2025':
          errorMessage = 'Record not found';
          break;
        default:
          errorMessage = `Database error (${prismaError.code})`;
      }
    }
    
    res.status(500).json({ 
      error: errorMessage,
      details: errorDetails
    });
  }
}) as RequestHandler);

/**
 * @route GET /api/quizzes/:id
 * @desc Get a quiz by ID
 * @access Private
 */
router.get('/:id', authenticateToken, (async (req, res) => {
  try {
    const { id } = req.params;
    
    const quiz = await prisma.quiz.findUnique({
      where: { id },
      include: {
        _count: {
          select: { questions: true }
        }
      }
    });

    if (!quiz) {
      return res.status(404).json({ error: 'Quiz not found' });
    }

    res.json(quiz);
  } catch (error) {
    console.error('Error fetching quiz:', error);
    res.status(500).json({ 
      error: 'Failed to fetch quiz',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}) as RequestHandler);

/**
 * @route PUT /api/quizzes/:id
 * @desc Update a quiz
 * @access Private (Admin only)
 */
router.put('/:id', authenticateToken, authorizeRoles([Role.ADMIN, Role.DEVELOPER]), (async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      name, 
      description, 
      topicId, 
      passingScore, 
      estimatedTime, 
      orderNum,
      problems 
    } = req.body;

    // Validate inputs
    if (!name || !topicId) {
      return res.status(400).json({ error: 'Name and topic ID are required' });
    }

    // Check if quiz exists
    const existingQuiz = await prisma.quiz.findUnique({
      where: { id }
    });

    if (!existingQuiz) {
      return res.status(404).json({ error: 'Quiz not found' });
    }

    // Check if topic exists
    const topic = await prisma.topic.findUnique({
      where: { id: topicId }
    });

    if (!topic) {
      return res.status(404).json({ error: 'Topic not found' });
    }

    // Update the quiz
    const updatedQuiz = await prisma.quiz.update({
      where: { id },
      data: {
        name,
        description,
        topicId,
        passingScore: passingScore ? parseInt(passingScore) : 70,
        estimatedTime: estimatedTime ? parseInt(estimatedTime) : null,
        orderNum: orderNum ? parseInt(orderNum) : null,
      }
    });

    // Handle problems update if provided
    if (Array.isArray(problems)) {
      // Get existing problems to determine which to delete
      const existingQuestions = await prisma.quizQuestion.findMany({
        where: { quizId: id },
        include: {
          mcProblem: {
            include: {
              options: true
            }
          },
          codeProblem: {
            include: {
              testCases: true
            }
          }
        }
      });

      // Process each problem
      for (const problem of problems) {
        if (problem.id) {
          // Update existing question
          const existingQuestion = existingQuestions.find(q => q.id === problem.id);
          
          if (existingQuestion) {
            // Update the base question
            await prisma.quizQuestion.update({
              where: { id: problem.id },
              data: {
                questionText: problem.questionText,
                points: problem.points,
                difficulty: problem.difficulty || 'MEDIUM',
                orderNum: problem.orderNum
              }
            });

            // Handle question type-specific updates
            if (problem.questionType === 'MULTIPLE_CHOICE') {
              // Update MC problem
              if (existingQuestion.mcProblem) {
                await prisma.mcProblem.update({
                  where: { questionId: problem.id },
                  data: {
                    explanation: problem.explanation,
                    shuffleOptions: problem.shuffleOptions ?? true
                  }
                });

                // Delete existing options and create new ones
                await prisma.mcOption.deleteMany({
                  where: { questionId: problem.id }
                });

                // Create new options
                for (let i = 0; i < problem.options.length; i++) {
                  const option = problem.options[i];
                  await prisma.mcOption.create({
                    data: {
                      questionId: problem.id,
                      optionText: option.text,
                      isCorrect: option.isCorrect,
                      explanation: option.explanation,
                      orderNum: i + 1
                    }
                  });
                }
              }
            } else if (problem.questionType === 'CODE') {
              // Update Code problem
              if (existingQuestion.codeProblem) {
                await prisma.codeProblem.update({
                  where: { questionId: problem.id },
                  data: {
                    codeTemplate: problem.codeTemplate,
                    functionName: problem.functionName,
                    language: problem.language || 'javascript',
                    timeLimit: problem.timeLimit || 5000,
                    memoryLimit: problem.memoryLimit
                  }
                });

                // Delete existing test cases and create new ones
                await prisma.testCase.deleteMany({
                  where: { codeProblemId: problem.id }
                });

                // Create new test cases
                for (let i = 0; i < problem.testCases.length; i++) {
                  const tc = problem.testCases[i];
                  await prisma.testCase.create({
                    data: {
                      codeProblemId: problem.id,
                      input: tc.input,
                      expectedOutput: tc.expectedOutput,
                      isHidden: tc.isHidden || false,
                      orderNum: i + 1
                    }
                  });
                }
              }
            }
          }
        } else {
          // Create new question
          const newQuestion = await prisma.quizQuestion.create({
            data: {
              quizId: id,
              questionText: problem.questionText,
              questionType: problem.questionType,
              points: problem.points,
              difficulty: problem.difficulty || 'MEDIUM',
              orderNum: problem.orderNum
            }
          });

          // Create type-specific data
          if (problem.questionType === 'MULTIPLE_CHOICE') {
            await prisma.mcProblem.create({
              data: {
                questionId: newQuestion.id,
                explanation: problem.explanation,
                shuffleOptions: problem.shuffleOptions ?? true,
                options: {
                  create: problem.options.map((option: any, index: number) => ({
                    optionText: option.text,
                    isCorrect: option.isCorrect,
                    explanation: option.explanation,
                    orderNum: index + 1
                  }))
                }
              }
            });
          } else if (problem.questionType === 'CODE') {
            await prisma.codeProblem.create({
              data: {
                questionId: newQuestion.id,
                codeTemplate: problem.codeTemplate,
                functionName: problem.functionName,
                language: problem.language || 'javascript',
                timeLimit: problem.timeLimit || 5000,
                memoryLimit: problem.memoryLimit,
                testCases: {
                  create: problem.testCases.map((tc: any, index: number) => ({
                    input: tc.input,
                    expectedOutput: tc.expectedOutput,
                    isHidden: tc.isHidden || false,
                    orderNum: index + 1
                  }))
                }
              }
            });
          }
        }
      }

      // Delete questions that are not in the updated problems array
      const updatedProblemIds = problems.filter(p => p.id).map(p => p.id);
      const questionsToDelete = existingQuestions
        .filter(q => !updatedProblemIds.includes(q.id))
        .map(q => q.id);

      if (questionsToDelete.length > 0) {
        await prisma.quizQuestion.deleteMany({
          where: {
            id: {
              in: questionsToDelete
            }
          }
        });
      }
    }

    // Fetch the updated quiz with question count
    const finalUpdatedQuiz = await prisma.quiz.findUnique({
      where: { id },
      include: {
        _count: {
          select: { questions: true }
        }
      }
    });

    res.json(finalUpdatedQuiz);
  } catch (error) {
    console.error('Error updating quiz:', error);
    res.status(500).json({ 
      error: 'Failed to update quiz',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}) as RequestHandler);

/**
 * @route DELETE /api/quizzes/:id
 * @desc Delete a quiz
 * @access Private (Admin only)
 */
router.delete('/:id', authenticateToken, authorizeRoles([Role.ADMIN, Role.DEVELOPER]), (async (req, res) => {
  try {
    const { id } = req.params;

    // Check if quiz exists
    const existingQuiz = await prisma.quiz.findUnique({
      where: { id }
    });

    if (!existingQuiz) {
      return res.status(404).json({ error: 'Quiz not found' });
    }

    // Delete the quiz and all related entities through cascade
    await prisma.quiz.delete({
      where: { id }
    });

    res.status(204).send();
  } catch (error) {
    console.error('Error deleting quiz:', error);
    res.status(500).json({ 
      error: 'Failed to delete quiz',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}) as RequestHandler);

export default router; 