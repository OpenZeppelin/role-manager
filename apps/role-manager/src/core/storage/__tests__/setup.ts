/**
 * Test setup for storage package tests
 * Provides IndexedDB mocking via fake-indexeddb
 */
import 'fake-indexeddb/auto';

import Dexie from 'dexie';
import { vi } from 'vitest';

// Mock the logger utility to avoid console noise in tests
vi.mock('@openzeppelin/ui-builder-utils', async () => {
  const actual = await vi.importActual('@openzeppelin/ui-builder-utils');
  return {
    ...actual,
    logger: {
      info: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
      debug: vi.fn(),
    },
  };
});

/**
 * Mock @openzeppelin/ui-builder-storage to provide the API used by the app.
 * The published npm version has a different API than the local dev version,
 * so we provide compatible mocks for testing.
 */
vi.mock('@openzeppelin/ui-builder-storage', () => {
  // Create a mock database factory
  const createDexieDatabase = (
    name: string,
    versions: Array<{ version: number; stores: Record<string, string> }>
  ) => {
    const db = new Dexie(name);
    for (const { version, stores } of versions) {
      db.version(version).stores(stores);
    }
    return db;
  };

  // Base class for entity storage
  class EntityStorage<T> {
    protected db: Dexie;
    protected tableName: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    protected table: Dexie.Table<T, any>;

    constructor(db: Dexie, tableName: string) {
      this.db = db;
      this.tableName = tableName;
      this.table = db.table(tableName);
    }

    async save(entity: Omit<T, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
      const now = new Date();
      const record = {
        ...entity,
        createdAt: now,
        updatedAt: now,
      } as T;
      const id = await this.table.add(record);
      return String(id);
    }

    async update(id: string, updates: Partial<T>): Promise<void> {
      // Convert string id to number for auto-increment tables
      const numId = parseInt(id, 10);
      // Use type assertion to bypass Dexie's strict UpdateSpec typing
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await this.table.update(numId, { ...updates, updatedAt: new Date() } as any);
    }

    async get(id: string): Promise<T | undefined> {
      // Convert string id to number for auto-increment tables
      const numId = parseInt(id, 10);
      // Handle non-numeric IDs gracefully
      if (isNaN(numId)) {
        return undefined;
      }
      return this.table.get(numId);
    }

    async getAll(): Promise<T[]> {
      return this.table.toArray();
    }

    async delete(id: string): Promise<void> {
      const numId = parseInt(id, 10);
      await this.table.delete(numId);
    }

    async clear(): Promise<void> {
      await this.table.clear();
    }
  }

  // Base class for key-value storage
  class KeyValueStorage<V> {
    protected db: Dexie;
    protected tableName: string;
    protected table: Dexie.Table<
      { key: string; value: V; createdAt: Date; updatedAt: Date },
      string
    >;
    protected options: { maxKeyLength?: number; maxValueSizeBytes?: number };

    constructor(
      db: Dexie,
      tableName: string,
      options: { maxKeyLength?: number; maxValueSizeBytes?: number } = {}
    ) {
      this.db = db;
      this.tableName = tableName;
      this.table = db.table(tableName);
      this.options = options;
    }

    async set(key: string, value: V): Promise<void> {
      if (!key || typeof key !== 'string' || key.trim().length === 0) {
        throw new Error('userPreferences/invalid-key');
      }
      const trimmedKey = key.trim();
      if (this.options.maxKeyLength && trimmedKey.length > this.options.maxKeyLength) {
        throw new Error('userPreferences/key-too-long');
      }
      if (value === undefined) {
        throw new Error('userPreferences/invalid-value');
      }

      const existing = await this.table.get(trimmedKey);
      const now = new Date();
      if (existing) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await this.table.update(trimmedKey, { value, updatedAt: now } as any);
      } else {
        await this.table.add({ key: trimmedKey, value, createdAt: now, updatedAt: now });
      }
    }

    async count(): Promise<number> {
      return this.table.count();
    }

    async keys(): Promise<string[]> {
      const records = await this.table.toArray();
      return records.map((r) => r.key);
    }

    async get<T = V>(key: string): Promise<T | undefined> {
      const record = await this.table.get(key);
      return record?.value as T | undefined;
    }

    async getOrDefault<T = V>(key: string, defaultValue: T): Promise<T> {
      const value = await this.get<T>(key);
      return value ?? defaultValue;
    }

    async has(key: string): Promise<boolean> {
      const record = await this.table.get(key);
      return record !== undefined;
    }

    async delete(key: string): Promise<void> {
      await this.table.delete(key);
    }

    async clear(): Promise<void> {
      await this.table.clear();
    }
  }

  // Helper for quota handling
  const withQuotaHandling = async <T>(tableName: string, fn: () => Promise<T>): Promise<T> => {
    try {
      return await fn();
    } catch (error: unknown) {
      // Handle both Error instances and plain objects with name/message properties
      const err = error as { name?: string; message?: string };
      if (err?.name === 'QuotaExceededError' || err?.message === 'Quota exceeded') {
        throw new Error(`${tableName}/quota-exceeded`);
      }
      throw error;
    }
  };

  // Hook factory
  const createRepositoryHook = () => {
    return () => ({
      data: [],
      loading: false,
      error: null,
    });
  };

  return {
    createDexieDatabase,
    EntityStorage,
    KeyValueStorage,
    withQuotaHandling,
    createRepositoryHook,
  };
});
