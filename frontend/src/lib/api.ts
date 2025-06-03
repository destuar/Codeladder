/**
 * @file api.ts
 * Main API client for CodeLadder frontend
 * Handles all HTTP requests to the backend with proper authentication,
 * error handling, and environment-aware logging
 */

import { logger } from './logger';

declare global {
  interface Window {
    ENV?: {
      API_URL: string;
      NODE_ENV: string;
    };
    CONFIG?: {
      API_URL: string;
      NODE_ENV: string;
      AUTH_ENABLED: boolean;
      DEFAULT_ERROR_MESSAGE: string;
      API_TIMEOUT: number;
    };
    RUNTIME_CONFIG?: {
      API_URL: string;
      ENV: string;
    };
  }
}

// Initialize ENV from CONFIG if needed
if (!window.ENV && window.CONFIG) {
  window.ENV = {
    API_URL: window.CONFIG.API_URL,
    NODE_ENV: window.CONFIG.NODE_ENV
  };
}

// Initialize ENV from RUNTIME_CONFIG if needed (for backward compatibility)
if (!window.ENV && window.RUNTIME_CONFIG) {
  window.ENV = {
    API_URL: window.RUNTIME_CONFIG.API_URL,
    NODE_ENV: window.RUNTIME_CONFIG.ENV // Note: using ENV from RUNTIME_CONFIG
  };
}

// Ensure ENV exists with defaults
if (!window.ENV) {
  window.ENV = {
    API_URL: '/api',
    NODE_ENV: 'development'
  };
  logger.warn('window.ENV not found, using defaults');
}

interface RequestOptions extends RequestInit {
  token?: string | null;
}

interface ApiError extends Error {
  status?: number;
  details?: string;
  url?: string;
}

const getBaseUrl = () => {
  // In both dev and prod, we'll use relative /api path
  // Vite handles proxying in dev, nginx handles it in prod
  return '/api';
};

// Simple request throttling system to prevent excessive API calls
const throttleMap = new Map<string, number>();
const THROTTLE_PERIOD = 500; // ms between identical requests

async function request(endpoint: string, options: RequestOptions = {}) {
  const { token, ...customOptions } = options;
  const authToken = token || localStorage.getItem('token');

  // Debug token usage only in development
  logger.debug('Token being used:', authToken ? 'Present' : 'Missing', {
    fromOptions: !!token,
    fromLocalStorage: !!localStorage.getItem('token')
  });

  const headers = new Headers(customOptions.headers);
  headers.set('Content-Type', 'application/json');
  
  if (authToken) {
    headers.set('Authorization', `Bearer ${authToken}`);
    logger.debug('Added auth token to request');
  }

  // Ensure endpoint doesn't start with a slash if it's not meant to be at the root
  // const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint; // Old logic removed
  const baseUrl = getBaseUrl(); // Returns '/api'
  
  // Smart URL joining: Prepend baseUrl only if endpoint doesn't already start with it.
  let url;
  if (endpoint.startsWith(baseUrl)) {
    // If endpoint already starts with /api, use it as is (relative to domain root)
    url = endpoint;
  } else {
    // Otherwise, combine baseUrl and endpoint, ensuring a single slash between them
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
    url = `${baseUrl}/${cleanEndpoint}`;
  }
  // Normalize slashes just in case
  url = url.replace(/\/+/g, '/');

  // Log API request using the new logger
  logger.api.request(options.method || 'GET', url, customOptions.body ? JSON.parse(customOptions.body as string) : null);

  try {
    logger.debug(`Sending fetch request to ${url}...`);
    const response = await fetch(url, {
      ...customOptions,
      headers,
      credentials: 'include'
    });
    logger.debug(`Received response from ${url}, status: ${response.status}`);

    let data: any = null; // Initialize data to null
    
    // Check for 204 No Content before trying to parse JSON
    if (response.status !== 204) { 
      try {
        data = await response.json();
        logger.debug(`Successfully parsed JSON response from ${url}`);
      } catch (e) {
        logger.warn(`Response from ${url} is not JSON (Status: ${response.status})`);
        // Don't try to read response.text() after response.json() failed
        // as the body stream can only be read once
        data = null; 
      }
    } else {
      logger.debug(`Received 204 No Content from ${url}, skipping JSON parse.`);
    }

    // Debug response headers only in development
    logger.debug('Response headers:', {
      ...Object.fromEntries(response.headers.entries())
    });

    // Log API response using the new logger
    logger.api.response(options.method || 'GET', url, response.status, data);

    if (response.status === 401) {
      logger.error('Unauthorized request', null, { url });
      throw new Error('Unauthorized');
    }

    if (!response.ok) {
      if (data?.error) {
        const errorMessage = Array.isArray(data.error) 
          ? data.error.map((e: any) => e.message || e).join(', ')
          : data.error;
        
        logger.error('API Error', null, {
          url,
          status: response.status,
          message: errorMessage,
          details: data.details || null,
        });
        
        const error = new Error(errorMessage) as ApiError;
        error.status = response.status;
        error.details = data.details;
        error.url = url;
        throw error;
      }
      
      logger.error('HTTP Error', null, {
        url,
        status: response.status,
        statusText: response.statusText
      });
      
      const error = new Error(`HTTP error! status: ${response.status}`) as ApiError;
      error.status = response.status;
      error.url = url;
      throw error;
    }

    return data;
  } catch (error) {
    // Log API error using the new logger
    logger.api.error(options.method || 'GET', url, error);
    throw error;
  }
}

export const api = {
  async get(endpoint: string, token?: string | null) {
    return request(endpoint, { token });
  },

  async post(endpoint: string, data: any, token?: string | null) {
    logger.debug(`API POST request to ${endpoint}`, data);
    return request(endpoint, {
      method: 'POST',
      token,
      body: JSON.stringify(data),
    });
  },

  async put(endpoint: string, data: any, token?: string | null) {
    return request(endpoint, {
      method: 'PUT',
      token,
      body: JSON.stringify(data),
    });
  },

  async delete(endpoint: string, token?: string | null) {
    return request(endpoint, {
      method: 'DELETE',
      token,
    });
  },

  request: async (endpoint: string, options: RequestOptions = {}) => {
    const baseUrl = getBaseUrl();
    const url = `${baseUrl}/${endpoint}`.replace(/\/+/g, '/');
    
    // ... rest of request implementation ...
  },

  // Learning path management
  async createLevel(data: any, token: string) {
    return this.post('/admin/levels', data, token);
  },

  async deleteProblem(id: string, token: string) {
    return this.delete(`/learning/problems/${id}`, token);
  },

  // Quiz management
  async getQuizzesByTopic(topicId: string, token: string) {
    logger.warn('DEPRECATED: Use getQuizzesByTopicSlug instead');
    return this.get(`/quizzes/topic/${topicId}`, token);
  },

  async getQuizzesByTopicSlug(slug: string, token: string) {
    return this.get(`/quizzes/topic/slug/${slug}`, token);
  },

  async getAllQuizzesForTopic(topicId: string, token: string) {
    logger.warn('DEPRECATED: Use getAllQuizzesForTopicSlug instead');
    return this.get(`/quizzes/topic/${topicId}/all`, token);
  },

  async getAllQuizzesForTopicSlug(slug: string, token: string) {
    return this.get(`/quizzes/topic/slug/${slug}/all`, token);
  },

  async getNextAvailableQuiz(topicId: string, token: string) {
    logger.warn('DEPRECATED: Use getNextAvailableQuizBySlug instead');
    return this.get(`/quizzes/topic/${topicId}/next`, token);
  },

  async getNextAvailableQuizBySlug(slug: string, token: string) {
    return this.get(`/quizzes/topic/slug/${slug}/next`, token);
  },

  async getQuiz(id: string, token: string) {
    return this.get(`/quizzes/${id}`, token);
  },

  // Tests - new endpoints
  async getTestsByLevel(levelId: string, token: string) {
    try {
      logger.debug(`Fetching tests for level ${levelId} using endpoint /quizzes/levels/:levelId`);
      
      // Use the correct endpoint identified from backend route definitions
      const tests = await this.get(`/quizzes/levels/${levelId}`, token);
      
      // If the response is null/undefined, return an empty array
      if (!tests) {
        logger.debug(`No tests found for level ${levelId}, returning empty array`);
        return [];
      }
      
      // Ensure response is an array
      const testsArray = Array.isArray(tests) ? tests : [tests];
      logger.debug(`Found ${testsArray.length} tests for level ${levelId}`);
      
      return testsArray;
    } catch (error) {
      logger.error(`Error fetching tests for level ${levelId}:`, error);
      // Return empty array instead of throwing to avoid breaking UI
      return [];
    }
  },

  // New function that can handle both quizzes and tests
  async createAssessment(data: {
    name: string;
    description?: string;
    topicId?: string;
    levelId?: string;
    assessmentType: 'QUIZ' | 'TEST';
    passingScore?: number;
    estimatedTime?: number | undefined;
    orderNum?: number | undefined;
  }, token: string) {
    return this.post('/quizzes', data, token);
  },

  // Update existing createQuiz to use createAssessment
  async createQuiz(data: {
    name: string;
    description?: string;
    topicId: string;
    passingScore?: number;
    estimatedTime?: number | undefined;
    orderNum?: number | undefined;
    problems?: any[];
  }, token: string) {
    // Add assessmentType to ensure backward compatibility
    return this.createAssessment({
      ...data,
      assessmentType: 'QUIZ'
    }, token);
  },

  // Add updateAssessment to handle both quizzes and tests
  async updateAssessment(id: string, data: {
    name: string;
    description?: string;
    topicId?: string;
    levelId?: string;
    assessmentType?: 'QUIZ' | 'TEST';
    passingScore?: number;
    estimatedTime?: number | undefined;
    orderNum?: number | undefined;
  }, token: string) {
    return this.put(`/quizzes/${id}`, data, token);
  },

  // Update existing updateQuiz to use updateAssessment
  async updateQuiz(id: string, data: {
    name: string;
    description?: string;
    topicId: string;
    passingScore?: number;
    estimatedTime?: number | undefined;
    orderNum?: number | undefined;
    problems?: any[];
  }, token: string) {
    // Add assessmentType to ensure backward compatibility
    return this.updateAssessment(id, {
      ...data,
      assessmentType: 'QUIZ'
    }, token);
  },

  // Shorthand for creating/updating tests
  async createTest(data: {
    name: string;
    description?: string;
    levelId: string;
    passingScore?: number;
    estimatedTime?: number | undefined;
    orderNum?: number | undefined;
  }, token: string) {
    return this.createAssessment({
      ...data,
      assessmentType: 'TEST'
    }, token);
  },

  async updateTest(id: string, data: {
    name: string;
    description?: string;
    levelId: string;
    passingScore?: number;
    estimatedTime?: number | undefined;
    orderNum?: number | undefined;
  }, token: string) {
    return this.updateAssessment(id, {
      ...data,
      assessmentType: 'TEST'
    }, token);
  },

  async validateQuiz(data: {
    name: string;
    description?: string;
    topicId: string;
    passingScore?: number;
    estimatedTime?: number | undefined;
    orderNum?: number | undefined;
    problems?: any[];
  }, token: string) {
    return this.post('/quizzes/validate', data, token);
  },

  // New method to validate tests
  async validateTest(data: {
    name: string;
    description?: string;
    levelId: string;
    passingScore?: number;
    estimatedTime?: number | undefined;
    orderNum?: number | undefined;
    problems?: any[];
    assessmentType: 'TEST';
  }, token: string) {
    return this.post('/quizzes/validate', {
      ...data,
      assessmentType: 'TEST' // Ensure this is set
    }, token);
  },

  async deleteQuiz(id: string, token: string) {
    return this.delete(`/quizzes/${id}`, token);
  },

  // Quiz Question Management
  async getQuizQuestions(quizId: string, token: string) {
    return this.get(`/quizzes/${quizId}/questions`, token);
  },

  async getQuizQuestion(questionId: string, token: string) {
    return this.get(`/quizzes/questions/${questionId}`, token);
  },

  async createQuizQuestion(quizId: string, data: any, token: string) {
    return this.post(`/quizzes/${quizId}/questions`, data, token);
  },

  async updateQuizQuestion(questionId: string, data: any, token: string) {
    return this.put(`/quizzes/questions/${questionId}`, data, token);
  },

  // Add a new function specifically for updating Test questions
  async updateTestQuestion(questionId: string, data: any, token: string) {
    return this.put(`/quizzes/questions/${questionId}`, data, token);
  },

  async deleteQuizQuestion(questionId: string, token: string) {
    return this.delete(`/quizzes/questions/${questionId}`, token);
  },

  /**
   * Fetches the structure (metadata and questions) of a quiz or test.
   * Used primarily for loading the assessment before an attempt starts.
   */
  async getAssessmentStructure(assessmentId: string, token: string, assessmentType: 'QUIZ' | 'TEST' = 'QUIZ') {
    logger.debug(`[API] Fetching assessment structure for ${assessmentType} ID: ${assessmentId}`);
    try {
      const endpoint = `/quizzes/${assessmentId}/attempt?assessmentType=${assessmentType}`;
      const data = await this.get(endpoint, token);
      logger.debug(`[API] Received assessment structure for ${assessmentId}:`, data);
      return data;
    } catch (error) {
      logger.error(`[API] Error fetching structure for ${assessmentType} ${assessmentId}:`, error);
      throw error;
    }
  },

  // Quiz attempt and response management
  async getAttemptDetails(attemptId: string, token: string) {
    try {
      logger.debug(`Fetching attempt details for ID ${attemptId}`);
      const endpoint = `/quizzes/attempts/${attemptId}`;
      const data = await this.get(endpoint, token);
      logger.debug(`Received attempt details for ${attemptId}:`, data);
      return data;
    } catch (error) {
      logger.error(`Error fetching attempt details for ${attemptId}:`, error);
      throw error;
    }
  },

  async getQuizAttempt(attemptId: string, token: string) {
    return this.get(`/quizzes/attempts/${attemptId}`, token);
  },

  async submitQuizResponse(
    attemptId: string, 
    questionId: string, 
    responseData: any, 
    token: string
  ) {
    return this.post(
      `/quizzes/attempts/${attemptId}/responses/${questionId}`, 
      responseData, 
      token
    );
  },

  async getQuizAttemptResults(attemptId: string, token: string) {
    return this.get(`/quizzes/attempts/${attemptId}/results`, token);
  },

  async getQuizResults(attemptId: string, token: string) {
    logger.debug(`Fetching quiz results for attempt: ${attemptId}`);
    try {
      // First, get the basic attempt results
      const attemptResults = await this.get(`/quizzes/attempts/${attemptId}/results`, token);
      logger.debug('Quiz results API response:', attemptResults);
      
      // If there's no quiz ID in the response, try to get the attempt first
      if (!attemptResults.quizId) {
        try {
          const attempt = await this.get(`/quizzes/attempts/${attemptId}`, token);
          if (attempt && attempt.quizId) {
            attemptResults.quizId = attempt.quizId;
            logger.debug(`Found quiz ID from attempt: ${attempt.quizId}`);
          }
        } catch (attemptError) {
          logger.warn('Could not fetch attempt to get quiz ID:', attemptError);
        }
      }
      
      // If we have a quiz ID but no quiz object, fetch the quiz details
      if (attemptResults.quizId && !attemptResults.quiz) {
        try {
          // Get the quiz type from the attempt or default to QUIZ
          const quizType = attemptResults.quiz?.assessmentType || 'QUIZ';
          
          // Fetch detailed quiz data including questions
          const quizDetails = await this.get(
            `/quizzes/${attemptResults.quizId}?details=true&assessmentType=${quizType}`, 
            token
          );
          
          if (quizDetails) {
            attemptResults.quiz = quizDetails;
            logger.debug('Enriched results with quiz details');
          }
        } catch (quizError) {
          logger.warn('Could not fetch quiz details:', quizError);
        }
      }
      
      return attemptResults;
    } catch (error) {
      logger.error('Error fetching quiz results:', error);
      throw error;
    }
  },

  // Quiz history endpoints
  async getQuizAttemptsByTopic(topicId: string, token: string) {
    try {
      return this.get(`/quizzes/topic/${topicId}/attempts`, token);
    } catch (error) {
      logger.error('Error fetching quiz attempts by topic:', error);
      throw error;
    }
  },

  // Get all quiz attempts for a topic by the current user using the topic slug
  async getQuizAttemptsByTopicSlug(slug: string, token: string) {
    logger.debug("api.ts: getQuizAttemptsByTopicSlug", slug);
    return this.get(`/quizzes/topic/slug/${slug}/attempts`, token);
  },

  // Get all test attempts for a level by the current user
  async getTestAttemptsForLevel(levelId: string, token: string) {
    logger.debug("api.ts: getTestAttemptsForLevel", levelId);
    return this.get(`/quizzes/levels/${levelId}/attempts`, token);
  },

  // Get all levels (learning path structure)
  async getLevels(token: string) {
    try {
      const data = await this.get('/learning/levels', token);
      return Array.isArray(data) ? data : [];
    } catch (error) {
      logger.error("Error fetching levels:", error);
      return []; // Return empty array on error
    }
  },
  
  async getTopics(levelId: string, token: string) {
    return this.get(`/levels/${levelId}/topics`, token);
  },
  
  // Get next recommended quiz for a topic using slug
  async getNextQuizForTopic(topicSlug: string, token: string | null): Promise<{ nextAssessmentId: string | null, message?: string }> {
    logger.debug("api.ts: getNextQuizForTopic by slug", topicSlug);
    try {
      const result = await this.get(`/quizzes/topic/slug/${topicSlug}/next-quiz`, token);
      return result || { nextAssessmentId: null, message: 'No response from server.' };
    } catch (error) {
      logger.error(`Error fetching next quiz for topic slug ${topicSlug}:`, error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to find next quiz.';
      return { nextAssessmentId: null, message: errorMessage };
    }
  },
  
  // Get next recommended test for a level
  async getNextTestForLevel(levelId: string, token: string | null): Promise<{ nextAssessmentId: string | null, message?: string }> {
    logger.debug("api.ts: getNextTestForLevel", levelId);
    try {
      const result = await this.get(`/quizzes/level/${levelId}/next-test`, token);
      // Provide a default message if the server returns null ID but no message
      if (result && result.nextAssessmentId === null && !result.message) {
        return { nextAssessmentId: null, message: 'No further tests available or all completed.' };
      }
      return result || { nextAssessmentId: null, message: 'No response from server.' };
    } catch (error) {
      logger.error(`Error fetching next test for level ${levelId}:`, error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to find next test.';
      return { nextAssessmentId: null, message: errorMessage };
    }
  },

  // Spaced Repetition
  async getReviewItems(token: string) {
    return this.get('/spaced-repetition/review', token);
  },

  // Specific Delete Helpers
  async deleteQuizAttempt(attemptId: string, token: string) {
    logger.debug(`[API] Deleting quiz attempt: ${attemptId}`);
    return this.delete(`/quizzes/attempts/${attemptId}`, token);
  },

  async deleteTestAttempt(attemptId: string, token: string) {
    logger.debug(`[API] Deleting test attempt: ${attemptId}`);
    // Assuming a similar endpoint structure for tests
    return this.delete(`/tests/attempts/${attemptId}`, token);
  },

  async submitCompleteQuiz(
    quizId: string,
    startedAt: string,
    answers: Record<string, any>,
    token: string
  ) {
    logger.debug('API - submitCompleteQuiz called:', { 
      quizId, 
      startedAt,
      answersCount: Object.keys(answers).length 
    });
    
    try {
      const endpoint = `/quizzes/${quizId}/submit`;
      logger.debug(`Making POST request to ${endpoint}`);
      
      const result = await this.post(
        endpoint,
        { startedAt, answers },
        token
      );
      
      logger.debug('submitCompleteQuiz API response:', result);
      return result;
    } catch (error) {
      logger.error('submitCompleteQuiz failed:', error);
      // Rethrow the error to be handled by the caller
      throw error;
    }
  },

  // Get submissions for a problem
  async getProblemSubmissions(problemId: string, token: string) {
    try {
      return await this.get(`/problems/${problemId}/submissions`, token);
    } catch (error) {
      logger.error('Failed to fetch problem submissions:', error);
      throw error;
    }
  },

  // Get a single submission with full details
  async getSubmissionDetails(submissionId: string, token: string) {
    try {
      return await this.get(`/problems/submissions/${submissionId}`, token);
    } catch (error) {
      logger.error('Failed to fetch submission details:', error);
      throw error;
    }
  },
};

export const getProblem = async (problemId: string) => {
  return request(`problems/${problemId}`);
};

/**
 * Fetch a specific quiz/test attempt by its ID.
 */
export const getQuizAttempt = async (attemptId: string, token: string | null) => {
  if (!attemptId) {
    logger.error('[API Client] getQuizAttempt requires an attemptId');
    throw new Error('Attempt ID is required to fetch quiz/test attempt details.');
  }
  logger.debug(`[API Client] Fetching attempt details for ID: ${attemptId}`);
  return await request(`/quizzes/attempts/${attemptId}`, {
    method: 'GET',
    token: token,
  });
};

/**
 * Complete a quiz/test attempt.
 */
// ... existing completeQuizAttempt function ... 