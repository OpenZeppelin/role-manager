# Research: Data Store Service

**Branch**: `003-data-store-service`
**Date**: 2025-12-01
**Spec**: [specs/003-data-store-service/spec.md](spec.md)

## Summary

This feature implements a client-side storage service using IndexedDB to persist recent contracts and user preferences. The research reflects the refactored `@openzeppelin/ui-builder-storage` package, which now provides an app-agnostic database factory and React helpers.

## Decisions

### 1. Storage Infrastructure

- **Decision**: Use `createDexieDatabase` from `@openzeppelin/ui-builder-storage` to create an app-specific Dexie instance (e.g., `RoleManager`), and implement repositories by extending `DexieStorage<T>`.
- **Rationale**:
  - **App-agnostic & aligned**: Matches the updated UI Builder pattern; each app declares its own DB name and versions.
  - **Isolation**: Separate DB name avoids schema/version collisions with other apps that also use the storage package.
  - **Reuse**: `DexieStorage` handles CRUD, timestamps, bulk ops, and index queries.
- **Alternatives Considered**:
  - **Subclassing Dexie** (custom `RoleManagerDB` class): Possible but unnecessary now that a first-class DB factory exists; factory is simpler and consistent across apps.

### 2. Data Structure & Schema

#### Recent Contracts

- **Decision**: Single `recentContracts` table with compound indices.
- **Schema**:
  - `++id` (auto-increment primary key; managed by Dexie)
  - `&[networkId+address]` (compound unique index per network + address)
  - `[networkId+lastAccessed]` (compound index for recent-by-network queries)
- **Behavior**:
  - On load: Upsert (update `lastAccessed` if exists, else insert)
  - On list: Query by `networkId`, sort by `lastAccessed` desc

#### User Preferences

- **Decision**: Simple `userPreferences` key-value table.
- **Schema**: `&key`
- **Rationale**: Flexible storage for settings without schema churn.

### 3. State Management Integration

- **Decision**: Compose hooks using storage React factories (e.g., `createRepositoryHook`, or `createLiveQueryHook` + `createCrudHook`).
- **Rationale**:
  - Reactive updates via `useLiveQuery`.
  - Clean separation: UI calls hook; hook calls repository.

## Implementation Details

### Database & Repository Setup

```typescript
import { createDexieDatabase, DexieStorage } from '@openzeppelin/ui-builder-storage';

export const db = createDexieDatabase('RoleManager', [
  {
    version: 1,
    stores: {
      recentContracts: '++id, &[networkId+address], [networkId+lastAccessed]',
      userPreferences: '&key',
    },
  },
]);

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
    table.where('networkId').equals(activeNetworkId).orderBy('lastAccessed').reverse().toArray(),
  repo: recentContractsStorage, // instance of RecentContractsStorage
  // onError, fileIO, expose (optional)
});
```

## Open Questions Resolved

- **Q**: Can we reuse `DexieStorage` with a custom DB instance?
- **A**: Yes. Pass the Dexie instance created by `createDexieDatabase` to the `DexieStorage` constructor.

- **Q**: How to handle unique constraints and upserts?
- **A**: Use `&[networkId+address]` for uniqueness. For upserts, implement `addOrUpdate` in the repository using `table.put` or pre-check + `update`.
