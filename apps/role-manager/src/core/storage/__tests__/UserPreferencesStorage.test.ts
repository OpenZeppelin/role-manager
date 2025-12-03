/**
 * Tests for UserPreferencesStorage repository
 */
import './setup';

import Dexie from 'dexie';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { UserPreferencesStorage } from '../UserPreferencesStorage';

// Create a test database factory that mimics the app's database structure
function createTestDatabase(): Dexie {
  const dbName = `TestDB-UserPreferences-${Date.now()}-${Math.random()}`;
  const db = new Dexie(dbName);
  db.version(1).stores({
    userPreferences: '&key',
  });
  return db;
}

// Create a test-compatible UserPreferencesStorage with injected db
class TestUserPreferencesStorage extends UserPreferencesStorage {
  constructor(testDb: Dexie) {
    super();
    this.table = testDb.table('userPreferences');
  }
}

describe('UserPreferencesStorage', () => {
  let testDb: Dexie;
  let storage: TestUserPreferencesStorage;

  beforeEach(async () => {
    testDb = createTestDatabase();
    storage = new TestUserPreferencesStorage(testDb);
    await testDb.open();
  });

  afterEach(async () => {
    if (testDb) {
      testDb.close();
      await testDb.delete();
    }
  });

  describe('set and get', () => {
    it('should store and retrieve a string value', async () => {
      await storage.set('theme', 'dark');
      const value = await storage.get<string>('theme');
      expect(value).toBe('dark');
    });

    it('should store and retrieve a number value', async () => {
      await storage.set('fontSize', 14);
      const value = await storage.get<number>('fontSize');
      expect(value).toBe(14);
    });

    it('should store and retrieve a boolean value', async () => {
      await storage.set('notifications', true);
      const value = await storage.get<boolean>('notifications');
      expect(value).toBe(true);
    });

    it('should store and retrieve an object value', async () => {
      const settings = { color: 'blue', size: 'large' };
      await storage.set('displaySettings', settings);
      const value = await storage.get<typeof settings>('displaySettings');
      expect(value).toEqual(settings);
    });

    it('should return undefined for non-existent key', async () => {
      const value = await storage.get<string>('non-existent');
      expect(value).toBeUndefined();
    });

    it('should update existing value (upsert)', async () => {
      await storage.set('theme', 'light');
      await storage.set('theme', 'dark');
      const value = await storage.get<string>('theme');
      expect(value).toBe('dark');
    });
  });

  describe('convenience getters', () => {
    describe('getString', () => {
      it('should return string value when stored', async () => {
        await storage.set('theme', 'dark');
        const value = await storage.getString('theme');
        expect(value).toBe('dark');
      });

      it('should return undefined for non-existent key', async () => {
        const value = await storage.getString('missing');
        expect(value).toBeUndefined();
      });

      it('should return undefined for non-string value', async () => {
        await storage.set('count', 42);
        const value = await storage.getString('count');
        expect(value).toBeUndefined();
      });
    });

    describe('getNumber', () => {
      it('should return number value when stored', async () => {
        await storage.set('fontSize', 14);
        const value = await storage.getNumber('fontSize');
        expect(value).toBe(14);
      });

      it('should return undefined for non-existent key', async () => {
        const value = await storage.getNumber('missing');
        expect(value).toBeUndefined();
      });

      it('should return undefined for non-number value', async () => {
        await storage.set('theme', 'dark');
        const value = await storage.getNumber('theme');
        expect(value).toBeUndefined();
      });

      it('should return undefined for NaN', async () => {
        await storage.set('invalid', NaN);
        const value = await storage.getNumber('invalid');
        expect(value).toBeUndefined();
      });
    });

    describe('getBoolean', () => {
      it('should return boolean value when stored', async () => {
        await storage.set('enabled', true);
        const value = await storage.getBoolean('enabled');
        expect(value).toBe(true);
      });

      it('should return false boolean correctly', async () => {
        await storage.set('disabled', false);
        const value = await storage.getBoolean('disabled');
        expect(value).toBe(false);
      });

      it('should return undefined for non-existent key', async () => {
        const value = await storage.getBoolean('missing');
        expect(value).toBeUndefined();
      });

      it('should return undefined for non-boolean value', async () => {
        await storage.set('theme', 'dark');
        const value = await storage.getBoolean('theme');
        expect(value).toBeUndefined();
      });

      it('should return undefined for truthy non-boolean values', async () => {
        await storage.set('truthy', 1);
        const value = await storage.getBoolean('truthy');
        expect(value).toBeUndefined();
      });
    });
  });

  describe('getOrDefault', () => {
    it('should return stored value when exists', async () => {
      await storage.set('theme', 'dark');
      const value = await storage.getOrDefault('theme', 'light');
      expect(value).toBe('dark');
    });

    it('should return default value when key does not exist', async () => {
      const value = await storage.getOrDefault('missing', 'default');
      expect(value).toBe('default');
    });
  });

  describe('delete', () => {
    it('should remove a key', async () => {
      await storage.set('theme', 'dark');
      expect(await storage.has('theme')).toBe(true);

      await storage.delete('theme');
      expect(await storage.has('theme')).toBe(false);
    });

    it('should not throw when deleting non-existent key', async () => {
      await expect(storage.delete('non-existent')).resolves.not.toThrow();
    });
  });

  describe('has', () => {
    it('should return true for existing key', async () => {
      await storage.set('theme', 'dark');
      expect(await storage.has('theme')).toBe(true);
    });

    it('should return false for non-existent key', async () => {
      expect(await storage.has('missing')).toBe(false);
    });
  });

  describe('clear', () => {
    it('should remove all preferences', async () => {
      await storage.set('theme', 'dark');
      await storage.set('fontSize', 14);
      await storage.set('notifications', true);

      expect(await storage.count()).toBe(3);

      await storage.clear();

      expect(await storage.count()).toBe(0);
    });
  });

  describe('keys', () => {
    it('should return all stored keys', async () => {
      await storage.set('a', 'value');
      await storage.set('b', 'value');
      await storage.set('c', 'value');

      const keys = await storage.keys();

      expect(keys).toHaveLength(3);
      expect(keys).toContain('a');
      expect(keys).toContain('b');
      expect(keys).toContain('c');
    });

    it('should return empty array when no preferences', async () => {
      const keys = await storage.keys();
      expect(keys).toEqual([]);
    });
  });

  describe('count', () => {
    it('should return 0 when empty', async () => {
      expect(await storage.count()).toBe(0);
    });

    it('should return correct count', async () => {
      await storage.set('a', 'value');
      expect(await storage.count()).toBe(1);

      await storage.set('b', 'value');
      await storage.set('c', 'value');
      expect(await storage.count()).toBe(3);
    });
  });

  describe('key validation (inherited)', () => {
    it('should reject empty keys', async () => {
      await expect(storage.set('', 'value')).rejects.toThrow('invalid-key');
    });

    it('should reject whitespace-only keys', async () => {
      await expect(storage.set('   ', 'value')).rejects.toThrow('invalid-key');
    });

    it('should trim keys', async () => {
      await storage.set('  theme  ', 'dark');
      const value = await storage.get<string>('theme');
      expect(value).toBe('dark');
    });

    it('should reject keys exceeding maxKeyLength (128)', async () => {
      const longKey = 'a'.repeat(129);
      await expect(storage.set(longKey, 'value')).rejects.toThrow('key-too-long');
    });

    it('should accept keys at exactly 128 characters', async () => {
      const exactKey = 'a'.repeat(128);
      await storage.set(exactKey, 'value');
      expect(await storage.get(exactKey)).toBe('value');
    });
  });

  describe('value validation (inherited)', () => {
    it('should reject undefined values', async () => {
      await expect(storage.set('key', undefined)).rejects.toThrow('invalid-value');
    });

    it('should accept null values', async () => {
      await storage.set('nullable', null);
      const value = await storage.get('nullable');
      expect(value).toBeNull();
    });
  });
});
