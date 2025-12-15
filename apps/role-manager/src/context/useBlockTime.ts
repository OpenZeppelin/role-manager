/**
 * useBlockTime hook
 * Feature: 015-ownership-transfer
 *
 * Hook to access block time estimation from any component.
 * Must be used within a BlockTimeProvider.
 */
import { useContext } from 'react';

import type { UseBlockTimeEstimateReturn } from '../hooks/useBlockTimeEstimate';
import { BlockTimeContext } from './blockTimeContextDef';

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
