/**
 * useAccessManagerOperations hook
 * Feature: 018-access-manager
 *
 * Reads from the shared AccessManagerSyncContext.
 */

import { useSharedAccessManagerSync } from '../context/AccessManagerSyncContext';
import type { ScheduledOperation } from '../types/access-manager';

export interface UseAccessManagerOperationsReturn {
  operations: ScheduledOperation[];
  isLoading: boolean;
  isPending: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

export function useAccessManagerOperations(
  _adapter: unknown,
  _contractAddress: string,
  enabled: boolean = true,
  _networkId: string = ''
): UseAccessManagerOperationsReturn {
  const sync = useSharedAccessManagerSync();

  if (!enabled || !sync.isAccessManager) {
    return {
      operations: [],
      isLoading: false,
      isPending: false,
      error: null,
      refetch: async () => {},
    };
  }

  return {
    operations: sync.operations,
    isLoading: sync.isLoading,
    isPending: sync.isLoading,
    error: sync.error,
    refetch: sync.refetch,
  };
}
