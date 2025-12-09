/**
 * Date Formatting Utilities
 *
 * Common date formatting functions for consistent display across the application.
 */

/**
 * Format ISO date string to M/D/YYYY format
 * @param isoString - ISO 8601 date string (e.g., "2024-11-15T10:30:00Z")
 * @returns Formatted date string (e.g., "11/15/2024") or empty string if invalid
 */
export function formatDate(isoString: string): string {
  if (!isoString) return '';
  const date = new Date(isoString);
  if (isNaN(date.getTime())) return '';
  return `${date.getMonth() + 1}/${date.getDate()}/${date.getFullYear()}`;
}

/**
 * Format ISO date string to M/D/YYYY, h:mm AM/PM format
 * @param isoString - ISO 8601 date string (e.g., "2024-11-15T10:30:00Z")
 * @returns Formatted date/time string in the user's local timezone (e.g., "11/15/2024, 10:30 AM") or empty string if invalid
 * @note The output time depends on the user's local timezone settings
 */
export function formatDateTime(isoString: string): string {
  if (!isoString) return '';
  const date = new Date(isoString);
  if (isNaN(date.getTime())) return '';

  const dateStr = `${date.getMonth() + 1}/${date.getDate()}/${date.getFullYear()}`;
  const timeStr = date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });

  return `${dateStr}, ${timeStr}`;
}
