/**
 * Format a value for display in the UI
 * Handles various data types appropriately (arrays, objects, strings, etc.)
 * @param value The value to format
 * @returns Formatted string representation
 */
export function formatValue(value: any): string {
  if (value === null) return 'null';
  if (value === undefined) return 'undefined';
  
  // Handle different types
  if (typeof value === 'string') {
    // For strings, show quotes and escape special characters
    return `"${value.replace(/"/g, '\\"')}"`;
  }
  
  if (typeof value === 'number' || typeof value === 'boolean') {
    return value.toString();
  }
  
  if (Array.isArray(value)) {
    // Format arrays recursively
    const formattedItems = value.map(item => formatValue(item));
    return `[${formattedItems.join(', ')}]`;
  }
  
  if (typeof value === 'object') {
    try {
      // Try to use JSON.stringify with indentation for complex objects
      return JSON.stringify(value, null, 2);
    } catch (e) {
      return String(value);
    }
  }
  
  // Fallback for any other type
  return String(value);
}

/**
 * Format test case inputs for display
 * @param inputs Array of inputs
 * @returns Formatted string representation
 */
export function formatInputs(inputs: any[]): string {
  if (!inputs || inputs.length === 0) return '()';
  
  return `(${inputs.map(formatValue).join(', ')})`;
}

/**
 * Format runtime for display
 * @param ms Runtime in milliseconds
 * @returns Formatted string with units
 */
export function formatRuntime(ms: number): string {
  if (ms < 1) return '<1 ms';
  if (ms < 1000) return `${Math.round(ms)} ms`;
  return `${(ms / 1000).toFixed(2)} s`;
}

/**
 * Format memory usage for display
 * @param kb Memory usage in KB
 * @returns Formatted string with units
 */
export function formatMemory(kb: number): string {
  if (kb < 1000) return `${Math.round(kb)} KB`;
  return `${(kb / 1024).toFixed(2)} MB`;
}

/**
 * Format execution time in milliseconds to a readable format
 * 
 * @param ms Time in milliseconds
 * @returns Formatted time string
 */
export function formatExecutionTime(ms: number): string {
  if (ms < 1) return '<1 ms';
  if (ms < 1000) return `${Math.round(ms)} ms`;
  return `${(ms / 1000).toFixed(2)} s`;
}

/**
 * Format memory usage in kilobytes to a readable format
 * 
 * @param kb Memory in kilobytes
 * @returns Formatted memory string
 */
export function formatMemoryUsage(kb: number): string {
  if (kb < 1000) return `${Math.round(kb)} KB`;
  return `${(kb / 1024).toFixed(2)} MB`;
} 