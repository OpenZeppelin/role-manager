/**
 * Hash detection and formatting utilities
 *
 * Provides functions for detecting and handling blockchain hash values
 * (bytes32, hex strings, etc.) for display purposes.
 *
 * Note: truncateMiddle from @openzeppelin/ui-utils should be used
 * for truncating hashes for display.
 */

/**
 * Check if a string is a hash (bytes32 hex string or starts with 0x).
 * Used to determine if a role identifier should be displayed as-is (hash fallback)
 * or processed for human-readable display.
 *
 * Per US4.3: "the role ID hash is shown as a fallback" when name unavailable.
 *
 * @param value - The string to check
 * @returns true if the value appears to be a hash
 *
 * @example
 * isHash('0xabc123...') // true
 * isHash('0x0000000000000000000000000000000000000000000000000000000000000000') // true
 * isHash('ADMIN_ROLE') // false
 * isHash('admin') // false
 */
export function isHash(value: string): boolean {
  // Check if it starts with 0x (common hex prefix)
  if (value.startsWith('0x')) {
    return true;
  }
  // Check if it's a long hex string (32+ chars) without 0x prefix
  // bytes32 is 64 hex characters
  if (value.length >= 32 && /^[0-9a-fA-F]+$/.test(value)) {
    return true;
  }
  return false;
}
