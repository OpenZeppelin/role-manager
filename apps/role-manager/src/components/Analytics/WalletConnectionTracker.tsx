import { useEffect, useRef } from 'react';

import { useDerivedAccountStatus, useWalletState } from '@openzeppelin/ui-react';

import {
  getAnalyticsNetworkContext,
  UNKNOWN_ANALYTICS_VALUE,
  useRoleManagerAnalytics,
} from '../../hooks/useRoleManagerAnalytics';
import { useSelectedContract } from '../../hooks/useSelectedContract';

/**
 * Reports wallet connect/disconnect transitions to analytics.
 *
 * Renders nothing. Mount once inside both `ContractProvider` (for the active
 * network) and `WalletStateProvider` (for the wallet status).
 *
 * Only the connector name (e.g. "MetaMask", "Freighter") is reported — never
 * the account address.
 */
export function WalletConnectionTracker(): null {
  const { isConnected } = useDerivedAccountStatus();
  const { activeRuntime } = useWalletState();
  const { runtime } = useSelectedContract();
  const { trackWalletConnection, trackWalletDisconnection } = useRoleManagerAnalytics();

  // Seed from the current status so an already-connected mount (persisted
  // wallet session) does not count as a connect transition.
  const wasConnectedRef = useRef(isConnected);

  useEffect(() => {
    if (isConnected === wasConnectedRef.current) return;
    wasConnectedRef.current = isConnected;

    const network = getAnalyticsNetworkContext(runtime);
    if (isConnected) {
      const connector = activeRuntime?.wallet?.getWalletConnectionStatus().connector;
      trackWalletConnection(connector?.name ?? connector?.id ?? UNKNOWN_ANALYTICS_VALUE, network);
    } else {
      trackWalletDisconnection(network);
    }
  }, [isConnected, activeRuntime, runtime, trackWalletConnection, trackWalletDisconnection]);

  return null;
}
