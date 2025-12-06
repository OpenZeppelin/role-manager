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
