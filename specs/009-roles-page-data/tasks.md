# Tasks: Roles Page Real Data Integration

**Input**: Design documents from `/specs/009-roles-page-data/`  
**Prerequisites**: plan.md, spec.md, data-model.md, contracts/components.ts, research.md  
**Branch**: `009-roles-page-data`

**Tests**: TDD approach per Constitution §V - tests included for new hooks and storage methods.

**Organization**: Tasks grouped by user story priority (P1 → P2) to enable independent implementation and testing.

## Format: `[ID] [P?] [Story?] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story (US1-US6) - Setup/Foundational/Polish have no story label
- File paths relative to `apps/role-manager/src/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Type definitions and exports needed by all subsequent phases

- [x] T001 [P] Add `CustomRoleDescriptions` type to `types/storage.ts`
- [x] T002 [P] Add `RoleWithDescription` type to `types/roles.ts`
- [x] T003 [P] Add `RoleIdentifier` type to `types/roles.ts`
- [x] T004 Update `types/roles.ts` barrel export with new types
- [x] T005 Update `components/Roles/index.ts` to prepare for new component exports

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Storage layer and hooks that MUST be complete before ANY user story

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

### Storage Layer Extension (TDD)

- [x] T006 [P] Write tests for `updateRoleDescription` method in `core/storage/__tests__/RecentContractsStorage.test.ts`
- [x] T007 [P] Write tests for `getCustomRoleDescriptions` method in `core/storage/__tests__/RecentContractsStorage.test.ts`
- [x] T008 [P] Write tests for `clearRoleDescription` method in `core/storage/__tests__/RecentContractsStorage.test.ts`
- [x] T009 Implement `updateRoleDescription` method in `core/storage/RecentContractsStorage.ts`
- [x] T010 Implement `getCustomRoleDescriptions` method in `core/storage/RecentContractsStorage.ts`
- [x] T011 Implement `clearRoleDescription` method in `core/storage/RecentContractsStorage.ts`
- [x] T012 Add 256-character validation with error code `storage/description-too-long`

### Custom Descriptions Hook (TDD)

- [x] T013 [P] Write tests for `useCustomRoleDescriptions` hook in `hooks/__tests__/useCustomRoleDescriptions.test.tsx`
- [x] T014 Create `useCustomRoleDescriptions` hook in `hooks/useCustomRoleDescriptions.ts`
- [x] T015 Export `useCustomRoleDescriptions` from `hooks/index.ts`

**Checkpoint**: Storage layer and description hook ready - user story implementation can begin

---

## Phase 3: User Stories 1-3 - Core Data Display (Priority: P1) 🎯 MVP

**Goal**: Display real roles, real assigned accounts, and handle contracts without access control

**Independent Test**: Select a contract with known AccessControl roles, navigate to Roles page, verify roles and members match on-chain state. Select unsupported contract, verify empty state message.

### Data Orchestration Hook (TDD)

- [x] T016 [P] [US1] Write tests for `useRolesPageData` hook in `hooks/__tests__/useRolesPageData.test.tsx`
- [x] T017 [US1] Create `useRolesPageData` hook in `hooks/useRolesPageData.ts`
- [x] T018 [US1] Implement capability detection integration (useContractCapabilities)
- [x] T019 [US1] Implement roles fetching integration (useContractRoles)
- [x] T020 [US1] Implement ownership fetching integration (useContractOwnership)
- [x] T021 [US1] Implement Owner role synthesis from OwnershipInfo
- [x] T022 [US1] Implement description priority resolution (custom > adapter > null)
- [x] T023 [US1] Implement role selection state management (default to first role)
- [x] T024 [US1] Export `useRolesPageData` from `hooks/index.ts`

### UI State Components

- [x] T025 [P] [US3] Create `RolesLoadingSkeleton` component in `components/Roles/RolesLoadingSkeleton.tsx`
- [x] T026 [P] [US3] Create `RolesErrorState` component in `components/Roles/RolesErrorState.tsx`
- [x] T027 [P] [US3] Create `RolesEmptyState` component in `components/Roles/RolesEmptyState.tsx`
- [x] T028 [US3] Export new state components from `components/Roles/index.ts`

### Component Updates for Real Data

- [x] T029 [P] [US1] Update `RoleCard` props to accept `RoleWithDescription` in `components/Roles/RoleCard.tsx`
- [x] T030 [P] [US1] Update `RolesList` props to accept real roles array in `components/Roles/RolesList.tsx`
- [x] T031 [P] [US2] Update `AccountRow` props for real member data in `components/Roles/AccountRow.tsx`
- [x] T032 [US2] Implement "You" badge detection in `AccountRow` (case-insensitive address comparison)
- [x] T033 [US2] Implement assignment date display/hide logic in `AccountRow`
- [x] T034 [P] [US1] Update `RoleDetails` props to accept `RoleWithDescription` in `components/Roles/RoleDetails.tsx`

### Page Integration

- [x] T035 [US1] Update `Roles.tsx` to use `useRolesPageData` hook in `pages/Roles.tsx`
- [x] T036 [US1] Replace mock data imports with real data from hook
- [x] T037 [US3] Add conditional rendering for loading skeleton state
- [x] T038 [US3] Add conditional rendering for error state with retry
- [x] T039 [US3] Add conditional rendering for empty state (unsupported contract)
- [x] T040 [US1] Wire role selection callbacks to hook's `setSelectedRoleId`
- [x] T041 [US1] Remove mock data exports from `components/Roles/mockData.ts` (deprecate file)
- [x] T042 [US3] Implement partial data handling (display roles if ownership fetch fails, per FR-022)
- [x] T043 [US1] Implement optimistic UI updates for description saves (per FR-018)

**Checkpoint**: Core P1 features complete - roles display, accounts display, error handling all functional

---

## Phase 4: User Story 4 - Dynamic Role Identifiers (Priority: P2)

**Goal**: Populate Role Identifiers table with actual role identifiers from the contract

**Independent Test**: Load a contract with custom roles, verify identifiers table shows all detected roles including custom ones with fallback to hash for unknown names.

### Implementation

- [ ] T044 [US4] Add `roleIdentifiers` computation to `useRolesPageData` hook
- [ ] T045 [US4] Update `RoleIdentifiersTable` props in `components/Roles/RoleIdentifiersTable.tsx`
- [ ] T046 [US4] Implement fallback to role ID hash when name unavailable
- [ ] T047 [US4] Wire identifiers table in `Roles.tsx` to real data

**Checkpoint**: Role identifiers table populated with real contract data

---

## Phase 5: User Story 5 - Real-time Data Refresh (Priority: P2)

**Goal**: Enable manual refresh and automatic refresh after mutations

**Independent Test**: Trigger refresh button, verify data re-fetches. Simulate external change, verify refresh shows new state.

### Implementation

- [ ] T048 [US5] Add `refetch` action to `useRolesPageData` return type
- [ ] T049 [US5] Implement combined refetch logic (roles + ownership)
- [ ] T050 [US5] Add refresh button to page header in `pages/Roles.tsx`
- [ ] T051 [US5] Implement subtle refresh loading indicator (without replacing content)
- [ ] T052 [US5] Handle contract switching (cancel pending, fetch new)

**Checkpoint**: Data refresh functional with proper loading indication

---

## Phase 6: User Story 6 - Edit Role Description (Priority: P2)

**Goal**: Enable inline editing of role descriptions with local storage persistence

**Independent Test**: Click description placeholder, enter text, press Enter, reload page, verify description persists. Press Escape, verify changes discarded.

### EditableDescription Component

- [ ] T053 [P] [US6] Create `EditableDescription` component in `components/Roles/EditableDescription.tsx`
- [ ] T054 [US6] Implement click-to-edit activation
- [ ] T055 [US6] Implement inline text input with pre-filled value
- [ ] T056 [US6] Implement Enter/blur to save
- [ ] T057 [US6] Implement Escape to cancel
- [ ] T058 [US6] Implement 256-character validation with error display
- [ ] T059 [US6] Export `EditableDescription` from `components/Roles/index.ts`

### Integration

- [ ] T060 [US6] Add `onDescriptionChange` prop to `RoleDetails` component
- [ ] T061 [US6] Integrate `EditableDescription` in `RoleDetails` for description display
- [ ] T062 [US6] Wire description updates to `useRolesPageData.updateRoleDescription`
- [ ] T063 [US6] Handle empty description save (clear custom, revert to adapter/placeholder)

**Checkpoint**: Inline description editing complete with persistence

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Final cleanup and validation

- [ ] T064 [P] Remove mock data file `components/Roles/mockData.ts`
- [ ] T064a [P] Remove legacy `Role` type from `types/roles.ts` (replaced by `RoleWithDescription`)
- [ ] T065 [P] Update component JSDoc comments with new prop types
- [ ] T066 [P] Run TypeScript type check (`pnpm typecheck`)
- [ ] T067 [P] Run linter (`pnpm lint`)
- [ ] T068 Run all tests (`pnpm test`)
- [ ] T069 Validate against quickstart.md test scenarios
- [ ] T070 Manual testing with real Stellar testnet contract
- [ ] T071 Validate performance: initial load <3s, role selection <100ms (NFR-001, NFR-002, SC-004, SC-005)
- [ ] T072 Verify scale: test with contract having 50+ roles to validate NFR-004 compliance

---

## Dependencies & Execution Order

### Phase Dependencies

```
Phase 1: Setup
    │
    ▼
Phase 2: Foundational (BLOCKS all user stories)
    │
    ├──────────────────────────────────┐
    ▼                                  │
Phase 3: US1-3 (P1 Core) ◄─────────────┘
    │
    ├─────────┬─────────┐
    ▼         ▼         ▼
Phase 4    Phase 5    Phase 6
(US4)      (US5)      (US6)
    │         │         │
    └─────────┴─────────┘
              │
              ▼
        Phase 7: Polish
```

### User Story Dependencies

| Story      | Depends On             | Can Parallel With     |
| ---------- | ---------------------- | --------------------- |
| US1-3 (P1) | Phase 2 (Foundational) | -                     |
| US4 (P2)   | Phase 3 (Core)         | US5, US6              |
| US5 (P2)   | Phase 3 (Core)         | US4, US6              |
| US6 (P2)   | Phase 2 (Foundational) | US4, US5 (after T024) |

### Within Each Phase

- Tests marked [P] can run in parallel
- Components marked [P] can run in parallel (different files)
- Hook implementation follows: tests → implementation → export
- Page integration follows: hook ready → component updates → page wiring

---

## Parallel Execution Examples

### Phase 2 Parallelization

```bash
# All storage tests can run in parallel:
T006: Write tests for updateRoleDescription
T007: Write tests for getCustomRoleDescriptions
T008: Write tests for clearRoleDescription

# Then all implementations in sequence (same file):
T009 → T010 → T011 → T012
```

### Phase 3 Component Updates

```bash
# All component updates can run in parallel (different files):
T029: Update RoleCard props
T030: Update RolesList props
T031: Update AccountRow props
T034: Update RoleDetails props

# State components can run in parallel:
T025: RolesLoadingSkeleton
T026: RolesErrorState
T027: RolesEmptyState
```

### P2 Stories After Core

```bash
# US4, US5, US6 can proceed in parallel after Phase 3:
Developer A: T044-T047 (US4 - Identifiers)
Developer B: T048-T052 (US5 - Refresh)
Developer C: T053-T063 (US6 - Description Editing)
```

---

## Implementation Strategy

### MVP First (Phase 1-3 Only)

1. Complete Phase 1: Setup (types)
2. Complete Phase 2: Foundational (storage + hook)
3. Complete Phase 3: US1-3 Core Display
4. **STOP and VALIDATE**: Test with real contract
5. Deploy/demo MVP - roles page shows real data!

### Incremental Delivery

1. **MVP (Phase 1-3)**: Real roles, accounts, error states → Deploy
2. **+US4 (Phase 4)**: Role identifiers table with real data → Deploy
3. **+US5 (Phase 5)**: Data refresh capability → Deploy
4. **+US6 (Phase 6)**: Description editing → Deploy
5. **Polish (Phase 7)**: Cleanup and validation → Final

### Single Developer Order

```
T001-T005 (Setup) →
T006-T015 (Foundational) →
T016-T043 (Core P1) →
T044-T047 (US4) →
T048-T052 (US5) →
T053-T063 (US6) →
T064-T072 (Polish)
```

---

## Task Summary

| Phase     | Description          | Tasks  | Parallelizable |
| --------- | -------------------- | ------ | -------------- |
| 1         | Setup                | 5      | 3              |
| 2         | Foundational         | 10     | 4              |
| 3         | US1-3 Core (P1)      | 28     | 11             |
| 4         | US4 Identifiers (P2) | 4      | 0              |
| 5         | US5 Refresh (P2)     | 5      | 0              |
| 6         | US6 Editing (P2)     | 11     | 1              |
| 7         | Polish               | 9      | 4              |
| **Total** |                      | **72** | **23**         |

---

## Notes

- [P] tasks = different files, no dependencies on incomplete tasks
- [Story] label maps task to specific user story for traceability
- TDD approach: write failing tests before implementation (T006-T008, T013, T016)
- All P1 stories (US1-3) grouped together due to shared dependencies
- P2 stories (US4-6) can proceed in parallel after core is done
- Commit after each task or logical group
- Stop at any checkpoint to validate independently

## Implementation Notes

- **Hook naming**: `useContractCapabilities` (plan.md) wraps `useAccessControlService` (spec.md) for capability detection—both refer to the same underlying functionality
- **Large member lists**: Pagination/virtualization for 1000+ members is handled upstream per FR-013 from spec 006; this feature integrates that behavior
- **Optimistic updates** (FR-018): Applied to description saves via `useCustomRoleDescriptions` hook; role/ownership data uses react-query's built-in caching
