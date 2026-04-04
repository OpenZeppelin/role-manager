/**
 * AliasLabelBridge
 *
 * Bridges alias storage and the AddressLabelProvider + AddressSuggestionProvider
 * from ui-components. Reads the current network from ContractContext and creates
 * reactive resolvers backed by the app's Dexie database.
 *
 * Label resolution priority:
 * 1. User alias (from Dexie) — always wins
 * 2. Sourcify contract name (auto-resolved) — "ImplName (Proxy)" for proxies
 * 3. No label (shows truncated address)
 *
 * - All `AddressDisplay` instances in the subtree automatically resolve aliases.
 * - All `AddressField` instances in the subtree automatically show alias suggestions.
 * - Clicking the pencil icon on any AddressDisplay opens the AliasEditPopover.
 */
import { useCallback, useEffect, useMemo, useRef } from 'react';
import type { ReactNode } from 'react';

import { AddressLabelProvider, AddressSuggestionProvider } from '@openzeppelin/ui-components';
import { AliasEditPopover, useAliasEditState } from '@openzeppelin/ui-renderer';
import {
  useAliasEditCallbacks,
  useAliasLabelResolver,
  useAliasSuggestionResolver,
} from '@openzeppelin/ui-storage';

import { EvmAccessManagerService } from '../core/ecosystems/evm/EvmAccessManagerService';
import { db } from '../core/storage/database';
import { useAccessManagerService } from '../hooks/useAccessManagerService';
import { clearContractNameCache, useContractNames } from '../hooks/useContractNames';
import { useSelectedContract } from '../hooks/useSelectedContract';
import { getEvmNetworkConfig } from '../utils/evm-network-config';
import { useSharedAccessManagerSync } from './AccessManagerSyncContext';

/** Bridges alias storage into ui-components contexts for labels and suggestions. */
export function AliasLabelBridge({ children }: { children: ReactNode }) {
  const { selectedNetwork, runtime } = useSelectedContract();

  // Collect addresses from AM sync context for Sourcify resolution
  const amSync = useSharedAccessManagerSync();
  const evmCfg = getEvmNetworkConfig(runtime);
  const chainId = evmCfg?.chainId ?? 0;
  const explorerApiUrl = evmCfg?.apiUrl ?? evmCfg?.explorerUrl;
  const rpcUrl = evmCfg?.rpcUrl;

  // Clear name cache when network/contract changes so fresh Sourcify data is fetched
  useEffect(() => {
    clearContractNameCache();
  }, [chainId]);

  // Deduplicate and normalize addresses for Sourcify resolution.
  // Sorted so the array reference is stable when the set hasn't changed.
  const addressesToResolve = useMemo(() => {
    const set = new Set<string>();
    for (const t of amSync.targets) set.add(t.target.toLowerCase());
    for (const r of amSync.roles) {
      for (const m of r.members) set.add(m.address.toLowerCase());
    }
    for (const e of amSync.eventHistory) {
      if (e.account) set.add(e.account.toLowerCase());
      if (e.target) set.add(e.target.toLowerCase());
    }
    return Array.from(set).sort();
  }, [amSync.targets, amSync.roles, amSync.eventHistory]);

  // Get the AM service's public client for EIP-1967 proxy detection
  // This uses the resilient transport (with Chainlist fallback) — no CORS issues
  const { service: amService } = useAccessManagerService(runtime);
  const getStorageAt = useMemo(() => {
    const svc = amService as EvmAccessManagerService | null;
    if (!svc?.publicClient) return undefined;
    const client = svc.publicClient;
    return async (address: string, slot: string): Promise<string | null> => {
      try {
        const result = await client.getStorageAt({
          address: address as `0x${string}`,
          slot: slot as `0x${string}`,
        });
        return result ?? null;
      } catch {
        return null;
      }
    };
  }, [amService]);

  // Resolve contract names via Sourcify (async, updates map reactively)
  const contractNames = useContractNames(
    addressesToResolve,
    chainId,
    explorerApiUrl,
    rpcUrl,
    getStorageAt
  );

  const labelResolver = useAliasLabelResolver(db, {
    networkId: selectedNetwork?.id,
  });

  // Use ref for contractNames to avoid re-creating the resolver callback
  // (and re-rendering all AddressDisplay children) on each batch resolve.
  const contractNamesRef = useRef(contractNames);
  contractNamesRef.current = contractNames;

  // Enhanced resolver: user alias → Sourcify contract name → undefined
  const enhancedResolveLabel = useCallback(
    (address: string, networkId?: string): string | undefined => {
      const alias = labelResolver.resolveLabel(address, networkId);
      if (alias) return alias;
      return contractNamesRef.current.get(address.toLowerCase());
    },
    [labelResolver]
  );

  const suggestionResolver = useAliasSuggestionResolver(db);
  const editCallbacks = useAliasEditCallbacks(db);

  const { editing, onEditLabel, handleClose, lastClickRef } = useAliasEditState(
    selectedNetwork?.id
  );

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      lastClickRef.current = { x: e.clientX, y: e.clientY };
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps -- ref is stable
    []
  );

  return (
    <div onPointerDown={handlePointerDown}>
      <AddressLabelProvider resolveLabel={enhancedResolveLabel} onEditLabel={onEditLabel}>
        <AddressSuggestionProvider resolveSuggestions={suggestionResolver.resolveSuggestions}>
          {children}
        </AddressSuggestionProvider>
      </AddressLabelProvider>

      {editing && (
        <AliasEditPopover
          address={editing.address}
          networkId={editing.networkId}
          anchorRect={editing.anchorRect}
          onClose={handleClose}
          {...editCallbacks}
        />
      )}
    </div>
  );
}
