/**
 * BlockTimeContext
 * Feature: 015-ownership-transfer
 *
 * Provides block time estimation across the application.
 * Starts calibrating when a contract is selected and caches
 * the estimate for use in all UI components.
 */
import { createContext, useContext, type ReactNode } from 'react';

import {
  useBlockTimeEstimate,
  type UseBlockTimeEstimateReturn,
} from '../hooks/useBlockTimeEstimate';
import { useSelectedContract } from '../hooks/useSelectedContract';

// =============================================================================
// Context
// =============================================================================

const BlockTimeContext = createContext<UseBlockTimeEstimateReturn | null>(null);

// =============================================================================
// Provider
// =============================================================================

interface BlockTimeProviderProps {
  children: ReactNode;
}

/**
 * BlockTimeProvider - Provides block time estimation to the app
 *
 * Wraps the application and starts calibrating block time as soon as
 * a contract is selected. The estimate is shared across all components.
 *
 * @example
 * ```tsx
 * // In app root
 * <BlockTimeProvider>
 *   <App />
 * </BlockTimeProvider>
 *
 * // In any component
 * const { formatBlocksToTime } = useBlockTime();
 * ```
 */
export function BlockTimeProvider({ children }: BlockTimeProviderProps) {
  const { adapter } = useSelectedContract();

  const blockTimeEstimate = useBlockTimeEstimate(adapter, {
    pollInterval: 10000, // 10 seconds
    minSamples: 3,
    maxSamples: 20,
    enabled: !!adapter,
  });

  return (
    <BlockTimeContext.Provider value={blockTimeEstimate}>{children}</BlockTimeContext.Provider>
  );
}

// =============================================================================
// Hook
// =============================================================================

/**
 * useBlockTime - Access block time estimation from any component
 *
 * @returns Block time estimate and conversion utilities
 * @throws Error if used outside of BlockTimeProvider
 *
 * @example
 * ```tsx
 * function ExpirationDisplay({ blocksRemaining }) {
 *   const { formatBlocksToTime, isCalibrating } = useBlockTime();
 *
 *   const timeEstimate = formatBlocksToTime(blocksRemaining);
 *
 *   return (
 *     <span>
 *       {blocksRemaining.toLocaleString()} blocks
 *       {timeEstimate && ` (${timeEstimate})`}
 *     </span>
 *   );
 * }
 * ```
 */
export function useBlockTime(): UseBlockTimeEstimateReturn {
  const context = useContext(BlockTimeContext);

  if (context === null) {
    throw new Error('useBlockTime must be used within a BlockTimeProvider');
  }

  return context;
}
