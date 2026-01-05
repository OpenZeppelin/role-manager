import { useMemo } from 'react';

import { useLiveQuery } from '@openzeppelin/ui-storage';

import { db } from '@/core/storage';
import { recentContractsStorage } from '@/core/storage/RecentContractsStorage';
import type { RecentContractRecord } from '@/types/storage';

/**
 * Hook for managing recent contracts for a specific network.
 * Uses Dexie's live query for real-time updates when data changes.
 *
 * @param networkId - The network ID to filter contracts by (undefined returns empty array)
 */
export function useRecentContracts(networkId: string | undefined) {
  // Use useLiveQuery with networkId in the dependencies array
  // This ensures the query re-runs when networkId changes
  const data = useLiveQuery(
    async () => {
      if (!networkId) {
        return [];
      }

      const rows = await db
        .table<RecentContractRecord>('recentContracts')
        .where('networkId')
        .equals(networkId)
        .sortBy('lastAccessed');

      // Reverse to get most recent first
      return rows.reverse();
    },
    [networkId], // Dependencies - re-run query when networkId changes
    [] // Default value while loading
  );

  // Memoize the exposed methods to prevent unnecessary re-renders
  const methods = useMemo(
    () => ({
      addOrUpdate: recentContractsStorage.addOrUpdate.bind(recentContractsStorage),
      getByNetwork: recentContractsStorage.getByNetwork.bind(recentContractsStorage),
      deleteContract: recentContractsStorage.deleteContract.bind(recentContractsStorage),
    }),
    []
  );

  return {
    data,
    isLoading: data === undefined,
    ...methods,
  };
}
