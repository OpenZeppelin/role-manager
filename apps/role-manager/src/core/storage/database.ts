import { createDexieDatabase } from '@openzeppelin/ui-builder-storage';

export const db = createDexieDatabase('RoleManager', [
  {
    version: 1,
    stores: {
      // Compound unique index to prevent duplicates per network/address
      // Compound index for efficient recents by network ordering
      recentContracts: '++id, &[networkId+address], [networkId+lastAccessed]',
      userPreferences: '&key',
    },
  },
]);
