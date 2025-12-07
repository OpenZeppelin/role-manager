# Tasks: Authorized Accounts Page Layout

**Input**: Design documents from `/specs/010-authorized-accounts-page/`  
**Prerequisites**: plan.md ✓, spec.md ✓, research.md ✓, data-model.md ✓, quickstart.md ✓

**Tests**: Not required (per Constitution V - visual components exempt from unit tests)

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **App location**: `apps/role-manager/src/`
- **Components**: `apps/role-manager/src/components/AuthorizedAccounts/`
- **Types**: `apps/role-manager/src/types/`
- **Pages**: `apps/role-manager/src/pages/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Create project structure and type definitions

- [x] T001 Create `components/AuthorizedAccounts/` directory structure in `apps/role-manager/src/components/`
- [x] T002 [P] Create type definitions file in `apps/role-manager/src/types/authorized-accounts.ts` with AuthorizedAccount, AccountStatus, AccountsFilterState, SelectionState, and all component props interfaces per data-model.md

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T003 Create mock data file with MOCK_ACCOUNTS and MOCK_AVAILABLE_ROLES in `apps/role-manager/src/components/AuthorizedAccounts/mockData.ts` per data-model.md
- [x] T004 Create barrel exports file in `apps/role-manager/src/components/AuthorizedAccounts/index.ts` (initially empty, will add exports as components are created)

**Checkpoint**: Foundation ready - user story implementation can now begin

---

## Phase 3: User Story 1 - View Empty Authorized Accounts Page (Priority: P1) 🎯 MVP

**Goal**: Display the page structure with header, filter placeholders, and empty state when no accounts exist

**Independent Test**: Load page with empty accounts array → verify header, filter bar, and empty state render correctly

### Implementation for User Story 1

- [x] T005 [P] [US1] Create AccountsEmptyState component in `apps/role-manager/src/components/AuthorizedAccounts/AccountsEmptyState.tsx` using shared EmptyState, Users icon, and "Grant First Authorization" CTA per spec Visual Design Requirements
- [x] T006 [P] [US1] Create AccountsLoadingSkeleton component in `apps/role-manager/src/components/AuthorizedAccounts/AccountsLoadingSkeleton.tsx` with table structure skeleton (header + 4 rows) per spec Loading Skeleton requirements
- [x] T007 [P] [US1] Create AccountsFilterBar UI shell in `apps/role-manager/src/components/AuthorizedAccounts/AccountsFilterBar.tsx` with:
  - Search input (disabled/placeholder) with magnifying glass icon
  - Status and Roles dropdowns (disabled/placeholder)
  - Visual layout matching spec (functionality wired in US3)
- [x] T008 [US1] Update AuthorizedAccounts page in `apps/role-manager/src/pages/AuthorizedAccounts.tsx` with:
  - PageHeader with title, dynamic subtitle (contract/network), "Add Account or Role" button
  - Loading state toggle for demo (useState)
  - Filter bar UI shell (non-functional)
  - Conditional render: loading skeleton vs empty state
  - `logger.info` handlers for button clicks (from `@openzeppelin/ui-builder-utils`)
- [x] T009 [US1] Export AccountsEmptyState, AccountsLoadingSkeleton, AccountsFilterBar from `apps/role-manager/src/components/AuthorizedAccounts/index.ts`

**Checkpoint**: User Story 1 complete - page shows header, filter placeholder, and empty state

---

## Phase 4: User Story 2 - View Populated Accounts Table (Priority: P2)

**Goal**: Display accounts in a table with all columns, badges, and action menus

**Independent Test**: Load page with MOCK_ACCOUNTS → verify table renders all columns with correct data

### Implementation for User Story 2

- [x] T010 [P] [US2] Create StatusBadge component in `apps/role-manager/src/components/AuthorizedAccounts/StatusBadge.tsx` with colored backgrounds (green/red/yellow) per spec Badge Styling requirements
- [x] T011 [P] [US2] Create RoleBadge component in `apps/role-manager/src/components/AuthorizedAccounts/RoleBadge.tsx` with gray outline styling per spec Badge Styling requirements
- [x] T012 [P] [US2] Create AccountActionsMenu component in `apps/role-manager/src/components/AuthorizedAccounts/AccountActionsMenu.tsx` using DropdownMenu with Edit Roles, Revoke Access, View Details items per FR-009
- [x] T013 [US2] Create AccountRow component in `apps/role-manager/src/components/AuthorizedAccounts/AccountRow.tsx` with:
  - Checkbox (using Radix Checkbox)
  - Truncated address display (0x1234...5678)
  - StatusBadge
  - Date columns (dateAdded, expiresAt with "Never" fallback)
  - Multiple RoleBadges
  - AccountActionsMenu
  - Hover/focus states per spec Interaction States
- [x] T014 [US2] Create AccountsTable component in `apps/role-manager/src/components/AuthorizedAccounts/AccountsTable.tsx` with:
  - HTML table with semantic structure
  - Header row with master checkbox (indeterminate support)
  - Column headers: Address, Status, Date Added, Expires, Roles, Actions
  - Map accounts to AccountRow components
  - Card container wrapper
- [x] T015 [US2] Add selection state management to AuthorizedAccounts page:
  - useState<Set<string>> for selectedIds
  - Selection change handlers (toggle row, toggle all)
  - getMasterCheckboxState helper usage
  - `logger.info` for action callbacks (from `@openzeppelin/ui-builder-utils`)
- [x] T016 [US2] Update page to conditionally render AccountsTable when mock accounts exist (add demo toggle between empty/populated)
- [x] T017 [US2] Export StatusBadge, RoleBadge, AccountActionsMenu, AccountRow, AccountsTable from `apps/role-manager/src/components/AuthorizedAccounts/index.ts`

**Checkpoint**: User Story 2 complete - table displays with all columns, selection works, actions log via logger

---

## Phase 5: User Story 3 - Filter and Search Accounts (Priority: P3)

**Goal**: Display filter bar with search input and dropdown filters ready for future business logic

**Independent Test**: Verify search input accepts text, dropdowns show options, changes log via logger

### Implementation for User Story 3

- [x] T018 [US3] Update AccountsFilterBar component in `apps/role-manager/src/components/AuthorizedAccounts/AccountsFilterBar.tsx` to be fully functional:
  - Enable search input with placeholder "Search by address or ENS..."
  - Enable Status dropdown with All Status, Active, Expired, Pending options
  - Enable Roles dropdown with All Roles + availableRoles from props
  - Controlled component pattern with filters prop and onFiltersChange callback
- [x] T019 [US3] Add filter state management to AuthorizedAccounts page:
  - useState<AccountsFilterState> with DEFAULT_FILTER_STATE
  - Filter change handler that logs changes via `logger.info` (from `@openzeppelin/ui-builder-utils`)
  - Pass MOCK_AVAILABLE_ROLES to AccountsFilterBar
- [x] T020 [US3] Wire AccountsFilterBar functionality into page (connect state to component, enable interactions)
- [x] T021 [US3] Verify AccountsFilterBar export is already in index.ts (added in T009)

**Checkpoint**: User Story 3 complete - filter bar renders, interactions log via logger

---

## Phase 6: Polish & Cross-Cutting Concerns

> **Note**: Tasks Phase 3-5 correspond to plan.md "Phased Delivery" sections (Phase 1: Foundation → US1, Phase 2: Table → US2, Phase 3: Filters → US3)

**Purpose**: Final cleanup and verification

- [ ] T022 [P] Verify all component exports in `apps/role-manager/src/components/AuthorizedAccounts/index.ts` are complete and typed
- [ ] T023 [P] Add JSDoc comments with feature reference (010-authorized-accounts-page) to all new components
- [ ] T024 Verify all visual states work: empty, loading, populated, selection (none/partial/all), filter interactions
- [ ] T025 Verify responsive breakpoints per SC-005: test at desktop (≥1024px) and tablet (768-1023px) viewports
- [ ] T026 Run quickstart.md validation - verify all expected `logger.info` outputs appear in browser console
- [ ] T027 Run linting and fix any TypeScript/ESLint errors

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3-5)**: All depend on Foundational phase completion
  - User stories should proceed sequentially (P1 → P2 → P3) for this UI-focused feature
  - Each story builds on previous (table needs badges, filter bar integrates with table)
- **Polish (Phase 6)**: Depends on all user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories
- **User Story 2 (P2)**: Should complete after US1 (shares page structure, adds table)
- **User Story 3 (P3)**: Should complete after US2 (filter bar integrates with existing page)

### Within Each User Story

- Components marked [P] can be built in parallel (different files)
- Page updates depend on component completion
- Export updates follow component creation

### Parallel Opportunities per Phase

**Phase 1**: T001 and T002 are sequential (folder before types)

**Phase 2**: T003 and T004 can run in parallel

**Phase 3 (US1)**: T005, T006, T007 can run in parallel, then T008, then T009

**Phase 4 (US2)**: T010, T011, T012 can run in parallel, then T013 → T014 → T015 → T016 → T017

**Phase 5 (US3)**: T018 → T019 → T020 → T021 (sequential due to integration)

**Phase 6**: T022 and T023 can run in parallel, then T024 → T025 → T026 → T027

---

## Parallel Example: User Story 2

```text
# Launch badge and menu components in parallel:
Task T010: "Create StatusBadge component"
Task T011: "Create RoleBadge component"
Task T012: "Create AccountActionsMenu component"

# Then AccountRow (depends on badges/menu):
Task T013: "Create AccountRow component"

# Then AccountsTable (depends on AccountRow):
Task T014: "Create AccountsTable component"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational
3. Complete Phase 3: User Story 1
4. **STOP and VALIDATE**: Verify empty state and loading skeleton work
5. Demo ready - shows page structure

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready
2. Add User Story 1 → Test independently → Page structure with empty state (MVP!)
3. Add User Story 2 → Test independently → Full table with data
4. Add User Story 3 → Test independently → Complete filter bar
5. Each story adds visual capability without breaking previous stories

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently verifiable
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- This is UI skeleton only - no real data fetching or business logic
- Follow Roles page (008-roles-page-layout) patterns for consistency
- Use `logger` from `@openzeppelin/ui-builder-utils` instead of `console` (Constitution III)
- Total tasks: 27 (T001-T027)
