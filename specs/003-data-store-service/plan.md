# Implementation Plan: Data Store Service

**Branch**: `003-data-store-service` | **Date**: 2025-12-01 | **Spec**: [specs/003-data-store-service/spec.md](spec.md)
**Input**: Feature specification from `specs/003-data-store-service/spec.md`

## Summary

This feature implements a client-side storage service using IndexedDB (via the refactored `@openzeppelin/ui-builder-storage` package) to persist user data locally. It enables the application to automatically save and list recently accessed contracts and persist user preferences (like network selection) across sessions. This eliminates the need for users to re-type contract addresses and re-configure their environment on every visit.

## Technical Context

**Language/Version**: TypeScript 5.x (via existing monorepo config)
**Primary Dependencies**:

- `@openzeppelin/ui-builder-storage` (DB factory + EntityStorage + KeyValueStorage + React helpers)
- `@openzeppelin/ui-builder-types` (Shared types)
- `dexie` (Underlying DB, transient dependency)
  **Storage**: IndexedDB (via Dexie)
  **Testing**: Vitest (Unit/Integration)
  **Target Platform**: Browser (SPA)
  **Project Type**: Web application (Frontend only)
  **Performance Goals**: < 100ms read latency for lists, no blocking on main thread
  **Constraints**: Offline-capable, client-side only (no backend), storage quota limited by browser
  **Scale/Scope**: < 1000 items typical (Recent Contracts), minimal data volume (< 5MB)

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

- [x] **I. Adapter-Led, Chain-Agnostic**: Feature is purely client-side storage; stores chain-agnostic data (addresses, network IDs). Does not implement chain logic.
- [x] **II. Reuse-First**: Uses `@openzeppelin/ui-builder-storage` package for DB factory, base repositories (EntityStorage, KeyValueStorage), and React composition.
- [x] **III. Type Safety**: Will use strict TypeScript interfaces for storage entities.
- [x] **IV. UI/Design System**: N/A for this plan (UI components will consume this service, but this plan focuses on the data layer).
- [x] **V. Testing and TDD**: Plan includes creating a storage service class that can be unit tested with Vitest (mocking Dexie or using fake-indexeddb).
- [x] **VI. Tooling, Persistence, Autonomy**: Standalone SPA, uses IndexedDB for local persistence.

## Project Structure

### Documentation (this feature)

```text
specs/003-data-store-service/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output (Interfaces/Schemas)
└── tasks.md             # Phase 2 output
```

### Source Code (repository root)

```text
apps/role-manager/src/
├── core/
│   └── storage/
│       ├── index.ts                  # Service exports
│       ├── database.ts               # createDexieDatabase('RoleManager', versions)
│       ├── RecentContractsStorage.ts # RecentContracts repository (extends EntityStorage)
│       └── UserPreferencesStorage.ts # Preferences repository (extends KeyValueStorage)
├── hooks/
│   └── useRecentContracts.ts         # React hook (createRepositoryHook or liveQuery + CRUD)
└── types/
    └── storage.ts                    # Storage entity interfaces
```

**Structure Decision**: Integrated into `apps/role-manager/src/core/storage` following the existing app structure. Use the storage DB factory to declare versions, `EntityStorage` for entity collections, and `KeyValueStorage` for preferences; compose React hooks via the provided helpers.

## Base Class Selection

| Storage                  | Base Class           | Schema      | Use Case                                  |
| ------------------------ | -------------------- | ----------- | ----------------------------------------- |
| `RecentContractsStorage` | `EntityStorage<T>`   | `++id, ...` | Entity collection with auto-generated IDs |
| `UserPreferencesStorage` | `KeyValueStorage<V>` | `&key`      | Key-value store for settings              |

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation | Why Needed | Simpler Alternative Rejected Because |
| --------- | ---------- | ------------------------------------ |
| (None)    |            |                                      |
