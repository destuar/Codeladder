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
        completedAt: {
          not: null
        }
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

/**
 * @route GET /api/quizzes/:id/attempt
 * @desc Get a quiz with all questions for a quiz attempt
 * @access Private
 */
router.get('/:id/attempt', authenticateToken, (async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }
    
    // Check if quiz exists
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
                    isCorrect: false, // Don't send isCorrect to frontend during quiz
                    explanation: false, // Don't send explanation during quiz
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
      return res.status(404).json({ error: 'Quiz not found' });
    }

    // Transform the quiz data for the frontend
    const quizData = {
      id: quiz.id,
      title: quiz.name,
      description: quiz.description,
      topicId: quiz.topicId,
      passingScore: quiz.passingScore,
      estimatedTime: quiz.estimatedTime,
      questions: quiz.questions.map(q => ({
        id: q.id,
        questionText: q.questionText,
        questionType: q.questionType,
        points: q.points,
        orderNum: q.orderNum,
        difficulty: q.difficulty,
        mcProblem: q.mcProblem ? {
          ...q.mcProblem,
          explanation: undefined, // Remove explanation for quiz attempt
          options: q.mcProblem.options.map(opt => ({
            ...opt,
            isCorrect: undefined, // Remove isCorrect flag for quiz attempt
          }))
        } : undefined,
        codeProblem: q.codeProblem
      }))
    };

    res.json(quizData);
  } catch (error) {
    console.error('Error fetching quiz for attempt:', error);
    res.status(500).json({ 
      error: 'Failed to fetch quiz',
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
    
    // Find quizzes for the topic
    const quizzes = await prisma.quiz.findMany({
      where: { topicId: topic.id },
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

export default router; 