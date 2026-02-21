/**
 * Delay formatting utilities
 * Feature: 017-evm-access-control (T065, US7)
 *
 * Format admin transfer delay for display. formatSecondsToReadable lives in @openzeppelin/ui-utils.
 */

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
