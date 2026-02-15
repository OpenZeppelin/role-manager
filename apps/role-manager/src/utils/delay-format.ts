/**
 * Delay formatting utilities
 * Feature: 017-evm-access-control (T065, US7)
 *
 * Format admin transfer delay (seconds) for display.
 */

/**
 * Format seconds into a human-readable string (e.g. "1 day", "24 hours", "30 minutes").
 */
export function formatSecondsToReadable(seconds: number): string {
  if (seconds <= 0 || !Number.isFinite(seconds)) {
    return '0 seconds';
  }
  if (seconds < 60) {
    return seconds === 1 ? '1 second' : `${seconds} seconds`;
  }
  if (seconds < 3600) {
    const mins = Math.floor(seconds / 60);
    return mins === 1 ? '1 minute' : `${mins} minutes`;
  }
  if (seconds < 86400) {
    const hours = Math.floor(seconds / 3600);
    return hours === 1 ? '1 hour' : `${hours} hours`;
  }
  const days = Math.floor(seconds / 86400);
  return days === 1 ? '1 day' : `${days} days`;
}

/**
 * Format a UNIX timestamp (seconds) as a locale date/time string.
 */
export function formatEffectAtDate(effectAt: number): string {
  const date = new Date(effectAt * 1000);
  return date.toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}
