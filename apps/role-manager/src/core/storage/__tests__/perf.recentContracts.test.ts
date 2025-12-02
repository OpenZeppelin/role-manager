/**
 * Performance micro-benchmarks for RecentContractsStorage
 *
 * Tests performance requirements from spec:
 * - SC-002: Support ≥50 records per network with acceptable performance
 * - SC-003: List/query latency < 100ms
 */
import './setup';

import Dexie from 'dexie';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { RecentContractsStorage } from '../RecentContractsStorage';

// Create a test database factory
function createTestDatabase(): Dexie {
  const dbName = `PerfTestDB-${Date.now()}-${Math.random()}`;
  const db = new Dexie(dbName);
  db.version(1).stores({
    recentContracts: '++id, &[networkId+address], [networkId+lastAccessed]',
  });
  return db;
}

// Create a test-compatible RecentContractsStorage with injected db
class TestRecentContractsStorage extends RecentContractsStorage {
  constructor(testDb: Dexie) {
    super();
    // @ts-expect-error - accessing protected member for testing
    this.table = testDb.table('recentContracts');
  }
}

// Helper to generate unique addresses
function generateAddress(index: number): string {
  return `ADDR_${index.toString().padStart(10, '0')}`;
}

describe('RecentContractsStorage Performance', () => {
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

  describe('SC-002: Support ≥50 records per network', () => {
    it(
      'should handle inserting 50 contracts efficiently (< 5s total)',
      { timeout: 15000 },
      async () => {
        const networkId = 'stellar-testnet';
        const count = 50;

        const startTime = performance.now();

        for (let i = 0; i < count; i++) {
          await storage.addOrUpdate({
            networkId,
            address: generateAddress(i),
            label: `Contract ${i}`,
          });
        }

        const endTime = performance.now();
        const duration = endTime - startTime;

        // Verify all records were inserted
        const records = await storage.getByNetwork(networkId);
        expect(records).toHaveLength(count);

        // Total insert time should be reasonable (< 5s for 50 records)
        expect(duration).toBeLessThan(5000);

        // Log for informational purposes
        console.log(`Inserted ${count} records in ${duration.toFixed(2)}ms`);
        console.log(`Average insert time: ${(duration / count).toFixed(2)}ms per record`);
      }
    );

    it(
      'should handle 50 contracts per network across multiple networks',
      { timeout: 30000 },
      async () => {
        const networks = ['stellar-testnet', 'stellar-mainnet', 'ethereum-mainnet'];
        const countPerNetwork = 50;

        const startTime = performance.now();

        for (const networkId of networks) {
          for (let i = 0; i < countPerNetwork; i++) {
            await storage.addOrUpdate({
              networkId,
              address: generateAddress(i),
            });
          }
        }

        const endTime = performance.now();
        const duration = endTime - startTime;

        // Verify counts per network
        for (const networkId of networks) {
          const records = await storage.getByNetwork(networkId);
          expect(records).toHaveLength(countPerNetwork);
        }

        console.log(
          `Inserted ${countPerNetwork * networks.length} records across ${networks.length} networks in ${duration.toFixed(2)}ms`
        );
      }
    );
  });

  describe('SC-003: List/query latency < 100ms', () => {
    beforeEach(async () => {
      // Pre-populate with 50 contracts
      const networkId = 'stellar-testnet';
      for (let i = 0; i < 50; i++) {
        await storage.addOrUpdate({
          networkId,
          address: generateAddress(i),
          label: `Contract ${i}`,
        });
      }
    });

    it('should list 50 contracts in < 100ms', async () => {
      const networkId = 'stellar-testnet';

      // Warm-up query (to ensure any lazy initialization is done)
      await storage.getByNetwork(networkId);

      // Measure query time
      const startTime = performance.now();
      const records = await storage.getByNetwork(networkId);
      const endTime = performance.now();

      const duration = endTime - startTime;

      expect(records).toHaveLength(50);
      expect(duration).toBeLessThan(100);

      console.log(`Listed 50 contracts in ${duration.toFixed(2)}ms`);
    });

    it('should maintain < 100ms query time across multiple consecutive queries', async () => {
      const networkId = 'stellar-testnet';
      const queryCount = 10;
      const durations: number[] = [];

      for (let i = 0; i < queryCount; i++) {
        const startTime = performance.now();
        await storage.getByNetwork(networkId);
        const endTime = performance.now();
        durations.push(endTime - startTime);
      }

      const avgDuration = durations.reduce((a, b) => a + b, 0) / durations.length;
      const maxDuration = Math.max(...durations);

      expect(maxDuration).toBeLessThan(100);
      expect(avgDuration).toBeLessThan(50); // Average should be even faster

      console.log(`Average query time over ${queryCount} queries: ${avgDuration.toFixed(2)}ms`);
      console.log(`Max query time: ${maxDuration.toFixed(2)}ms`);
    });

    it('should return records in correct order (most recent first)', async () => {
      const networkId = 'stellar-testnet';

      const records = await storage.getByNetwork(networkId);

      // Verify ordering by lastAccessed desc
      for (let i = 1; i < records.length; i++) {
        expect(records[i - 1].lastAccessed).toBeGreaterThanOrEqual(records[i].lastAccessed);
      }
    });
  });

  describe('Update performance (LWW)', () => {
    beforeEach(async () => {
      // Pre-populate with 50 contracts
      for (let i = 0; i < 50; i++) {
        await storage.addOrUpdate({
          networkId: 'stellar-testnet',
          address: generateAddress(i),
        });
      }
    });

    it('should update existing contract in < 50ms (LWW)', async () => {
      const networkId = 'stellar-testnet';
      const existingAddress = generateAddress(25); // Middle of the list

      // Warm-up
      await storage.addOrUpdate({ networkId, address: existingAddress });

      // Measure update time
      const startTime = performance.now();
      await storage.addOrUpdate({
        networkId,
        address: existingAddress,
        label: 'Updated Label',
      });
      const endTime = performance.now();

      const duration = endTime - startTime;

      expect(duration).toBeLessThan(50);

      console.log(`Updated existing contract in ${duration.toFixed(2)}ms`);
    });

    it('should handle burst updates efficiently', async () => {
      const networkId = 'stellar-testnet';
      const updateCount = 20;

      const startTime = performance.now();

      // Update 20 random existing contracts
      for (let i = 0; i < updateCount; i++) {
        const randomIndex = Math.floor(Math.random() * 50);
        await storage.addOrUpdate({
          networkId,
          address: generateAddress(randomIndex),
        });
      }

      const endTime = performance.now();
      const duration = endTime - startTime;

      // Should still have exactly 50 records (no duplicates)
      const records = await storage.getByNetwork(networkId);
      expect(records).toHaveLength(50);

      console.log(`Performed ${updateCount} updates in ${duration.toFixed(2)}ms`);
      console.log(`Average update time: ${(duration / updateCount).toFixed(2)}ms`);
    });
  });

  describe('Delete performance', () => {
    beforeEach(async () => {
      for (let i = 0; i < 50; i++) {
        await storage.addOrUpdate({
          networkId: 'stellar-testnet',
          address: generateAddress(i),
        });
      }
    });

    it('should delete a single record in < 50ms', async () => {
      const records = await storage.getByNetwork('stellar-testnet');
      const idToDelete = records[25].id;

      const startTime = performance.now();
      await storage.delete(idToDelete);
      const endTime = performance.now();

      const duration = endTime - startTime;

      expect(duration).toBeLessThan(50);

      const remainingRecords = await storage.getByNetwork('stellar-testnet');
      expect(remainingRecords).toHaveLength(49);

      console.log(`Deleted single record in ${duration.toFixed(2)}ms`);
    });

    it('should clear all records in < 100ms', async () => {
      const startTime = performance.now();
      await storage.clear();
      const endTime = performance.now();

      const duration = endTime - startTime;

      expect(duration).toBeLessThan(100);

      const records = await storage.getByNetwork('stellar-testnet');
      expect(records).toHaveLength(0);

      console.log(`Cleared all records in ${duration.toFixed(2)}ms`);
    });
  });

  describe('Memory and scale considerations', () => {
    it('should handle 100 contracts without degradation', async () => {
      const networkId = 'stellar-testnet';
      const count = 100;

      // Insert 100 contracts
      for (let i = 0; i < count; i++) {
        await storage.addOrUpdate({
          networkId,
          address: generateAddress(i),
          label: `Contract with a reasonably long label for testing ${i}`,
        });
      }

      // Query should still be fast
      const startTime = performance.now();
      const records = await storage.getByNetwork(networkId);
      const endTime = performance.now();

      const duration = endTime - startTime;

      expect(records).toHaveLength(count);
      expect(duration).toBeLessThan(100); // Still under 100ms

      console.log(`Listed ${count} contracts in ${duration.toFixed(2)}ms`);
    }, 30000); // 30s timeout for this test
  });
});
