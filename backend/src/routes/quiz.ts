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
 * @route POST /api/quizzes/attempts/:id/responses
 * @desc Submit a response for a quiz question
 * @access Private
 */
router.post('/attempts/:id/responses', authenticateToken, (async (req, res) => {
  try {
    const { id: attemptId } = req.params;
    const { questionId, type, selectedOptionId, codeSubmission } = req.body;
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }
    
    if (!questionId) {
      return res.status(400).json({ error: 'Question ID is required' });
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
      isCorrect = true; // Simplification
      points = 1; // Simplification
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
      return res.status(404).json({ error: 'Attempt not found' });
    }
    
    if (attempt.userId !== userId) {
      return res.status(403).json({ error: 'Not authorized to complete this attempt' });
    }
    
    if (attempt.completedAt) {
      return res.status(400).json({ error: 'This attempt has already been completed' });
    }
    
    // Get all questions for this quiz
    const quizQuestions = await prisma.quizQuestion.findMany({
      where: { quizId: attempt.quizId }
    });
    
    // Calculate total possible points
    const totalPossiblePoints = quizQuestions.reduce((sum, q) => sum + q.points, 0);
    
    // Calculate points earned
    const pointsEarned = attempt.responses.reduce((sum, r) => sum + (r.points || 0), 0);
    
    // Calculate score as a percentage
    const score = totalPossiblePoints > 0 
      ? Math.round((pointsEarned / totalPossiblePoints) * 100) 
      : 0;
    
    // Determine if passed based on quiz passing score
    const passed = score >= attempt.quiz.passingScore;
    
    // Complete the attempt
    const completedAttempt = await prisma.quizAttempt.update({
      where: { id: attemptId },
      data: {
        completedAt: new Date(),
        score,
        passed
      }
    });
    
    res.json(completedAttempt);
  } catch (error) {
    console.error('Error completing quiz attempt:', error);
    res.status(500).json({ 
      error: 'Failed to complete quiz attempt',
      details: error instanceof Error ? error.message : 'Unknown error'
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
      questions: attempt.responses.map(response => {
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
        completedAt: {
          not: null
        }
      },
      select: {
        quizId: true,
        score: true,
        completedAt: true,
      }
    });
    
    // Create a map of completed quiz IDs to attempts
    const completedQuizMap = completedAttempts.reduce((map, attempt) => {
      if (!map[attempt.quizId]) {
        map[attempt.quizId] = [];
      }
      map[attempt.quizId].push(attempt);
      return map;
    }, {} as Record<string, any[]>);
    
    // 3. Add completion status to each quiz
    const quizzesWithStatus = topicQuizzes.map(quiz => {
      const attempts = completedQuizMap[quiz.id] || [];
      const bestAttempt = attempts.length > 0 
        ? attempts.reduce((best, current) => current.score > best.score ? current : best, attempts[0])
        : null;
        
      return {
        ...quiz,
        completed: attempts.length > 0,
        attemptsCount: attempts.length,
        bestScore: bestAttempt?.score || null,
        lastCompletedAt: bestAttempt?.completedAt || null
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

export default router; 