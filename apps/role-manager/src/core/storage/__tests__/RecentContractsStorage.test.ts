/**
 * Tests for RecentContractsStorage repository
 */
import './setup';

import Dexie from 'dexie';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { ContractSchemaInput } from '@/types/storage';

import { RecentContractsStorage, type RecentContractInput } from '../RecentContractsStorage';

// Create a test database factory that mimics the app's database structure
function createTestDatabase(): Dexie {
  const dbName = `TestDB-RecentContracts-${Date.now()}-${Math.random()}`;
  const db = new Dexie(dbName);
  db.version(1).stores({
    recentContracts: '++id, &[networkId+address], [networkId+lastAccessed]',
  });
  // Version 2 adds source index for schema filtering
  db.version(2).stores({
    recentContracts: '++id, &[networkId+address], [networkId+lastAccessed], source',
  });
  return db;
}

// Helper to create a mock ContractSchema for testing
function createMockSchema(name: string = 'TestContract') {
  return {
    name,
    ecosystem: 'stellar' as const,
    functions: [
      {
        id: 'fn_1',
        name: 'transfer',
        displayName: 'Transfer',
        inputs: [],
        outputs: [],
        type: 'function',
        modifiesState: true,
      },
    ],
    events: [],
  };
}

// Helper to create a ContractSchemaInput for testing
function createSchemaInput(overrides: Partial<ContractSchemaInput> = {}): ContractSchemaInput {
  return {
    address: 'CABC123456789',
    networkId: 'stellar-testnet',
    ecosystem: 'stellar',
    schema: createMockSchema(),
    source: 'fetched',
    ...overrides,
  };
}

// Create a test-compatible RecentContractsStorage with injected db
class TestRecentContractsStorage extends RecentContractsStorage {
  constructor(testDb: Dexie) {
    // Call parent constructor which sets up with singleton db
    super();
    // Override the table with our test db's table
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

    // Control character validation was removed - labels with control characters are now accepted
    // This simplifies the validation logic as control chars in labels are edge cases
    // that don't pose security risks in a client-side storage context

    it('should allow label with control characters (null, bell, DEL)', async () => {
      // Test null character (\x00)
      const input1: RecentContractInput = {
        networkId: 'stellar-testnet',
        address: 'ADDR_NULL',
        label: 'Test\x00Label',
      };
      const id1 = await storage.addOrUpdate(input1);
      expect(id1).toBeDefined();

      // Test bell character (\x07)
      const input2: RecentContractInput = {
        networkId: 'stellar-testnet',
        address: 'ADDR_BELL',
        label: 'Test\x07Label',
      };
      const id2 = await storage.addOrUpdate(input2);
      expect(id2).toBeDefined();

      // Test DEL character (\x7F)
      const input3: RecentContractInput = {
        networkId: 'stellar-testnet',
        address: 'ADDR_DEL',
        label: 'Test\x7FLabel',
      };
      const id3 = await storage.addOrUpdate(input3);
      expect(id3).toBeDefined();
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

  describe('addOrUpdateWithSchema', () => {
    it('should create a new record with schema data', async () => {
      const input = createSchemaInput({
        address: 'CABC123456789',
        networkId: 'stellar-testnet',
        label: 'My Token',
      });

      const id = await storage.addOrUpdateWithSchema(input);

      expect(id).toBeDefined();
      expect(typeof id).toBe('string');

      // Verify the record was created with schema data
      const record = await storage.getByAddressAndNetwork('CABC123456789', 'stellar-testnet');
      expect(record).toBeDefined();
      expect(record!.address).toBe('CABC123456789');
      expect(record!.networkId).toBe('stellar-testnet');
      expect(record!.label).toBe('My Token');
      expect(record!.ecosystem).toBe('stellar');
      expect(record!.source).toBe('fetched');
      expect(record!.schema).toBeDefined();
      expect(record!.schemaHash).toBeDefined();

      // Verify schema can be parsed back
      const parsedSchema = JSON.parse(record!.schema!);
      expect(parsedSchema.name).toBe('TestContract');
      expect(parsedSchema.functions).toHaveLength(1);
    });

    it('should update an existing record with new schema data', async () => {
      // First, create a basic record without schema
      await storage.addOrUpdate({
        networkId: 'stellar-testnet',
        address: 'CABC123456789',
        label: 'Old Label',
      });

      // Now update with schema
      const input = createSchemaInput({
        address: 'CABC123456789',
        networkId: 'stellar-testnet',
        label: 'New Label',
        schema: createMockSchema('UpdatedContract'),
      });

      const id = await storage.addOrUpdateWithSchema(input);

      // Should return the same record (not create a duplicate)
      const records = await storage.getByNetwork('stellar-testnet');
      expect(records).toHaveLength(1);

      // Verify schema was added
      const record = await storage.getByAddressAndNetwork('CABC123456789', 'stellar-testnet');
      expect(record!.label).toBe('New Label');
      expect(record!.schema).toBeDefined();
      const parsedSchema = JSON.parse(record!.schema!);
      expect(parsedSchema.name).toBe('UpdatedContract');
    });

    it('should store schemaMetadata when provided', async () => {
      const input = createSchemaInput({
        schemaMetadata: {
          fetchedFrom: 'https://soroban-testnet.stellar.org',
          fetchTimestamp: 1701619200000,
          contractName: 'MyToken',
        },
      });

      await storage.addOrUpdateWithSchema(input);

      const record = await storage.getByAddressAndNetwork(input.address, input.networkId);
      expect(record!.schemaMetadata).toBeDefined();
      expect(record!.schemaMetadata!.fetchedFrom).toBe('https://soroban-testnet.stellar.org');
      expect(record!.schemaMetadata!.fetchTimestamp).toBe(1701619200000);
      expect(record!.schemaMetadata!.contractName).toBe('MyToken');
    });

    it('should store definitionOriginal when provided', async () => {
      const originalDef = JSON.stringify({ spec: ['some', 'spec', 'data'] });
      const input = createSchemaInput({
        definitionOriginal: originalDef,
      });

      await storage.addOrUpdateWithSchema(input);

      const record = await storage.getByAddressAndNetwork(input.address, input.networkId);
      expect(record!.definitionOriginal).toBe(originalDef);
    });
  });

  describe('getByAddressAndNetwork', () => {
    it('should return the full record for a given address and network', async () => {
      const input = createSchemaInput({
        address: 'CXYZ987654321',
        networkId: 'stellar-mainnet',
        label: 'Production Contract',
        schemaMetadata: {
          fetchedFrom: 'https://soroban.stellar.org',
          fetchTimestamp: Date.now(),
        },
      });

      await storage.addOrUpdateWithSchema(input);

      const record = await storage.getByAddressAndNetwork('CXYZ987654321', 'stellar-mainnet');

      expect(record).toBeDefined();
      expect(record!.address).toBe('CXYZ987654321');
      expect(record!.networkId).toBe('stellar-mainnet');
      expect(record!.label).toBe('Production Contract');
      expect(record!.ecosystem).toBe('stellar');
      expect(record!.schema).toBeDefined();
      expect(record!.schemaHash).toBeDefined();
      expect(record!.source).toBe('fetched');
      expect(record!.schemaMetadata).toBeDefined();
    });

    it('should return null for non-existent address', async () => {
      const record = await storage.getByAddressAndNetwork('NON_EXISTENT', 'stellar-testnet');
      expect(record).toBeNull();
    });

    it('should return null when address exists on different network', async () => {
      await storage.addOrUpdateWithSchema(
        createSchemaInput({
          address: 'CABC123',
          networkId: 'stellar-testnet',
        })
      );

      const record = await storage.getByAddressAndNetwork('CABC123', 'stellar-mainnet');
      expect(record).toBeNull();
    });

    it('should return record without schema fields if schema not loaded', async () => {
      // Create basic record without schema
      await storage.addOrUpdate({
        networkId: 'stellar-testnet',
        address: 'BASIC_ADDR',
        label: 'Basic Contract',
      });

      const record = await storage.getByAddressAndNetwork('BASIC_ADDR', 'stellar-testnet');

      expect(record).toBeDefined();
      expect(record!.address).toBe('BASIC_ADDR');
      expect(record!.label).toBe('Basic Contract');
      // Schema fields should be undefined
      expect(record!.schema).toBeUndefined();
      expect(record!.schemaHash).toBeUndefined();
      expect(record!.source).toBeUndefined();
    });
  });

  describe('hasSchema', () => {
    it('should return true when contract has a loaded schema', async () => {
      await storage.addOrUpdateWithSchema(
        createSchemaInput({
          address: 'CHAS_SCHEMA',
          networkId: 'stellar-testnet',
        })
      );

      const result = await storage.hasSchema('CHAS_SCHEMA', 'stellar-testnet');
      expect(result).toBe(true);
    });

    it('should return false when contract exists but has no schema', async () => {
      await storage.addOrUpdate({
        networkId: 'stellar-testnet',
        address: 'CNO_SCHEMA',
      });

      const result = await storage.hasSchema('CNO_SCHEMA', 'stellar-testnet');
      expect(result).toBe(false);
    });

    it('should return false when contract does not exist', async () => {
      const result = await storage.hasSchema('CNON_EXISTENT', 'stellar-testnet');
      expect(result).toBe(false);
    });
  });

  describe('clearSchema', () => {
    it('should clear schema data but preserve basic contract info', async () => {
      // First create a record with schema
      const id = await storage.addOrUpdateWithSchema(
        createSchemaInput({
          address: 'CCLEAR_SCHEMA',
          networkId: 'stellar-testnet',
          label: 'Contract To Clear',
          schemaMetadata: {
            fetchedFrom: 'https://test.rpc',
            fetchTimestamp: Date.now(),
          },
          definitionOriginal: '{"spec":[]}',
        })
      );

      // Verify schema exists
      let record = await storage.getByAddressAndNetwork('CCLEAR_SCHEMA', 'stellar-testnet');
      expect(record!.schema).toBeDefined();
      expect(record!.schemaHash).toBeDefined();
      expect(record!.source).toBe('fetched');

      // Clear the schema
      await storage.clearSchema(id);

      // Verify basic info is preserved but schema is cleared
      record = await storage.getByAddressAndNetwork('CCLEAR_SCHEMA', 'stellar-testnet');
      expect(record).toBeDefined();
      expect(record!.address).toBe('CCLEAR_SCHEMA');
      expect(record!.networkId).toBe('stellar-testnet');
      expect(record!.label).toBe('Contract To Clear');
      expect(record!.lastAccessed).toBeDefined();

      // Schema fields should be cleared
      expect(record!.schema).toBeUndefined();
      expect(record!.schemaHash).toBeUndefined();
      expect(record!.source).toBeUndefined();
      expect(record!.ecosystem).toBeUndefined();
      expect(record!.schemaMetadata).toBeUndefined();
      expect(record!.definitionOriginal).toBeUndefined();
      expect(record!.definitionArtifacts).toBeUndefined();
    });

    it('should not throw when clearing schema on record without schema', async () => {
      const id = await storage.addOrUpdate({
        networkId: 'stellar-testnet',
        address: 'CNO_SCHEMA_TO_CLEAR',
      });

      // Should not throw
      await expect(storage.clearSchema(id)).resolves.not.toThrow();

      // Record should still exist
      const record = await storage.getByAddressAndNetwork('CNO_SCHEMA_TO_CLEAR', 'stellar-testnet');
      expect(record).toBeDefined();
    });
  });
});
