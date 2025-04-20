/**
 * Clears all session storage keys related to a specific assessment.
 * 
 * @param assessmentId - The ID of the quiz or test to clear.
 * @param type - The type of assessment ('quiz' or 'test').
 */
export const clearAssessmentSession = (assessmentId: string, type: 'quiz' | 'test') => {
  if (!assessmentId) return;
  
  console.log(`Clearing all session data for ${type} ID: ${assessmentId}`);
  
  const prefixes = ['assessment_', `${type}_`, `${type}_attempt_`, `${type}_completed_`];
  const keysToRemove: string[] = [];

  // Find all keys related to this assessmentId
  for (let i = 0; i < sessionStorage.length; i++) {
    const key = sessionStorage.key(i);
    if (key && key.includes(assessmentId)) {
      keysToRemove.push(key);
    }
  }
  
  // Add standard keys even if they don't contain the ID string (like assessment_ overview)
  keysToRemove.push(`assessment_${assessmentId}`);
  keysToRemove.push(`${type}_${assessmentId}`);
  keysToRemove.push(`${type}_attempt_${assessmentId}`);
  keysToRemove.push(`${type}_${assessmentId}_completed`);

  // Remove duplicates and clear
  const uniqueKeys = [...new Set(keysToRemove)];
  uniqueKeys.forEach(key => {
    console.log(`Removing session key: ${key}`);
    sessionStorage.removeItem(key);
  });
  
  console.log(`Finished clearing session data for ${assessmentId}.`);
};

/**
 * Marks an assessment as completed in session storage.
 */
export const markAssessmentCompleted = (assessmentId: string, type: 'quiz' | 'test') => {
  if (!assessmentId) return;
  sessionStorage.setItem(`${type}_${assessmentId}_completed`, 'true');
  console.log(`Marked ${type} ${assessmentId} as completed in session.`);
};

/**
 * Checks if an assessment has been marked as completed in session storage.
 */
export const isAssessmentCompleted = (assessmentId: string, type: 'quiz' | 'test'): boolean => {
  if (!assessmentId) return false;
  return sessionStorage.getItem(`${type}_${assessmentId}_completed`) === 'true';
};

// Add other session-related utilities here if needed 