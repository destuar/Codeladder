/**
 * Formats estimated time in minutes to a human-readable string
 */
export function formatEstimatedTime(minutes: number | null | undefined): string | null {
  if (!minutes) return null;
  
  if (minutes < 60) {
    return `${minutes} min`;
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  if (remainingMinutes === 0) {
    return `${hours}h`;
  }
  return `${hours}h ${remainingMinutes}m`;
} 