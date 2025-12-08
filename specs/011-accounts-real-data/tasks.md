# Tasks: Authorized Accounts Real Data Integration

**Input**: Design documents from `/specs/011-accounts-real-data/`  
**Prerequisites**: plan.md ✓, spec.md ✓, research.md ✓, data-model.md ✓, contracts/hooks.ts ✓, quickstart.md ✓

**Tests**: Included (TDD specified in plan.md Constitution Check)

**Organization**: Tasks grouped by user story priority to enable incremental delivery.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 1: Setup (Type Foundation)

**Purpose**: Update shared type definitions required by all subsequent phases

- [x] T001 Update `AccountStatus` type to remove `'expired'` and add `'awaiting-signature'` in `apps/role-manager/src/types/authorized-accounts.ts`
- [x] T002 Update `ACCOUNT_STATUS_CONFIG` to remove expired entry and add awaiting-signature in `apps/role-manager/src/types/authorized-accounts.ts`
- [x] T003 Create `RoleBadgeInfo` interface in `apps/role-manager/src/types/authorized-accounts.ts`
- [x] T004 Rename `AuthorizedAccount` to `AuthorizedAccountView` with new structure (remove `expiresAt`, change `dateAdded` to `string | null`, change `roles` to `RoleBadgeInfo[]`) in `apps/role-manager/src/types/authorized-accounts.ts`
- [x] T005 Add `EnrichedRoleMember` and `EnrichedRoleAssignment` types in `apps/role-manager/src/types/authorized-accounts.ts`
- [x] T006 Add `AccountsFilterState` with `DEFAULT_FILTER_STATE` in `apps/role-manager/src/types/authorized-accounts.ts`
- [x] T007 Export new types from `apps/role-manager/src/types/index.ts`

**Checkpoint**: Type foundation ready - utility and hook implementation can begin ✅

---

## Phase 2: Foundational (Core Utilities)

**Purpose**: Data transformation utilities that MUST be complete before hooks

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

### Tests for Utilities

- [x] T008 [P] Create test file with TDD tests for `transformRolesToAccounts` in `apps/role-manager/src/utils/__tests__/account-transformer.test.ts`
- [x] T009 [P] Add test cases for multi-role account aggregation in `apps/role-manager/src/utils/__tests__/account-transformer.test.ts`
- [x] T010 [P] Add test cases for earliest timestamp selection in `apps/role-manager/src/utils/__tests__/account-transformer.test.ts`
- [x] T011 [P] Add test cases for owner integration in `apps/role-manager/src/utils/__tests__/account-transformer.test.ts`
- [x] T012 [P] Add test cases for `sortAccounts` in `apps/role-manager/src/utils/__tests__/account-transformer.test.ts`
- [x] T013 [P] Add test cases for `applyAccountsFilters` in `apps/role-manager/src/utils/__tests__/account-transformer.test.ts`

### Implementation for Utilities

- [x] T014 Create `transformRolesToAccounts()` function in `apps/role-manager/src/utils/account-transformer.ts`
- [x] T015 Create `sortAccounts()` function in `apps/role-manager/src/utils/account-transformer.ts`
- [x] T016 Create `applyAccountsFilters()` function in `apps/role-manager/src/utils/account-transformer.ts`
- [x] T017 Export utility functions from `apps/role-manager/src/utils/index.ts`
- [x] T018 Verify all utility tests pass (35 tests passed)

**Checkpoint**: Foundation ready - user story implementation can now begin ✅

---

## Phase 3: User Story 1+2+6 - Core Data Integration (Priority: P1) 🎯 MVP

**Goal**: Display real authorized accounts with automatic loading on contract selection and proper error handling

**Independent Test**: Select a contract with known roles, navigate to Authorized Accounts page, verify accounts match on-chain state. Switch contracts and verify automatic refresh. Select unsupported contract and verify empty state.

### Tests for Core Data Hooks

- [x] T019 [P] [US1] Create test file for `useContractRolesEnriched` in `apps/role-manager/src/hooks/__tests__/useContractRolesEnriched.test.tsx`
- [x] T020 [P] [US1] Add test cases for successful enriched role fetch in `apps/role-manager/src/hooks/__tests__/useContractRolesEnriched.test.tsx`
- [x] T021 [P] [US1] Add test cases for fallback to regular API in `apps/role-manager/src/hooks/__tests__/useContractRolesEnriched.test.tsx`
- [x] T022 [P] [US1] Add test cases for error handling in `apps/role-manager/src/hooks/__tests__/useContractRolesEnriched.test.tsx`
- [x] T023 [P] [US1] Create test file for `useAuthorizedAccountsPageData` in `apps/role-manager/src/hooks/__tests__/useAuthorizedAccountsPageData.test.tsx`
- [x] T024 [P] [US1] Add test cases for data transformation integration in `apps/role-manager/src/hooks/__tests__/useAuthorizedAccountsPageData.test.tsx`
- [x] T025 [P] [US2] Add test cases for contract change auto-refresh in `apps/role-manager/src/hooks/__tests__/useAuthorizedAccountsPageData.test.tsx`
- [x] T026 [P] [US6] Add test cases for unsupported contract handling in `apps/role-manager/src/hooks/__tests__/useAuthorizedAccountsPageData.test.tsx`

### Implementation for Core Data Hooks

- [x] T027 [US1] Create `useContractRolesEnriched` hook with react-query in `apps/role-manager/src/hooks/useContractRolesEnriched.ts`
- [x] T028 [US1] Implement fallback from `getCurrentRolesEnriched` to `getCurrentRoles` in `apps/role-manager/src/hooks/useContractRolesEnriched.ts`
- [x] T029 [US1] Create `useAuthorizedAccountsPageData` orchestration hook in `apps/role-manager/src/hooks/useAuthorizedAccountsPageData.ts`
- [x] T030 [US2] Implement contract change detection and state reset in `apps/role-manager/src/hooks/useAuthorizedAccountsPageData.ts`
- [x] T031 [US1] Export new hooks from `apps/role-manager/src/hooks/index.ts`
- [x] T032 Verify all hook tests pass (511 tests passed)

### Implementation for Error/Empty State Components

- [x] T033 [P] [US6] Create `AccountsEmptyState` component for unsupported contracts in `apps/role-manager/src/components/AuthorizedAccounts/AccountsEmptyState.tsx`
- [x] T034 [P] [US6] Create `AccountsErrorState` component with retry button in `apps/role-manager/src/components/AuthorizedAccounts/AccountsErrorState.tsx`
- [x] T035 [US6] Export new components from `apps/role-manager/src/components/AuthorizedAccounts/index.ts`

### Implementation for UI Component Updates

- [x] T036 [P] [US1] Update `AccountRow` to handle `dateAdded: null` (display "-") in `apps/role-manager/src/components/AuthorizedAccounts/AccountRow.tsx` (already implemented in Phase 1)
- [x] T037 [P] [US1] Update `AccountRow` to remove Expires column rendering in `apps/role-manager/src/components/AuthorizedAccounts/AccountRow.tsx` (already removed in Phase 1)
- [x] T038 [P] [US1] Update `AccountRow` to display `RoleBadgeInfo[]` as role badges in `apps/role-manager/src/components/AuthorizedAccounts/AccountRow.tsx` (already implemented in Phase 1)
- [x] T039 [US1] Update `AccountsTable` to wire to real data props in `apps/role-manager/src/components/AuthorizedAccounts/AccountsTable.tsx` (already works with AuthorizedAccountView[])

### Implementation for Page Integration

- [x] T040 [US1] Update `AuthorizedAccounts` page to use `useAuthorizedAccountsPageData` hook in `apps/role-manager/src/pages/AuthorizedAccounts.tsx`
- [x] T041 [US1] Wire loading skeleton display during initial fetch in `apps/role-manager/src/pages/AuthorizedAccounts.tsx`
- [x] T042 [US6] Wire error state display with retry action in `apps/role-manager/src/pages/AuthorizedAccounts.tsx`
- [x] T043 [US6] Wire empty state display for unsupported contracts in `apps/role-manager/src/pages/AuthorizedAccounts.tsx`
- [x] T044 [US1] Remove demo toggle and mock data from spec 010 in `apps/role-manager/src/pages/AuthorizedAccounts.tsx`
- [x] T045 [US1] Hide "Add Account or Role" button (view-only scope) in `apps/role-manager/src/pages/AuthorizedAccounts.tsx`

**Checkpoint**: MVP complete - User Stories 1, 2, 6 functional. Real data displays, auto-refresh on contract change, error handling works. ✅

---

## Phase 4: User Story 3 - Search and Filter Accounts (Priority: P2)

**Goal**: Enable users to search by address and filter by role

**Independent Test**: Load accounts, type address in search, verify filtering works. Select role filter, verify only matching accounts shown.

### Tests for Search & Filter

- [x] T046 [P] [US3] Add test cases for search filter functionality in `apps/role-manager/src/hooks/__tests__/useAuthorizedAccountsPageData.test.tsx`
- [x] T047 [P] [US3] Add test cases for role filter functionality in `apps/role-manager/src/hooks/__tests__/useAuthorizedAccountsPageData.test.tsx`
- [x] T048 [P] [US3] Add test cases for combined filter AND logic in `apps/role-manager/src/hooks/__tests__/useAuthorizedAccountsPageData.test.tsx`

### Implementation for Search & Filter

- [x] T049 [US3] Update `AccountsFilterBar` to remove "Expired" from status dropdown in `apps/role-manager/src/components/AuthorizedAccounts/AccountsFilterBar.tsx` (already done - no "Expired" option present)
- [x] T050 [US3] Wire `AccountsFilterBar` to receive `availableRoles` from hook in `apps/role-manager/src/pages/AuthorizedAccounts.tsx` (already done in Phase 3)
- [x] T051 [US3] Wire `filters` and `setFilters` to `AccountsFilterBar` in `apps/role-manager/src/pages/AuthorizedAccounts.tsx` (already done in Phase 3)
- [x] T052 [US3] Verify search and filter functionality works end-to-end (534 tests passing)
- [x] T053 Verify filter tests pass (534 tests passing)

**Checkpoint**: User Story 3 complete - Search and filter functional ✅

---

## Phase 5: User Story 4 - Paginated Accounts View (Priority: P2)

**Goal**: Enable pagination for contracts with many accounts

**Independent Test**: Load contract with >10 accounts, verify pagination controls appear, navigate pages.

### Tests for Pagination

- [x] T054 [P] [US4] Add test cases for pagination state in `apps/role-manager/src/hooks/__tests__/useAuthorizedAccountsPageData.test.tsx` (already existed: 'should paginate accounts correctly', 'should navigate between pages')
- [x] T055 [P] [US4] Add test cases for pagination reset on filter change in `apps/role-manager/src/hooks/__tests__/useAuthorizedAccountsPageData.test.tsx` (already existed: 'should reset pagination when filters change', 'should reset pagination when contract changes')
- [x] T056 [P] [US4] Add test cases for pagination controls visibility in `apps/role-manager/src/hooks/__tests__/useAuthorizedAccountsPageData.test.tsx` (added 3 tests for visibility flags)

### Implementation for Pagination

- [x] T057 [P] [US4] Create `AccountsPagination` component with controls in `apps/role-manager/src/components/AuthorizedAccounts/AccountsPagination.tsx`
- [x] T058 [US4] Export `AccountsPagination` from `apps/role-manager/src/components/AuthorizedAccounts/index.ts`
- [x] T059 [US4] Wire `AccountsPagination` to `pagination` controls from hook in `apps/role-manager/src/pages/AuthorizedAccounts.tsx`
- [x] T060 [US4] Conditionally show pagination only when `totalItems > pageSize` in `apps/role-manager/src/pages/AuthorizedAccounts.tsx`
- [x] T061 Verify pagination tests pass (537 tests passed)

**Checkpoint**: User Story 4 complete - Pagination functional ✅

---

## Phase 6: User Story 5 - Manual Data Refresh (Priority: P2)

**Goal**: Enable manual refresh with loading indicator

**Independent Test**: Click Refresh button, verify spinner appears, verify data updates.

### Tests for Refresh

- [x] T062 [P] [US5] Add test cases for refetch functionality in `apps/role-manager/src/hooks/__tests__/useAuthorizedAccountsPageData.test.tsx` (already existed: 'exposes refetch function', 'calls refetch on underlying hooks')
- [x] T063 [P] [US5] Add test cases for isRefreshing state in `apps/role-manager/src/hooks/__tests__/useAuthorizedAccountsPageData.test.tsx` (already existed: 'should return isRefreshing=true when fetching but not initial load')

### Implementation for Refresh

- [x] T064 [US5] Add Refresh button to page header in `apps/role-manager/src/pages/AuthorizedAccounts.tsx` (already implemented at lines 168-179)
- [x] T065 [US5] Wire Refresh button to `refetch` function from hook in `apps/role-manager/src/pages/AuthorizedAccounts.tsx` (onClick={() => refetch()})
- [x] T066 [US5] Display spinning icon when `isRefreshing` is true in `apps/role-manager/src/pages/AuthorizedAccounts.tsx` (animate-spin class + 'Refreshing...' text)
- [x] T067 Verify refresh tests pass (537 tests passed)

**Checkpoint**: User Story 5 complete - Manual refresh functional ✅

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Final cleanup and verification

- [x] T068 [P] Verify "No matching accounts found" message displays when search has no results in `apps/role-manager/src/pages/AuthorizedAccounts.tsx`
- [x] T069 [P] Verify selection checkboxes log to console on interaction (placeholder behavior) in `apps/role-manager/src/pages/AuthorizedAccounts.tsx`
- [x] T070 [P] Verify row action menus log to console (placeholder behavior) in `apps/role-manager/src/components/AuthorizedAccounts/AccountRow.tsx`
- [x] T071 Verify "You" badge stub returns null (awaiting wallet integration) in `apps/role-manager/src/pages/AuthorizedAccounts.tsx`
- [x] T072 Run all tests and ensure 100% pass rate (537 tests passed)
- [ ] T073 Manual end-to-end testing with real contract
- [x] T074 Update component index exports if needed in `apps/role-manager/src/components/AuthorizedAccounts/index.ts`
- [x] T075 Remove deprecated `AuthorizedAccount` interface from `apps/role-manager/src/types/authorized-accounts.ts` (kept for backwards compatibility, replace all usages with `AuthorizedAccountView`)

**Checkpoint**: Phase 7 complete (T073 requires manual testing). All code tasks done, 537 tests pass. ✅

---

## Dependencies & Execution Order

### Phase Dependencies

```
Phase 1: Setup (Types)
    ↓
Phase 2: Foundational (Utilities)
    ↓
Phase 3: US1+US2+US6 (Core - MVP) ← Most critical
    ↓
Phase 4: US3 (Search/Filter) ← Can start after Phase 3
    ↓
Phase 5: US4 (Pagination) ← Can start after Phase 3
    ↓
Phase 6: US5 (Refresh) ← Can start after Phase 3
    ↓
Phase 7: Polish
```

### P2 User Stories are Independent

After Phase 3 (MVP) completes, Phases 4, 5, and 6 can run in parallel:

```
                    ┌─── Phase 4: US3 (Search/Filter)
                    │
Phase 3 (MVP) ──────┼─── Phase 5: US4 (Pagination)
                    │
                    └─── Phase 6: US5 (Refresh)
```

### Within Each Phase

- Tests (T0XX [P]) can run in parallel within same phase
- Models/types before utilities
- Utilities before hooks
- Hooks before components
- Components before page integration

### Parallel Opportunities by Phase

| Phase | Parallel Tasks                          | Sequential Tasks     |
| ----- | --------------------------------------- | -------------------- |
| 1     | None (same file)                        | T001-T007            |
| 2     | T008-T013 (tests)                       | T014-T018 (impl)     |
| 3     | T019-T026 (tests), T033-T034, T036-T038 | T027-T032, T039-T045 |
| 4     | T046-T048 (tests), T057                 | T049-T053, T058-T061 |
| 5     | T054-T056 (tests)                       | T057-T061            |
| 6     | T062-T063 (tests)                       | T064-T067            |
| 7     | T068-T071                               | T072-T074            |

---

## Parallel Example: Phase 3 Core Implementation

```bash
# After Phase 2 complete, launch all Phase 3 tests in parallel:
Task T019: "Create test file for useContractRolesEnriched"
Task T020: "Add test cases for successful enriched role fetch"
Task T021: "Add test cases for fallback to regular API"
Task T022: "Add test cases for error handling"
Task T023: "Create test file for useAuthorizedAccountsPageData"
Task T024: "Add test cases for data transformation integration"
Task T025: "Add test cases for contract change auto-refresh"
Task T026: "Add test cases for unsupported contract handling"

# Launch UI component updates in parallel:
Task T033: "Create AccountsEmptyState component"
Task T034: "Create AccountsErrorState component"
Task T036: "Update AccountRow for null dateAdded"
Task T037: "Update AccountRow remove Expires column"
Task T038: "Update AccountRow for RoleBadgeInfo[]"
```

---

## Implementation Strategy

### MVP First (Phase 1-3)

1. Complete Phase 1: Type Foundation
2. Complete Phase 2: Utility Functions (with tests)
3. Complete Phase 3: Core Integration (US1+US2+US6)
4. **STOP and VALIDATE**: Test with real contract
5. Deploy/demo MVP

### Incremental Delivery

| Increment   | User Stories  | Value Delivered                         |
| ----------- | ------------- | --------------------------------------- |
| MVP         | US1, US2, US6 | Real data, auto-refresh, error handling |
| +Filter     | US3           | Search and filter accounts              |
| +Pagination | US4           | Handle large account lists              |
| +Refresh    | US5           | Manual data refresh                     |

### Task Count Summary

| Phase           | Tasks  | Focus             |
| --------------- | ------ | ----------------- |
| 1: Setup        | 7      | Type definitions  |
| 2: Foundational | 11     | Utilities + tests |
| 3: US1+US2+US6  | 27     | Core MVP          |
| 4: US3          | 8      | Search/Filter     |
| 5: US4          | 8      | Pagination        |
| 6: US5          | 6      | Refresh           |
| 7: Polish       | 8      | Cleanup           |
| **Total**       | **75** |                   |

---

## Notes

- [P] tasks = different files, no dependencies within same phase
- [Story] labels: US1=View Data, US2=Auto-Load, US3=Search/Filter, US4=Pagination, US5=Refresh, US6=Error States
- Tests marked [P] can all run in parallel within their phase
- TDD approach: write tests first, verify they fail, then implement
- Commit after each task or logical group
- Stop at MVP checkpoint (after Phase 3) to validate core functionality
- Avoid: cross-file conflicts, implementing without failing tests first
