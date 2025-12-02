# Research: Data Store Service

**Branch**: `003-data-store-service`
**Date**: 2025-12-01
**Spec**: [specs/003-data-store-service/spec.md](spec.md)

## Summary

This feature implements a client-side storage service using IndexedDB to persist recent contracts and user preferences. The research reflects the refactored `@openzeppelin/ui-builder-storage` package, which now provides:

- **`EntityStorage<T>`**: Base class for entity collections with auto-generated IDs
- **`KeyValueStorage<V>`**: Base class for key-value stores with `key` as primary key
- **Shared utilities**: `withQuotaHandling`, `isQuotaError` for consistent error handling

## Decisions

### 1. Storage Infrastructure

- **Decision**: Use `createDexieDatabase` from `@openzeppelin/ui-builder-storage` to create an app-specific Dexie instance (e.g., `RoleManager`), and implement repositories by extending the appropriate base class.
- **Rationale**:
  - **App-agnostic & aligned**: Matches the updated UI Builder pattern; each app declares its own DB name and versions.
  - **Isolation**: Separate DB name avoids schema/version collisions with other apps that also use the storage package.
  - **Reuse**: Base classes handle CRUD, timestamps, bulk ops, validation, and quota error handling.
- **Alternatives Considered**:
  - **Subclassing Dexie** (custom `RoleManagerDB` class): Possible but unnecessary now that a first-class DB factory exists; factory is simpler and consistent across apps.

### 2. Base Class Selection

- **`EntityStorage<T>`** for `RecentContractsStorage`:
  - Auto-generated `id` field
  - Schema: `++id, ...`
  - Methods: `save()`, `update()`, `delete()`, `get()`, `getAll()`, `findByIndex()`
- **`KeyValueStorage<V>`** for `UserPreferencesStorage`:
  - `key` field as primary key
  - Schema: `&key`
  - Methods: `set()`, `get()`, `getOrDefault()`, `delete()`, `has()`, `keys()`, `setMany()`, `getMany()`

### 3. Data Structure & Schema

#### Recent Contracts

- **Decision**: Single `recentContracts` table with compound indices.
- **Schema**:
  - `++id` (auto-increment primary key; managed by EntityStorage)
  - `&[networkId+address]` (compound unique index per network + address)
  - `[networkId+lastAccessed]` (compound index for recent-by-network queries)
- **Behavior**:
  - On load: Upsert (update `lastAccessed` if exists, else insert)
  - On list: Query by `networkId`, sort by `lastAccessed` desc

#### User Preferences

- **Decision**: Simple `userPreferences` key-value table.
- **Schema**: `&key`
- **Rationale**: Flexible storage for settings without schema churn. KeyValueStorage handles validation and quota errors.

### 4. State Management Integration

- **Decision**: Compose hooks using storage React factories (e.g., `createRepositoryHook`, or `createLiveQueryHook` + `createCrudHook`).
- **Rationale**:
  - Reactive updates via `useLiveQuery`.
  - Clean separation: UI calls hook; hook calls repository.

## Implementation Details

### Database & Repository Setup

```typescript
import {
  createDexieDatabase,
  EntityStorage,
  KeyValueStorage,
} from '@openzeppelin/ui-builder-storage';

export const db = createDexieDatabase('RoleManager', [
  {
    version: 1,
    stores: {
      recentContracts: '++id, &[networkId+address], [networkId+lastAccessed]',
      userPreferences: '&key',
    },
  },
]);

// Entity collection with auto-generated IDs
export class RecentContractsStorage extends EntityStorage<RecentContractRecord> {
  constructor() {
    super(db, 'recentContracts');
  }
  // addOrUpdate, getByNetwork, etc.
}

// Key-value store with key as primary key
export class UserPreferencesStorage extends KeyValueStorage<unknown> {
  constructor() {
    super(db, 'userPreferences', {
      maxKeyLength: 128,
      maxValueSizeBytes: 1024 * 1024,
    });
  }
  // Convenience methods: getString, getNumber, getBoolean
}
```

### Hook Composition (optional)

```typescript
import { createRepositoryHook } from '@openzeppelin/ui-builder-storage';

export const useRecentContracts = createRepositoryHook<
  RecentContractRecord,
  RecentContractsStorage
>({
  db,
  tableName: 'recentContracts',
  query: (table) =>
    table
      .where('networkId')
      .equals(activeNetworkId)
      .sortBy('lastAccessed')
      .then((rows) => rows.reverse()),
  repo: recentContractsStorage, // instance of RecentContractsStorage
  // onError, fileIO, expose (optional)
});
```

## Open Questions Resolved

- **Q**: Can we reuse `EntityStorage` with a custom DB instance?
- **A**: Yes. Pass the Dexie instance created by `createDexieDatabase` to the `EntityStorage` constructor.

- **Q**: How to handle unique constraints and upserts?
- **A**: Use `&[networkId+address]` for uniqueness. For upserts, implement `addOrUpdate` in the repository using `table.put` or pre-check + `update`.

- **Q**: What base class to use for key-value storage?
- **A**: Use `KeyValueStorage<V>` which is designed for `&key` primary key schemas with built-in validation and quota handling.
