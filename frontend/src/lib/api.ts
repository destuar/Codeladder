const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

interface RequestOptions extends RequestInit {
  token?: string | null;
}

interface ApiError extends Error {
  status?: number;
}

async function request(endpoint: string, options: RequestOptions = {}) {
  const { token, ...customOptions } = options;

  const headers = new Headers(customOptions.headers);
  headers.set('Content-Type', 'application/json');

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const config: RequestInit = {
    ...customOptions,
    headers,
    credentials: 'include',
  };

  console.log(`Making ${config.method || 'GET'} request to ${endpoint}`, {
    headers: Object.fromEntries(headers.entries()),
    body: config.body,
  });

  try {
    const response = await fetch(`${BASE_URL}${endpoint}`, config);
    console.log(`Response from ${endpoint}:`, {
      status: response.status,
      statusText: response.statusText,
      headers: Object.fromEntries(response.headers.entries()),
    });
    
    const data = await response.json().catch(() => null);
    console.log(`Response data from ${endpoint}:`, data);

    // Handle 401 by throwing a specific error
    if (response.status === 401) {
      throw new Error('Unauthorized');
    }

    if (!response.ok) {
      console.error('API Error:', {
        endpoint,
        status: response.status,
        statusText: response.statusText,
        data
      });
      
      if (data?.error) {
        const error = new Error(
          Array.isArray(data.error) 
            ? data.error.map((e: any) => e.message || e).join(', ')
            : data.error
        ) as ApiError;
        error.status = response.status;
        throw error;
      }
      
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return data;
  } catch (error) {
    console.error('Request failed:', error);
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Network error');
  }
}

export const api = {
  async get(endpoint: string, token?: string | null) {
    return request(endpoint, {
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      credentials: 'include',
    });
  },

  async post(endpoint: string, data: any, token?: string | null) {
    return request(endpoint, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      body: JSON.stringify(data),
      credentials: 'include',
    });
  },

  async put(endpoint: string, data: any, token?: string | null) {
    return request(endpoint, {
      method: 'PUT',
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      body: JSON.stringify(data),
      credentials: 'include',
    });
  },

  async delete(endpoint: string, token?: string | null) {
    return request(endpoint, {
      method: 'DELETE',
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      credentials: 'include',
    });
  },
};

export const getProblem = async (problemId: string) => {
  const response = await fetch(`${BASE_URL}/api/problems/${problemId}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error('Failed to fetch problem');
  }

  return response.json();
}; 