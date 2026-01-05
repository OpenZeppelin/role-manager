/**
 * Snapshot utility functions
 * Feature: 007-dashboard-real-data, Phase 6
 *
 * Provides utilities for generating snapshot filenames
 * with truncated addresses and filesystem-safe timestamps.
 */

import { truncateMiddle } from '@openzeppelin/ui-utils';

/**
 * Truncates an address to a shorter format for display and filenames.
 *
 * Uses the format: `{prefix}...{suffix}` (e.g., "GCKF...MTGG")
 * Wraps the `truncateMiddle` utility from @openzeppelin/ui-utils with address-specific defaults.
 *
 * @param address - The full address to truncate
 * @param prefixLen - Number of characters to keep at the start (default: 4)
 * @param suffixLen - Number of characters to keep at the end (default: 4)
 * @returns Truncated address or full address if it's short enough
 *
 * @example
 * ```ts
 * truncateAddress('GCKFBEIYV2U22IO2BJ4KVJOIP7XPWQGQFKKWXR6DOSJBV7STMAQSMTGG')
 * // Returns: 'GCKF...MTGG'
 *
 * truncateAddress('0x1234567890abcdef1234567890abcdef12345678')
 * // Returns: '0x12...5678'
 *
 * truncateAddress('SHORT')
 * // Returns: 'SHORT' (no truncation needed)
 * ```
 */
export function truncateAddress(
  address: string,
  prefixLen: number = 4,
  suffixLen: number = 4
): string {
  return truncateMiddle(address, prefixLen, suffixLen);
}

/**
 * Generates a unique filename for an access control snapshot export.
 *
 * Format: `access-snapshot-{truncated-address}-{ISO-timestamp}.json`
 *
 * The timestamp has colons and periods replaced with dashes for filesystem safety.
 *
 * @param address - The contract address to include in the filename
 * @returns A unique, filesystem-safe filename with .json extension
 *
 * @example
 * ```ts
 * generateSnapshotFilename('GCKFBEIYV2U22IO2BJ4KVJOIP7XPWQGQFKKWXR6DOSJBV7STMAQSMTGG')
 * // Returns: 'access-snapshot-GCKF...MTGG-2025-12-04T10-30-45-123Z.json'
 * ```
 */
export function generateSnapshotFilename(address: string): string {
  const truncated = truncateAddress(address);

  // Generate ISO timestamp and replace colons and periods with dashes for filesystem safety
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

  return `access-snapshot-${truncated}-${timestamp}.json`;
}
