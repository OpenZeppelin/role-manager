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
 * 2. Tracks pending same-ecosystem EVM chain switches via networkToSwitchTo
 * 3. Renders NetworkSwitchManager only when an EVM chain switch is actually needed
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
  useDerivedAccountStatus,
  useWalletReconnectionHandler,
  useWalletState,
} from '@openzeppelin/ui-react';
import { logger } from '@openzeppelin/ui-utils';

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
 * It also manages same-ecosystem network switching (e.g., EVM chains)
 * so users stay connected when switching networks while cross-ecosystem moves
 * remain wallet-session handoffs instead of chain switches.
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
  const { setActiveNetworkId, activeRuntime, isRuntimeLoading } = useWalletState();
  const { isConnected } = useDerivedAccountStatus();

  // Track the last network ID we synced to avoid unnecessary re-syncs on remount
  const lastSyncedNetworkIdRef = useRef<string | null | typeof NOT_INITIALIZED>(NOT_INITIALIZED);

  // Track pending network switch (follows UI Builder pattern)
  const [networkToSwitchTo, setNetworkToSwitchTo] = useState<string | null>(null);

  // Track if the active runtime is ready for network switch
  const [isAdapterReady, setIsAdapterReady] = useState(false);

  const selectedWalletCapability =
    activeRuntime && selectedNetwork && activeRuntime.networkConfig.id === selectedNetwork.id
      ? (activeRuntime.wallet ?? null)
      : null;

  // Handle wallet reconnection - re-queue network switch if needed
  // Uses the hook from react-core which detects reconnection and calls the callback
  const handleRequeueSwitch = useCallback((networkId: string) => {
    logger.info(
      'WalletSyncProvider',
      `Wallet reconnected on different chain. Re-queueing switch to ${networkId}.`
    );
    setIsAdapterReady(false);
    setNetworkToSwitchTo(networkId);
  }, []);

  useWalletReconnectionHandler(
    selectedNetwork?.id ?? null,
    selectedWalletCapability,
    networkToSwitchTo,
    handleRequeueSwitch
  );

  // Sync network selection to wallet state
  useEffect(() => {
    const nextNetwork = selectedNetwork ?? null;
    const newNetworkId = nextNetwork?.id ?? null;

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

      // Queue a managed chain switch whenever the target network supports it.
      // This covers same-ecosystem switches (Ethereum → Sepolia), cross-ecosystem
      // returns (Stellar → Ethereum where the wallet session is stale), AND
      // first load / remounts after provider swaps (WalletStateProvider remounts
      // this tree on ecosystem transitions, resetting refs to null).
      // The NetworkSwitchManager guard (shouldMountNetworkSwitcher) ensures
      // the actual switch only fires when isConnected and isAdapterReady.
      const requiresManagedChainSwitch = !!(
        newNetworkId &&
        nextNetwork &&
        'chainId' in nextNetwork
      );

      if (requiresManagedChainSwitch) {
        setNetworkToSwitchTo(newNetworkId);
      } else {
        setNetworkToSwitchTo(null);
      }

      lastSyncedNetworkIdRef.current = newNetworkId;
      setActiveNetworkId(newNetworkId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentionally tracking only selectedNetwork.id to avoid re-running on object reference changes
  }, [selectedNetwork?.id, setActiveNetworkId]);

  // Watch for runtime ready state (follows UI Builder pattern)
  useEffect(() => {
    if (!activeRuntime?.wallet || !networkToSwitchTo || !selectedNetwork?.id) {
      // Clear ready state if no pending switch
      if (!networkToSwitchTo && isAdapterReady) {
        logger.debug(
          'WalletSyncProvider',
          'Target network cleared, resetting adapter ready state.'
        );
        setIsAdapterReady(false);
      }
      return;
    }

    // Runtime is ready when its wallet capability matches the target network.
    const runtimeMatchesTarget =
      activeRuntime.wallet.networkConfig.id === networkToSwitchTo &&
      selectedNetwork.id === networkToSwitchTo;
    const walletSupportsChainSwitch = 'chainId' in activeRuntime.wallet.networkConfig;

    if (runtimeMatchesTarget && walletSupportsChainSwitch && !isRuntimeLoading) {
      logger.debug(
        'WalletSyncProvider',
        `Runtime ready for target network ${selectedNetwork.id}. Setting isAdapterReady.`
      );
      if (!isAdapterReady) {
        setIsAdapterReady(true);
      }
    } else if (isAdapterReady && (!runtimeMatchesTarget || !walletSupportsChainSwitch)) {
      // Mismatch - reset
      logger.debug(
        'WalletSyncProvider',
        `Mismatch: selectedNetwork (${selectedNetwork.id}) vs target (${networkToSwitchTo}). Resetting isAdapterReady.`
      );
      setIsAdapterReady(false);
    }
  }, [activeRuntime, networkToSwitchTo, selectedNetwork?.id, isRuntimeLoading, isAdapterReady]);

  // Callback when network switch completes
  const handleNetworkSwitchComplete = useCallback(() => {
    logger.debug('WalletSyncProvider', 'Network switch completed, clearing target.');
    setNetworkToSwitchTo(null);
    setIsAdapterReady(false);
  }, []);

  // Determine if NetworkSwitchManager should be mounted
  const shouldMountNetworkSwitcher = useMemo(() => {
    const decision = !!(
      activeRuntime?.wallet &&
      activeRuntime?.networkCatalog &&
      networkToSwitchTo &&
      isConnected &&
      isAdapterReady &&
      'chainId' in activeRuntime.wallet.networkConfig &&
      activeRuntime.wallet.networkConfig.id === networkToSwitchTo
    );
    return decision;
  }, [activeRuntime, networkToSwitchTo, isConnected, isAdapterReady]);

  return (
    <>
      {/* NetworkSwitchManager handles actual wallet chain switching for EVM */}
      {shouldMountNetworkSwitcher &&
        activeRuntime?.wallet &&
        activeRuntime.networkCatalog &&
        networkToSwitchTo && (
          <NetworkSwitchManager
            wallet={activeRuntime.wallet}
            networkCatalog={activeRuntime.networkCatalog}
            targetNetworkId={networkToSwitchTo}
            onNetworkSwitchComplete={handleNetworkSwitchComplete}
          />
        )}
      {children}
    </>
  );
}
