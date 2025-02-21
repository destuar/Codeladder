declare global {
  interface Window {
    RUNTIME_CONFIG: {
      API_URL: string;
      ENV: string;
    };
  }
}

// Debug logging helper
const debug = {
  log: (...args: any[]) => {
    if (window.RUNTIME_CONFIG.ENV !== 'production') {
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

// Simplify BASE_URL handling to always use relative paths
const BASE_URL = '/api';

interface RequestOptions extends RequestInit {
  token?: string | null;
}

interface ApiError extends Error {
  status?: number;
}

const API_URL = window.RUNTIME_CONFIG?.API_URL || '/api';

async function request(endpoint: string, options: RequestOptions = {}) {
  const { token, ...customOptions } = options;
  const authToken = token || localStorage.getItem('token');

  const headers = new Headers(customOptions.headers);
  headers.set('Content-Type', 'application/json');
  
  if (authToken) {
    headers.set('Authorization', `Bearer ${authToken}`);
    debug.log('Added auth token to request');
  }

  // URL construction with logging
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
  debug.log('Cleaned endpoint:', cleanEndpoint);
  
  const cleanBaseUrl = BASE_URL.endsWith('/') ? BASE_URL.slice(0, -1) : BASE_URL;
  debug.log('Cleaned base URL:', cleanBaseUrl);
  
  const url = `${cleanBaseUrl}/${cleanEndpoint}`;
  debug.log('Final URL:', url);

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

    // Log the complete response
    debug.response(url, response, data);

    if (response.status === 401) {
      debug.error('Unauthorized request:', url);
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
};

export const getProblem = async (problemId: string) => {
  return request(`problems/${problemId}`);
}; 