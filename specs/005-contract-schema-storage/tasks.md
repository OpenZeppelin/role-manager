# Tasks: Contract Schema Loading and Storage

**Input**: Design documents from `/specs/005-contract-schema-storage/`  
**Prerequisites**: plan.md ✓, spec.md ✓, research.md ✓, data-model.md ✓, contracts/storage.ts ✓, quickstart.md ✓

**Tests**: TDD is REQUIRED per Constitution §V for storage methods, hooks, and services.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3, US4)
- Include exact file paths in descriptions

## Path Conventions

- **Monorepo app**: `apps/role-manager/src/`
- **Scripts**: `scripts/`
- **Tests**: Colocated with source in `__tests__/` directories

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Add new dependency and update local development scripts

- [x] T001 Add `@openzeppelin/ui-builder-renderer` dependency to `apps/role-manager/package.json`
- [x] T002 [P] Update `scripts/setup-local-dev.cjs` to include `'@openzeppelin/ui-builder-renderer'` in UI_BUILDER_PACKAGES array
- [x] T003 Run `pnpm install` to verify dependency resolution

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core storage infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

### Tests for Foundational (TDD - Write FIRST, verify FAIL)

- [x] T004 [P] Write test: `addOrUpdateWithSchema()` creates record with schema in `apps/role-manager/src/core/storage/__tests__/RecentContractsStorage.test.ts`
- [x] T005 [P] Write test: `addOrUpdateWithSchema()` updates existing record in `apps/role-manager/src/core/storage/__tests__/RecentContractsStorage.test.ts`
- [x] T006 [P] Write test: `getByAddressAndNetwork()` returns full record in `apps/role-manager/src/core/storage/__tests__/RecentContractsStorage.test.ts`
- [x] T007 [P] Write test: `hasSchema()` returns correct boolean in `apps/role-manager/src/core/storage/__tests__/RecentContractsStorage.test.ts`
- [x] T008 [P] Write test: `clearSchema()` removes schema but keeps basic info in `apps/role-manager/src/core/storage/__tests__/RecentContractsStorage.test.ts`

### Implementation for Foundational

- [x] T009 Extend `RecentContractRecord` interface with schema fields in `apps/role-manager/src/types/storage.ts`
- [x] T010 Add `ContractSchemaMetadata`, `ContractSchemaSource` types in `apps/role-manager/src/types/storage.ts`
- [x] T011 Update database to version 2 with `source` index in `apps/role-manager/src/core/storage/database.ts`
- [x] T012 Implement `addOrUpdateWithSchema()` method in `apps/role-manager/src/core/storage/RecentContractsStorage.ts`
- [x] T013 Implement `getByAddressAndNetwork()` method in `apps/role-manager/src/core/storage/RecentContractsStorage.ts`
- [x] T014 Implement `hasSchema()` method in `apps/role-manager/src/core/storage/RecentContractsStorage.ts`
- [x] T015 Implement `clearSchema()` method in `apps/role-manager/src/core/storage/RecentContractsStorage.ts`
- [x] T016 Run tests to verify all foundational tests pass

**Checkpoint**: Storage layer complete - user story implementation can now begin

---

## Phase 3: User Story 1 - Load Contract Schema by Address (Priority: P1) 🎯 MVP

**Goal**: Users can enter a Stellar contract ID and load its schema via Soroban RPC with dynamic form rendering

**Independent Test**: Enter a valid Stellar contract ID on testnet, verify the system fetches and displays the contract's functions

### Tests for User Story 1 (TDD - Write FIRST, verify FAIL)

- [x] T017 [P] [US1] Write test: circuit breaker blocks after 3 failures in `apps/role-manager/src/hooks/__tests__/useContractSchemaLoader.test.tsx`
- [x] T018 [P] [US1] Write test: circuit breaker resets on success in `apps/role-manager/src/hooks/__tests__/useContractSchemaLoader.test.tsx`
- [x] T019 [P] [US1] Write test: `load()` returns schema on success in `apps/role-manager/src/hooks/__tests__/useContractSchemaLoader.test.tsx`
- [x] T020 [P] [US1] Write test: `load()` sets error state on failure in `apps/role-manager/src/hooks/__tests__/useContractSchemaLoader.test.tsx`

### Implementation for User Story 1

- [x] T021 [US1] Create `CircuitBreakerState` and `CircuitBreakerConfig` types in `apps/role-manager/src/types/schema.ts`
- [x] T022 [US1] Implement `useContractSchemaLoader` hook with circuit breaker in `apps/role-manager/src/hooks/useContractSchemaLoader.ts`
- [x] T023 [US1] Update `AddContractForm` to use `DynamicFormField` for adapter-driven inputs in `apps/role-manager/src/components/Contracts/AddContractForm.tsx`
- [x] T024 [US1] ~~Create standalone ContractSchemaDisplay~~ REMOVED - schema loading integrated into AddContractDialog flow
- [x] T025 [US1] Update exports in `apps/role-manager/src/components/Contracts/index.ts`
- [x] T026 [US1] Integrate schema loading into `AddContractDialog` (load-first, save-on-success flow) in `apps/role-manager/src/components/Contracts/AddContractDialog.tsx`
- [x] T027 [US1] Add error handling for invalid contract ID, not found, and network errors
- [x] T028 [US1] Add loading indicators during schema fetch
- [x] T029 [US1] Run US1 tests to verify all pass (18/18 tests pass)

**Checkpoint**: User Story 1 (MVP) is complete - users can load Stellar contract schemas via RPC

**Implementation Note**: Instead of a standalone `LoadContractSchemaDialog`, schema loading was integrated directly into the existing `AddContractDialog`. The flow is: form → load schema → save with schema on success → error state with retry on failure. The `AddContractForm` uses `DynamicFormField` from `@openzeppelin/ui-builder-renderer` to render adapter-specific inputs (e.g., contractAddress for Stellar, contractAddress + ABI for EVM).

---

## Phase 4: User Story 2 - Provide Manual Contract Definition (Priority: P2) ⏸️ BLOCKED

**Goal**: Users can provide JSON spec when automatic fetching fails

**Independent Test**: Paste a valid JSON spec for a contract, verify the system parses and displays functions correctly

> **⚠️ BLOCKED BY ADAPTER**: The Stellar adapter currently only returns `contractAddress` from `getContractDefinitionInputs()`. Manual definition support requires the adapter to add a `contractDefinition` field first. See [adapter.ts lines 157-180](https://github.com/OpenZeppelin/contracts-ui-builder/blob/main/packages/adapter-stellar/src/adapter.ts#L157-L180) for the documented enhancement plan.
>
> **Architecture Ready**: Role Manager's dynamic form rendering and storage (with `source: 'manual'`) are designed to support this automatically when the adapter is updated.
>
> **Skip this phase for MVP** - resume when `@openzeppelin/ui-builder-adapter-stellar` adds manual definition input.

### Tests for User Story 2 (TDD - DEFERRED until adapter supports manual input)

- [ ] T030 [P] [US2] Write test: manual JSON spec is parsed correctly in `apps/role-manager/src/hooks/__tests__/useContractSchemaLoader.test.tsx`
- [ ] T031 [P] [US2] Write test: invalid JSON spec returns clear error in `apps/role-manager/src/hooks/__tests__/useContractSchemaLoader.test.tsx`
- [ ] T032 [P] [US2] Write test: manual definition takes precedence over fetched in `apps/role-manager/src/hooks/__tests__/useContractSchemaLoader.test.tsx`

### Implementation for User Story 2 (DEFERRED)

- [ ] T033 [US2] Update `ContractDefinitionForm` to handle manual spec input (will work automatically when adapter provides the field)
- [ ] T034 [US2] Add validation for manual JSON spec format in `apps/role-manager/src/hooks/useContractSchemaLoader.ts`
- [ ] T035 [US2] Add clear error messages for parsing failures (JSON syntax, invalid structure)
- [ ] T036 [US2] Ensure manual definition sets `source: 'manual'` when saving
- [ ] T037 [US2] Run US2 tests to verify all pass

**Checkpoint**: User Story 2 complete - users can provide manual contract definitions (when adapter supports it)

---

## Phase 5: User Story 3 - Persist Contract Schema for Offline Use (Priority: P2)

**Goal**: Loaded schemas are stored locally and restored on app reopen without network requests

**Independent Test**: Load a contract, close the app, reopen, verify schema is available without network

### Tests for User Story 3 (TDD - Write FIRST, verify FAIL)

- [x] T038 [P] [US3] Write test: `useContractSchema` loads from storage when available in `apps/role-manager/src/hooks/__tests__/useContractSchema.test.tsx`
- [x] T039 [P] [US3] Write test: `useContractSchema` skips network when schema exists in `apps/role-manager/src/hooks/__tests__/useContractSchema.test.tsx`
- [x] T040 [P] [US3] Write test: multiple contracts are restored correctly in `apps/role-manager/src/hooks/__tests__/useContractSchema.test.tsx`

### Implementation for User Story 3

- [x] T041 [US3] Create `useContractSchema` hook that checks storage first in `apps/role-manager/src/hooks/useContractSchema.ts`
- [x] T042 [US3] Implement storage-first loading strategy (check IndexedDB before RPC)
- [x] T043 [US3] Auto-save schema to storage after successful load
- [x] T044 [US3] Handle storage quota errors gracefully with user message
- [x] T045 [US3] Run US3 tests to verify all pass (20/20 tests pass)

**Checkpoint**: User Story 3 complete - schemas persist offline

**Implementation Note**: The `useContractSchema` hook provides storage-first loading with automatic persistence. Key features:

- Checks IndexedDB before making network requests
- Auto-saves schemas to storage after successful network loads via `recentContractsStorage.addOrUpdateWithSchema()`
- Handles storage quota errors gracefully (shows schema even if save fails)
- Delegates network loading to `useContractSchemaLoader` (with circuit breaker protection)
- Supports multiple contracts and different networks with correct isolation

---

## Phase 6: User Story 4 - Refresh Contract Schema (Priority: P3) ⏸️ POSTPONED

**Goal**: Users can refresh fetched schemas to detect changes, with function-level diff reporting

**Independent Test**: Load a contract, trigger refresh, verify system reports "no changes" or shows diff

> **⏸️ POSTPONED**: Schema refresh functionality is not a priority for the current Stellar integration focus. The core MVP (US1 - load schema via RPC) and offline persistence (US3) are complete. Schema refresh can be revisited after Stellar-specific features are fully implemented and validated.
>
> **Skip this phase for now** - resume when schema refresh becomes a user priority.

### Tests for User Story 4 (TDD - Write FIRST, verify FAIL)

- [ ] T046 [P] [US4] Write test: `getRefreshableContracts()` excludes manual schemas in `apps/role-manager/src/core/storage/__tests__/RecentContractsStorage.test.ts`
- [ ] T047 [P] [US4] Write test: `compareSchemas()` detects added functions in `apps/role-manager/src/services/__tests__/schemaComparisonService.test.ts`
- [ ] T048 [P] [US4] Write test: `compareSchemas()` detects removed functions in `apps/role-manager/src/services/__tests__/schemaComparisonService.test.ts`
- [ ] T049 [P] [US4] Write test: `compareSchemas()` detects modified functions in `apps/role-manager/src/services/__tests__/schemaComparisonService.test.ts`
- [ ] T050 [P] [US4] Write test: `compareSchemas()` returns identical for unchanged schemas in `apps/role-manager/src/services/__tests__/schemaComparisonService.test.ts`

### Implementation for User Story 4

- [ ] T051 [US4] Implement `getRefreshableContracts()` method (source === 'fetched') in `apps/role-manager/src/core/storage/RecentContractsStorage.ts`
- [ ] T052 [US4] Create `schemaComparisonService.ts` with `compareSchemas()` function in `apps/role-manager/src/services/schemaComparisonService.ts`
- [ ] T053 [US4] Implement function-level diff detection (added, removed, modified)
- [ ] T054 [US4] Create `SchemaRefreshButton` component in `apps/role-manager/src/components/Contracts/SchemaRefreshButton.tsx`
- [ ] T055 [US4] Implement refresh UI with diff display (summary of changes)
- [ ] T056 [US4] Add "no changes detected" confirmation message
- [ ] T057 [US4] Skip refresh for manual schemas with user feedback
- [ ] T058 [US4] Export `SchemaRefreshButton` from `apps/role-manager/src/components/Contracts/index.ts`
- [ ] T059 [US4] Run US4 tests to verify all pass

**Checkpoint**: User Story 4 complete - users can refresh schemas and see diffs

---

## Phase 7: Polish & Cross-Cutting Concerns ✅ COMPLETE

**Purpose**: Final validation and cleanup

- [x] T060 [P] Update exports in `apps/role-manager/src/hooks/index.ts` (if exists) or create barrel file
- [x] T061 [P] Run full test suite to verify no regressions (189/189 tests pass)
- [x] T062 Validate quickstart.md scenarios work end-to-end
- [x] T063 Run linting and fix any issues (all pass)
- [x] T064 Review code for Constitution compliance (adapter-led, no chain-specific UI logic)
- [x] T065 Update any relevant documentation

**Checkpoint**: Feature implementation complete for MVP + Offline Persistence (US1 + US3)

---

## Dependencies & Execution Order

### Phase Dependencies

```
Phase 1 (Setup) → Phase 2 (Foundational) → User Stories (3-6) → Phase 7 (Polish)
                         ↓
              BLOCKS all user stories
```

### User Story Dependencies

| Story    | Depends On         | Can Start After  | Independent?           |
| -------- | ------------------ | ---------------- | ---------------------- |
| US1 (P1) | Foundational       | Phase 2 complete | ✅ Yes                 |
| US2 (P2) | **Adapter update** | Adapter enhanced | ⏸️ BLOCKED (adapter)   |
| US3 (P2) | Foundational       | Phase 2 complete | ✅ Yes                 |
| US4 (P3) | Foundational       | Phase 2 complete | ⏸️ POSTPONED (Stellar) |

**Note**: US2 is blocked until `@openzeppelin/ui-builder-adapter-stellar` adds manual definition input to `getContractDefinitionInputs()`. US4 (schema refresh) is postponed to focus on Stellar-specific priorities. Architecture for both is ready - will work when revisited.

### Within Each User Story

1. Tests MUST be written and FAIL before implementation (TDD)
2. Types before hooks/services
3. Hooks/services before components
4. Components before integration
5. All tests pass before checkpoint

### Parallel Opportunities

**Phase 2 (Foundational)**:

```
T004, T005, T006, T007, T008 → Run all tests in parallel
T009, T010 → Run type definitions in parallel
```

**User Stories (once Foundational complete)**:

```
US1, US3, US4 can run in parallel (if team capacity allows)
US2 should follow US1 (extends same form)
```

**Within US1**:

```
T017, T018, T019, T020 → Run all tests in parallel
```

**Within US4**:

```
T046, T047, T048, T049, T050 → Run all tests in parallel
```

---

## Parallel Example: User Story 1

```bash
# Launch all tests for User Story 1 together (TDD):
T017: "Write test: circuit breaker blocks after 3 failures"
T018: "Write test: circuit breaker resets on success"
T019: "Write test: load() returns schema on success"
T020: "Write test: load() sets error state on failure"

# Then implement sequentially:
T021 → T022 → T023 → T024 → T025 → T026 → T027 → T028 → T029
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001-T003)
2. Complete Phase 2: Foundational (T004-T016)
3. Complete Phase 3: User Story 1 (T017-T029)
4. **STOP and VALIDATE**: Test loading a Stellar contract via RPC
5. Deploy/demo if ready - this is a working MVP!

### Incremental Delivery

| Increment | Stories          | Value Delivered                      | Status       |
| --------- | ---------------- | ------------------------------------ | ------------ |
| MVP       | US1              | Load contract schemas via RPC        | ✅ Complete  |
| v1.1      | US1 + US3        | + Offline persistence                | ✅ Complete  |
| v1.2      | US1 + US3 + US4  | + Schema refresh with diff           | ⏸️ Postponed |
| v1.3      | All (when ready) | + Manual definition (awaits adapter) | ⏸️ Blocked   |

### Parallel Team Strategy

With 2 developers after Foundational phase:

- **Developer A**: US1 → US2
- **Developer B**: US3 → US4

---

## Task Summary

| Phase                 | Tasks          | Parallel?                     |
| --------------------- | -------------- | ----------------------------- |
| Phase 1: Setup        | T001-T003 (3)  | T002 parallel                 |
| Phase 2: Foundational | T004-T016 (13) | T004-T008, T009-T010 parallel |
| Phase 3: US1 (MVP)    | T017-T029 (13) | T017-T020 parallel            |
| Phase 4: US2          | T030-T037 (8)  | T030-T032 parallel            |
| Phase 5: US3          | T038-T045 (8)  | T038-T040 parallel            |
| Phase 6: US4          | T046-T059 (14) | T046-T050 parallel            |
| Phase 7: Polish       | T060-T065 (6)  | T060-T061 parallel            |
| **Total**             | **65 tasks**   |                               |

### Tasks per User Story

| Story        | Test Tasks | Implementation Tasks | Total |
| ------------ | ---------- | -------------------- | ----- |
| Foundational | 5          | 8                    | 13    |
| US1 (P1)     | 4          | 9                    | 13    |
| US2 (P2)     | 3          | 5                    | 8     |
| US3 (P2)     | 3          | 5                    | 8     |
| US4 (P3)     | 5          | 9                    | 14    |

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story is independently completable and testable
- TDD is mandatory: verify tests FAIL before implementing
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- Constitution compliance: All chain-specific logic stays in adapters
