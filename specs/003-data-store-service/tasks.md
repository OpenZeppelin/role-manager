# Tasks: Data Store Service

This document lists actionable, dependency-ordered tasks for implementing the Data Store Service. Tasks are grouped by phases and user stories. Each task follows the strict checklist format.

## Phase 1 — Setup

- [x] T001 Create feature folder scaffolding per plan (no code changes required)
- [x] T002 Add storage package to app dependencies if missing (apps/role-manager/package.json)
- [x] T003 Ensure TypeScript path aliases for core/hooks/types exist (apps/role-manager/tsconfig.json)

## Phase 2 — Foundational (Blocking prerequisites)

- [x] T004 Create database factory file using createDexieDatabase in apps/role-manager/src/core/storage/database.ts
- [x] T005 Create storage entity interfaces in apps/role-manager/src/types/storage.ts
- [x] T006 Create storage service export barrel in apps/role-manager/src/core/storage/index.ts

## Phase 3 — User Story 1 (P1): Recall Recently Accessed Contracts

Goal: Persist and display recently accessed contracts per network, ordered by lastAccessed, with uniqueness per [networkId,address].

Independent Test: Load a contract; verify it appears in recents. Reload same contract; verify timestamp updated without duplicate. Delete entry; verify removal persists.

- [x] T007 [US1] Implement RecentContractsStorage repository (save/addOrUpdate/getByNetwork/delete/clear) in apps/role-manager/src/core/storage/RecentContractsStorage.ts
- [x] T008 [P] [US1] Enforce Dexie schema indices (&[networkId+address], [networkId+lastAccessed]) in apps/role-manager/src/core/storage/database.ts
- [x] T009 [P] [US1] Implement useRecentContracts hook with live query and CRUD in apps/role-manager/src/hooks/useRecentContracts.ts
- [x] T010 [P] [US1] Wire label nickname support in repository (optional field persisted) in apps/role-manager/src/core/storage/RecentContractsStorage.ts
- [x] T011 [US1] Add adapter/address validation gate before persistence in apps/role-manager/src/core/storage/RecentContractsStorage.ts
- [x] T012 [US1] Add empty-state handling and integration point (return [] and flags) in apps/role-manager/src/hooks/useRecentContracts.ts
- [x] T013 [US1] Implement last-writer-wins conflict resolution on lastAccessed in apps/role-manager/src/core/storage/RecentContractsStorage.ts
- [x] T014 [US1] Add quota-exceeded error mapping and user-facing error propagation in apps/role-manager/src/hooks/useRecentContracts.ts
- [x] T015 [US1] Export repository and hook from storage index in apps/role-manager/src/core/storage/index.ts

## Phase 4 — User Story 2 (P2): Persist User Preferences

Goal: Persist user-selected network and display settings across sessions.

Independent Test: Change network; reload app; verify preference restored.

- [x] T016 [US2] Implement UserPreferencesStorage repository (set/get/clear) in apps/role-manager/src/core/storage/UserPreferencesStorage.ts
- [x] T017 [P] [US2] Add convenience helpers for typed get/set (e.g., get<string>) in apps/role-manager/src/core/storage/UserPreferencesStorage.ts
- [x] T018 [US2] Add assumptions/constraints enforcement (max label length, trimming) in apps/role-manager/src/core/storage/UserPreferencesStorage.ts

## Phase 5 — Polish & Cross-Cutting

- [x] T019 Add unit tests with fake-indexeddb for repositories (apps/role-manager/src/core/storage/**tests**/RecentContractsStorage.test.ts)
- [x] T020 [P] Add unit tests for hooks (apps/role-manager/src/hooks/**tests**/useRecentContracts.test.tsx)
- [x] T021 [P] Add performance micro-benchmarks for listing 50 items (apps/role-manager/src/core/storage/**tests**/perf.recentContracts.test.ts)
- [x] T022 Document storage usage in developer docs (apps/role-manager/README.md)

## Dependencies (Story Order)

1. Phase 1 → Phase 2 → US1 (Phase 3) → US2 (Phase 4) → Polish (Phase 5)
2. US2 can start after Phase 2; does not depend on US1 runtime code

## Parallelization Examples

- T008, T009, T010 can proceed in parallel after T004 and T005
- T017 can proceed in parallel with T016 once the repository file exists
- Test tasks (T019–T021) can run in parallel after repositories/hooks are implemented

## Implementation Strategy (MVP)

- MVP scope: Complete Phase 2 + Phase 3 (US1). Defer preferences (US2) and polish.
- Deliver a working recent contracts list per network with add/update/delete, ordering, uniqueness, and basic error handling.
