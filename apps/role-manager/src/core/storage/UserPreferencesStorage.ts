import { KeyValueStorage } from '@openzeppelin/ui-builder-storage';

import { db } from './database';

/**
 * Storage service for persisting user preferences as key-value pairs.
 * Extends KeyValueStorage for built-in validation, quota handling, and bulk operations.
 *
 * @example
 * ```typescript
 * await userPreferencesStorage.set('theme', 'dark');
 * const theme = await userPreferencesStorage.get<string>('theme');
 * ```
 */
export class UserPreferencesStorage extends KeyValueStorage<unknown> {
  constructor() {
    super(db, 'userPreferences', {
      maxKeyLength: 128,
      maxValueSizeBytes: 1024 * 1024, // 1MB
    });
  }

  /**
   * Gets a string preference value.
   * Returns undefined if not found or if value is not a string.
   */
  async getString(key: string): Promise<string | undefined> {
    const value = await this.get(key);
    return typeof value === 'string' ? value : undefined;
  }

  /**
   * Gets a number preference value.
   * Returns undefined if not found or if value is not a number.
   */
  async getNumber(key: string): Promise<number | undefined> {
    const value = await this.get(key);
    return typeof value === 'number' && !Number.isNaN(value) ? value : undefined;
  }

  /**
   * Gets a boolean preference value.
   * Returns undefined if not found or if value is not a boolean.
   */
  async getBoolean(key: string): Promise<boolean | undefined> {
    const value = await this.get(key);
    return typeof value === 'boolean' ? value : undefined;
  }
}

// Export singleton instance
export const userPreferencesStorage = new UserPreferencesStorage();
