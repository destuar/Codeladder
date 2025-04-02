/**
 * @file frontend/src/features/admin/utils/judge0Diagnostics.ts
 * 
 * Judge0 CE Diagnostics Utility
 * Provides functions for checking Judge0 connectivity and health status
 */

import { api } from '../../../lib/api';

export interface Judge0HealthResponse {
  success: boolean;
  message: string;
  details?: {
    status: {
      id: number;
      description: string;
    };
    output: string;
    error?: string;
    compilationOutput?: string;
    executionTime?: number;
    memory?: number;
    exitCode?: number;
  };
}

/**
 * Check Judge0 CE health status
 * 
 * @returns Judge0 health status and diagnostic information
 * @throws Error if the request fails
 */
export const checkJudge0Health = async (): Promise<Judge0HealthResponse> => {
  try {
    // Get current auth token
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('Authentication required');
    }
    
    // Call the health check endpoint
    const response = await api.get('code/health', token);
    return response;
  } catch (error) {
    console.error('Judge0 health check failed:', error);
    
    // Rethrow with meaningful message
    if (error instanceof Error) {
      throw new Error(`Judge0 health check failed: ${error.message}`);
    }
    throw new Error('Judge0 health check failed: Unknown error');
  }
};

/**
 * Extract technical details from a Judge0 health check response
 * 
 * @param response Judge0 health check response
 * @returns Formatted technical details as string
 */
export const formatJudge0DiagnosticInfo = (response: Judge0HealthResponse): string => {
  if (!response.details) {
    return 'No diagnostic information available';
  }
  
  const { status, output, error, compilationOutput, executionTime, memory, exitCode } = response.details;
  
  // Build formatted diagnostic info
  return `
Status: ${status.id} (${status.description})
Output: ${output || 'None'}
${error ? `Error: ${error}` : ''}
${compilationOutput ? `Compilation output: ${compilationOutput}` : ''}
Execution time: ${executionTime !== undefined ? `${executionTime}s` : 'N/A'}
Memory usage: ${memory !== undefined ? `${memory}KB` : 'N/A'}
Exit code: ${exitCode !== undefined ? exitCode : 'N/A'}
`.trim();
}; 