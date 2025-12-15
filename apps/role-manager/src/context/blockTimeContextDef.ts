/**
 * BlockTimeContext definition
 * Feature: 015-ownership-transfer
 *
 * Context definition for block time estimation.
 * Separated from the provider component to enable Fast Refresh.
 */
import { createContext } from 'react';

import type { UseBlockTimeEstimateReturn } from '../hooks/useBlockTimeEstimate';

export const BlockTimeContext = createContext<UseBlockTimeEstimateReturn | null>(null);
