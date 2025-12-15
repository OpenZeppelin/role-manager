/**
 * Block Time Utilities
 * Feature: 015-ownership-transfer
 *
 * Utility functions for calculating and displaying block-based time estimates.
 */

// =============================================================================
// Types
// =============================================================================

/**
 * Result of block expiration calculation
 */
export interface BlockExpirationEstimate {
  /** Number of blocks remaining until expiration */
  blocksRemaining: number;
  /** Human-readable time estimate (e.g., "~2 hours"), null if not available */
  timeEstimate: string | null;
}

/**
 * Function type for converting blocks to time string
 */
export type FormatBlocksToTimeFn = (blocks: number) => string | null;

// =============================================================================
// Functions
// =============================================================================

/**
 * Calculate blocks remaining and time estimate for an expiration block.
 *
 * @param expirationBlock - The block number at which something expires
 * @param currentBlock - The current block number (null if unknown)
 * @param formatBlocksToTime - Function to convert blocks to human-readable time
 * @returns Expiration estimate or null if expired/invalid
 *
 * @example
 * ```tsx
 * const { formatBlocksToTime } = useBlockTime();
 * const estimate = calculateBlockExpiration(2120000, 2118912, formatBlocksToTime);
 * // { blocksRemaining: 1088, timeEstimate: "~15 minutes" }
 * ```
 */
export function calculateBlockExpiration(
  expirationBlock: number,
  currentBlock: number | null | undefined,
  formatBlocksToTime: FormatBlocksToTimeFn
): BlockExpirationEstimate | null {
  // Can't calculate without current block
  if (currentBlock === null || currentBlock === undefined) {
    return null;
  }

  // Already expired
  if (currentBlock >= expirationBlock) {
    return null;
  }

  const blocksRemaining = expirationBlock - currentBlock;
  const timeEstimate = formatBlocksToTime(blocksRemaining);

  return { blocksRemaining, timeEstimate };
}

/**
 * Format a time estimate string for display (removes ~ prefix if present).
 *
 * @param timeEstimate - Raw time estimate (e.g., "~2 hours")
 * @returns Formatted string (e.g., "2 hours")
 */
export function formatTimeEstimateDisplay(timeEstimate: string | null): string | null {
  if (!timeEstimate) return null;
  return timeEstimate.replace('~', '');
}
