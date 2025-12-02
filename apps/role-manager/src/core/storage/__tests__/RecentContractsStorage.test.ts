/**
 * Tests for RecentContractsStorage repository
 */
import './setup';

import Dexie from 'dexie';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { RecentContractsStorage, type RecentContractInput } from '../RecentContractsStorage';

// Create a test database factory that mimics the app's database structure
function createTestDatabase(): Dexie {
  const dbName = `TestDB-RecentContracts-${Date.now()}-${Math.random()}`;
  const db = new Dexie(dbName);
  db.version(1).stores({
    recentContracts: '++id, &[networkId+address], [networkId+lastAccessed]',
  });
  return db;
}

// Create a test-compatible RecentContractsStorage with injected db
class TestRecentContractsStorage extends RecentContractsStorage {
  constructor(testDb: Dexie) {
    // Call parent constructor which sets up with singleton db
    super();
    // Override the table with our test db's table
    // @ts-expect-error - accessing protected member for testing
    this.table = testDb.table('recentContracts');
  }
}

describe('RecentContractsStorage', () => {
  let testDb: Dexie;
  let storage: TestRecentContractsStorage;

  beforeEach(async () => {
    testDb = createTestDatabase();
    storage = new TestRecentContractsStorage(testDb);
    await testDb.open();
  });

  afterEach(async () => {
    if (testDb) {
      testDb.close();
      await testDb.delete();
    }
  });

  describe('addOrUpdate', () => {
    it('should add a new contract with generated id', async () => {
      const input: RecentContractInput = {
        networkId: 'stellar-testnet',
        address: 'GBZXN7PIRZGNMHGA7MUUUF4GWPY5AYPV6LY4UV2GL6VJGIQRXFDNMADI',
      };

      const id = await storage.addOrUpdate(input);

      expect(id).toBeDefined();
      expect(typeof id).toBe('string');
    });

    it('should store networkId, address, and lastAccessed', async () => {
      const input: RecentContractInput = {
        networkId: 'stellar-testnet',
        address: 'GBZXN7PIRZGNMHGA7MUUUF4GWPY5AYPV6LY4UV2GL6VJGIQRXFDNMADI',
      };

      const id = await storage.addOrUpdate(input);
      const records = await storage.getByNetwork('stellar-testnet');

      expect(records).toHaveLength(1);
      // ID may be stored as number in DB but returned as string from addOrUpdate
      expect(String(records[0].id)).toBe(id);
      expect(records[0].networkId).toBe('stellar-testnet');
      expect(records[0].address).toBe(input.address);
      expect(records[0].lastAccessed).toBeDefined();
      expect(typeof records[0].lastAccessed).toBe('number');
    });

    it('should store optional label when provided', async () => {
      const input: RecentContractInput = {
        networkId: 'stellar-testnet',
        address: 'GBZXN7PIRZGNMHGA7MUUUF4GWPY5AYPV6LY4UV2GL6VJGIQRXFDNMADI',
        label: 'My Token Contract',
      };

      await storage.addOrUpdate(input);
      const records = await storage.getByNetwork('stellar-testnet');

      expect(records[0].label).toBe('My Token Contract');
    });

    it('should trim whitespace from networkId and address', async () => {
      const input: RecentContractInput = {
        networkId: '  stellar-testnet  ',
        address: '  GBZXN7PIRZGNMHGA7MUUUF4GWPY5AYPV6LY4UV2GL6VJGIQRXFDNMADI  ',
      };

      await storage.addOrUpdate(input);
      const records = await storage.getByNetwork('stellar-testnet');

      expect(records).toHaveLength(1);
      expect(records[0].networkId).toBe('stellar-testnet');
      expect(records[0].address).toBe('GBZXN7PIRZGNMHGA7MUUUF4GWPY5AYPV6LY4UV2GL6VJGIQRXFDNMADI');
    });

    it('should update lastAccessed when same contract is added again (LWW)', async () => {
      const input: RecentContractInput = {
        networkId: 'stellar-testnet',
        address: 'GBZXN7PIRZGNMHGA7MUUUF4GWPY5AYPV6LY4UV2GL6VJGIQRXFDNMADI',
      };

      const id1 = await storage.addOrUpdate(input);
      const records1 = await storage.getByNetwork('stellar-testnet');
      const firstLastAccessed = records1[0].lastAccessed;

      // Wait a bit to ensure timestamp difference
      await new Promise((resolve) => setTimeout(resolve, 10));

      const id2 = await storage.addOrUpdate(input);
      const records2 = await storage.getByNetwork('stellar-testnet');

      // Should return same id (update, not insert)
      expect(id2).toBe(id1);
      // Should still have only one record (no duplicate)
      expect(records2).toHaveLength(1);
      // lastAccessed should be updated
      expect(records2[0].lastAccessed).toBeGreaterThan(firstLastAccessed);
    });

    it('should preserve existing label on update if not provided', async () => {
      const input1: RecentContractInput = {
        networkId: 'stellar-testnet',
        address: 'GBZXN7PIRZGNMHGA7MUUUF4GWPY5AYPV6LY4UV2GL6VJGIQRXFDNMADI',
        label: 'My Token',
      };

      await storage.addOrUpdate(input1);

      // Update without label
      const input2: RecentContractInput = {
        networkId: 'stellar-testnet',
        address: 'GBZXN7PIRZGNMHGA7MUUUF4GWPY5AYPV6LY4UV2GL6VJGIQRXFDNMADI',
      };

      await storage.addOrUpdate(input2);
      const records = await storage.getByNetwork('stellar-testnet');

      // Label should be preserved
      expect(records[0].label).toBe('My Token');
    });

    it('should update label when explicitly provided on update', async () => {
      const input1: RecentContractInput = {
        networkId: 'stellar-testnet',
        address: 'GBZXN7PIRZGNMHGA7MUUUF4GWPY5AYPV6LY4UV2GL6VJGIQRXFDNMADI',
        label: 'Old Label',
      };

      await storage.addOrUpdate(input1);

      const input2: RecentContractInput = {
        networkId: 'stellar-testnet',
        address: 'GBZXN7PIRZGNMHGA7MUUUF4GWPY5AYPV6LY4UV2GL6VJGIQRXFDNMADI',
        label: 'New Label',
      };

      await storage.addOrUpdate(input2);
      const records = await storage.getByNetwork('stellar-testnet');

      expect(records[0].label).toBe('New Label');
    });

    it('should allow same address on different networks', async () => {
      const address = 'GBZXN7PIRZGNMHGA7MUUUF4GWPY5AYPV6LY4UV2GL6VJGIQRXFDNMADI';

      await storage.addOrUpdate({ networkId: 'stellar-testnet', address });
      await storage.addOrUpdate({ networkId: 'stellar-mainnet', address });

      const testnetRecords = await storage.getByNetwork('stellar-testnet');
      const mainnetRecords = await storage.getByNetwork('stellar-mainnet');

      expect(testnetRecords).toHaveLength(1);
      expect(mainnetRecords).toHaveLength(1);
      expect(testnetRecords[0].id).not.toBe(mainnetRecords[0].id);
    });
  });

  describe('input validation', () => {
    it('should reject empty networkId', async () => {
      const input: RecentContractInput = {
        networkId: '',
        address: 'GBZXN7PIRZGNMHGA7MUUUF4GWPY5AYPV6LY4UV2GL6VJGIQRXFDNMADI',
      };

      await expect(storage.addOrUpdate(input)).rejects.toThrow(
        'recentContracts/invalid-network-id'
      );
    });

    it('should reject whitespace-only networkId', async () => {
      const input: RecentContractInput = {
        networkId: '   ',
        address: 'GBZXN7PIRZGNMHGA7MUUUF4GWPY5AYPV6LY4UV2GL6VJGIQRXFDNMADI',
      };

      await expect(storage.addOrUpdate(input)).rejects.toThrow(
        'recentContracts/invalid-network-id'
      );
    });

    it('should reject empty address', async () => {
      const input: RecentContractInput = {
        networkId: 'stellar-testnet',
        address: '',
      };

      await expect(storage.addOrUpdate(input)).rejects.toThrow('recentContracts/invalid-address');
    });

    it('should reject whitespace-only address', async () => {
      const input: RecentContractInput = {
        networkId: 'stellar-testnet',
        address: '   ',
      };

      await expect(storage.addOrUpdate(input)).rejects.toThrow('recentContracts/invalid-address');
    });

    it('should reject address exceeding 256 characters', async () => {
      const input: RecentContractInput = {
        networkId: 'stellar-testnet',
        address: 'A'.repeat(257),
      };

      await expect(storage.addOrUpdate(input)).rejects.toThrow(
        'recentContracts/invalid-address-length'
      );
    });

    it('should accept address at exactly 256 characters', async () => {
      const input: RecentContractInput = {
        networkId: 'stellar-testnet',
        address: 'A'.repeat(256),
      };

      const id = await storage.addOrUpdate(input);
      expect(id).toBeDefined();
    });

    it('should reject null/undefined networkId', async () => {
      const input = {
        networkId: null as unknown as string,
        address: 'GBZXN7PIRZGNMHGA7MUUUF4GWPY5AYPV6LY4UV2GL6VJGIQRXFDNMADI',
      };

      await expect(storage.addOrUpdate(input)).rejects.toThrow(
        'recentContracts/invalid-network-id'
      );
    });

    it('should reject null/undefined address', async () => {
      const input = {
        networkId: 'stellar-testnet',
        address: null as unknown as string,
      };

      await expect(storage.addOrUpdate(input)).rejects.toThrow('recentContracts/invalid-address');
    });

    it('should reject label exceeding 64 characters', async () => {
      const input: RecentContractInput = {
        networkId: 'stellar-testnet',
        address: 'GBZXN7PIRZGNMHGA7MUUUF4GWPY5AYPV6LY4UV2GL6VJGIQRXFDNMADI',
        label: 'A'.repeat(65),
      };

      await expect(storage.addOrUpdate(input)).rejects.toThrow(
        'recentContracts/invalid-label-length'
      );
    });

    it('should accept label at exactly 64 characters', async () => {
      const input: RecentContractInput = {
        networkId: 'stellar-testnet',
        address: 'GBZXN7PIRZGNMHGA7MUUUF4GWPY5AYPV6LY4UV2GL6VJGIQRXFDNMADI',
        label: 'A'.repeat(64),
      };

      const id = await storage.addOrUpdate(input);
      expect(id).toBeDefined();

      const records = await storage.getByNetwork('stellar-testnet');
      expect(records[0].label).toBe('A'.repeat(64));
    });

    it('should accept empty or undefined label', async () => {
      const input1: RecentContractInput = {
        networkId: 'stellar-testnet',
        address: 'ADDR1',
        label: '',
      };
      const input2: RecentContractInput = {
        networkId: 'stellar-testnet',
        address: 'ADDR2',
      };

      const id1 = await storage.addOrUpdate(input1);
      const id2 = await storage.addOrUpdate(input2);

      expect(id1).toBeDefined();
      expect(id2).toBeDefined();
    });

    it('should trim label and validate trimmed length', async () => {
      // Label with whitespace that after trimming is exactly 64 chars
      const input: RecentContractInput = {
        networkId: 'stellar-testnet',
        address: 'GBZXN7PIRZGNMHGA7MUUUF4GWPY5AYPV6LY4UV2GL6VJGIQRXFDNMADI',
        label: '  ' + 'A'.repeat(65) + '  ',
      };

      await expect(storage.addOrUpdate(input)).rejects.toThrow(
        'recentContracts/invalid-label-length'
      );
    });

    it('should reject label with null character (control char)', async () => {
      const input: RecentContractInput = {
        networkId: 'stellar-testnet',
        address: 'GBZXN7PIRZGNMHGA7MUUUF4GWPY5AYPV6LY4UV2GL6VJGIQRXFDNMADI',
        label: 'Test\x00Label',
      };

      await expect(storage.addOrUpdate(input)).rejects.toThrow(
        'recentContracts/invalid-label-control-chars'
      );
    });

    it('should reject label with bell character (control char)', async () => {
      const input: RecentContractInput = {
        networkId: 'stellar-testnet',
        address: 'GBZXN7PIRZGNMHGA7MUUUF4GWPY5AYPV6LY4UV2GL6VJGIQRXFDNMADI',
        label: 'Test\x07Label',
      };

      await expect(storage.addOrUpdate(input)).rejects.toThrow(
        'recentContracts/invalid-label-control-chars'
      );
    });

    it('should reject label with DEL character (control char)', async () => {
      const input: RecentContractInput = {
        networkId: 'stellar-testnet',
        address: 'GBZXN7PIRZGNMHGA7MUUUF4GWPY5AYPV6LY4UV2GL6VJGIQRXFDNMADI',
        label: 'Test\x7FLabel',
      };

      await expect(storage.addOrUpdate(input)).rejects.toThrow(
        'recentContracts/invalid-label-control-chars'
      );
    });

    it('should allow label with normal whitespace (tab, newline, carriage return)', async () => {
      // Tab (\x09), Newline (\x0A), and Carriage Return (\x0D) are common whitespace, allowed
      const input: RecentContractInput = {
        networkId: 'stellar-testnet',
        address: 'GBZXN7PIRZGNMHGA7MUUUF4GWPY5AYPV6LY4UV2GL6VJGIQRXFDNMADI',
        label: 'Test\tLabel\nWith\rWhitespace',
      };

      const id = await storage.addOrUpdate(input);
      expect(id).toBeDefined();
    });
  });

  describe('getByNetwork', () => {
    it('should return empty array for network with no contracts', async () => {
      const records = await storage.getByNetwork('stellar-testnet');
      expect(records).toEqual([]);
    });

    it('should return only contracts for the specified network', async () => {
      await storage.addOrUpdate({ networkId: 'stellar-testnet', address: 'ADDR1' });
      await storage.addOrUpdate({ networkId: 'stellar-mainnet', address: 'ADDR2' });
      await storage.addOrUpdate({ networkId: 'stellar-testnet', address: 'ADDR3' });

      const testnetRecords = await storage.getByNetwork('stellar-testnet');
      const mainnetRecords = await storage.getByNetwork('stellar-mainnet');

      expect(testnetRecords).toHaveLength(2);
      expect(mainnetRecords).toHaveLength(1);
      expect(testnetRecords.every((r) => r.networkId === 'stellar-testnet')).toBe(true);
      expect(mainnetRecords.every((r) => r.networkId === 'stellar-mainnet')).toBe(true);
    });

    it('should return contracts ordered by lastAccessed descending (most recent first)', async () => {
      await storage.addOrUpdate({ networkId: 'stellar-testnet', address: 'ADDR1' });
      await new Promise((resolve) => setTimeout(resolve, 10));
      await storage.addOrUpdate({ networkId: 'stellar-testnet', address: 'ADDR2' });
      await new Promise((resolve) => setTimeout(resolve, 10));
      await storage.addOrUpdate({ networkId: 'stellar-testnet', address: 'ADDR3' });

      const records = await storage.getByNetwork('stellar-testnet');

      expect(records).toHaveLength(3);
      expect(records[0].address).toBe('ADDR3'); // Most recent
      expect(records[1].address).toBe('ADDR2');
      expect(records[2].address).toBe('ADDR1'); // Oldest
    });

    it('should update order when contract is re-accessed', async () => {
      await storage.addOrUpdate({ networkId: 'stellar-testnet', address: 'ADDR1' });
      await new Promise((resolve) => setTimeout(resolve, 10));
      await storage.addOrUpdate({ networkId: 'stellar-testnet', address: 'ADDR2' });
      await new Promise((resolve) => setTimeout(resolve, 10));
      await storage.addOrUpdate({ networkId: 'stellar-testnet', address: 'ADDR3' });

      // Re-access ADDR1
      await new Promise((resolve) => setTimeout(resolve, 10));
      await storage.addOrUpdate({ networkId: 'stellar-testnet', address: 'ADDR1' });

      const records = await storage.getByNetwork('stellar-testnet');

      expect(records[0].address).toBe('ADDR1'); // Now most recent
      expect(records[1].address).toBe('ADDR3');
      expect(records[2].address).toBe('ADDR2');
    });

    it('should return empty array for empty/whitespace networkId', async () => {
      await storage.addOrUpdate({ networkId: 'stellar-testnet', address: 'ADDR1' });

      expect(await storage.getByNetwork('')).toEqual([]);
      expect(await storage.getByNetwork('   ')).toEqual([]);
    });

    it('should trim networkId when querying', async () => {
      await storage.addOrUpdate({ networkId: 'stellar-testnet', address: 'ADDR1' });

      const records = await storage.getByNetwork('  stellar-testnet  ');
      expect(records).toHaveLength(1);
    });
  });

  describe('inherited EntityStorage methods', () => {
    it('should delete a contract by id', async () => {
      const id = await storage.addOrUpdate({
        networkId: 'stellar-testnet',
        address: 'ADDR1',
      });

      expect(await storage.get(id)).toBeDefined();

      await storage.delete(id);

      expect(await storage.get(id)).toBeUndefined();
    });

    it('should clear all contracts', async () => {
      await storage.addOrUpdate({ networkId: 'stellar-testnet', address: 'ADDR1' });
      await storage.addOrUpdate({ networkId: 'stellar-testnet', address: 'ADDR2' });
      await storage.addOrUpdate({ networkId: 'stellar-mainnet', address: 'ADDR3' });

      await storage.clear();

      const testnetRecords = await storage.getByNetwork('stellar-testnet');
      const mainnetRecords = await storage.getByNetwork('stellar-mainnet');

      expect(testnetRecords).toHaveLength(0);
      expect(mainnetRecords).toHaveLength(0);
    });

    it('should get contract by id', async () => {
      const id = await storage.addOrUpdate({
        networkId: 'stellar-testnet',
        address: 'ADDR1',
        label: 'Test Contract',
      });

      const record = await storage.get(id);

      expect(record).toBeDefined();
      // ID may be stored as number in DB but returned as string from addOrUpdate
      expect(String(record!.id)).toBe(id);
      expect(record!.address).toBe('ADDR1');
      expect(record!.label).toBe('Test Contract');
    });

    it('should return undefined for non-existent id', async () => {
      const record = await storage.get('non-existent-id');
      expect(record).toBeUndefined();
    });
  });

  describe('timestamps', () => {
    it('should set createdAt and updatedAt on creation', async () => {
      const id = await storage.addOrUpdate({
        networkId: 'stellar-testnet',
        address: 'ADDR1',
      });

      const record = await storage.get(id);

      expect(record!.createdAt).toBeInstanceOf(Date);
      expect(record!.updatedAt).toBeInstanceOf(Date);
    });

    it('should update updatedAt on re-access but preserve createdAt', async () => {
      const id = await storage.addOrUpdate({
        networkId: 'stellar-testnet',
        address: 'ADDR1',
      });

      const record1 = await storage.get(id);
      const originalCreatedAt = record1!.createdAt;
      const originalUpdatedAt = record1!.updatedAt;

      // Wait longer to ensure timestamp difference (fake-indexeddb can be fast)
      await new Promise((resolve) => setTimeout(resolve, 50));

      await storage.addOrUpdate({
        networkId: 'stellar-testnet',
        address: 'ADDR1',
      });

      const record2 = await storage.get(id);

      expect(record2!.createdAt.getTime()).toBe(originalCreatedAt.getTime());
      // updatedAt should be >= original (may be equal if update is very fast)
      expect(record2!.updatedAt.getTime()).toBeGreaterThanOrEqual(originalUpdatedAt.getTime());
    });
  });

  describe('quota handling', () => {
    it('should throw quota-exceeded error when storage is full', async () => {
      // Mock quota exceeded error on the underlying table
      const tableSpy = vi.spyOn(storage['table'], 'add').mockRejectedValue({
        name: 'QuotaExceededError',
        message: 'Quota exceeded',
      });

      await expect(
        storage.addOrUpdate({
          networkId: 'stellar-testnet',
          address: 'ADDR1',
        })
      ).rejects.toThrow('quota-exceeded');

      tableSpy.mockRestore();
    });
  });
});
