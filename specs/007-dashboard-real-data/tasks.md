# Tasks: Dashboard Real Data Integration

**Input**: Design documents from `/specs/007-dashboard-real-data/`  
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, contracts/ ✅

**Tests**: Included for hooks and utilities per Constitution V (TDD for business logic)

**Organization**: Tasks grouped by user story for independent implementation and testing

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3, US4)
- All paths relative to `apps/role-manager/src/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Create new directories and type definitions needed by all user stories

- [x] T001 Create `context/` directory at `apps/role-manager/src/context/`
- [x] T002 [P] Create dashboard types in `types/dashboard.ts` with ContractType, DashboardData, UseDashboardDataReturn interfaces per data-model.md
- [x] T003 [P] Create context barrel export in `context/index.ts`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Contract selection context that ALL user stories depend on

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T004 [P] Write unit tests for ContractContext in `context/__tests__/ContractContext.test.tsx`
- [x] T005 Implement ContractContext provider in `context/ContractContext.tsx` with selectedContract, selectedNetwork, adapter, contracts state per data-model.md §ContractContextValue
- [x] T006 [P] Write unit tests for useSelectedContract in `hooks/__tests__/useSelectedContract.test.tsx`
- [x] T007 Implement useSelectedContract hook in `hooks/useSelectedContract.ts` as convenience wrapper for ContractContext
- [x] T008 Update Sidebar.tsx to consume ContractContext instead of local useState (migrate selectedContract, selectedNetwork state to context)
- [x] T009 Wrap App.tsx with ContractProvider inside BrowserRouter per research.md §1 implementation notes
- [x] T010 Export useSelectedContract from `hooks/index.ts`

**Checkpoint**: Context infrastructure ready - contract selection now shared across all pages

---

## Phase 3: User Story 1 - View Contract Information (Priority: P1) 🎯 MVP

**Goal**: Display real contract details (name, address, network, type) on Dashboard

**Independent Test**: Select contract from sidebar → Dashboard shows correct label, address, network name, and capability badges

### Implementation for User Story 1

- [x] T011 [P] [US1] Extract FeatureBadge component to `components/Shared/FeatureBadge.tsx` for reuse across the app
- [x] T012 [P] [US1] Update AccessControlCapabilitiesSummary.tsx to import FeatureBadge from shared location
- [x] T013 [US1] Update ContractInfoCard.tsx to accept capabilities prop and render FeatureBadge components (AccessControl, Ownable badges)
- [x] T014 [US1] Create DashboardEmptyState.tsx component with title "No Contract Selected", description per FR-011, and "Add Contract" CTA button that opens AddContractDialog
- [x] T015 [US1] Update Dashboard.tsx: import useSelectedContract, render DashboardEmptyState when no contract selected, pass real contract data to ContractInfoCard

**Checkpoint**: Dashboard displays real contract info when contract selected, empty state when not

---

## Phase 4: User Story 2 - View Live Statistics (Priority: P1)

**Goal**: Display actual roles count and unique authorized accounts count

**Independent Test**: Load contract with known roles → Dashboard shows correct role count and unique member count

### Implementation for User Story 2

- [ ] T016 [P] [US2] Write unit tests for deduplication utility in `utils/__tests__/deduplication.test.ts`
- [ ] T017 [P] [US2] Implement getUniqueAccountsCount utility in `utils/deduplication.ts` using Set-based algorithm per research.md §3
- [ ] T018 [P] [US2] Write unit tests for useDashboardData hook in `hooks/__tests__/useDashboardData.test.tsx`
- [ ] T019 [US2] Implement useDashboardData hook in `hooks/useDashboardData.ts`: aggregate useContractRoles, useContractOwnership, compute rolesCount, uniqueAccountsCount, combined loading/error states per data-model.md §UseDashboardDataReturn
- [ ] T020 [US2] Update Dashboard.tsx: import useDashboardData, pass real rolesCount to Roles stats card, pass uniqueAccountsCount to Authorized Accounts stats card
- [ ] T021 [US2] Add loading state rendering in Dashboard.tsx: show spinner/skeleton in stats cards when isLoading is true
- [ ] T022 [US2] Add error state rendering in Dashboard.tsx: show inline error message with "Retry" button below message per FR-007
- [ ] T023 [US2] Handle Ownable-only contracts: show "Not Supported" badge on Roles card, disable click navigation per FR-014
- [ ] T024 [US2] Export useDashboardData from `hooks/index.ts`

**Checkpoint**: Dashboard shows live role count and unique accounts count with loading/error states

---

## Phase 5: User Story 3 - Refresh Dashboard Data (Priority: P2)

**Goal**: "Refresh Data" button refetches roles and ownership data

**Independent Test**: Click Refresh Data → loading indicator appears → counts update after fetch completes

### Implementation for User Story 3

- [ ] T025 [US3] Add refetch function to useDashboardData hook: combine rolesRefetch and ownershipRefetch with Promise.all per research.md §7
- [ ] T026 [US3] Add isRefreshing state to useDashboardData to distinguish initial load from manual refresh
- [ ] T027 [US3] Update Dashboard.tsx Refresh Data button: connect onClick to refetch, show loading indicator when isRefreshing, disable during refresh per FR-012
- [ ] T028 [US3] Add error toast notification when refresh fails per User Story 3 acceptance scenario 3

**Checkpoint**: Refresh Data button works, shows loading state, handles errors gracefully

---

## Phase 6: User Story 4 - Download Snapshot (Priority: P3)

**Goal**: Download JSON file with current access control state

**Independent Test**: Click Download Snapshot → JSON file downloads with correct filename and content per access-snapshot.schema.json

### Implementation for User Story 4

- [ ] T029 [P] [US4] Write unit tests for snapshot filename generation in `utils/__tests__/snapshot.test.ts`
- [ ] T030 [P] [US4] Implement generateSnapshotFilename utility in `utils/snapshot.ts` with truncateAddress helper (4 chars prefix/suffix) per research.md §4
- [ ] T031 [US4] Integrate useExportSnapshot hook in useDashboardData: expose exportSnapshot function, isExporting state, use custom filename from generateSnapshotFilename
- [ ] T032 [US4] Update Dashboard.tsx Download Snapshot button: connect onClick to exportSnapshot, disable when no contract or isExporting per FR-012
- [ ] T033 [US4] Verify exported JSON matches access-snapshot.schema.json: includes version "1.0", exportedAt, contract object, capabilities, roles, ownership

**Checkpoint**: Download Snapshot generates valid JSON file with correct filename format

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Final cleanup and validation

- [ ] T034 [P] Add JSDoc comments to all new public functions and hooks
- [ ] T035 [P] Run linter and fix any issues: `pnpm lint`
- [ ] T036 [P] Update hooks/index.ts to export all new hooks (verify useDashboardData, useSelectedContract exported)
- [ ] T037 Run all tests: `pnpm test`
- [ ] T038 Manual validation: test all acceptance scenarios from spec.md
- [ ] T039 Validate quickstart.md examples work correctly

---

## Gaps Resolved During Planning

The following gaps were identified in the pre-implementation checklist and resolved:

| Gap                                | Resolution                                                                                 | Task Reference |
| ---------------------------------- | ------------------------------------------------------------------------------------------ | -------------- |
| **Empty state text not specified** | Updated FR-011 with exact text: "No Contract Selected", description, "Add Contract" button | T014           |
| **Retry button placement unclear** | Updated FR-007: inline below error message, retry triggers refetch for failed data only    | T022           |
| **AccessSnapshot schema mismatch** | Aligned spec Key Entities with data-model.md (version, exportedAt, nested contract)        | T033           |

---

## Dependencies & Execution Order

### Phase Dependencies

```
Phase 1 (Setup) ─────────────────────────────────────────────┐
                                                              │
Phase 2 (Foundational) ◄─────────────────────────────────────┘
    │
    ├──► Phase 3 (US1: Contract Info) ─── MVP! ───┐
    │                                              │
    ├──► Phase 4 (US2: Statistics) ◄──────────────┘ (can start after T015)
    │         │
    │         ├──► Phase 5 (US3: Refresh) (depends on useDashboardData)
    │         │
    │         └──► Phase 6 (US4: Snapshot) (depends on useDashboardData)
    │
    └──► Phase 7 (Polish) ◄── all user stories complete
```

### User Story Dependencies

| Story    | Can Start After                | Dependencies                |
| -------- | ------------------------------ | --------------------------- |
| US1 (P1) | Phase 2 complete               | ContractContext only        |
| US2 (P1) | T015 (US1 Dashboard update)    | Uses Dashboard.tsx from US1 |
| US3 (P2) | T024 (useDashboardData export) | Extends useDashboardData    |
| US4 (P3) | T024 (useDashboardData export) | Extends useDashboardData    |

### Parallel Opportunities

**Phase 1** (all parallel):

```
T001 ─┬─ T002 ─┬─ T003
      │        │
      └────────┘
```

**Phase 2** (tests parallel, then implementation):

```
T004 ─┬─ T006
      │
      ├──► T005 ──► T007 ──► T008 ──► T009 ──► T010
      │
      └────────────────────────────────────────────►
```

**Phase 4** (tests and utilities parallel):

```
T016 ─┬─ T017 ─┬─ T018
      │        │
      └────────┴──► T019 ──► T020-T024
```

**Phase 6** (tests parallel):

```
T029 ─┬─ T030
      │
      └──► T031 ──► T032 ──► T033
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001-T003)
2. Complete Phase 2: Foundational (T004-T010)
3. Complete Phase 3: User Story 1 (T011-T015)
4. **STOP and VALIDATE**: Contract info displays correctly
5. Demo/Deploy: Basic Dashboard with real contract info

### Incremental Delivery

| Increment | Stories     | Value Delivered                 |
| --------- | ----------- | ------------------------------- |
| MVP       | US1         | Real contract info on Dashboard |
| +Stats    | US1+US2     | Live role/account counts        |
| +Refresh  | US1+US2+US3 | Manual data refresh             |
| Complete  | All         | Full feature with export        |

### Estimated Task Counts

| Phase        | Tasks  | Parallel Opportunities |
| ------------ | ------ | ---------------------- |
| Setup        | 3      | 2 parallel             |
| Foundational | 7      | 2 parallel pairs       |
| US1          | 5      | 2 parallel             |
| US2          | 9      | 3 parallel             |
| US3          | 4      | 0 (sequential)         |
| US4          | 5      | 2 parallel             |
| Polish       | 6      | 4 parallel             |
| **Total**    | **39** |                        |

---

## Notes

- All paths relative to `apps/role-manager/src/`
- Tests use Vitest + React Testing Library per plan.md
- Constitution V requires TDD for hooks/utilities (tests written first, must fail)
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
