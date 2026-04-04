/**
 * useAccessManagerTargets hook
 * Feature: 018-access-manager
 *
 * Reads from the shared AccessManagerSyncContext.
 */

import { useSharedAccessManagerSync } from '../context/AccessManagerSyncContext';
import type { TargetConfig } from '../types/access-manager';

export interface UseAccessManagerTargetsReturn {
  targets: TargetConfig[];
  isLoading: boolean;
  isPending: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

export function useAccessManagerTargets(
  _adapter: unknown,
  _contractAddress: string,
  enabled: boolean = true,
  _networkId: string = ''
): UseAccessManagerTargetsReturn {
  const sync = useSharedAccessManagerSync();

  if (!enabled || !sync.isAccessManager) {
    return {
      targets: [],
      isLoading: false,
      isPending: false,
      error: null,
      refetch: async () => {},
    };
  }

  return {
    targets: sync.targets,
    isLoading: sync.isLoading,
    isPending: sync.isLoading,
    error: sync.error,
    refetch: sync.refetch,
  };
}
