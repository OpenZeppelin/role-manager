/**
 * useAccessManagerRoles hook
 * Feature: 018-access-manager
 *
 * Reads from the shared AccessManagerSyncContext.
 * Data is always in-memory — no IndexedDB delay on navigation.
 */

import { useSharedAccessManagerSync } from '../context/AccessManagerSyncContext';
import type { AccessManagerEventLog } from '../core/storage/AccessManagerSyncStorage';
import type { AccessManagerRole, SyncProgress } from '../types/access-manager';

export interface UseAccessManagerRolesReturn {
  roles: AccessManagerRole[];
  eventHistory: AccessManagerEventLog[];
  isLoading: boolean;
  isPending: boolean;
  isSyncing: boolean;
  syncProgress: SyncProgress | null;
  error: Error | null;
  refetch: () => Promise<void>;
}

export function useAccessManagerRoles(
  _adapter: unknown,
  _contractAddress: string,
  enabled: boolean = true,
  _networkId: string = ''
): UseAccessManagerRolesReturn {
  const sync = useSharedAccessManagerSync();

  if (!enabled || !sync.isAccessManager) {
    return {
      roles: [],
      eventHistory: [],
      isLoading: false,
      isPending: false,
      isSyncing: false,
      syncProgress: null,
      error: null,
      refetch: async () => {},
    };
  }

  return {
    roles: sync.roles,
    eventHistory: sync.eventHistory,
    isLoading: sync.isLoading,
    isPending: sync.isLoading,
    isSyncing: sync.isSyncing,
    syncProgress: sync.syncProgress,
    error: sync.error,
    refetch: sync.refetch,
  };
}
