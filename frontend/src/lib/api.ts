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
  console.warn('[API Client] window.ENV not found, using defaults');
}

// Debug logging helper
const debug = {
  log: (...args: any[]) => {
    if (window.ENV?.NODE_ENV !== 'production') {
      console.log('[API Client]', ...args);
    }
  },
  error: (...args: any[]) => console.error('[API Client Error]', ...args),
  request: (method: string, url: string, options: any) => {
    debug.log(`🚀 ${method} Request:`, {
      url,
      headers: Object.fromEntries(options.headers.entries()),
      body: options.body ? JSON.parse(options.body) : undefined,
      credentials: options.credentials
    });
  },
  response: (url: string, response: Response, data: any) => {
    debug.log(`📥 Response from ${url}:`, {
      status: response.status,
      statusText: response.statusText,
      headers: Object.fromEntries(response.headers.entries()),
      data
    });
  }
};

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

  // Add token debugging
  debug.log('Token being used:', authToken ? 'Present' : 'Missing', {
    fromOptions: !!token,
    fromLocalStorage: !!localStorage.getItem('token')
  });

  const headers = new Headers(customOptions.headers);
  headers.set('Content-Type', 'application/json');
  
  if (authToken) {
    headers.set('Authorization', `Bearer ${authToken}`);
    debug.log('Added auth token to request');
  }

  // Ensure endpoint doesn't start with a slash if it's not meant to be at the root
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
  const baseUrl = getBaseUrl();
  const url = `${baseUrl}/${cleanEndpoint}`.replace(/\/+/g, '/');

  console.log(`Making ${options.method || 'GET'} request to: ${url}`, {
    method: options.method || 'GET',
    token: authToken ? 'Present' : 'Missing',
    body: customOptions.body ? JSON.parse(customOptions.body as string) : null
  });

  // Log the complete request
  debug.request(options.method || 'GET', url, {
    ...customOptions,
    headers,
    credentials: 'include'
  });

  try {
    console.log(`Sending fetch request to ${url}...`);
    const response = await fetch(url, {
      ...customOptions,
      headers,
      credentials: 'include'
    });
    console.log(`Received response from ${url}, status: ${response.status}`);

    let data;
    try {
      data = await response.json();
      console.log(`Successfully parsed JSON response from ${url}`);
    } catch (e) {
      console.warn(`Response from ${url} is not JSON:`, e);
      // Don't try to read response.text() after response.json() failed
      // as the body stream can only be read once
      console.log(`Response status: ${response.status}, text: [Cannot read body again]`);
      data = null;
    }

    // Add response debugging
    debug.log('Response headers:', {
      ...Object.fromEntries(response.headers.entries())
    });

    console.log(`Response from ${url}:`, {
      status: response.status,
      ok: response.ok,
      data
    });

    if (response.status === 401) {
      debug.error('Unauthorized request:', url, {
        responseData: data,
        headers: Object.fromEntries(headers.entries())
      });
      throw new Error('Unauthorized');
    }

    if (!response.ok) {
      if (data?.error) {
        const errorMessage = Array.isArray(data.error) 
          ? data.error.map((e: any) => e.message || e).join(', ')
          : data.error;
        debug.error('API Error:', {
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
      debug.error('HTTP Error:', {
        url,
        status: response.status,
        statusText: response.statusText,
        responseData: data || null
      });
      const error = new Error(`HTTP error! status: ${response.status}`) as ApiError;
      error.status = response.status;
      error.url = url;
      throw error;
    }

    return data;
  } catch (error) {
    debug.error('Request failed:', {
      url,
      method: options.method || 'GET',
      error: error instanceof Error ? {
        message: error.message,
        stack: error.stack,
        name: error.name
      } : 'Unknown error'
    });
    throw error;
  }
}

export const api = {
  async get(endpoint: string, token?: string | null) {
    return request(endpoint, { token });
  },

  async post(endpoint: string, data: any, token?: string | null) {
    debug.log(`API POST request to ${endpoint}`, data);
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
    return this.post('/learning/levels', data, token);
  },

  async deleteProblem(id: string, token: string) {
    return this.delete(`/learning/problems/${id}`, token);
  },

  // Quiz management
  async getQuizzesByTopic(topicId: string, token: string) {
    console.warn('DEPRECATED: Use getQuizzesByTopicSlug instead');
    return this.get(`/quizzes/topic/${topicId}`, token);
  },

  async getQuizzesByTopicSlug(slug: string, token: string) {
    return this.get(`/quizzes/topic/slug/${slug}`, token);
  },

  async getAllQuizzesForTopic(topicId: string, token: string) {
    console.warn('DEPRECATED: Use getAllQuizzesForTopicSlug instead');
    return this.get(`/quizzes/topic/${topicId}/all`, token);
  },

  async getAllQuizzesForTopicSlug(slug: string, token: string) {
    return this.get(`/quizzes/topic/slug/${slug}/all`, token);
  },

  async getNextAvailableQuiz(topicId: string, token: string) {
    console.warn('DEPRECATED: Use getNextAvailableQuizBySlug instead');
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
      console.log(`Fetching tests for level ${levelId} using endpoint /quizzes/levels/:levelId`);
      
      // Use the correct endpoint identified from backend route definitions
      const tests = await this.get(`/quizzes/levels/${levelId}`, token);
      
      // If the response is null/undefined, return an empty array
      if (!tests) {
        console.log(`No tests found for level ${levelId}, returning empty array`);
        return [];
      }
      
      // Ensure response is an array
      const testsArray = Array.isArray(tests) ? tests : [tests];
      console.log(`Found ${testsArray.length} tests for level ${levelId}`);
      
      return testsArray;
    } catch (error) {
      console.error(`Error fetching tests for level ${levelId}:`, error);
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

  async deleteQuizQuestion(questionId: string, token: string) {
    return this.delete(`/quizzes/questions/${questionId}`, token);
  },

  async getQuizForAttempt(quizId: string, token: string, assessmentType: 'QUIZ' | 'TEST' = 'QUIZ') {
    try {
      console.log(`Fetching ${assessmentType.toLowerCase()} data for attempt with ID ${quizId}`);
      
      // Add assessment type as a query parameter to help the backend distinguish between quizzes and tests
      const endpoint = `/quizzes/${quizId}/attempt?assessmentType=${assessmentType}`;
      const data = await this.get(endpoint, token);
      
      // Ensure the response has a questions array, even if empty
      if (data && !data.questions) {
        console.warn(`Response for ${assessmentType.toLowerCase()} ${quizId} did not include questions array:`, data);
        data.questions = [];
      }
      
      // If questions exist, log them for debugging
      if (data && data.questions) {
        console.log(`Received ${data.questions.length} questions for ${assessmentType.toLowerCase()} ${quizId}`);
      }
      
      return data;
    } catch (error) {
      console.error(`Error fetching ${assessmentType.toLowerCase()} data for attempt:`, error);
      throw error;
    }
  },

  // Quiz attempt and response management
  async startQuizAttempt(quizId: string, token: string) {
    return this.post(`/quizzes/${quizId}/attempts`, {}, token);
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

  async completeQuizAttempt(attemptId: string, token: string) {
    return this.post(`/quizzes/attempts/${attemptId}/complete`, {}, token);
  },

  // New method to submit entire quiz at once
  async submitCompleteQuiz(
    quizId: string,
    startedAt: string,
    answers: Record<string, any>,
    token: string
  ) {
    console.log('API - submitCompleteQuiz called:', { 
      quizId, 
      startedAt,
      answersCount: Object.keys(answers).length 
    });
    
    try {
      const endpoint = `/quizzes/${quizId}/submit`;
      console.log(`Making POST request to ${endpoint}`);
      
      const result = await this.post(
        endpoint,
        { startedAt, answers },
        token
      );
      
      console.log('submitCompleteQuiz API response:', result);
      return result;
    } catch (error) {
      console.error('submitCompleteQuiz failed:', error);
      // Rethrow the error to be handled by the caller
      throw error;
    }
  },

  async getQuizAttemptResults(attemptId: string, token: string) {
    return this.get(`/quizzes/attempts/${attemptId}/results`, token);
  },

  async getQuizResults(attemptId: string, token: string) {
    console.log(`Fetching quiz results for attempt: ${attemptId}`);
    try {
      const results = await this.get(`/quizzes/attempts/${attemptId}/results`, token);
      console.log('Quiz results API response:', results);
      return results;
    } catch (error) {
      console.error('Error fetching quiz results:', error);
      throw error;
    }
  },

  // Quiz history endpoints
  async getQuizAttemptsByTopic(topicId: string, token: string) {
    try {
      return this.get(`/quizzes/topic/${topicId}/attempts`, token);
    } catch (error) {
      console.error('Error fetching quiz attempts by topic:', error);
      throw error;
    }
  },

  async getQuizAttemptsByTopicSlug(slug: string, token: string) {
    try {
      return this.get(`/quizzes/topic/slug/${slug}/attempts`, token);
    } catch (error) {
      console.error('Error fetching quiz attempts by topic slug:', error);
      throw error;
    }
  },

  // Get test attempts for a specific level
  async getTestAttemptsForLevel(levelId: string, token: string) {
    try {
      console.log(`Fetching test attempts for level ${levelId}`);
      const attempts = await this.get(`/quizzes/levels/${levelId}/attempts`, token);
      return Array.isArray(attempts) ? attempts : [];
    } catch (error) {
      console.error(`Error fetching test attempts for level ${levelId}:`, error);
      return []; // Return empty array on error
    }
  },

  // Learning Path Endpoints
  async getLevels(token: string) {
    console.log("Fetching levels via API client...");
    try {
      const levels = await this.get('/learning/levels', token);
      console.log("Received levels from API:", levels);
      return Array.isArray(levels) ? levels : [];
    } catch (error) {
      console.error("Error in api.getLevels:", error);
      throw error; // Re-throw to be caught by useQuery or caller
    }
  },
  
  async getTopics(levelId: string, token: string) {
    // Note: Depending on backend routes, might need levelId or slug
    return this.get(`/learning/levels/${levelId}/topics`, token);
  },

  // Method to get the next recommended quiz ID for a topic
  async getNextQuizForTopic(topicId: string, token: string | null) {
    try {
      console.log(`[API Client] Fetching next quiz ID for topic ${topicId}`);
      const response = await this.get(`/quizzes/topic/${topicId}/next-quiz`, token);
      // Backend sends { nextAssessmentId: string | null, message?: string }
      if (!response || typeof response.nextAssessmentId === 'undefined') {
        throw new Error('Invalid response structure from next-quiz endpoint');
      }
      if (response.message) {
        console.log(`[API Client] Message from next-quiz: ${response.message}`);
      }
      return response.nextAssessmentId; // Return only the ID (or null)
    } catch (error) {
      console.error(`[API Client] Error fetching next quiz for topic ${topicId}:`, error);
      // Depending on desired behavior, could return null or re-throw
      return null; // Return null on error to prevent breaking navigation
    }
  },

  // Method to get the next recommended test ID for a level
  async getNextTestForLevel(levelId: string, token: string | null) {
    try {
      console.log(`[API Client] Fetching next test ID for level ${levelId}`);
      const response = await this.get(`/quizzes/level/${levelId}/next-test`, token);
      // Backend sends { nextAssessmentId: string | null, message?: string }
       if (!response || typeof response.nextAssessmentId === 'undefined') {
        throw new Error('Invalid response structure from next-test endpoint');
      }
       if (response.message) {
        console.log(`[API Client] Message from next-test: ${response.message}`);
      }
      return response.nextAssessmentId; // Return only the ID (or null)
    } catch (error) {
      console.error(`[API Client] Error fetching next test for level ${levelId}:`, error);
       // Depending on desired behavior, could return null or re-throw
      return null; // Return null on error
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
    console.error('[API Client] getQuizAttempt requires an attemptId');
    throw new Error('Attempt ID is required to fetch quiz/test attempt details.');
  }
  console.log(`[API Client] Fetching attempt details for ID: ${attemptId}`);
  return await request(`/quizzes/attempts/${attemptId}`, {
    method: 'GET',
    token: token,
  });
};

/**
 * Complete a quiz/test attempt.
 */
// ... existing completeQuizAttempt function ... 