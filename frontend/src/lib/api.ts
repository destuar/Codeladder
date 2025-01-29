const API_URL = 'http://localhost:8000/api';

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

  try {
    const response = await fetch(`${API_URL}${endpoint}`, config);
    const data = await response.json();

    if (!response.ok) {
      console.error('API Error:', {
        status: response.status,
        statusText: response.statusText,
        data
      });
      const error = new Error(data.error || 'API Error') as ApiError;
      error.status = response.status;
      throw error;
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
  get: (endpoint: string, token?: string | null) => 
    request(endpoint, { method: 'GET', token }),

  post: (endpoint: string, data: unknown, token?: string | null) =>
    request(endpoint, {
      method: 'POST',
      body: JSON.stringify(data),
      token,
    }),

  put: (endpoint: string, data: unknown, token?: string | null) =>
    request(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data),
      token,
    }),

  delete: (endpoint: string, token?: string | null) =>
    request(endpoint, { method: 'DELETE', token }),
}; 