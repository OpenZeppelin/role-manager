/**
 * Tests for database schema versions
 *
 * Validates that the database schema includes the expected tables
 * and indexes for each version, including the v3 alias schema.
 *
 * Uses the shared storage mock setup which provides ALIAS_SCHEMA.
 */
import './setup';

import Dexie from 'dexie';
import { afterEach, describe, expect, it } from 'vitest';

const ALIAS_SCHEMA_INDEX =
  '++id, [address+networkId], address, networkId, alias, createdAt, updatedAt';

function createTestDatabase(): Dexie {
  const dbName = `TestDB-Schema-${Date.now()}-${Math.random()}`;
  const db = new Dexie(dbName);

  db.version(1).stores({
    recentContracts: '++id, &[networkId+address], [networkId+lastAccessed]',
    userPreferences: '&key',
  });

  db.version(2).stores({
    recentContracts: '++id, &[networkId+address], [networkId+lastAccessed], source',
    userPreferences: '&key',
  });

  db.version(3).stores({
    recentContracts: '++id, &[networkId+address], [networkId+lastAccessed], source',
    userPreferences: '&key',
    aliases: ALIAS_SCHEMA_INDEX,
  });

  db.version(4)
    .stores({
      recentContracts: '++id, &[networkId+address], [networkId+lastAccessed], source',
      userPreferences: '&key',
      aliases: ALIAS_SCHEMA_INDEX,
    })
    .upgrade(async (trans) => {
      const contracts = trans.table('recentContracts');
      const aliases = trans.table('aliases');
      const now = new Date();

      await contracts
        .filter((c: { label?: string }) => !!c.label?.trim())
        .each(async (contract: { address: string; networkId: string; label: string }) => {
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
        });
    });

  return db;
}

describe('database schema', () => {
  let db: Dexie;

  afterEach(async () => {
    try {
      db.close();
      await Dexie.delete(db.name);
    } catch {
      // ignore cleanup errors
    }
  });

  it('has version 4 as latest', () => {
    db = createTestDatabase();
    expect(db.verno).toBe(4);
  });

  it('version 4 includes aliases table', async () => {
    db = createTestDatabase();
    await db.open();

    const tableNames = db.tables.map((t) => t.name);
    expect(tableNames).toContain('recentContracts');
    expect(tableNames).toContain('userPreferences');
    expect(tableNames).toContain('aliases');
  });

  it('aliases table supports basic CRUD', async () => {
    db = createTestDatabase();
    await db.open();

    const aliasesTable = db.table('aliases');

    const id = await aliasesTable.add({
      address: '0x742d35Cc6634C0532925a3b844Bc454e4438f44e',
      alias: 'Treasury',
      networkId: 'ethereum-mainnet',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const record = await aliasesTable.get(id);
    expect(record).toBeTruthy();
    expect(record.alias).toBe('Treasury');
    expect(record.address).toBe('0x742d35Cc6634C0532925a3b844Bc454e4438f44e');
    expect(record.networkId).toBe('ethereum-mainnet');
  });

  it('preserves existing tables in v4 migration', async () => {
    db = createTestDatabase();
    await db.open();

    const recentContracts = db.table('recentContracts');
    await recentContracts.add({
      networkId: 'ethereum-mainnet',
      address: '0xabc',
      lastAccessed: new Date(),
      source: 'manual',
    });

    const count = await recentContracts.count();
    expect(count).toBe(1);
  });

  describe('v4 label-to-alias migration', () => {
    it('migrates contract labels to alias records', async () => {
      const dbName = `TestDB-Migration-${Date.now()}-${Math.random()}`;

      // Seed a v3 database with contracts that have labels
      const oldDb = new Dexie(dbName);
      oldDb.version(1).stores({
        recentContracts: '++id, &[networkId+address], [networkId+lastAccessed]',
        userPreferences: '&key',
      });
      oldDb.version(2).stores({
        recentContracts: '++id, &[networkId+address], [networkId+lastAccessed], source',
        userPreferences: '&key',
      });
      oldDb.version(3).stores({
        recentContracts: '++id, &[networkId+address], [networkId+lastAccessed], source',
        userPreferences: '&key',
        aliases: ALIAS_SCHEMA_INDEX,
      });

      await oldDb.open();
      await oldDb.table('recentContracts').bulkAdd([
        {
          networkId: 'ethereum-mainnet',
          address: '0xAAA',
          label: 'My Treasury',
          lastAccessed: Date.now(),
          source: 'fetched',
        },
        {
          networkId: 'polygon-mainnet',
          address: '0xBBB',
          label: 'DAO Vault',
          lastAccessed: Date.now(),
          source: 'fetched',
        },
        {
          networkId: 'ethereum-mainnet',
          address: '0xCCC',
          lastAccessed: Date.now(),
          source: 'fetched',
        },
      ]);
      oldDb.close();

      // Re-open with v4 schema to trigger upgrade
      const newDb = new Dexie(dbName);
      newDb.version(1).stores({
        recentContracts: '++id, &[networkId+address], [networkId+lastAccessed]',
        userPreferences: '&key',
      });
      newDb.version(2).stores({
        recentContracts: '++id, &[networkId+address], [networkId+lastAccessed], source',
        userPreferences: '&key',
      });
      newDb.version(3).stores({
        recentContracts: '++id, &[networkId+address], [networkId+lastAccessed], source',
        userPreferences: '&key',
        aliases: ALIAS_SCHEMA_INDEX,
      });
      newDb
        .version(4)
        .stores({
          recentContracts: '++id, &[networkId+address], [networkId+lastAccessed], source',
          userPreferences: '&key',
          aliases: ALIAS_SCHEMA_INDEX,
        })
        .upgrade(async (trans) => {
          const contracts = trans.table('recentContracts');
          const aliases = trans.table('aliases');
          const now = new Date();

          await contracts
            .filter((c: { label?: string }) => !!c.label?.trim())
            .each(async (contract: { address: string; networkId: string; label: string }) => {
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
            });
        });

      await newDb.open();

      const aliases = await newDb.table('aliases').toArray();
      expect(aliases).toHaveLength(2);
      expect(aliases.find((a: { address: string }) => a.address === '0xAAA')?.alias).toBe(
        'My Treasury'
      );
      expect(aliases.find((a: { address: string }) => a.address === '0xBBB')?.alias).toBe(
        'DAO Vault'
      );

      // Contract without label should not get an alias
      const noAlias = aliases.find((a: { address: string }) => a.address === '0xCCC');
      expect(noAlias).toBeUndefined();

      newDb.close();
      await Dexie.delete(dbName);
    });

    it('does not overwrite existing aliases during migration', async () => {
      const dbName = `TestDB-Migration-NoOverwrite-${Date.now()}-${Math.random()}`;

      // Seed a v3 database with a contract AND a pre-existing alias
      const oldDb = new Dexie(dbName);
      oldDb.version(1).stores({
        recentContracts: '++id, &[networkId+address], [networkId+lastAccessed]',
        userPreferences: '&key',
      });
      oldDb.version(2).stores({
        recentContracts: '++id, &[networkId+address], [networkId+lastAccessed], source',
        userPreferences: '&key',
      });
      oldDb.version(3).stores({
        recentContracts: '++id, &[networkId+address], [networkId+lastAccessed], source',
        userPreferences: '&key',
        aliases: ALIAS_SCHEMA_INDEX,
      });

      await oldDb.open();
      await oldDb.table('recentContracts').add({
        networkId: 'ethereum-mainnet',
        address: '0xAAA',
        label: 'Old Name',
        lastAccessed: Date.now(),
        source: 'fetched',
      });
      await oldDb.table('aliases').add({
        address: '0xAAA',
        networkId: 'ethereum-mainnet',
        alias: 'User-Set Name',
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      oldDb.close();

      // Re-open with v4 to trigger upgrade
      const newDb = new Dexie(dbName);
      newDb.version(1).stores({
        recentContracts: '++id, &[networkId+address], [networkId+lastAccessed]',
        userPreferences: '&key',
      });
      newDb.version(2).stores({
        recentContracts: '++id, &[networkId+address], [networkId+lastAccessed], source',
        userPreferences: '&key',
      });
      newDb.version(3).stores({
        recentContracts: '++id, &[networkId+address], [networkId+lastAccessed], source',
        userPreferences: '&key',
        aliases: ALIAS_SCHEMA_INDEX,
      });
      newDb
        .version(4)
        .stores({
          recentContracts: '++id, &[networkId+address], [networkId+lastAccessed], source',
          userPreferences: '&key',
          aliases: ALIAS_SCHEMA_INDEX,
        })
        .upgrade(async (trans) => {
          const contracts = trans.table('recentContracts');
          const aliases = trans.table('aliases');
          const now = new Date();

          await contracts
            .filter((c: { label?: string }) => !!c.label?.trim())
            .each(async (contract: { address: string; networkId: string; label: string }) => {
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
            });
        });

      await newDb.open();

      const aliases = await newDb.table('aliases').toArray();
      expect(aliases).toHaveLength(1);
      expect(aliases[0].alias).toBe('User-Set Name');

      newDb.close();
      await Dexie.delete(dbName);
    });
  });
});
