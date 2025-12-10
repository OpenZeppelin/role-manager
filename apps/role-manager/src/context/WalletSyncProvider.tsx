/**
 * WalletSyncProvider - Synchronizes network selection with wallet state
 * Feature: 013-wallet-connect-header
 *
 * This provider bridges the ContractContext (Role Manager's network selection)
 * with the WalletStateProvider (UI Builder's wallet management).
 *
 * When a user selects a network from the ecosystem picker in the sidebar,
 * this provider:
 * 1. Updates the wallet state so the correct adapter is loaded
 * 2. Tracks pending network switches via networkToSwitchTo
 * 3. Renders NetworkSwitchManager to trigger wallet chain switching (EVM)
 * 4. Handles wallet reconnection scenarios
 *
 * This follows the UI Builder's pattern for seamless network switching
 * where users stay connected across network changes within the same ecosystem.
 *
 * @contract
 * - MUST read selectedNetwork from ContractContext
 * - MUST call setActiveNetworkId when selectedNetwork changes
 * - MUST track networkToSwitchTo for pending switches
 * - MUST render NetworkSwitchManager when adapter is ready
 * - MUST NOT modify ContractContext state
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import {
  NetworkSwitchManager,
  useWalletReconnectionHandler,
  useWalletState,
} from '@openzeppelin/ui-builder-react-core';
import { logger } from '@openzeppelin/ui-builder-utils';

import { useContractContext } from './ContractContext';

export interface WalletSyncProviderProps {
  children: React.ReactNode;
}

// Sentinel value to differentiate between "not yet initialized" and "synced to null"
const NOT_INITIALIZED = Symbol('NOT_INITIALIZED');

/**
 * Synchronizes the selected network from ContractContext to WalletStateProvider.
 *
 * This enables the wallet UI to automatically load the correct adapter
 * when the user selects a network from the ecosystem picker.
 * It also manages network switching within the same ecosystem (e.g., EVM chains)
 * so users stay connected when switching networks.
 *
 * @example
 * ```tsx
 * // In App.tsx provider hierarchy
 * <ContractProvider>
 *   <WalletStateProvider ...>
 *     <WalletSyncProvider>
 *       <MainLayout>...</MainLayout>
 *     </WalletSyncProvider>
 *   </WalletStateProvider>
 * </ContractProvider>
 * ```
 */
export function WalletSyncProvider({ children }: WalletSyncProviderProps): React.ReactElement {
  const { selectedNetwork } = useContractContext();
  const { setActiveNetworkId, activeAdapter, isAdapterLoading } = useWalletState();

  // Track the last network ID we synced to avoid unnecessary re-syncs on remount
  const lastSyncedNetworkIdRef = useRef<string | null | typeof NOT_INITIALIZED>(NOT_INITIALIZED);

  // Track pending network switch (follows UI Builder pattern)
  const [networkToSwitchTo, setNetworkToSwitchTo] = useState<string | null>(null);

  // Track if adapter is ready for network switch
  const [isAdapterReady, setIsAdapterReady] = useState(false);

  // Handle wallet reconnection - re-queue network switch if needed
  // Uses the hook from react-core which detects reconnection and calls the callback
  const handleRequeueSwitch = useCallback((networkId: string) => {
    logger.info(
      'WalletSyncProvider',
      `Wallet reconnected on different chain. Re-queueing switch to ${networkId}.`
    );
    setNetworkToSwitchTo(networkId);
  }, []);

  useWalletReconnectionHandler(
    selectedNetwork?.id ?? null,
    activeAdapter,
    networkToSwitchTo,
    handleRequeueSwitch
  );

  // Sync network selection to wallet state
  useEffect(() => {
    const newNetworkId = selectedNetwork?.id ?? null;

    // Only sync if:
    // 1. This is the first sync (ref is NOT_INITIALIZED), OR
    // 2. The network ID has actually changed from what we last synced
    if (
      lastSyncedNetworkIdRef.current === NOT_INITIALIZED ||
      newNetworkId !== lastSyncedNetworkIdRef.current
    ) {
      logger.info(
        'WalletSyncProvider',
        `Network changed: ${lastSyncedNetworkIdRef.current?.toString()} → ${newNetworkId}`
      );

      // Reset adapter ready state when network changes
      setIsAdapterReady(false);

      // Queue the network switch, or clear pending switch if network deselected
      if (newNetworkId) {
        setNetworkToSwitchTo(newNetworkId);
      } else {
        setNetworkToSwitchTo(null);
      }

      lastSyncedNetworkIdRef.current = newNetworkId;
      setActiveNetworkId(newNetworkId);
    }
  }, [selectedNetwork?.id, setActiveNetworkId]);

  // Watch for adapter ready state (follows UI Builder pattern)
  useEffect(() => {
    if (!activeAdapter || !networkToSwitchTo || !selectedNetwork?.id) {
      // Clear adapter ready if no pending switch
      if (!networkToSwitchTo && isAdapterReady) {
        logger.info('WalletSyncProvider', 'Target network cleared, resetting adapter ready state.');
        setIsAdapterReady(false);
      }
      return;
    }

    // Adapter is ready when it matches the target network
    // Note: activeAdapter is guaranteed truthy here due to early return above
    if (selectedNetwork.id === networkToSwitchTo && !isAdapterLoading) {
      logger.info(
        'WalletSyncProvider',
        `✅ Adapter ready for target network ${selectedNetwork.id}. Setting isAdapterReady.`
      );
      if (!isAdapterReady) {
        setIsAdapterReady(true);
      }
    } else if (isAdapterReady && selectedNetwork.id !== networkToSwitchTo) {
      // Mismatch - reset
      logger.info(
        'WalletSyncProvider',
        `Mismatch: selectedNetwork (${selectedNetwork.id}) vs target (${networkToSwitchTo}). Resetting isAdapterReady.`
      );
      setIsAdapterReady(false);
    }
  }, [activeAdapter, networkToSwitchTo, selectedNetwork?.id, isAdapterLoading, isAdapterReady]);

  // Callback when network switch completes
  const handleNetworkSwitchComplete = useCallback(() => {
    logger.info('WalletSyncProvider', '🔄 Network switch completed, clearing target.');
    setNetworkToSwitchTo(null);
    setIsAdapterReady(false);
  }, []);

  // Determine if NetworkSwitchManager should be mounted
  const shouldMountNetworkSwitcher = useMemo(() => {
    const decision = !!(
      activeAdapter &&
      networkToSwitchTo &&
      isAdapterReady &&
      activeAdapter.networkConfig.id === networkToSwitchTo
    );
    if (decision) {
      logger.info(
        'WalletSyncProvider',
        `MOUNTING NetworkSwitchManager. Adapter ID: ${activeAdapter?.networkConfig.id}, Target: ${networkToSwitchTo}`
      );
    }
    return decision;
  }, [activeAdapter, networkToSwitchTo, isAdapterReady]);

  return (
    <>
      {/* NetworkSwitchManager handles actual wallet chain switching for EVM */}
      {shouldMountNetworkSwitcher && activeAdapter && networkToSwitchTo && (
        <NetworkSwitchManager
          adapter={activeAdapter}
          targetNetworkId={networkToSwitchTo}
          onNetworkSwitchComplete={handleNetworkSwitchComplete}
        />
      )}
      {children}
    </>
  );
}
