# Quickstart: Data Store Service

This guide explains how to integrate and use the local data store service in the Role Manager application.

## Prerequisites

Ensure `@openzeppelin/ui-builder-storage` is installed (it should be part of the workspace).

## 1. Database Initialization

Create an app-specific Dexie database using the storage package factory and define the schema for `recentContracts` and `userPreferences`.

```typescript
// src/core/storage/database.ts
import { createDexieDatabase } from '@openzeppelin/ui-builder-storage';

export const db = createDexieDatabase('RoleManager', [
  {
    version: 1,
    stores: {
      recentContracts: '++id, &[networkId+address], [networkId+lastAccessed]',
      userPreferences: '&key',
    },
  },
]);
```

## 2. Storage Services

The storage package provides two base classes:

- **`EntityStorage<T>`**: For entity collections with auto-generated IDs (e.g., recent contracts)
- **`KeyValueStorage<V>`**: For key-value stores with `key` as primary key (e.g., preferences)

### Recent Contracts (EntityStorage)

```typescript
// src/core/storage/RecentContractsStorage.ts
import { EntityStorage, withQuotaHandling } from '@openzeppelin/ui-builder-storage';

import { db } from './database';

export class RecentContractsStorage extends EntityStorage<RecentContractRecord> {
  constructor() {
    super(db, 'recentContracts');
  }

  async addOrUpdate(input: RecentContractInput): Promise<string> {
    // Validation...
    return await withQuotaHandling(this.tableName, async () => {
      // Find existing or create new...
    });
  }

  async getByNetwork(networkId: string): Promise<RecentContractRecord[]> {
    // Query by network, sort by lastAccessed desc
  }
}
```

### User Preferences (KeyValueStorage)

```typescript
// src/core/storage/UserPreferencesStorage.ts
import { KeyValueStorage } from '@openzeppelin/ui-builder-storage';

import { db } from './database';

export class UserPreferencesStorage extends KeyValueStorage<unknown> {
  constructor() {
    super(db, 'userPreferences', {
      maxKeyLength: 128,
      maxValueSizeBytes: 1024 * 1024, // 1MB
    });
  }

  // Convenience methods for typed access
  async getString(key: string): Promise<string | undefined> {
    const value = await this.get(key);
    return typeof value === 'string' ? value : undefined;
  }
}
```

## 3. Using Recent Contracts (React)

You can compose a repository hook using the React helpers for live queries and CRUD.

```typescript
import { createRepositoryHook } from '@openzeppelin/ui-builder-storage';

export const useRecentContracts = createRepositoryHook<
  RecentContractRecord,
  RecentContractsStorage
>({
  db,
  tableName: 'recentContracts',
  // Example query: most recent for the active network
  query: (table) =>
    table
      .where('networkId')
      .equals(activeNetworkId)
      .sortBy('lastAccessed')
      .then((rows) => rows.reverse()),
  repo: recentContractsStorage,
});
```

## 4. Managing Preferences

Use the `UserPreferencesStorage` service directly or wrap it in a hook if you need reactivity.

```typescript
import { userPreferencesStorage } from '@/core/storage';

// Save preference
await userPreferencesStorage.set('active_network', 'stellar-testnet');

// Read preference (typed)
const network = await userPreferencesStorage.get<string>('active_network');

// Read with convenience method
const theme = await userPreferencesStorage.getString('theme');

// Use getOrDefault for fallbacks
const pageSize = await userPreferencesStorage.getOrDefault('page_size', 10);
```

## 5. Key Differences: EntityStorage vs KeyValueStorage

| Aspect           | EntityStorage                             | KeyValueStorage                           |
| ---------------- | ----------------------------------------- | ----------------------------------------- |
| **Primary Key**  | Auto-generated `id`                       | User-provided `key`                       |
| **Schema**       | `++id, ...`                               | `&key`                                    |
| **Use Case**     | Collections (contracts, items)            | Settings, preferences                     |
| **Base Record**  | `BaseRecord` (id, createdAt, updatedAt)   | `KeyValueRecord` (key, value, timestamps) |
| **Main Methods** | `save()`, `update()`, `get()`, `getAll()` | `set()`, `get()`, `getOrDefault()`        |
