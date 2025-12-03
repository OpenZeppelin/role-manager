import { createRepositoryHook } from '@openzeppelin/ui-builder-storage';

import { db } from '@/core/storage';
import { recentContractsStorage } from '@/core/storage/RecentContractsStorage';
import type { RecentContractsStorage as RecentContractsRepo } from '@/core/storage/RecentContractsStorage';
import type { RecentContractRecord } from '@/types/storage';

export function useRecentContracts(networkId: string | undefined) {
  const useRepo = createRepositoryHook<RecentContractRecord, RecentContractsRepo>({
    db,
    tableName: 'recentContracts',
    // Live list for the active network ordered by lastAccessed desc
    query: (table) =>
      networkId
        ? table
            .where('networkId')
            .equals(networkId)
            .sortBy('lastAccessed')
            .then((rows) => rows.reverse())
        : Promise.resolve([]),
    repo: recentContractsStorage,
    expose: (repo) => ({
      addOrUpdate: repo.addOrUpdate.bind(repo),
      getByNetwork: repo.getByNetwork.bind(repo),
      deleteContract: repo.deleteContract.bind(repo),
    }),
  });
  return useRepo();
}
