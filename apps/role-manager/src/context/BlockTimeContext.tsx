/**
 * BlockTimeProvider
 * Feature: 015-ownership-transfer
 *
 * Provides block time estimation across the application.
 * Starts calibrating when a contract is selected and caches
 * the estimate for use in all UI components.
 */
import type { ReactNode } from 'react';

import { useBlockTimeEstimate } from '../hooks/useBlockTimeEstimate';
import { useSelectedContract } from '../hooks/useSelectedContract';
import { BlockTimeContext } from './blockTimeContextDef';

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
