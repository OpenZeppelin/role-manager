/**
 * AccessManagerSyncContext
 * Feature: 018-access-manager
 *
 * Shared sync state for AccessManager contracts.
 * Runs one sync instance at the app level — all pages read from it instantly.
 * No IndexedDB read delay on navigation, no duplicate RPCs.
 */

import { createContext, useContext, type ReactNode } from 'react';

import { useAccessManagerService } from '../hooks/useAccessManagerService';
import {
  useAccessManagerSync,
  type UseAccessManagerSyncReturn,
} from '../hooks/useAccessManagerSync';
import { type ExtendedCapabilities } from '../hooks/useContractCapabilities';
import { useSelectedContract } from '../hooks/useSelectedContract';

// =============================================================================
// Context
// =============================================================================

interface AccessManagerSyncContextValue extends UseAccessManagerSyncReturn {
  /** Whether the selected contract is an AccessManager */
  isAccessManager: boolean;
}

const defaultValue: AccessManagerSyncContextValue = {
  roles: [],
  targets: [],
  operations: [],
  eventHistory: [],
  expiration: null,
  minSetback: null,
  isLoading: false,
  isSyncing: false,
  syncProgress: null,
  lastSyncedAt: null,
  error: null,
  refetch: async () => {},
  isAccessManager: false,
};

const SyncContext = createContext<AccessManagerSyncContextValue>(defaultValue);

// =============================================================================
// Provider
// =============================================================================

export function AccessManagerSyncProvider({ children }: { children: ReactNode }) {
  const { selectedContract, runtime } = useSelectedContract();
  const { service } = useAccessManagerService(runtime);

  const contractAddress = selectedContract?.address ?? '';
  const networkId = selectedContract?.networkId ?? '';
  const chainId = (runtime?.networkConfig as { chainId?: number } | undefined)?.chainId ?? 0;
  const isAccessManager = !!(selectedContract?.capabilities as ExtendedCapabilities | undefined)
    ?.hasAccessManager;

  const sync = useAccessManagerSync(service, contractAddress, chainId, networkId, isAccessManager);

  return (
    <SyncContext.Provider
      value={{
        ...sync,
        isAccessManager,
      }}
    >
      {children}
    </SyncContext.Provider>
  );
}

// =============================================================================
// Hook
// =============================================================================

/**
 * Access the shared AccessManager sync state.
 * Data is always in-memory — no IndexedDB read delay on page navigation.
 */
export function useSharedAccessManagerSync(): AccessManagerSyncContextValue {
  return useContext(SyncContext);
}
