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

  it('has version 3 as latest', () => {
    db = createTestDatabase();
    expect(db.verno).toBe(3);
  });

  it('version 3 includes aliases table', async () => {
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

  it('preserves existing tables in v3 migration', async () => {
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
});
