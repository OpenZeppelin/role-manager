# Tasks: Role Changes Page with Real Data

**Input**: Design documents from `/specs/012-role-changes-data/`  
**Prerequisites**: plan.md ✓, spec.md ✓, research.md ✓, data-model.md ✓, contracts/ ✓, quickstart.md ✓

**Tests**: Not explicitly requested for UI components. However, per Constitution V (TDD for business logic), hook tests are recommended and included as optional tasks below.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing.

## Format: `[ID] [P?] [Story?] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, etc.)
- All paths are relative to `apps/role-manager/src/`

---

## Phase 1: Setup (Types & Utilities)

**Purpose**: Create foundational types and utilities needed by all user stories

- [x] T001 [P] Create type definitions in `types/role-changes.ts` (copy from `contracts/role-changes.ts` in spec folder)
- [x] T002 [P] Create data transformation utilities in `utils/history-transformer.ts` (CHANGE_TYPE_MAP, transformEntry function, sort by timestamp descending per FR-016)
- [x] T003 [P] Create RoleChanges component folder structure with `components/RoleChanges/index.ts` barrel export

**Checkpoint**: Types and utilities ready for component implementation ✅

---

## Phase 2: Foundational (Core Hooks)

**Purpose**: Data fetching hooks that MUST be complete before UI components

**⚠️ CRITICAL**: These hooks block all user story implementation

- [x] T004 Create `useContractHistory` hook in `hooks/useContractHistory.ts` (react-query wrapper for adapter.getHistory(), DEFAULT_PAGE_SIZE = 20 per FR-023)
- [x] T005 Create `useRoleChangesPageData` orchestration hook in `hooks/useRoleChangesPageData.ts` (combines context, capabilities, history, filters, pagination state)

### Optional: Hook Tests (Constitution V - TDD for Business Logic)

> **Note**: These tests are recommended per Constitution V but marked optional. If following TDD, write these tests FIRST before T004/T005 implementation.

- [x] T004a [P] _(Optional)_ Create test for `useContractHistory` hook in `hooks/__tests__/useContractHistory.test.tsx` (21 tests)
- [x] T005a _(Optional)_ Create test for `useRoleChangesPageData` hook in `hooks/__tests__/useRoleChangesPageData.test.tsx` (31 tests)

**Checkpoint**: Data layer ready - UI component implementation can now begin ✅

---

## Phase 3: User Story 1 - View Role Change History (P1) 🎯 MVP

**Goal**: Display chronological list of role changes (grants, revokes, transfers) for selected contract

**Independent Test**: Select a contract with known history → verify events display with correct columns (Timestamp, Action, Role, Account, Transaction)

### Implementation for User Story 1

- [x] T006 [P] [US1] Create `ChangeRow.tsx` component in `components/RoleChanges/ChangeRow.tsx` (single event row with all columns)
- [x] T007 [P] [US1] Create `ChangesTable.tsx` component in `components/RoleChanges/ChangesTable.tsx` (table with column headers, renders ChangeRow)
- [x] T008 [P] [US1] Create `ChangesLoadingSkeleton.tsx` component in `components/RoleChanges/ChangesLoadingSkeleton.tsx` (loading state)
- [x] T009 [US1] Create `RoleChanges.tsx` page in `pages/RoleChanges.tsx` (basic page structure with PageHeader, Card, Table)
- [x] T010 [US1] Wire `useRoleChangesPageData` hook to `RoleChanges.tsx` page (display events in table)
- [x] T011 [US1] Update barrel export in `components/RoleChanges/index.ts` with US1 components

**Checkpoint**: Can view role change history for selected contracts ✅

---

## Phase 4: User Story 6 - Handle Contracts Without History Support (P1)

**Goal**: Show appropriate feedback when history is unavailable (not supported or indexer down)

**Independent Test**: Navigate to contract with `supportsHistory: false` → verify informative message; trigger API error → verify error state with retry

### Implementation for User Story 6

- [x] T012 [P] [US6] Create `ChangesEmptyState.tsx` component in `components/RoleChanges/ChangesEmptyState.tsx` (no AC/Ownable or no events)
- [x] T013 [P] [US6] Create `ChangesErrorState.tsx` component in `components/RoleChanges/ChangesErrorState.tsx` (error with retry button)
- [x] T014 [US6] Add history support check to `RoleChanges.tsx` page (show informative message when `supportsHistory: false`)
- [x] T015 [US6] Add error handling to `RoleChanges.tsx` page (show error state with retry when fetch fails)
- [x] T016 [US6] Update barrel export in `components/RoleChanges/index.ts` with US6 components

**Checkpoint**: Error and empty states display correctly for all edge cases ✅

---

## Phase 5: User Story 2 - Automatic Data Loading on Contract Selection (P1)

**Goal**: Page automatically loads history when contract selection changes

**Independent Test**: Switch between contracts → verify data refreshes automatically without manual action; switch rapidly → verify only final contract's data displays

### Implementation for User Story 2

- [x] T017 [US2] Add contract change detection to `useRoleChangesPageData.ts` hook (reset state on contract change)
- [x] T018 [US2] Verify react-query key includes contractId for automatic cache invalidation
- [x] T019 [US2] Add loading state during contract switch in `RoleChanges.tsx` page

**Checkpoint**: Data loads automatically when switching contracts, stale requests cancelled ✅

---

## Phase 6: User Story 3 - Paginated History View (P2)

**Goal**: Navigate through large history datasets using cursor-based pagination

**Independent Test**: Load contract with >20 events → verify Next button enabled; click Next → verify next page loads; click Previous → verify return to previous page

### Implementation for User Story 3

- [x] T020 [P] [US3] Create `CursorPagination.tsx` component in `components/RoleChanges/CursorPagination.tsx` (Previous/Next buttons, no page numbers)
- [x] T021 [US3] Add cursor pagination state management to `useRoleChangesPageData.ts` hook (currentCursor, cursorHistory for back nav)
- [x] T022 [US3] Add pagination controls to `RoleChanges.tsx` page (render CursorPagination below table)
- [x] T023 [US3] Update barrel export in `components/RoleChanges/index.ts` with CursorPagination

**Checkpoint**: Can navigate through paginated history with Previous/Next buttons ✅

---

## Phase 7: User Story 4 - Filter Role Changes (P2)

**Goal**: Filter events by action type (Grant/Revoke/Transfer) and by role

**Independent Test**: Select "Grant" filter → verify only grant events shown; select role filter → verify only events for that role shown; clear filters → verify all events return

### Implementation for User Story 4

- [x] T024 [P] [US4] Create `ChangesFilterBar.tsx` component in `components/RoleChanges/ChangesFilterBar.tsx` (action type dropdown + role dropdown)
- [x] T025 [US4] Add filter state management to `useRoleChangesPageData.ts` hook (actionFilter, roleFilter, reset on contract change)
- [x] T026 [US4] Add server-side role filter integration to `useContractHistory.ts` hook (pass roleId to API)
- [x] T027 [US4] Add client-side action type filtering to `useRoleChangesPageData.ts` hook (filter transformed events)
- [x] T028 [US4] Add filter bar to `RoleChanges.tsx` page (render ChangesFilterBar above table)
- [x] T029 [US4] Reset pagination when filters change in `useRoleChangesPageData.ts` hook
- [x] T030 [US4] Update barrel export in `components/RoleChanges/index.ts` with ChangesFilterBar

**Checkpoint**: Can filter events by action type and role, pagination resets on filter change

---

## Phase 8: User Story 5 - Manual Data Refresh (P2)

**Goal**: User can manually refresh history to see latest events

**Independent Test**: Click Refresh button → verify loading indicator on button (not full page); verify new events appear after refresh completes

### Implementation for User Story 5

- [x] T031 [US5] Add refresh functionality to `useRoleChangesPageData.ts` hook (expose refetch, isRefreshing state)
- [x] T032 [US5] Add Refresh button to `RoleChanges.tsx` page header (with spinner during refresh)
- [x] T033 [US5] Ensure refresh doesn't replace table content (background refresh pattern)

**Checkpoint**: Can manually refresh data without page flicker ✅

---

## Phase 9: Polish & Cross-Cutting Concerns

**Purpose**: Final cleanup and validation

- [x] T034 [P] Verify all components follow design system patterns (Tailwind CSS v4, `cn` utility)
- [x] T035 [P] Verify all console.log replaced with `logger` from `@openzeppelin/ui-builder-utils`
- [x] T036 [P] Verify accessibility (ARIA labels on table, buttons, pagination)
- [x] T037 Add route for RoleChanges page to app router (if not already present)
- [x] T038 Run quickstart.md validation against implemented code
- [x] T039 Final barrel export cleanup in `components/RoleChanges/index.ts`

**Checkpoint**: Feature complete and validated ✅

---

## Dependencies & Execution Order

### Phase Dependencies

```
Phase 1 (Setup) ──────────────────────────────────────────┐
                                                          │
Phase 2 (Foundational) ───────────────────────────────────┤
     │                                                    │
     └─── BLOCKS ALL USER STORIES ────────────────────────┘
                    │
    ┌───────────────┼───────────────┬───────────────┐
    ▼               ▼               ▼               ▼
Phase 3 (US1)   Phase 4 (US6)   Phase 5 (US2)   [All P1]
    │               │               │
    └───────────────┴───────────────┘
                    │
    ┌───────────────┼───────────────┬───────────────┐
    ▼               ▼               ▼               ▼
Phase 6 (US3)   Phase 7 (US4)   Phase 8 (US5)   [All P2]
    │               │               │
    └───────────────┴───────────────┘
                    │
                    ▼
            Phase 9 (Polish)
```

### User Story Dependencies

| Story                | Priority | Dependencies       | Can Start After  |
| -------------------- | -------- | ------------------ | ---------------- |
| US1 - View History   | P1       | None               | Phase 2 complete |
| US6 - Error Handling | P1       | None               | Phase 2 complete |
| US2 - Auto Loading   | P1       | US1 (table exists) | Phase 3 complete |
| US3 - Pagination     | P2       | US1 (table exists) | Phase 3 complete |
| US4 - Filtering      | P2       | US1 (table exists) | Phase 3 complete |
| US5 - Refresh        | P2       | US1 (page exists)  | Phase 3 complete |

### Parallel Opportunities Within Phases

**Phase 1 (all parallel)**:

```
T001 types/role-changes.ts
T002 utils/history-transformer.ts
T003 components/RoleChanges/index.ts
```

**Phase 3 (US1 - components parallel)**:

```
T006 ChangeRow.tsx
T007 ChangesTable.tsx
T008 ChangesLoadingSkeleton.tsx
```

**Phase 4 (US6 - components parallel)**:

```
T012 ChangesEmptyState.tsx
T013 ChangesErrorState.tsx
```

**Phase 6-8 (P2 stories can run in parallel if staffed)**:

```
Developer A: Phase 6 (US3 - Pagination)
Developer B: Phase 7 (US4 - Filtering)
Developer C: Phase 8 (US5 - Refresh)
```

---

## Implementation Strategy

### MVP First (P1 Stories Only)

1. **Complete Phase 1**: Setup (types, utils) ✓
2. **Complete Phase 2**: Foundational hooks ✓
3. **Complete Phase 3**: US1 - View History ✓
4. **Complete Phase 4**: US6 - Error Handling ✓
5. **Complete Phase 5**: US2 - Auto Loading ✓
6. **STOP and VALIDATE**: Core page fully functional
7. Deploy/demo MVP

**MVP Scope**: Tasks T001-T019 (19 tasks)

### Incremental Delivery (P2 Stories)

After MVP validation:

1. Add US3 (Pagination) → Test → Deploy
2. Add US4 (Filtering) → Test → Deploy
3. Add US5 (Refresh) → Test → Deploy
4. Complete Polish phase

---

## Task Summary

| Phase   | Tasks                                    | Description                 |
| ------- | ---------------------------------------- | --------------------------- |
| Phase 1 | T001-T003 (3)                            | Setup: types, utils, folder |
| Phase 2 | T004-T005 (2) + T004a-T005a (2 optional) | Foundational: core hooks    |
| Phase 3 | T006-T011 (6)                            | US1: View History           |
| Phase 4 | T012-T016 (5)                            | US6: Error Handling         |
| Phase 5 | T017-T019 (3)                            | US2: Auto Loading           |
| Phase 6 | T020-T023 (4)                            | US3: Pagination             |
| Phase 7 | T024-T030 (7)                            | US4: Filtering              |
| Phase 8 | T031-T033 (3)                            | US5: Refresh                |
| Phase 9 | T034-T039 (6)                            | Polish                      |

**Total Tasks**: 39 (+ 2 optional test tasks)  
**MVP Tasks (P1)**: 19 (+ 2 optional)  
**P2 Tasks**: 14  
**Polish Tasks**: 6

---

## Notes

- [P] tasks = different files, no dependencies within phase
- [Story] label maps task to specific user story for traceability
- Optional test tasks (T004a, T005a) included per Constitution V for business logic hooks
- Each user story checkpoint enables independent validation
- Commit after each task or logical group
- All file paths relative to `apps/role-manager/src/`
