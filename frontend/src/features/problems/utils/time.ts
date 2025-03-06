/**
 * Formats a time duration in minutes into a human-readable string
 * @param time - Time in minutes
 * @returns Formatted string (e.g., "30m", "2h 30m", "2h")
 */
export const formatEstimatedTime = (time?: number): string | null => {
  if (!time) return null;
  if (time < 60) return `${time}m`;
  const hours = Math.floor(time / 60);
  const minutes = time % 60;
  return minutes ? `${hours}h ${minutes}m` : `${hours}h`;
}; 