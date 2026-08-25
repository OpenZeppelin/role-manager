import { useMemo } from 'react';

import { useAnalytics } from '@openzeppelin/ui-react';

import type { RoleManagerRuntime } from '@/core/runtimeAdapter';

// =============================================================================
// Network context
// =============================================================================

/** Fallback used when the network/ecosystem of an action cannot be resolved. */
export const UNKNOWN_ANALYTICS_VALUE = 'unknown';

/**
 * Network dimensions attached to every action event.
 *
 * Both values are required so GA custom dimensions (`network_id`, `ecosystem`)
 * are always populated and downstream queries can group by network without
 * dealing with missing columns.
 */
export interface AnalyticsNetworkContext {
  /** Network config id (e.g. `ethereum-mainnet`, `stellar-testnet`). */
  networkId: string;
  /** Ecosystem id (e.g. `evm`, `stellar`). */
  ecosystem: string;
}

/**
 * Derive the analytics network context from the active runtime.
 *
 * Falls back to `"unknown"` when no runtime is loaded so events are never
 * dropped for lack of a network; the analytics team filters those out.
 */
export function getAnalyticsNetworkContext(
  runtime: Pick<RoleManagerRuntime, 'networkConfig'> | null | undefined
): AnalyticsNetworkContext {
  return {
    networkId: runtime?.networkConfig?.id ?? UNKNOWN_ANALYTICS_VALUE,
    ecosystem: runtime?.networkConfig?.ecosystem ?? UNKNOWN_ANALYTICS_VALUE,
  };
}

/**
 * Convert a network context into GA event parameters.
 *
 * Param names (`network_id`, `ecosystem`) are registered as GA custom
 * dimensions — do not rename them.
 */
function toNetworkParams(network: AnalyticsNetworkContext): Record<string, string> {
  return {
    network_id: network.networkId,
    ecosystem: network.ecosystem,
  };
}

// =============================================================================
// Hook
// =============================================================================

/**
 * Role Manager specific analytics tracking hook.
 *
 * Extends the shared useAnalytics hook with app-specific tracking methods
 * for Role Manager user interactions. Every action event carries the
 * `network_id` and `ecosystem` dimensions via an {@link AnalyticsNetworkContext},
 * typically built with {@link getAnalyticsNetworkContext} from the active runtime.
 *
 * Privacy: never pass wallet/account addresses to these trackers. Contract
 * addresses are acceptable; role names, filter selections and formats are fine.
 *
 * Returns a memoized object to ensure stable function references across renders.
 *
 * @example
 * ```tsx
 * function GrantRoleDialog() {
 *   const { runtime } = useSelectedContract();
 *   const { trackRoleGranted } = useRoleManagerAnalytics();
 *
 *   const onSuccess = () => {
 *     trackRoleGranted('Minter', getAnalyticsNetworkContext(runtime));
 *   };
 * }
 * ```
 */
export function useRoleManagerAnalytics() {
  const analytics = useAnalytics();

  return useMemo(
    () => ({
      // Pass through base analytics methods
      ...analytics,

      /**
       * Track when a user selects a contract to manage
       */
      trackContractSelection: (contractAddress: string, network: AnalyticsNetworkContext) => {
        analytics.trackEvent('contract_selected', {
          contract_address: contractAddress,
          ...toNetworkParams(network),
        });
      },

      /**
       * Track when a user connects their wallet.
       * `walletType` is the connector name (e.g. "MetaMask", "Freighter"), never an address.
       */
      trackWalletConnection: (walletType: string, network: AnalyticsNetworkContext) => {
        analytics.trackEvent('wallet_connected', {
          wallet_type: walletType,
          ...toNetworkParams(network),
        });
      },

      /**
       * Track when a user disconnects their wallet
       */
      trackWalletDisconnection: (network: AnalyticsNetworkContext) => {
        analytics.trackEvent('wallet_disconnected', toNetworkParams(network));
      },

      /**
       * Track when a role is granted
       */
      trackRoleGranted: (roleName: string, network: AnalyticsNetworkContext) => {
        analytics.trackEvent('role_granted', {
          role_name: roleName,
          ...toNetworkParams(network),
        });
      },

      /**
       * Track when a role is revoked
       */
      trackRoleRevoked: (roleName: string, network: AnalyticsNetworkContext) => {
        analytics.trackEvent('role_revoked', {
          role_name: roleName,
          ...toNetworkParams(network),
        });
      },

      /**
       * Track when a role is renounced (Feature: 017-evm-access-control, T055)
       */
      trackRoleRenounced: (roleName: string, network: AnalyticsNetworkContext) => {
        analytics.trackEvent('role_renounced', {
          role_name: roleName,
          ...toNetworkParams(network),
        });
      },

      /**
       * Track when ownership transfer is initiated
       */
      trackOwnershipTransferInitiated: (network: AnalyticsNetworkContext) => {
        analytics.trackEvent('ownership_transfer_initiated', toNetworkParams(network));
      },

      /**
       * Track when ownership is accepted
       */
      trackOwnershipAccepted: (network: AnalyticsNetworkContext) => {
        analytics.trackEvent('ownership_accepted', toNetworkParams(network));
      },

      /**
       * Track when ownership is renounced (Feature: 017-evm-access-control, T055)
       */
      trackOwnershipRenounced: (network: AnalyticsNetworkContext) => {
        analytics.trackEvent('ownership_renounced', toNetworkParams(network));
      },

      /**
       * Track when admin transfer is initiated
       */
      trackAdminTransferInitiated: (network: AnalyticsNetworkContext) => {
        analytics.trackEvent('admin_transfer_initiated', toNetworkParams(network));
      },

      /**
       * Track when admin transfer is accepted
       */
      trackAdminTransferAccepted: (network: AnalyticsNetworkContext) => {
        analytics.trackEvent('admin_transfer_accepted', toNetworkParams(network));
      },

      /**
       * Track when admin transfer is canceled (Feature: 017-evm-access-control, T069)
       */
      trackAdminTransferCancelled: (network: AnalyticsNetworkContext) => {
        analytics.trackEvent('admin_transfer_cancelled', toNetworkParams(network));
      },

      /**
       * Track when admin delay change is scheduled (Feature: 017-evm-access-control, T069)
       */
      trackAdminDelayChangeScheduled: (network: AnalyticsNetworkContext) => {
        analytics.trackEvent('admin_delay_change_scheduled', toNetworkParams(network));
      },

      /**
       * Track when admin delay change is rolled back (Feature: 017-evm-access-control, T069)
       */
      trackAdminDelayChangeRolledBack: (network: AnalyticsNetworkContext) => {
        analytics.trackEvent('admin_delay_change_rolled_back', toNetworkParams(network));
      },

      /**
       * Track when a snapshot is exported
       */
      trackSnapshotExported: (format: string, network: AnalyticsNetworkContext) => {
        analytics.trackEvent('snapshot_exported', {
          format,
          ...toNetworkParams(network),
        });
      },

      /**
       * Track filter usage on pages.
       * `filterValue` must never contain free-form user input (search text may be an address).
       */
      trackFilterApplied: (
        page: string,
        filterType: string,
        filterValue: string,
        network: AnalyticsNetworkContext
      ) => {
        analytics.trackEvent('filter_applied', {
          page,
          filter_type: filterType,
          filter_value: filterValue,
          ...toNetworkParams(network),
        });
      },
    }),
    [analytics]
  );
}
