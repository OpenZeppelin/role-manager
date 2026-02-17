/**
 * useBlockTimeEstimate hook
 * Feature: 015-ownership-transfer
 *
 * Estimates average block time by observing block changes over time.
 * Provides utility to convert blocks to human-readable time estimates.
 *
 * The hook:
 * - Polls current block at regular intervals
 * - Tracks block changes over time to calculate average block time
 * - Caches estimates for consistent UI display
 * - Works across different chains (EVM, Stellar, etc.)
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import type { ContractAdapter } from '@openzeppelin/ui-types';

import { useCurrentBlock } from './useCurrentBlock';

// =============================================================================
// Types
// =============================================================================

/**
 * A single block observation sample
 */
interface BlockSample {
  block: number;
  timestamp: number;
}

/**
 * Block time estimate result
 */
export interface BlockTimeEstimate {
  /** Average milliseconds per block (null if not enough samples) */
  avgBlockTimeMs: number | null;
  /** Number of samples collected */
  sampleCount: number;
  /** Whether estimation is still calibrating (< minimum samples) */
  isCalibrating: boolean;
  /** Confidence level: 'low' | 'medium' | 'high' based on sample count */
  confidence: 'low' | 'medium' | 'high';
}

/**
 * Return type for useBlockTimeEstimate hook
 */
export interface UseBlockTimeEstimateReturn extends BlockTimeEstimate {
  /** Convert blocks to estimated time string (e.g., "~2 hours", "~15 minutes") */
  formatBlocksToTime: (blocks: number) => string | null;
  /** Get estimated milliseconds for a given number of blocks */
  getEstimatedMs: (blocks: number) => number | null;
}

/**
 * Options for useBlockTimeEstimate hook
 */
export interface UseBlockTimeEstimateOptions {
  /** Polling interval in milliseconds (default: 10000 - 10 seconds) */
  pollInterval?: number;
  /** Minimum samples before providing estimates (default: 3) */
  minSamples?: number;
  /** Maximum samples to keep (default: 20) */
  maxSamples?: number;
  /** Whether polling is enabled (default: true) */
  enabled?: boolean;
}

// =============================================================================
// Constants
// =============================================================================

const DEFAULT_POLL_INTERVAL = 10000; // 10 seconds
const MIN_SAMPLES_DEFAULT = 3;
const MAX_SAMPLES_DEFAULT = 20;

// Confidence thresholds
const LOW_CONFIDENCE_THRESHOLD = 5;
const MEDIUM_CONFIDENCE_THRESHOLD = 10;

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Format milliseconds to human-readable time string
 */
function formatMsToReadableTime(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) {
    const remainingHours = hours % 24;
    if (remainingHours > 0 && days < 7) {
      return `~${days}d ${remainingHours}h`;
    }
    return `~${days} day${days > 1 ? 's' : ''}`;
  }

  if (hours > 0) {
    const remainingMinutes = minutes % 60;
    if (remainingMinutes > 0 && hours < 24) {
      return `~${hours}h ${remainingMinutes}m`;
    }
    return `~${hours} hour${hours > 1 ? 's' : ''}`;
  }

  if (minutes > 0) {
    return `~${minutes} minute${minutes > 1 ? 's' : ''}`;
  }

  return '< 1 minute';
}

/**
 * Calculate average block time from samples
 */
function calculateAvgBlockTime(samples: BlockSample[]): number | null {
  if (samples.length < 2) return null;

  // Sort by timestamp
  const sorted = [...samples].sort((a, b) => a.timestamp - b.timestamp);

  // Calculate total time and blocks elapsed
  const firstSample = sorted[0];
  const lastSample = sorted[sorted.length - 1];

  const timeElapsed = lastSample.timestamp - firstSample.timestamp;
  const blocksElapsed = lastSample.block - firstSample.block;

  if (blocksElapsed <= 0 || timeElapsed <= 0) return null;

  return timeElapsed / blocksElapsed;
}

// =============================================================================
// Hook Implementation
// =============================================================================

/**
 * Hook for estimating block time based on observed block changes.
 *
 * Polls the current block and tracks changes over time to calculate
 * an average block time. Provides utilities to convert blocks to
 * human-readable time estimates.
 *
 * @param adapter - The contract adapter instance
 * @param options - Configuration options
 * @returns Block time estimate and conversion utilities
 *
 * @example
 * ```tsx
 * const { formatBlocksToTime, isCalibrating, confidence } = useBlockTimeEstimate(adapter);
 *
 * // Display time estimate
 * const blocksRemaining = 1000;
 * const timeEstimate = formatBlocksToTime(blocksRemaining);
 * // -> "~2 hours" or null if still calibrating
 * ```
 */
export function useBlockTimeEstimate(
  adapter: ContractAdapter | null,
  options?: UseBlockTimeEstimateOptions
): UseBlockTimeEstimateReturn {
  const {
    pollInterval = DEFAULT_POLL_INTERVAL,
    minSamples = MIN_SAMPLES_DEFAULT,
    maxSamples = MAX_SAMPLES_DEFAULT,
    enabled = true,
  } = options ?? {};

  // Track block samples
  const samplesRef = useRef<BlockSample[]>([]);
  const [sampleCount, setSampleCount] = useState(0);

  // Stop polling once we have enough samples — the estimate is well-calibrated
  // and continuing to poll would waste RPC requests.
  const isFullyCalibrated = sampleCount >= maxSamples;

  // Get current block with polling (stops when fully calibrated)
  const { currentBlock } = useCurrentBlock(adapter, {
    pollInterval: isFullyCalibrated ? false : pollInterval,
    enabled,
  });

  // Track previous block to detect changes
  const prevBlockRef = useRef<number | null>(null);

  // Record new samples when block changes
  useEffect(() => {
    if (currentBlock === null) return;

    // Only record if block actually changed
    if (prevBlockRef.current !== null && currentBlock !== prevBlockRef.current) {
      const newSample: BlockSample = {
        block: currentBlock,
        timestamp: Date.now(),
      };

      // Add sample and trim to max
      samplesRef.current = [...samplesRef.current, newSample].slice(-maxSamples);
      setSampleCount(samplesRef.current.length);
    }

    prevBlockRef.current = currentBlock;
  }, [currentBlock, maxSamples]);

  // Calculate average block time
  const avgBlockTimeMs = useMemo(() => {
    return calculateAvgBlockTime(samplesRef.current);
  }, [sampleCount]);

  // Determine calibration state and confidence
  const isCalibrating = sampleCount < minSamples;

  const confidence = useMemo((): 'low' | 'medium' | 'high' => {
    if (sampleCount < LOW_CONFIDENCE_THRESHOLD) return 'low';
    if (sampleCount < MEDIUM_CONFIDENCE_THRESHOLD) return 'medium';
    return 'high';
  }, [sampleCount]);

  // Convert blocks to estimated milliseconds
  const getEstimatedMs = useCallback(
    (blocks: number): number | null => {
      if (avgBlockTimeMs === null || blocks <= 0) return null;
      return blocks * avgBlockTimeMs;
    },
    [avgBlockTimeMs]
  );

  // Format blocks to human-readable time
  const formatBlocksToTime = useCallback(
    (blocks: number): string | null => {
      const ms = getEstimatedMs(blocks);
      if (ms === null) return null;
      return formatMsToReadableTime(ms);
    },
    [getEstimatedMs]
  );

  return {
    avgBlockTimeMs,
    sampleCount,
    isCalibrating,
    confidence,
    formatBlocksToTime,
    getEstimatedMs,
  };
}
