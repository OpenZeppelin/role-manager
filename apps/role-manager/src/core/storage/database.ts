import { ALIAS_SCHEMA, createDexieDatabase } from '@openzeppelin/ui-storage';

export const db = createDexieDatabase('RoleManager', [
  {
    version: 1,
    stores: {
      recentContracts: '++id, &[networkId+address], [networkId+lastAccessed]',
      userPreferences: '&key',
    },
  },
  {
    version: 2,
    stores: {
      recentContracts: '++id, &[networkId+address], [networkId+lastAccessed], source',
      userPreferences: '&key',
    },
  },
  {
    version: 3,
    stores: {
      recentContracts: '++id, &[networkId+address], [networkId+lastAccessed], source',
      userPreferences: '&key',
      ...ALIAS_SCHEMA,
    },
  },
  {
    version: 4,
    stores: {
      recentContracts: '++id, &[networkId+address], [networkId+lastAccessed], source',
      userPreferences: '&key',
      ...ALIAS_SCHEMA,
    },
    upgrade: async (trans) => {
      const contracts = trans.table('recentContracts');
      const aliases = trans.table('aliases');
      const now = new Date();

      const labeled = await contracts
        .filter((c: { label?: string }) => !!c.label?.trim())
        .toArray();

      for (const contract of labeled as { address: string; networkId: string; label: string }[]) {
        const existing = await aliases
          .where('[address+networkId]')
          .equals([contract.address, contract.networkId])
          .first();

        if (!existing) {
          await aliases.add({
            address: contract.address,
            networkId: contract.networkId,
            alias: contract.label.trim(),
            createdAt: now,
            updatedAt: now,
          });
        }
      }
    },
  },
  {
    version: 5,
    stores: {
      recentContracts: '++id, &[networkId+address], [networkId+lastAccessed], source',
      userPreferences: '&key',
      ...ALIAS_SCHEMA,
      accessManagerSync: '&[networkId+address]',
    },
  },
]);
