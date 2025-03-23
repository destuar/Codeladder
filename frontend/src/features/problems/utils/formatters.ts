/**
 * Format a value for display in the UI
 * Handles various data types appropriately (arrays, objects, strings, etc.)
 * @param value The value to format
 * @returns Formatted string representation
 */
export function formatValue(value: any): string {
  // Handle undefined and null
  if (value === undefined) return 'undefined';
  if (value === null) return 'null';
  
  // Handle arrays
  if (Array.isArray(value)) {
    // For empty arrays
    if (value.length === 0) return '[]';
    
    // For long arrays, truncate with ellipsis
    const MAX_ARRAY_ITEMS = 5;
    if (value.length > MAX_ARRAY_ITEMS) {
      const visibleItems = value.slice(0, MAX_ARRAY_ITEMS).map(formatValue).join(', ');
      return `[${visibleItems}, ... ${value.length - MAX_ARRAY_ITEMS} more]`;
    }
    
    // For regular arrays
    return `[${value.map(formatValue).join(', ')}]`;
  }
  
  // Handle objects
  if (typeof value === 'object') {
    try {
      // Format as JSON with some indentation for readability
      return JSON.stringify(value, null, 2)
        // Reduce indentation to save space
        .replace(/\n\s{2}/g, '\n  ');
    } catch (e) {
      return String(value);
    }
  }
  
  // Handle strings
  if (typeof value === 'string') {
    // Show strings with quotes to distinguish from numbers
    if (value.length > 50) {
      return `"${value.substring(0, 47)}..."`;
    }
    return `"${value}"`;
  }
  
  // Handle other primitives
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