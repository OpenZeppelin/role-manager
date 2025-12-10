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

/**
 * Format a Date to ISO8601 string without timezone (YYYY-MM-DDTHH:mm:ss)
 * Used for API query parameters that expect local datetime strings.
 *
 * By default, sets time to start of day (00:00:00) for consistent filtering.
 * When endOfDay is true, sets time to 23:59:59 to include all events on that day.
 *
 * @param date - The date to format
 * @param endOfDay - If true, sets time to 23:59:59; if false, sets to 00:00:00
 * @returns ISO8601 formatted string without timezone (e.g., "2024-12-05T00:00:00")
 */
export function formatToISOLocalString(date: Date, endOfDay = false): string {
  const pad = (n: number): string => String(n).padStart(2, '0');
  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());

  // Explicitly set start of day (00:00:00) or end of day (23:59:59)
  // This ensures consistent behavior regardless of the input Date's time
  const hours = endOfDay ? '23' : '00';
  const minutes = endOfDay ? '59' : '00';
  const seconds = endOfDay ? '59' : '00';

  return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
}

/**
 * Parse ISO8601 string to Date object
 *
 * @param isoString - ISO8601 date string to parse
 * @returns Date object or undefined if string is empty/invalid
 */
export function parseISOString(isoString?: string): Date | undefined {
  if (!isoString) return undefined;
  const date = new Date(isoString);
  return isNaN(date.getTime()) ? undefined : date;
}
