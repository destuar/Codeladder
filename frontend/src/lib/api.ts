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
}

const getBaseUrl = () => {
  // In both dev and prod, we'll use relative /api path
  // Vite handles proxying in dev, nginx handles it in prod
  return '/api';
};

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

  const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
  const baseUrl = getBaseUrl();
  const url = `${baseUrl}/${cleanEndpoint}`.replace(/\/+/g, '/');

  debug.log(`Making ${options.method || 'GET'} request to:`, url);

  // Log the complete request
  debug.request(options.method || 'GET', url, {
    ...customOptions,
    headers,
    credentials: 'include'
  });

  try {
    const response = await fetch(url, {
      ...customOptions,
      headers,
      credentials: 'include'
    });

    const data = await response.json().catch(() => {
      debug.log('No JSON response body');
      return null;
    });

    // Add response debugging
    debug.log('Response headers:', {
      ...Object.fromEntries(response.headers.entries())
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
          message: errorMessage
        });
        const error = new Error(errorMessage) as ApiError;
        error.status = response.status;
        throw error;
      }
      debug.error('HTTP Error:', {
        url,
        status: response.status,
        statusText: response.statusText
      });
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return data;
  } catch (error) {
    debug.error('Request failed:', {
      url,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    throw error;
  }
}

export const api = {
  async get(endpoint: string, token?: string | null) {
    return request(endpoint, { token });
  },

  async post(endpoint: string, data: any, token?: string | null) {
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
  }
};

export const getProblem = async (problemId: string) => {
  return request(`problems/${problemId}`);
}; 