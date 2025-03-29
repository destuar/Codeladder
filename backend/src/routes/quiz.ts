import express from 'express';
import { Router } from 'express';
import type { RequestHandler } from 'express-serve-static-core';
import { prisma } from '../lib/prisma';
import { Role } from '@prisma/client';
import { authenticateToken } from '../middleware/auth';
import { authorizeRoles } from '../middleware/authorize';

const router = Router();

/**
 * @route GET /api/quizzes/attempts/:id
 * @desc Get a quiz attempt by ID
 * @access Private
 */
router.get('/attempts/:id', authenticateToken, (async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;
    
    console.log(`Accessing attempt ${id} for user ${userId}`);
    
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }
    
    // Get attempt with responses
    const attempt = await prisma.quizAttempt.findUnique({
      where: { id },
      include: {
        responses: {
          include: {
            question: true,
            mcResponse: true,
            codeResponse: {
              include: {
                testResults: true
              }
            }
          }
        }
      }
    });

    if (!attempt) {
      return res.status(404).json({ error: 'Attempt not found' });
    }
    
    // Check if user owns this attempt
    if (attempt.userId !== userId) {
      return res.status(403).json({ error: 'Not authorized to access this attempt' });
    }
    
    res.json(attempt);
  } catch (error) {
    console.error('Error fetching quiz attempt:', error);
    res.status(500).json({ 
      error: 'Failed to fetch quiz attempt',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}) as RequestHandler);

/**
 * @route POST /api/quizzes/attempts/:attemptId/responses/:questionId
 * @desc Submit a response for a specific question in a quiz
 * @access Private
 */
router.post('/attempts/:attemptId/responses/:questionId', authenticateToken, (async (req, res) => {
  try {
    const { attemptId, questionId } = req.params;
    const { type, selectedOptionId, codeSubmission } = req.body;
    const userId = req.user?.id;
    
    console.log(`Submitting ${type} response for question ${questionId} in attempt ${attemptId}`);
    
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }
    
    // Verify the attempt exists and belongs to the user
    const attempt = await prisma.quizAttempt.findUnique({
      where: { id: attemptId },
      include: { quiz: true }
    });

    if (!attempt) {
      return res.status(404).json({ error: 'Attempt not found' });
    }
    
    if (attempt.userId !== userId) {
      return res.status(403).json({ error: 'Not authorized to submit to this attempt' });
    }
    
    if (attempt.completedAt) {
      return res.status(400).json({ error: 'This attempt has already been completed' });
    }
    
    // Find existing response to update if it exists
    const existingResponse = await prisma.quizResponse.findFirst({
      where: {
        attemptId,
        questionId
      },
      include: {
        mcResponse: true,
        codeResponse: true
      }
    });
    
    // If MC question, validate the option belongs to the question
    let isCorrect = false;
    let points = 0;
    
    if (type === 'MULTIPLE_CHOICE') {
      if (!selectedOptionId) {
        return res.status(400).json({ error: 'Selected option ID is required for multiple choice questions' });
      }
      
      // Get the question and options to validate
      const question = await prisma.quizQuestion.findUnique({
        where: { id: questionId },
        include: {
          mcProblem: {
            include: {
              options: true
            }
          }
        }
      });
      
      if (!question || !question.mcProblem) {
        return res.status(404).json({ error: 'Question not found or not a multiple choice question' });
      }
      
      // Find the selected option
      const selectedOption = question.mcProblem.options.find(opt => opt.id === selectedOptionId);
      
      if (!selectedOption) {
        return res.status(400).json({ error: 'Selected option does not belong to this question' });
      }
      
      // Determine if the answer is correct
      isCorrect = selectedOption.isCorrect;
      points = isCorrect ? question.points : 0;
    } else if (type === 'CODE') {
      // For code questions, we'll assume they're correct for now (just store the submission)
      // In a real implementation, you'd run tests against the code to determine correctness
      isCorrect = false; // Default to false until evaluated
      points = 0; // Default to 0 until evaluated
      
      // Get the question to validate
      const question = await prisma.quizQuestion.findUnique({
        where: { id: questionId },
        include: {
          codeProblem: true
        }
      });
      
      if (!question || !question.codeProblem) {
        return res.status(404).json({ error: 'Question not found or not a code question' });
      }
    } else {
      return res.status(400).json({ error: 'Invalid response type' });
    }
    
    // Create or update the response
    let response;
    
    if (existingResponse) {
      // Update existing response
      response = await prisma.$transaction(async (prisma) => {
        // Update the main response
        const updatedResponse = await prisma.quizResponse.update({
          where: { id: existingResponse.id },
          data: {
            isCorrect,
            points
          }
        });
        
        if (type === 'MULTIPLE_CHOICE') {
          // Update MC response
          if (existingResponse.mcResponse) {
            await prisma.mcResponse.update({
              where: { responseId: existingResponse.id },
              data: {
                selectedOptionId
              }
            });
          } else {
            await prisma.mcResponse.create({
              data: {
                responseId: existingResponse.id,
                selectedOptionId
              }
            });
          }
        } else if (type === 'CODE') {
          // Update code response
          if (existingResponse.codeResponse) {
            await prisma.codeResponse.update({
              where: { responseId: existingResponse.id },
              data: {
                codeSubmission
              }
            });
          } else {
            await prisma.codeResponse.create({
              data: {
                responseId: existingResponse.id,
                codeSubmission
              }
            });
          }
        }
        
        return updatedResponse;
      });
    } else {
      // Create new response
      response = await prisma.$transaction(async (prisma) => {
        // Create the main response
        const newResponse = await prisma.quizResponse.create({
          data: {
            attemptId,
            questionId,
            isCorrect,
            points
          }
        });
        
        if (type === 'MULTIPLE_CHOICE') {
          // Create MC response
          await prisma.mcResponse.create({
            data: {
              responseId: newResponse.id,
              selectedOptionId
            }
          });
        } else if (type === 'CODE') {
          // Create code response
          await prisma.codeResponse.create({
            data: {
              responseId: newResponse.id,
              codeSubmission
            }
          });
        }
        
        return newResponse;
      });
    }
    
    res.status(200).json(response);
  } catch (error) {
    console.error('Error submitting quiz response:', error);
    res.status(500).json({ 
      error: 'Failed to submit quiz response',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}) as RequestHandler);

/**
 * @route POST /api/quizzes/attempts/:id/complete
 * @desc Complete a quiz attempt and calculate score
 * @access Private
 */
router.post('/attempts/:id/complete', authenticateToken, (async (req, res) => {
  try {
    const { id: attemptId } = req.params;
    const userId = req.user?.id;
    
    console.log(`Attempting to complete quiz attempt ${attemptId} for user ${userId}`);
    
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }
    
    // Verify the attempt exists and belongs to the user
    const attempt = await prisma.quizAttempt.findUnique({
      where: { id: attemptId },
      include: { 
        quiz: true,
        responses: true
      }
    });

    if (!attempt) {
      console.log(`Attempt ${attemptId} not found`);
      return res.status(404).json({ error: 'Attempt not found' });
    }
    
    if (attempt.userId !== userId) {
      console.log(`User ${userId} not authorized to complete attempt ${attemptId}`);
      return res.status(403).json({ error: 'Not authorized to complete this attempt' });
    }
    
    if (attempt.completedAt) {
      console.log(`Attempt ${attemptId} already completed at ${attempt.completedAt}`);
      // If it's already completed, just return the existing data
      return res.json({
        ...attempt,
        attemptId: attempt.id // Ensure attemptId is included for frontend
      });
    }
    
    let score = 0;
    let passed = false;
    
    try {
      // Get all questions for this quiz
      const quizQuestions = await prisma.quizQuestion.findMany({
        where: { quizId: attempt.quizId }
      });
      
      // Calculate total possible points
      const totalPossiblePoints = quizQuestions.reduce((sum, q) => sum + q.points, 0);
      
      // Calculate points earned
      const pointsEarned = attempt.responses.reduce((sum, r) => sum + (r.points || 0), 0);
      
      // Calculate score as a percentage
      score = totalPossiblePoints > 0 
        ? Math.round((pointsEarned / totalPossiblePoints) * 100) 
        : 0;
      
      // Determine if passed based on quiz passing score
      passed = score >= attempt.quiz.passingScore;
    } catch (error) {
      // If score calculation fails, log error but still complete the attempt
      console.error('Error calculating quiz score:', error);
      score = 0;
      passed = false;
    }
    
    // Complete the attempt
    const completedAttempt = await prisma.quizAttempt.update({
      where: { id: attemptId },
      data: {
        completedAt: new Date(),
        score,
        passed
      }
    });
    
    console.log(`Successfully completed attempt ${attemptId} with score ${score}`);
    
    // Always include the attemptId in the response for the frontend
    res.json({
      ...completedAttempt,
      attemptId: completedAttempt.id
    });
  } catch (error) {
    console.error('Error completing quiz attempt:', error);
    
    const attemptIdFromParams = req.params.id;
    
    // Try to save the attempt as completed even if there's an error
    try {
      if (attemptIdFromParams) {
        const failedCompletion = await prisma.quizAttempt.update({
          where: { id: attemptIdFromParams },
          data: {
            completedAt: new Date(),
            score: 0
          }
        });
        
        console.log(`Emergency completion of attempt ${attemptIdFromParams} due to error`);
        
        // Return something usable to the frontend
        return res.status(200).json({
          ...failedCompletion,
          attemptId: failedCompletion.id,
          error: 'Quiz completed with errors'
        });
      }
    } catch (fallbackError) {
      console.error('Failed emergency completion:', fallbackError);
    }
    
    res.status(500).json({ 
      error: 'Failed to complete quiz attempt',
      details: error instanceof Error ? error.message : 'Unknown error',
      attemptId: attemptIdFromParams // Still include the attemptId even on error
    });
  }
}) as RequestHandler);

/**
 * @route GET /api/quizzes/attempts/:id/results
 * @desc Get detailed results for a completed quiz attempt
 * @access Private
 */
router.get('/attempts/:id/results', authenticateToken, (async (req, res) => {
  try {
    const { id: attemptId } = req.params;
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }
    
    // Get attempt with all related data
    const attempt = await prisma.quizAttempt.findUnique({
      where: { id: attemptId },
      include: {
        quiz: true,
        responses: {
          include: {
            question: {
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
            },
            mcResponse: {
              include: {
                selectedOption: true
              }
            },
            codeResponse: {
              include: {
                testResults: true
              }
            }
          }
        }
      }
    });

    if (!attempt) {
      return res.status(404).json({ error: 'Attempt not found' });
    }
    
    // Check if user owns this attempt
    if (attempt.userId !== userId) {
      return res.status(403).json({ error: 'Not authorized to access these results' });
    }
    
    // Check if attempt is completed
    if (!attempt.completedAt) {
      return res.status(400).json({ error: 'This attempt has not been completed yet' });
    }
    
    // Transform data for the frontend
    const results = {
      id: attempt.id,
      quizId: attempt.quizId,
      quizTitle: attempt.quiz.name,
      score: attempt.score,
      passed: attempt.passed,
      passingScore: attempt.quiz.passingScore,
      startedAt: attempt.startedAt,
      completedAt: attempt.completedAt,
      timeSpent: attempt.completedAt && attempt.startedAt 
        ? Math.round((new Date(attempt.completedAt).getTime() - new Date(attempt.startedAt).getTime()) / 1000)
        : null,
      questions: attempt.responses
        .map(response => ({
          response,
          orderNum: response.question.orderNum ?? 9999 // Use a high default for questions with no orderNum
        }))
        .sort((a, b) => a.orderNum - b.orderNum)
        .map(({ response }) => {
          const question = response.question;
          
          // Define question data with proper type that includes optional mcProblem and codeProblem
          const questionData: {
            id: string;
            questionText: string;
            questionType: string;
            type: string;
            points: number;
            correct: boolean;
            userAnswer: any;
            correctAnswer: any;
            explanation: string;
            mcProblem?: any;
            codeProblem?: any;
          } = {
            id: question.id,
            questionText: question.questionText,
            questionType: question.questionType,
            type: question.questionType, // Alias for compatibility
            points: question.points,
            correct: response.isCorrect || false,
            userAnswer: null,
            correctAnswer: null,
            explanation: ''
          };
          
          // Add type-specific data
          if (question.questionType === 'MULTIPLE_CHOICE' && question.mcProblem && response.mcResponse) {
            questionData.userAnswer = response.mcResponse.selectedOptionId;
            
            // Find the correct option
            const correctOption = question.mcProblem.options.find(opt => opt.isCorrect);
            if (correctOption) {
              questionData.correctAnswer = correctOption.id;
            }
            
            questionData.explanation = question.mcProblem.explanation || '';
            
            // Add the problem data to make it compatible with the quiz question interface
            questionData.mcProblem = {
              ...question.mcProblem,
              options: question.mcProblem.options
            };
          } else if (question.questionType === 'CODE' && question.codeProblem && response.codeResponse) {
            questionData.userAnswer = response.codeResponse.codeSubmission;
            questionData.codeProblem = question.codeProblem;
          }
          
          return questionData;
        })
    };
    
    res.json(results);
  } catch (error) {
    console.error('Error fetching quiz results:', error);
    res.status(500).json({ 
      error: 'Failed to fetch quiz results',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}) as RequestHandler);

/**
 * @route GET /api/quizzes/levels/:levelId
 * @desc Get all tests for a level
 * @access Private
 */
router.get('/levels/:levelId', authenticateToken, (async (req, res) => {
  try {
    const { levelId } = req.params;
    
    if (!levelId) {
      return res.status(400).json({ error: 'Level ID is required' });
    }

    // First check if level exists
    const levelExists = await prisma.level.findUnique({
      where: { id: levelId }
    });

    if (!levelExists) {
      return res.status(404).json({ error: `Level not found with ID: ${levelId}` });
    }
    
    // Query tests for this level
    const tests = await prisma.quiz.findMany({
      where: { 
        levelId,
        assessmentType: 'TEST'  // Only return tests
      },
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
    
    // Return tests
    res.json(tests || []);
  } catch (error) {
    console.error('Error fetching tests:', error);
    
    res.status(500).json({ 
      error: 'Failed to fetch tests',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}) as RequestHandler);

/**
 * @route GET /api/quizzes/levels/:levelId/attempts
 * @desc Get all test attempts for a level by the current user
 * @access Private
 */
router.get('/levels/:levelId/attempts', authenticateToken, (async (req, res) => {
  try {
    const { levelId } = req.params;
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }
    
    // First check if level exists
    const level = await prisma.level.findUnique({
      where: { id: levelId }
    });
    
    if (!level) {
      return res.status(404).json({ error: `Level not found with ID: ${levelId}` });
    }
    
    // Get all tests (quizzes with type TEST) for this level
    const tests = await prisma.quiz.findMany({
      where: { 
        levelId: levelId,
        assessmentType: 'TEST'
       },
      select: { id: true } // Only need the IDs
    });
    
    const testIds = tests.map(test => test.id);
    
    if (testIds.length === 0) {
      // No tests found for this level, so no attempts possible
      return res.json([]);
    }
    
    // Get all attempts for these tests by the current user
    const attempts = await prisma.quizAttempt.findMany({
      where: {
        userId,
        quizId: { in: testIds }
      },
      include: {
        quiz: { // Include basic quiz (test) info
          select: {
            id: true,
            name: true,
            description: true,
            passingScore: true
          }
        }
      },
      orderBy: {
        startedAt: 'desc' // Show most recent first
      }
    });
    
    res.json(attempts);
  } catch (error) {
    console.error('Error fetching level test attempts:', error);
    res.status(500).json({ 
      error: 'Failed to fetch test attempts for level',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}) as RequestHandler);

/**
 * @route GET /api/quizzes/topic/:topicId
 * @desc Get all quizzes for a topic
 * @access Private
 * @deprecated Use /api/quizzes/topic/slug/:slug instead to avoid technical debt
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
    
    // Query with proper field mappings, only returning quizzes
    const quizzes = await prisma.quiz.findMany({
      where: { 
        topicId,
        assessmentType: 'QUIZ'  // Only return quizzes
      },
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

/**
 * @route GET /api/quizzes/topic/:topicId/next
 * @desc Get the next available quiz for a user in a specific topic 
 * @access Private
 * @deprecated Use /api/quizzes/topic/slug/:slug/next instead to avoid technical debt
 */
router.get('/topic/:topicId/next', authenticateToken, (async (req, res) => {
  try {
    const { topicId } = req.params;
    const userId = req.user?.id;
    
    console.log(`Getting next available quiz for topic ${topicId} and user ${userId}`);
    
    if (!topicId) {
      return res.status(400).json({ error: 'Topic ID is required' });
    }
    
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    // First check if topic exists
    const topicExists = await prisma.topic.findUnique({
      where: { id: topicId }
    });

    if (!topicExists) {
      console.log(`Topic not found with ID: ${topicId}`);
      return res.status(404).json({ error: `Topic not found with ID: ${topicId}` });
    }
    
    // 1. Get all quizzes for the topic ordered by orderNum
    const topicQuizzes = await prisma.quiz.findMany({
      where: { topicId },
      orderBy: [
        { orderNum: 'asc' }, 
        { createdAt: 'asc' }
      ],
      include: {
        _count: {
          select: { questions: true }
        }
      }
    });
    
    console.log(`Found ${topicQuizzes.length} quizzes for topic ${topicId}`);
    
    if (!topicQuizzes.length) {
      return res.status(404).json({ error: 'No quizzes available for this topic' });
    }
    
    // 2. Get all completed quiz attempts for this user/topic
    const completedAttempts = await prisma.quizAttempt.findMany({
      where: {
        userId,
        quiz: {
          topicId
        },
        completedAt: { not: null }
      },
      include: {
        quiz: true
      }
    });
    
    console.log(`User has completed ${completedAttempts.length} quiz attempts for this topic`);
    
    // Create a set of completed quiz IDs
    const completedQuizIds = new Set(completedAttempts.map(attempt => attempt.quizId));
    
    // 3. Find the first quiz that hasn't been completed
    const nextQuiz = topicQuizzes.find(quiz => !completedQuizIds.has(quiz.id));
    
    if (nextQuiz) {
      console.log(`Found next quiz to take: ${nextQuiz.id} - ${nextQuiz.name}`);
      return res.json(nextQuiz);
    } else {
      // All quizzes have been completed
      console.log('All quizzes completed for this topic');
      return res.json(null);
    }
  } catch (error) {
    console.error('Error fetching next quiz:', error);
    
    res.status(500).json({ 
      error: 'Failed to fetch next quiz',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}) as RequestHandler);

/**
 * @route GET /api/quizzes/topic/:topicId/all
 * @desc Get all quizzes for a topic, including completed ones, with completion status
 * @access Private
 * @deprecated Use /api/quizzes/topic/slug/:slug/all instead to avoid technical debt
 */
router.get('/topic/:topicId/all', authenticateToken, (async (req, res) => {
  try {
    const { topicId } = req.params;
    const userId = req.user?.id;
    
    console.log(`Getting all quizzes for topic ${topicId} for user ${userId}`);
    
    if (!topicId) {
      return res.status(400).json({ error: 'Topic ID is required' });
    }
    
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    // First check if topic exists
    const topicExists = await prisma.topic.findUnique({
      where: { id: topicId }
    });

    if (!topicExists) {
      return res.status(404).json({ error: `Topic not found with ID: ${topicId}` });
    }
    
    // 1. Get all quizzes for the topic
    const topicQuizzes = await prisma.quiz.findMany({
      where: { topicId },
      orderBy: [
        { orderNum: 'asc' }, 
        { createdAt: 'asc' }
      ],
      include: {
        _count: {
          select: { questions: true }
        }
      }
    });
    
    if (!topicQuizzes.length) {
      return res.status(404).json({ error: 'No quizzes available for this topic' });
    }
    
    // 2. Get all completed quiz attempts for this user/topic
    const completedAttempts = await prisma.quizAttempt.findMany({
      where: {
        userId,
        quiz: {
          topicId
        },
        completedAt: { not: null }
      },
      select: {
        quizId: true,
        score: true,
        passed: true,
        completedAt: true
      }
    });
    
    // Create a map of quiz IDs to completion status
    const quizCompletionStatus = new Map();
    completedAttempts.forEach(attempt => {
      // Keep only the highest score if there are multiple attempts
      if (!quizCompletionStatus.has(attempt.quizId) || 
          (quizCompletionStatus.get(attempt.quizId).score ?? 0) < (attempt.score ?? 0)) {
        quizCompletionStatus.set(attempt.quizId, {
          completed: true,
          score: attempt.score,
          passed: attempt.passed,
          completedAt: attempt.completedAt
        });
      }
    });
    
    // 3. Add completion status to each quiz
    const quizzesWithStatus = topicQuizzes.map(quiz => {
      const status = quizCompletionStatus.get(quiz.id) || {
        completed: false,
        score: null,
        passed: false,
        completedAt: null
      };
      
      return {
        ...quiz,
        ...status
      };
    });
    
    return res.json(quizzesWithStatus);
  } catch (error) {
    console.error('Error fetching quizzes:', error);
    res.status(500).json({ 
      error: 'Failed to fetch quizzes',
      details: error instanceof Error ? error.message : 'Unknown error'
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
 * @desc Update a quiz or test
 * @access Private (Admin only)
 */
router.put('/:id', authenticateToken, authorizeRoles([Role.ADMIN, Role.DEVELOPER]), (async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      name, 
      description, 
      topicId, 
      levelId,
      passingScore, 
      estimatedTime, 
      orderNum,
      assessmentType // We don't allow changing this, but we check it for consistency
    } = req.body;

    // Validate inputs
    if (!name) {
      return res.status(400).json({ error: 'Name is required' });
    }

    // Check if assessment exists
    const existingAssessment = await prisma.quiz.findUnique({
      where: { id }
    });

    if (!existingAssessment) {
      return res.status(404).json({ error: 'Assessment not found' });
    }

    // Prevent changing assessment type - it's a fixed property
    if (assessmentType && assessmentType !== existingAssessment.assessmentType) {
      return res.status(400).json({ 
        error: 'Assessment type cannot be changed. Create a new assessment instead.'
      });
    }

    // Check if the assessment is a quiz or a test
    const isQuiz = existingAssessment.assessmentType === 'QUIZ';
    
    // Prepare the update data based on the assessment type
    const updateData: any = {
      name,
      description,
      passingScore: passingScore ? parseInt(passingScore.toString()) : existingAssessment.passingScore,
      estimatedTime: estimatedTime ? parseInt(estimatedTime.toString()) : existingAssessment.estimatedTime,
      orderNum: orderNum ? parseInt(orderNum.toString()) : existingAssessment.orderNum
    };

    if (isQuiz) {
      // For quizzes, topicId is required and levelId must not be provided
      if (!topicId) {
        return res.status(400).json({ error: 'Topic ID is required for quizzes' });
      }
      
      if (levelId) {
        return res.status(400).json({ error: 'Level ID should not be provided for quizzes' });
      }

      // Check if topic exists
      const topic = await prisma.topic.findUnique({
        where: { id: topicId }
      });

      if (!topic) {
        return res.status(404).json({ error: 'Topic not found' });
      }
      
      updateData.topicId = topicId;
    } else {
      // For tests, levelId is required and topicId must not be provided
      if (!levelId) {
        return res.status(400).json({ error: 'Level ID is required for tests' });
      }
      
      if (topicId) {
        return res.status(400).json({ error: 'Topic ID should not be provided for tests' });
      }

      // Check if level exists
      const level = await prisma.level.findUnique({
        where: { id: levelId }
      });

      if (!level) {
        return res.status(404).json({ error: 'Level not found' });
      }
      
      updateData.levelId = levelId;
    }

    // Update the assessment
    const updatedAssessment = await prisma.quiz.update({
      where: { id },
      data: updateData
    });

    res.json(updatedAssessment);
  } catch (error) {
    console.error('Error updating quiz/test:', error);
    res.status(500).json({ 
      error: 'Failed to update quiz/test',
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

/**
 * @route GET /api/quizzes/:id/attempt
 * @desc Get a quiz or test with all questions for an attempt
 * @access Private
 */
router.get('/:id/attempt', authenticateToken, (async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;
    // Get the assessmentType from query params (QUIZ or TEST)
    const assessmentType = (req.query.assessmentType as string)?.toUpperCase() || 'QUIZ';
    
    console.log(`Fetching ${assessmentType} with ID ${id} for user ${userId}`);
    
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }
    
    // Check if quiz/test exists
    const quiz = await prisma.quiz.findUnique({
      where: { id },
      include: {
        questions: {
          orderBy: { orderNum: 'asc' },
          include: {
            mcProblem: {
              include: {
                options: {
                  orderBy: { orderNum: 'asc' },
                  select: {
                    id: true,
                    questionId: true,
                    optionText: true,
                    isCorrect: false, // Don't send isCorrect to frontend during quiz/test
                    explanation: false, // Don't send explanation during quiz/test
                    orderNum: true
                  }
                }
              }
            },
            codeProblem: {
              include: {
                testCases: {
                  where: { isHidden: false }, // Only include visible test cases
                  select: {
                    id: true,
                    input: true,
                    expectedOutput: true,
                    isHidden: true,
                    orderNum: true
                  }
                }
              }
            }
          }
        }
      }
    });

    if (!quiz) {
      return res.status(404).json({ error: `${assessmentType} not found` });
    }

    // Verify the assessment type matches if specified
    if (assessmentType !== 'ALL' && quiz.assessmentType !== assessmentType) {
      console.warn(`Warning: Requested ${assessmentType} but ID ${id} is a ${quiz.assessmentType}`);
    }

    // Log the number of questions found
    console.log(`Found ${quiz.questions.length} questions for ${assessmentType} ${id}`);

    // Transform the quiz/test data for the frontend
    const quizData = {
      id: quiz.id,
      title: quiz.name,
      description: quiz.description,
      topicId: quiz.topicId,
      levelId: quiz.levelId,
      passingScore: quiz.passingScore,
      estimatedTime: quiz.estimatedTime,
      assessmentType: quiz.assessmentType,
      type: quiz.assessmentType, // For backward compatibility
      questions: quiz.questions.map(q => ({
        id: q.id,
        questionText: q.questionText,
        questionType: q.questionType,
        points: q.points,
        orderNum: q.orderNum,
        difficulty: q.difficulty,
        mcProblem: q.mcProblem ? {
          ...q.mcProblem,
          explanation: undefined, // Remove explanation for attempt
          options: q.mcProblem.options.map(opt => ({
            ...opt,
            isCorrect: undefined, // Remove isCorrect flag for attempt
          }))
        } : undefined,
        codeProblem: q.codeProblem
      }))
    };

    // <<< ADD DETAILED LOGGING HERE >>>
    if (quizData.questions && quizData.questions.length > 0) {
      console.log('DEBUG: First question data being sent to frontend:');
      // Log only the first question to avoid overly large logs
      console.dir(quizData.questions[0], { depth: null }); 
    } else {
      console.log('DEBUG: No questions found or questions array is empty.');
    }
    // <<< END LOGGING >>>

    res.json(quizData);
  } catch (error) {
    console.error(`Error fetching quiz/test for attempt:`, error);
    res.status(500).json({ 
      error: 'Failed to fetch quiz or test data',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}) as RequestHandler);

/**
 * @route POST /api/quizzes/:id/attempts
 * @desc Start a new quiz attempt
 * @access Private
 */
router.post('/:id/attempts', authenticateToken, (async (req, res) => {
  try {
    const { id: quizId } = req.params;
    const userId = req.user?.id;
    
    console.log(`Creating new quiz attempt for quiz ${quizId} and user ${userId}`);
    
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }
    
    // Check if quiz exists
    const quiz = await prisma.quiz.findUnique({
      where: { id: quizId }
    });

    if (!quiz) {
      console.log(`Quiz not found with ID: ${quizId}`);
      return res.status(404).json({ error: 'Quiz not found' });
    }
    
    // Create new attempt
    const attempt = await prisma.quizAttempt.create({
      data: {
        quizId,
        userId,
        startedAt: new Date()
      }
    });
    
    console.log(`Created new quiz attempt with ID: ${attempt.id}`);
    res.status(201).json(attempt);
  } catch (error) {
    console.error('Error starting quiz attempt:', error);
    res.status(500).json({ 
      error: 'Failed to start quiz attempt',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}) as RequestHandler);

/**
 * @route GET /api/quizzes/topic/slug/:slug
 * @desc Get all quizzes for a topic using the topic slug
 * @access Private
 */
router.get('/topic/slug/:slug', authenticateToken, (async (req, res) => {
  try {
    const { slug } = req.params;
    const userId = req.user?.id;
    
    if (!slug) {
      return res.status(400).json({ error: 'Topic slug is required' });
    }
    
    // Find topic by slug
    const topic = await prisma.topic.findUnique({
      where: { slug }
    });
    
    if (!topic) {
      return res.status(404).json({ error: `Topic not found with slug: ${slug}` });
    }
    
    // Find quizzes for the topic - Filter by QUIZ assessmentType
    const quizzes = await prisma.quiz.findMany({
      where: { 
        topicId: topic.id,
        assessmentType: 'QUIZ' // Only return quizzes, not tests
      },
      orderBy: { orderNum: 'asc' },
      include: {
        _count: {
          select: { questions: true }
        }
      }
    });
    
    res.json(quizzes);
  } catch (error) {
    console.error('Error fetching quizzes by topic slug:', error);
    res.status(500).json({ 
      error: 'Failed to fetch quizzes',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}) as RequestHandler);

/**
 * @route GET /api/quizzes/topic/slug/:slug/next
 * @desc Get the next available quiz for a user in a specific topic using the topic slug
 * @access Private
 */
router.get('/topic/slug/:slug/next', authenticateToken, (async (req, res) => {
  try {
    const { slug } = req.params;
    const userId = req.user?.id;
    
    console.log(`Getting next available quiz for topic slug ${slug} and user ${userId}`);
    
    if (!slug) {
      return res.status(400).json({ error: 'Topic slug is required' });
    }
    
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }
    
    // Find topic by slug
    const topic = await prisma.topic.findUnique({
      where: { slug }
    });
    
    if (!topic) {
      console.log(`Topic not found with slug: ${slug}`);
      return res.status(404).json({ error: `Topic not found with slug: ${slug}` });
    }
    
    // 1. Get all quizzes for the topic ordered by orderNum
    const topicQuizzes = await prisma.quiz.findMany({
      where: { topicId: topic.id },
      orderBy: { orderNum: 'asc' },
      include: {
        _count: {
          select: { questions: true }
        }
      }
    });
    
    console.log(`Found ${topicQuizzes.length} quizzes for topic ${topic.id} (${slug})`);
    
    if (!topicQuizzes.length) {
      return res.status(404).json({ error: 'No quizzes available for this topic' });
    }
    
    // 2. Get all completed quiz attempts for this user/topic
    const completedAttempts = await prisma.quizAttempt.findMany({
      where: {
        userId,
        quiz: {
          topicId: topic.id
        },
        completedAt: { not: null },
        passed: true
      },
      select: {
        quizId: true
      }
    });
    
    console.log(`User has completed ${completedAttempts.length} quiz attempts for this topic`);
    
    // Create a set of quiz IDs that have been completed
    const completedQuizIds = new Set(completedAttempts.map(attempt => attempt.quizId));
    
    // 3. Find the first quiz that hasn't been completed
    const nextQuiz = topicQuizzes.find(quiz => !completedQuizIds.has(quiz.id));
    
    // 4. Return the next quiz, or indicate all are completed
    if (nextQuiz) {
      return res.json(nextQuiz);
    } else {
      console.log('All quizzes completed for this topic');
      // When all quizzes completed, return the last one to allow practice
      return res.json({
        ...topicQuizzes[topicQuizzes.length - 1],
        allCompleted: true
      });
    }
  } catch (error) {
    console.error('Error fetching next quiz by topic slug:', error);
    res.status(500).json({ 
      error: 'Failed to fetch next quiz',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}) as RequestHandler);

/**
 * @route GET /api/quizzes/topic/slug/:slug/all
 * @desc Get all quizzes for a topic using slug, including completed ones, with completion status
 * @access Private
 */
router.get('/topic/slug/:slug/all', authenticateToken, (async (req, res) => {
  try {
    const { slug } = req.params;
    const userId = req.user?.id;
    
    console.log(`Getting all quizzes for topic slug ${slug} for user ${userId}`);
    
    if (!slug) {
      return res.status(400).json({ error: 'Topic slug is required' });
    }
    
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }
    
    // Find topic by slug
    const topic = await prisma.topic.findUnique({
      where: { slug }
    });
    
    if (!topic) {
      return res.status(404).json({ error: `Topic not found with slug: ${slug}` });
    }
    
    // 1. Get all quizzes for the topic
    const topicQuizzes = await prisma.quiz.findMany({
      where: { topicId: topic.id },
      orderBy: { orderNum: 'asc' },
      include: {
        _count: {
          select: { questions: true }
        }
      }
    });
    
    if (!topicQuizzes.length) {
      return res.status(404).json({ error: 'No quizzes available for this topic' });
    }
    
    // 2. Get all completed quiz attempts for this user/topic
    const completedAttempts = await prisma.quizAttempt.findMany({
      where: {
        userId,
        quiz: {
          topicId: topic.id
        },
        completedAt: { not: null }
      },
      select: {
        quizId: true,
        score: true,
        passed: true,
        completedAt: true
      }
    });
    
    // Create a map of quiz IDs to completion status
    const quizCompletionStatus = new Map();
    completedAttempts.forEach(attempt => {
      // Keep only the highest score if there are multiple attempts
      if (!quizCompletionStatus.has(attempt.quizId) || 
          (quizCompletionStatus.get(attempt.quizId).score ?? 0) < (attempt.score ?? 0)) {
        quizCompletionStatus.set(attempt.quizId, {
          completed: true,
          score: attempt.score,
          passed: attempt.passed,
          completedAt: attempt.completedAt
        });
      }
    });
    
    // 3. Combine the data
    const quizzesWithStatus = topicQuizzes.map(quiz => {
      const status = quizCompletionStatus.get(quiz.id) || {
        completed: false,
        score: null,
        passed: false,
        completedAt: null
      };
      
      return {
        ...quiz,
        ...status
      };
    });
    
    res.json(quizzesWithStatus);
  } catch (error) {
    console.error('Error fetching all quizzes by topic slug:', error);
    res.status(500).json({ 
      error: 'Failed to fetch quizzes',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}) as RequestHandler);

/**
 * @route GET /api/quizzes/topic/:topicId/attempts
 * @desc Get all quiz attempts for a topic by the current user
 * @access Private
 */
router.get('/topic/:topicId/attempts', authenticateToken, (async (req, res) => {
  try {
    const { topicId } = req.params;
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }
    
    // First check if topic exists
    const topic = await prisma.topic.findUnique({
      where: { id: topicId }
    });
    
    if (!topic) {
      return res.status(404).json({ error: `Topic not found with ID: ${topicId}` });
    }
    
    // Get all quizzes for this topic
    const quizzes = await prisma.quiz.findMany({
      where: { topicId },
      select: { id: true }
    });
    
    const quizIds = quizzes.map(quiz => quiz.id);
    
    // Get all attempts for these quizzes
    const attempts = await prisma.quizAttempt.findMany({
      where: {
        userId,
        quizId: { in: quizIds }
      },
      include: {
        quiz: {
          select: {
            id: true,
            name: true,
            description: true,
            passingScore: true,
            orderNum: true
          }
        }
      },
      orderBy: {
        startedAt: 'desc'
      }
    });
    
    res.json(attempts);
  } catch (error) {
    console.error('Error fetching topic quiz attempts:', error);
    res.status(500).json({ 
      error: 'Failed to fetch quiz attempts',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}) as RequestHandler);

/**
 * @route GET /api/quizzes/topic/slug/:slug/attempts
 * @desc Get all quiz attempts for a topic by the current user using the topic slug
 * @access Private
 */
router.get('/topic/slug/:slug/attempts', authenticateToken, (async (req, res) => {
  try {
    const { slug } = req.params;
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }
    
    // First check if topic exists
    const topic = await prisma.topic.findUnique({
      where: { slug }
    });
    
    if (!topic) {
      return res.status(404).json({ error: `Topic not found with slug: ${slug}` });
    }
    
    // Get all quizzes for this topic
    const quizzes = await prisma.quiz.findMany({
      where: { topicId: topic.id },
      select: { id: true }
    });
    
    const quizIds = quizzes.map(quiz => quiz.id);
    
    // Get all attempts for these quizzes
    const attempts = await prisma.quizAttempt.findMany({
      where: {
        userId,
        quizId: { in: quizIds }
      },
      include: {
        quiz: {
          select: {
            id: true,
            name: true,
            description: true,
            passingScore: true,
            orderNum: true
          }
        }
      },
      orderBy: {
        startedAt: 'desc'
      }
    });
    
    res.json(attempts);
  } catch (error) {
    console.error('Error fetching topic quiz attempts by slug:', error);
    res.status(500).json({ 
      error: 'Failed to fetch quiz attempts',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}) as RequestHandler);

/**
 * @route POST /api/quizzes/:id/submit
 * @desc Create and complete a quiz attempt in a single transaction
 * @access Private
 */
router.post('/:id/submit', authenticateToken, (async (req, res) => {
  try {
    const { id: quizId } = req.params;
    const { startedAt, answers } = req.body;
    const userId = req.user?.id;
    
    console.log(`Creating and completing quiz attempt for quiz ${quizId} and user ${userId}`);
    
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }
    
    // Check if quiz exists
    const quiz = await prisma.quiz.findUnique({
      where: { id: quizId },
      include: {
        questions: true
      }
    });

    if (!quiz) {
      console.log(`Quiz not found with ID: ${quizId}`);
      return res.status(404).json({ error: 'Quiz not found' });
    }
    
    // Use a transaction to create attempt, responses, and complete it all at once
    const result = await prisma.$transaction(async (tx) => {
      // 1. Create the attempt
      const attempt = await tx.quizAttempt.create({
        data: {
          quizId,
          userId,
          startedAt: new Date(startedAt),
          completedAt: new Date() // Set completion time immediately
        }
      });
      
      console.log(`Created quiz attempt with ID: ${attempt.id}`);
      
      // Track total possible points and earned points
      let totalPossiblePoints = 0;
      let pointsEarned = 0;
      
      // 2. Process all question responses
      for (const question of quiz.questions) {
        const answer = answers[question.id];
        totalPossiblePoints += question.points;
        
        // Skip if no answer provided
        if (!answer) continue;
        
        if (question.questionType === 'MULTIPLE_CHOICE') {
          // For MC questions, check if the answer is correct
          const mcProblem = await tx.mcProblem.findUnique({
            where: { questionId: question.id },
            include: { options: true }
          });
          
          if (!mcProblem) continue;
          
          // Find the selected option and correct option
          const selectedOption = mcProblem.options.find(opt => opt.id === answer);
          const correctOption = mcProblem.options.find(opt => opt.isCorrect);
          
          const isCorrect = selectedOption?.isCorrect || false;
          const points = isCorrect ? question.points : 0;
          
          // Add points if correct
          if (isCorrect) {
            pointsEarned += points;
          }
          
          // Create the response
          await tx.quizResponse.create({
            data: {
              attemptId: attempt.id,
              questionId: question.id,
              isCorrect,
              points,
              mcResponse: {
                create: {
                  selectedOptionId: answer
                }
              }
            }
          });
        } else if (question.questionType === 'CODE') {
          // For code questions, we'd normally run tests, but for now just store the submission
          // In a real implementation, you'd evaluate the code here or call a code execution service
          
          // For now, assume all code submissions are correct
          // In a real implementation, this would depend on test case results
          const isCorrect = true; 
          const points = isCorrect ? question.points : 0;
          
          if (isCorrect) {
            pointsEarned += points;
          }
          
          // Create the response
          await tx.quizResponse.create({
            data: {
              attemptId: attempt.id,
              questionId: question.id,
              isCorrect,
              points,
              codeResponse: {
                create: {
                  codeSubmission: answer
                }
              }
            }
          });
        }
      }
      
      // 3. Calculate score and update the attempt
      const score = totalPossiblePoints > 0 
        ? Math.round((pointsEarned / totalPossiblePoints) * 100) 
        : 0;
      
      const passed = score >= quiz.passingScore;
      
      // Update the attempt with score and passed status
      const updatedAttempt = await tx.quizAttempt.update({
        where: { id: attempt.id },
        data: {
          score,
          passed
        }
      });
      
      return updatedAttempt;
    });
    
    console.log(`Successfully created and completed quiz attempt: ${result.id}`);
    
    res.status(201).json(result);
  } catch (error) {
    console.error('Error creating and completing quiz attempt:', error);
    res.status(500).json({ 
      error: 'Failed to submit quiz',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}) as RequestHandler);

/**
 * @route POST /api/quizzes
 * @desc Create a new quiz or test
 * @access Private (Admin only)
 */
router.post('/', authenticateToken, authorizeRoles([Role.ADMIN, Role.DEVELOPER]), (async (req, res) => {
  try {
    const { 
      name, 
      description, 
      topicId, 
      levelId, 
      passingScore, 
      estimatedTime, 
      orderNum,
      assessmentType = 'QUIZ' // Default to QUIZ for backward compatibility
    } = req.body;

    // Validate basic inputs
    if (!name) {
      return res.status(400).json({ error: 'Name is required' });
    }

    // Validate assessment type
    if (assessmentType !== 'QUIZ' && assessmentType !== 'TEST') {
      return res.status(400).json({ error: 'Assessment type must be either QUIZ or TEST' });
    }

    // Validate topic/level relationships based on assessment type
    if (assessmentType === 'QUIZ') {
      // For QUIZes, topicId is required and levelId must be null
      if (!topicId) {
        return res.status(400).json({ error: 'Topic ID is required for quizzes' });
      }
      
      if (levelId) {
        return res.status(400).json({ error: 'Level ID should not be provided for quizzes' });
      }

      // Check if topic exists
      const topic = await prisma.topic.findUnique({
        where: { id: topicId }
      });

      if (!topic) {
        return res.status(404).json({ error: 'Topic not found' });
      }
    } else if (assessmentType === 'TEST') {
      // For TESTs, levelId is required and topicId must be null
      if (!levelId) {
        return res.status(400).json({ error: 'Level ID is required for tests' });
      }
      
      if (topicId) {
        return res.status(400).json({ error: 'Topic ID should not be provided for tests' });
      }

      // Check if level exists
      const level = await prisma.level.findUnique({
        where: { id: levelId }
      });

      if (!level) {
        return res.status(404).json({ error: 'Level not found' });
      }
    }

    // Create the quiz or test
    const newAssessment = await prisma.quiz.create({
      data: {
        name,
        description,
        topicId, // Will be null for tests
        levelId, // Will be null for quizzes
        passingScore: passingScore ? parseInt(passingScore) : 70,
        estimatedTime: estimatedTime ? parseInt(estimatedTime) : null,
        orderNum: orderNum ? parseInt(orderNum) : null,
        assessmentType, // Save the assessment type
      }
    });

    res.status(201).json(newAssessment);
  } catch (error) {
    console.error('Error creating quiz/test:', error);
    res.status(500).json({ 
      error: 'Failed to create quiz/test',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}) as RequestHandler);

/**
 * @route GET /api/quizzes/:quizId/questions
 * @desc Get all questions for a quiz/test
 * @access Private (Admin/Developer)
 */
router.get('/:quizId/questions', authenticateToken, authorizeRoles([Role.ADMIN, Role.DEVELOPER]), (async (req, res) => {
  try {
    const { quizId } = req.params;
    console.log(`Fetching questions for quiz ${quizId}`);
    
    // Check if quiz exists
    const quiz = await prisma.quiz.findUnique({
      where: { id: quizId }
    });
    
    if (!quiz) {
      console.log(`Quiz ${quizId} not found`);
      return res.status(404).json({ error: 'Quiz not found' });
    }
    
    // Fetch questions with related data (MC problems, code problems, etc.)
    const questions = await prisma.quizQuestion.findMany({
      where: { quizId },
      orderBy: { orderNum: 'asc' },
      include: {
        mcProblem: {
          include: {
            options: {
              orderBy: { orderNum: 'asc' }
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
    
    // Transform the data to match frontend expectations
    const transformedQuestions = questions.map(question => {
      const baseQuestion = {
        id: question.id,
        questionText: question.questionText,
        questionType: question.questionType,
        points: question.points,
        orderNum: question.orderNum,
        difficulty: question.difficulty
      };
      
      if (question.questionType === 'MULTIPLE_CHOICE' && question.mcProblem) {
        return {
          ...baseQuestion,
          explanation: question.mcProblem.explanation,
          shuffleOptions: question.mcProblem.shuffleOptions,
          options: question.mcProblem.options.map(option => ({
            id: option.id,
            text: option.optionText,
            isCorrect: option.isCorrect,
            explanation: option.explanation,
            orderNum: option.orderNum
          }))
        };
      }
      
      if (question.questionType === 'CODE' && question.codeProblem) {
        return {
          ...baseQuestion,
          language: question.codeProblem.language,
          codeTemplate: question.codeProblem.codeTemplate,
          functionName: question.codeProblem.functionName,
          timeLimit: question.codeProblem.timeLimit,
          memoryLimit: question.codeProblem.memoryLimit,
          testCases: question.codeProblem.testCases.map(tc => ({
            id: tc.id,
            input: tc.input,
            expectedOutput: tc.expectedOutput,
            isHidden: tc.isHidden,
            orderNum: tc.orderNum
          }))
        };
      }
      
      return baseQuestion;
    });
    
    console.log(`Successfully fetched ${transformedQuestions.length} questions for quiz ${quizId}`);
    res.json(transformedQuestions);
  } catch (error) {
    console.error('Error fetching quiz questions:', error);
    res.status(500).json({ 
      error: 'Failed to fetch quiz questions',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}) as RequestHandler);

/**
 * @route POST /api/quizzes/:quizId/questions
 * @desc Create a new question for a quiz/test
 * @access Private (Admin/Developer)
 */
router.post('/:quizId/questions', authenticateToken, authorizeRoles([Role.ADMIN, Role.DEVELOPER]), (async (req, res) => {
  try {
    const { quizId } = req.params;
    const questionData = req.body;
    
    console.log(`Creating new question for quiz ${quizId}`, questionData);
    
    // Check if quiz exists
    const quiz = await prisma.quiz.findUnique({
      where: { id: quizId }
    });
    
    if (!quiz) {
      console.log(`Quiz ${quizId} not found`);
      return res.status(404).json({ error: 'Quiz not found' });
    }
    
    // Calculate next order number if not provided
    let orderNum = questionData.orderNum;
    if (!orderNum) {
      const maxOrderNum = await prisma.quizQuestion.findFirst({
        where: { quizId },
        orderBy: { orderNum: 'desc' },
        select: { orderNum: true }
      });
      
      orderNum = maxOrderNum?.orderNum ? maxOrderNum.orderNum + 1 : 1;
    }
    
    // Create the question based on its type
    let createdQuestion;
    
    if (questionData.questionType === 'MULTIPLE_CHOICE') {
      // Create MC question with options
      createdQuestion = await prisma.$transaction(async (prisma) => {
        // Create base question
        const question = await prisma.quizQuestion.create({
          data: {
            quizId,
            questionText: questionData.questionText,
            questionType: 'MULTIPLE_CHOICE',
            points: questionData.points || 1,
            orderNum,
            difficulty: questionData.difficulty || 'MEDIUM',
            mcProblem: {
              create: {
                explanation: questionData.explanation || null,
                shuffleOptions: questionData.shuffleOptions !== false
              }
            }
          },
          include: {
            mcProblem: true
          }
        });
        
        // Create options
        if (Array.isArray(questionData.options) && question.mcProblem) {
          const mcProblemId = question.mcProblem.questionId;
          
          for (let i = 0; i < questionData.options.length; i++) {
            const option = questionData.options[i];
            await prisma.mcOption.create({
              data: {
                questionId: mcProblemId,
                optionText: option.text,
                isCorrect: option.isCorrect === true,
                explanation: option.explanation || null,
                orderNum: option.orderNum || i + 1
              }
            });
          }
        }
        
        // Get the full question with options
        return prisma.quizQuestion.findUnique({
          where: { id: question.id },
          include: {
            mcProblem: {
              include: {
                options: {
                  orderBy: { orderNum: 'asc' }
                }
              }
            }
          }
        });
      });
      
    } else if (questionData.questionType === 'CODE') {
      // Create CODE question with test cases
      createdQuestion = await prisma.$transaction(async (prisma) => {
        // Create base question
        const question = await prisma.quizQuestion.create({
          data: {
            quizId,
            questionText: questionData.questionText,
            questionType: 'CODE',
            points: questionData.points || 1,
            orderNum,
            difficulty: questionData.difficulty || 'MEDIUM',
            codeProblem: {
              create: {
                language: questionData.language || 'javascript',
                codeTemplate: questionData.codeTemplate || null,
                functionName: questionData.functionName || null,
                timeLimit: questionData.timeLimit || 5000,
                memoryLimit: questionData.memoryLimit || null
              }
            }
          },
          include: {
            codeProblem: true
          }
        });
        
        // Create test cases
        if (Array.isArray(questionData.testCases) && question.codeProblem) {
          const codeProblemId = question.codeProblem.questionId;
          
          for (let i = 0; i < questionData.testCases.length; i++) {
            const testCase = questionData.testCases[i];
            await prisma.testCase.create({
              data: {
                codeProblemId,
                input: testCase.input || '',
                expectedOutput: testCase.expectedOutput || '',
                isHidden: testCase.isHidden === true,
                orderNum: testCase.orderNum || i + 1
              }
            });
          }
        }
        
        // Get the full question with test cases
        return prisma.quizQuestion.findUnique({
          where: { id: question.id },
          include: {
            codeProblem: {
              include: {
                testCases: {
                  orderBy: { orderNum: 'asc' }
                }
              }
            }
          }
        });
      });
    } else {
      return res.status(400).json({ error: 'Invalid question type' });
    }
    
    // Transform the created question to match frontend expectations
    const transformedQuestion = await transformQuestionForResponse(createdQuestion);
    
    console.log(`Successfully created question for quiz ${quizId}`);
    res.status(201).json(transformedQuestion);
  } catch (error) {
    console.error('Error creating quiz question:', error);
    res.status(500).json({ 
      error: 'Failed to create quiz question',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}) as RequestHandler);

/**
 * @route GET /api/quizzes/questions/:questionId
 * @desc Get a specific question by ID
 * @access Private (Admin/Developer)
 */
router.get('/questions/:questionId', authenticateToken, authorizeRoles([Role.ADMIN, Role.DEVELOPER]), (async (req, res) => {
  try {
    const { questionId } = req.params;
    console.log(`Fetching question ${questionId}`);
    
    // Fetch the question with related data
    const question = await prisma.quizQuestion.findUnique({
      where: { id: questionId },
      include: {
        mcProblem: {
          include: {
            options: {
              orderBy: { orderNum: 'asc' }
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
    
    if (!question) {
      console.log(`Question ${questionId} not found`);
      return res.status(404).json({ error: 'Question not found' });
    }
    
    // Transform the question to match frontend expectations
    const transformedQuestion = await transformQuestionForResponse(question);
    
    res.json(transformedQuestion);
  } catch (error) {
    console.error('Error fetching quiz question:', error);
    res.status(500).json({ 
      error: 'Failed to fetch quiz question',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}) as RequestHandler);

/**
 * @route PUT /api/quizzes/questions/:questionId
 * @desc Update a specific question
 * @access Private (Admin/Developer)
 */
router.put('/questions/:questionId', authenticateToken, authorizeRoles([Role.ADMIN, Role.DEVELOPER]), (async (req, res) => {
  try {
    const { questionId } = req.params;
    const questionData = req.body;
    
    console.log(`Updating question ${questionId}`);
    
    // Check if question exists
    const existingQuestion = await prisma.quizQuestion.findUnique({
      where: { id: questionId },
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
    
    if (!existingQuestion) {
      console.log(`Question ${questionId} not found`);
      return res.status(404).json({ error: 'Question not found' });
    }
    
    // Update the question based on its type
    let updatedQuestion;
    
    if (questionData.questionType === 'MULTIPLE_CHOICE') {
      // Update MC question with options
      updatedQuestion = await prisma.$transaction(async (prisma) => {
        // Update base question
        await prisma.quizQuestion.update({
          where: { id: questionId },
          data: {
            questionText: questionData.questionText,
            points: questionData.points || 1,
            orderNum: questionData.orderNum || existingQuestion.orderNum,
            difficulty: questionData.difficulty || existingQuestion.difficulty
          }
        });
        
        // If MC problem doesn't exist yet (question type changed), create it
        if (!existingQuestion.mcProblem) {
          await prisma.mcProblem.create({
            data: {
              questionId,
              explanation: questionData.explanation || null,
              shuffleOptions: questionData.shuffleOptions !== false
            }
          });
        } else {
          // Update existing MC problem
          await prisma.mcProblem.update({
            where: { questionId },
            data: {
              explanation: questionData.explanation || null,
              shuffleOptions: questionData.shuffleOptions !== false
            }
          });
          
          // Delete existing options
          await prisma.mcOption.deleteMany({
            where: { questionId: existingQuestion.mcProblem.questionId }
          });
        }
        
        // Create new options
        if (Array.isArray(questionData.options)) {
          for (let i = 0; i < questionData.options.length; i++) {
            const option = questionData.options[i];
            await prisma.mcOption.create({
              data: {
                questionId,
                optionText: option.text,
                isCorrect: option.isCorrect === true,
                explanation: option.explanation || null,
                orderNum: option.orderNum || i + 1
              }
            });
          }
        }
        
        // If there was a code problem, delete it
        if (existingQuestion.codeProblem) {
          await prisma.testCase.deleteMany({
            where: { codeProblemId: existingQuestion.codeProblem.questionId }
          });
          
          await prisma.codeProblem.delete({
            where: { questionId }
          });
        }
        
        // Get the updated question
        return prisma.quizQuestion.findUnique({
          where: { id: questionId },
          include: {
            mcProblem: {
              include: {
                options: {
                  orderBy: { orderNum: 'asc' }
                }
              }
            }
          }
        });
      });
      
    } else if (questionData.questionType === 'CODE') {
      // Update CODE question with test cases
      updatedQuestion = await prisma.$transaction(async (prisma) => {
        // Update base question
        await prisma.quizQuestion.update({
          where: { id: questionId },
          data: {
            questionText: questionData.questionText,
            points: questionData.points || 1,
            orderNum: questionData.orderNum || existingQuestion.orderNum,
            difficulty: questionData.difficulty || existingQuestion.difficulty
          }
        });
        
        // If code problem doesn't exist yet (question type changed), create it
        if (!existingQuestion.codeProblem) {
          await prisma.codeProblem.create({
            data: {
              questionId,
              language: questionData.language || 'javascript',
              codeTemplate: questionData.codeTemplate || null,
              functionName: questionData.functionName || null,
              timeLimit: questionData.timeLimit || 5000,
              memoryLimit: questionData.memoryLimit || null
            }
          });
        } else {
          // Update existing code problem
          await prisma.codeProblem.update({
            where: { questionId },
            data: {
              language: questionData.language || 'javascript',
              codeTemplate: questionData.codeTemplate || null,
              functionName: questionData.functionName || null,
              timeLimit: questionData.timeLimit || 5000,
              memoryLimit: questionData.memoryLimit || null
            }
          });
          
          // Delete existing test cases
          await prisma.testCase.deleteMany({
            where: { codeProblemId: existingQuestion.codeProblem.questionId }
          });
        }
        
        // Create new test cases
        if (Array.isArray(questionData.testCases)) {
          for (let i = 0; i < questionData.testCases.length; i++) {
            const testCase = questionData.testCases[i];
            await prisma.testCase.create({
              data: {
                codeProblemId: questionId,
                input: testCase.input || '',
                expectedOutput: testCase.expectedOutput || '',
                isHidden: testCase.isHidden === true,
                orderNum: testCase.orderNum || i + 1
              }
            });
          }
        }
        
        // If there was an MC problem, delete it
        if (existingQuestion.mcProblem) {
          await prisma.mcOption.deleteMany({
            where: { questionId: existingQuestion.mcProblem.questionId }
          });
          
          await prisma.mcProblem.delete({
            where: { questionId }
          });
        }
        
        // Get the updated question
        return prisma.quizQuestion.findUnique({
          where: { id: questionId },
          include: {
            codeProblem: {
              include: {
                testCases: {
                  orderBy: { orderNum: 'asc' }
                }
              }
            }
          }
        });
      });
    } else {
      return res.status(400).json({ error: 'Invalid question type' });
    }
    
    // Transform the updated question to match frontend expectations
    const transformedQuestion = await transformQuestionForResponse(updatedQuestion);
    
    console.log(`Successfully updated question ${questionId}`);
    res.json(transformedQuestion);
  } catch (error) {
    console.error('Error updating quiz question:', error);
    res.status(500).json({ 
      error: 'Failed to update quiz question',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}) as RequestHandler);

/**
 * @route DELETE /api/quizzes/questions/:questionId
 * @desc Delete a specific question
 * @access Private (Admin/Developer)
 */
router.delete('/questions/:questionId', authenticateToken, authorizeRoles([Role.ADMIN, Role.DEVELOPER]), (async (req, res) => {
  try {
    const { questionId } = req.params;
    console.log(`Deleting question ${questionId}`);
    
    // Check if question exists
    const question = await prisma.quizQuestion.findUnique({
      where: { id: questionId }
    });
    
    if (!question) {
      console.log(`Question ${questionId} not found`);
      return res.status(404).json({ error: 'Question not found' });
    }
    
    // Perform cascading delete
    await prisma.$transaction(async (prisma) => {
      // Delete responses first to avoid foreign key constraints
      const responses = await prisma.quizResponse.findMany({
        where: { questionId },
        include: {
          mcResponse: true,
          codeResponse: {
            include: {
              testResults: true
            }
          }
        }
      });
      
      for (const response of responses) {
        if (response.mcResponse) {
          await prisma.mcResponse.delete({
            where: { responseId: response.id }
          });
        }
        
        if (response.codeResponse) {
          // Delete test results first
          if (response.codeResponse.testResults.length > 0) {
            await prisma.testCaseResult.deleteMany({
              where: { codeResponseId: response.id }
            });
          }
          
          await prisma.codeResponse.delete({
            where: { responseId: response.id }
          });
        }
        
        await prisma.quizResponse.delete({
          where: { id: response.id }
        });
      }
      
      // Delete question-specific data based on type
      if (question.questionType === 'MULTIPLE_CHOICE') {
        // Delete MC options
        await prisma.mcOption.deleteMany({
          where: { questionId }
        });
        
        // Delete MC problem
        await prisma.mcProblem.delete({
          where: { questionId }
        }).catch(() => {
          // Ignore if not found
        });
      } else if (question.questionType === 'CODE') {
        // Delete test cases
        await prisma.testCase.deleteMany({
          where: { codeProblemId: questionId }
        });
        
        // Delete code problem
        await prisma.codeProblem.delete({
          where: { questionId }
        }).catch(() => {
          // Ignore if not found
        });
      }
      
      // Finally delete the question itself
      await prisma.quizQuestion.delete({
        where: { id: questionId }
      });
    });
    
    console.log(`Successfully deleted question ${questionId}`);
    res.json({ success: true, message: 'Question deleted successfully' });
  } catch (error) {
    console.error('Error deleting quiz question:', error);
    res.status(500).json({ 
      error: 'Failed to delete quiz question',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}) as RequestHandler);

// Helper function to transform question data for response
async function transformQuestionForResponse(question: any) {
  if (!question) return null;
  
  const baseQuestion = {
    id: question.id,
    questionText: question.questionText,
    questionType: question.questionType,
    points: question.points,
    orderNum: question.orderNum,
    difficulty: question.difficulty
  };
  
  if (question.questionType === 'MULTIPLE_CHOICE' && question.mcProblem) {
    return {
      ...baseQuestion,
      explanation: question.mcProblem.explanation,
      shuffleOptions: question.mcProblem.shuffleOptions,
      options: question.mcProblem.options.map((option: any) => ({
        id: option.id,
        text: option.optionText,
        isCorrect: option.isCorrect,
        explanation: option.explanation,
        orderNum: option.orderNum
      }))
    };
  }
  
  if (question.questionType === 'CODE' && question.codeProblem) {
    return {
      ...baseQuestion,
      language: question.codeProblem.language,
      codeTemplate: question.codeProblem.codeTemplate,
      functionName: question.codeProblem.functionName,
      timeLimit: question.codeProblem.timeLimit,
      memoryLimit: question.codeProblem.memoryLimit,
      testCases: question.codeProblem.testCases.map((tc: any) => ({
        id: tc.id,
        input: tc.input,
        expectedOutput: tc.expectedOutput,
        isHidden: tc.isHidden,
        orderNum: tc.orderNum
      }))
    };
  }
  
  return baseQuestion;
}

/**
 * @route GET /api/quizzes/topic/:topicId/next-quiz
 * @desc Get the ID of the next recommended quiz for the user within a topic.
 *        Prioritizes uncompleted quizzes, then randomly selects from completed ones if necessary.
 * @access Private
 */
router.get('/topic/:topicId/next-quiz', authenticateToken, (async (req, res) => {
  try {
    const { topicId } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    // 1. Validate Topic exists
    const topic = await prisma.topic.findUnique({ where: { id: topicId } });
    if (!topic) {
      return res.status(404).json({ error: `Topic not found with ID: ${topicId}` });
    }

    // 2. Get all Quiz IDs for this topic
    const allQuizzes = await prisma.quiz.findMany({
      where: { topicId, assessmentType: 'QUIZ' },
      select: { id: true },
    });

    const allQuizIds = allQuizzes.map(q => q.id);
    if (allQuizIds.length === 0) {
      return res.json({ nextAssessmentId: null, message: 'No quizzes found for this topic.' });
    }

    // 3. Get IDs of quizzes completed by the user within this topic
    const completedAttempts = await prisma.quizAttempt.findMany({
      where: {
        userId,
        quizId: { in: allQuizIds },
        completedAt: { not: null }, // Check for completion
      },
      select: { quizId: true },
      distinct: ['quizId'], // Only need unique completed quiz IDs
    });
    const completedQuizIds = new Set(completedAttempts.map(a => a.quizId));

    // 4. Filter into uncompleted and completed
    const uncompletedIds = allQuizIds.filter(id => !completedQuizIds.has(id));
    const completedIds = allQuizIds.filter(id => completedQuizIds.has(id));

    let selectedId: string | null = null;

    // 5. Select randomly, prioritizing uncompleted
    if (uncompletedIds.length > 0) {
      selectedId = uncompletedIds[Math.floor(Math.random() * uncompletedIds.length)];
      console.log(`Selected uncompleted quiz ${selectedId} for topic ${topicId}`);
    } else if (completedIds.length > 0) {
      // If all are completed, select randomly from the completed ones
      selectedId = completedIds[Math.floor(Math.random() * completedIds.length)];
      console.log(`Selected completed quiz ${selectedId} for topic ${topicId} (all were completed)`);
    }

    res.json({ nextAssessmentId: selectedId });

  } catch (error) {
    console.error('Error fetching next quiz for topic:', error);
    res.status(500).json({
      error: 'Failed to determine next quiz',
      details: error instanceof Error ? error.message : 'Unknown error',
      nextAssessmentId: null
    });
  }
}) as RequestHandler);


/**
 * @route GET /api/quizzes/level/:levelId/next-test
 * @desc Get the ID of the next recommended test for the user within a level.
 *       Prioritizes uncompleted tests, then randomly selects from completed ones if necessary.
 * @access Private
 */
router.get('/level/:levelId/next-test', authenticateToken, (async (req, res) => {
  try {
    const { levelId } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    // 1. Validate Level exists
    const level = await prisma.level.findUnique({ where: { id: levelId } });
    if (!level) {
      return res.status(404).json({ error: `Level not found with ID: ${levelId}` });
    }

    // 2. Get all Test IDs for this level
    const allTests = await prisma.quiz.findMany({
      where: { levelId, assessmentType: 'TEST' },
      select: { id: true },
    });

    const allTestIds = allTests.map(t => t.id);
    if (allTestIds.length === 0) {
      return res.json({ nextAssessmentId: null, message: 'No tests found for this level.' });
    }

    // 3. Get IDs of tests completed by the user within this level
    const completedAttempts = await prisma.quizAttempt.findMany({
      where: {
        userId,
        quizId: { in: allTestIds }, // quizId still refers to the test ID here
        completedAt: { not: null },
      },
      select: { quizId: true },
      distinct: ['quizId'],
    });
    const completedTestIds = new Set(completedAttempts.map(a => a.quizId));

    // 4. Filter into uncompleted and completed
    const uncompletedIds = allTestIds.filter(id => !completedTestIds.has(id));
    const completedIds = allTestIds.filter(id => completedTestIds.has(id));

    let selectedId: string | null = null;

    // 5. Select randomly, prioritizing uncompleted
    if (uncompletedIds.length > 0) {
      selectedId = uncompletedIds[Math.floor(Math.random() * uncompletedIds.length)];
       console.log(`Selected uncompleted test ${selectedId} for level ${levelId}`);
    } else if (completedIds.length > 0) {
      selectedId = completedIds[Math.floor(Math.random() * completedIds.length)];
       console.log(`Selected completed test ${selectedId} for level ${levelId} (all were completed)`);
    }

    res.json({ nextAssessmentId: selectedId });

  } catch (error) {
    console.error('Error fetching next test for level:', error);
    res.status(500).json({
      error: 'Failed to determine next test',
      details: error instanceof Error ? error.message : 'Unknown error',
      nextAssessmentId: null
    });
  }
}) as RequestHandler);

export default router; 