import { useMemo } from 'react';

import { useAnalytics } from '@openzeppelin/ui-react';

/**
 * Role Manager specific analytics tracking hook.
 *
 * Extends the shared useAnalytics hook with app-specific tracking methods
 * for Role Manager user interactions.
 *
 * Returns a memoized object to ensure stable function references across renders.
 *
 * @example
 * ```tsx
 * function Dashboard() {
 *   const { trackPageView, trackContractSelection } = useRoleManagerAnalytics();
 *
 *   useEffect(() => {
 *     trackPageView('Dashboard', '/');
 *   }, [trackPageView]);
 *
 *   const handleContractSelect = (address: string, networkId: string) => {
 *     trackContractSelection(address, networkId);
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
      trackContractSelection: (contractAddress: string, networkId: string, ecosystem: string) => {
        analytics.trackEvent('contract_selected', {
          contract_address: contractAddress,
          network_id: networkId,
          ecosystem,
        });
      },

      /**
       * Track when a user connects their wallet
       */
      trackWalletConnection: (ecosystem: string, walletType: string) => {
        analytics.trackEvent('wallet_connected', {
          ecosystem,
          wallet_type: walletType,
        });
      },

      /**
       * Track when a user disconnects their wallet
       */
      trackWalletDisconnection: (ecosystem: string) => {
        analytics.trackEvent('wallet_disconnected', {
          ecosystem,
        });
      },

      /**
       * Track when a role is granted
       */
      trackRoleGranted: (roleName: string, ecosystem: string) => {
        analytics.trackEvent('role_granted', {
          role_name: roleName,
          ecosystem,
        });
      },

      /**
       * Track when a role is revoked
       */
      trackRoleRevoked: (roleName: string, ecosystem: string) => {
        analytics.trackEvent('role_revoked', {
          role_name: roleName,
          ecosystem,
        });
      },

      /**
       * Track when ownership transfer is initiated
       */
      trackOwnershipTransferInitiated: (ecosystem: string) => {
        analytics.trackEvent('ownership_transfer_initiated', {
          ecosystem,
        });
      },

      /**
       * Track when ownership is accepted
       */
      trackOwnershipAccepted: (ecosystem: string) => {
        analytics.trackEvent('ownership_accepted', {
          ecosystem,
        });
      },

      /**
       * Track when admin transfer is initiated
       */
      trackAdminTransferInitiated: (ecosystem: string) => {
        analytics.trackEvent('admin_transfer_initiated', {
          ecosystem,
        });
      },

      /**
       * Track when admin transfer is accepted
       */
      trackAdminTransferAccepted: (ecosystem: string) => {
        analytics.trackEvent('admin_transfer_accepted', {
          ecosystem,
        });
      },

      /**
       * Track when ownership is renounced (Feature: 017-evm-access-control, T055)
       */
      trackOwnershipRenounced: (ecosystem: string) => {
        analytics.trackEvent('ownership_renounced', {
          ecosystem,
        });
      },

      /**
       * Track when a role is renounced (Feature: 017-evm-access-control, T055)
       */
      trackRoleRenounced: (roleName: string, ecosystem: string) => {
        analytics.trackEvent('role_renounced', {
          role_name: roleName,
          ecosystem,
        });
      },

      /**
       * Track when a snapshot is exported
       */
      trackSnapshotExported: (format: string, ecosystem: string) => {
        analytics.trackEvent('snapshot_exported', {
          format,
          ecosystem,
        });
      },

      /**
       * Track filter usage on pages
       */
      trackFilterApplied: (page: string, filterType: string, filterValue: string) => {
        analytics.trackEvent('filter_applied', {
          page,
          filter_type: filterType,
          filter_value: filterValue,
        });
      },
    }),
    [analytics]
  );
}
