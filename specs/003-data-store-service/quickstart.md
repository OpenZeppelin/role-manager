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

Implement repositories by extending `DexieStorage<T>`.

```typescript
// src/core/storage/RecentContractsStorage.ts
import { DexieStorage } from '@openzeppelin/ui-builder-storage';

import { db } from './database';

export class RecentContractsStorage extends DexieStorage<RecentContractRecord> {
  constructor() {
    super(db, 'recentContracts');
  }
  // addOrUpdate, getByNetwork, etc.
}

export class UserPreferencesStorage extends DexieStorage<UserPreferenceRecord> {
  constructor() {
    super(db, 'userPreferences');
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
    table.where('networkId').equals(activeNetworkId).orderBy('lastAccessed').reverse().toArray(),
  repo: recentContractsStorage,
});
```

## 4. Managing Preferences

Use the `UserPreferencesStorage` service directly or wrap it in a hook if you need reactivity.

```typescript
import { userPreferencesStorage } from '@/core/storage';

// Save preference
await userPreferencesStorage.set('active_network', 'stellar-testnet');

// Read preference
const network = await userPreferencesStorage.get<string>('active_network');
```
