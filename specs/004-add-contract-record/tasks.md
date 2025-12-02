# Tasks: Add Contract Record

**Input**: Design documents from `/specs/004-add-contract-record/`  
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, contracts/ ✅, quickstart.md ✅

**Tests**: Required per Constitution §V - TDD for all hook business logic.

**Organization**: Tasks grouped by user story for independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: User story this task belongs to (US1, US2, US3, US4)
- Paths are relative to `apps/role-manager/`

## Path Conventions

- **Project root**: `apps/role-manager/src/`
- **Components**: `src/components/`
- **Hooks**: `src/hooks/`
- **Core services**: `src/core/`
- **Types**: `src/types/`

---

## Phase 1: Setup

**Purpose**: Project initialization and type definitions

- [ ] T001 Create types file at `src/types/contracts.ts` with `AddContractFormData`, `ContractRecord` types from contracts/components.ts
- [ ] T002 [P] Create barrel export at `src/components/Contracts/index.ts` (empty, will populate later)
- [ ] T003 [P] Verify UI Builder dependencies are installed (`@openzeppelin/ui-builder-ui`, `react-hook-form`, `sonner` for toasts)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [ ] T004 Create local `ecosystemManager.ts` at `src/core/ecosystems/ecosystemManager.ts` (adapted from UI Builder's private builder package pattern per research.md) with `loadAdapterPackageModule`, `getNetworksByEcosystem`, `getAdapter`, `capitalize` functions
- [ ] T005 [P] Extend `ECOSYSTEM_REGISTRY` in `src/core/ecosystems/registry.ts` to add `addressExample` for Stellar, Midnight ecosystems
- [ ] T006 Add `deleteContract(id: string)` method to `RecentContractsStorage` class at `src/core/storage/RecentContractsStorage.ts`
- [ ] T007 Expose `deleteContract` method in `useRecentContracts` hook at `src/hooks/useRecentContracts.ts`

**Checkpoint**: Foundation ready - ecosystemManager, storage delete, and registry extensions complete

---

## Phase 3: User Story 1 & 2 - Add Contract with Validation (Priority: P1) 🎯 MVP

**Goal**: Users can add a new contract record with network-specific address validation

**Independent Test**: Open dialog, select network, enter valid name/address, click Add → contract appears in selector and is auto-selected

**Note**: US1 (Add Contract) and US2 (Address Validation) are combined as they are interdependent - validation is core to the add flow.

### Tests for User Story 1 & 2 (Constitution §V - TDD Required)

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [ ] T008a [P] [US1] Write failing tests for `useNetworkAdapter` at `src/hooks/__tests__/useNetworkAdapter.test.ts` covering: adapter loading, isLoading state, error handling, retry functionality
- [ ] T009a [P] [US1] Write failing tests for `useAllNetworks` at `src/hooks/__tests__/useAllNetworks.test.ts` covering: network fetching, ecosystem filtering, loading state
- [ ] T010a [P] [US1] Write failing tests for `useContractForm` at `src/hooks/__tests__/useContractForm.test.ts` covering: validation logic, network change re-validation, placeholder generation, form state

### Hooks for User Story 1 & 2

- [ ] T008 [P] [US1] Create `useNetworkAdapter` hook at `src/hooks/useNetworkAdapter.ts` implementing `UseNetworkAdapterReturn` interface with adapter loading, isLoading, error, retry states
- [ ] T009 [P] [US1] Create `useAllNetworks` hook at `src/hooks/useAllNetworks.ts` to fetch networks from all enabled ecosystems via `getNetworksByEcosystem`
- [ ] T010 [US1] Create `useContractForm` hook at `src/hooks/useContractForm.ts` implementing `UseContractFormReturn` interface with react-hook-form integration, adapter-based validation, dynamic placeholder

### Components for User Story 1 & 2

- [ ] T011 [US1] Create `AddContractForm` component at `src/components/Contracts/AddContractForm.tsx` with Network selector (first), Name field (with `autoFocus` per UX-004), Address field with loading spinner when `isAdapterLoading` (per UX-010), validation errors styled with `text-destructive` below fields (per ERR-006)
- [ ] T012 [US1] Create `AddContractDialog` component at `src/components/Contracts/AddContractDialog.tsx` implementing `AddContractDialogProps` with Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter from ui-builder-ui
- [ ] T013 [US1] Update barrel export at `src/components/Contracts/index.ts` to export AddContractDialog, AddContractForm

### Integration for User Story 1 & 2

- [ ] T014 [US1] Add dialog state (`isAddDialogOpen`) and handlers to `Sidebar.tsx` at `src/components/Layout/Sidebar.tsx`
- [ ] T015 [US1] Wire up `onContractAdded` callback in Sidebar to auto-select new contract (FR-008a)

**Checkpoint**: Users can add contracts with full validation. This is the MVP - stop here to validate core functionality works.

---

## Phase 4: User Story 3 - Network Selection with Search (Priority: P2)

**Goal**: Users can efficiently find networks using search and see them grouped by ecosystem

**Independent Test**: Open dialog, click network selector, type search query, verify filtering works and networks are grouped

**Note**: NetworkSelector from ui-builder-ui provides search and grouping. This phase ensures proper integration.

### Implementation for User Story 3

- [ ] T016 [US3] Verify NetworkSelector props in `AddContractForm.tsx` include `groupByEcosystem: true` and all accessor functions per INT-001
- [ ] T017 [US3] Add `filterNetwork` prop to NetworkSelector to support custom filtering if default is insufficient
- [ ] T018 [US3] Ensure ecosystem grouping order matches ECOSYSTEM_ORDER (EVM, Stellar, Midnight, Solana) per FR-010

**Checkpoint**: Network selection with search and grouping works as specified

---

## Phase 5: User Story 4 - Delete Contract Record (Priority: P2)

**Goal**: Users can delete contracts they no longer need to track from the dropdown

**Independent Test**: Open dropdown with multiple contracts, click delete on non-selected contract, verify it disappears

### Implementation for User Story 4

- [ ] T019 [US4] Rename `AccountSelector.tsx` to `ContractSelector.tsx` at `src/components/Layout/` with updated interface per `ContractSelectorProps`
- [ ] T020 [US4] Add delete icon (Trash from lucide-react) to each contract item in `ContractSelector.tsx`, visible on hover only, hidden for selected contract per UX-002
- [ ] T021 [US4] Implement `onRemoveContract` handler in `ContractSelector.tsx` that calls `deleteContract` from useRecentContracts
- [ ] T022 [US4] Add error handling for delete failures with toast notification per ERR-004
- [ ] T023 [US4] Update "Add new account" text to "Add new contract" and use Plus icon per UX-001
- [ ] T024 [US4] Update imports in `Sidebar.tsx` from AccountSelector to ContractSelector

**Checkpoint**: Contract deletion works, delete icon shows on hover, selected contract cannot be deleted

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Error handling, accessibility, and final polish

- [ ] T025 [P] Add aria-label to delete buttons: `aria-label="Delete {contractName}"` per NFR-A005
- [ ] T026 [P] Ensure all form fields have associated labels with `htmlFor` per NFR-A003
- [ ] T027 [P] Add `aria-describedby` to fields for error message association and wrap error messages in `aria-live="polite"` region per NFR-A004
- [ ] T028 Implement empty state in dialog when no networks available per ERR-005
- [ ] T028a [P] Add retry button for adapter load failures in AddContractForm per UX-011 (inline "Retry" link with error message)
- [ ] T029 Add error toast for save failures per ERR-003 (using sonner toast)
- [ ] T030 [P] Verify focus trap works in dialog (should be handled by Dialog component)
- [ ] T031 Run linting and fix any issues: `pnpm lint`
- [ ] T032 Run type check and fix any issues: `pnpm typecheck`
- [ ] T033 Manual testing against quickstart.md Definition of Done checklist

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup - BLOCKS all user stories
- **User Story 1&2 (Phase 3)**: Depends on Foundational - core MVP
- **User Story 3 (Phase 4)**: Depends on Phase 3 (needs form component)
- **User Story 4 (Phase 5)**: Depends on Foundational only (can parallel with Phase 3)
- **Polish (Phase 6)**: Depends on all user stories being complete

### User Story Dependencies

```
Phase 2 (Foundational)
       │
       ├──────────────────────┐
       ▼                      ▼
Phase 3 (US1&2)         Phase 5 (US4)
       │                      │
       ▼                      │
Phase 4 (US3)                 │
       │                      │
       └──────────┬───────────┘
                  ▼
           Phase 6 (Polish)
```

- **US1 & US2 (P1)**: Core MVP - must complete first for validation
- **US3 (P2)**: Enhances US1/US2 form - depends on AddContractForm existing
- **US4 (P2)**: Independent - only needs Foundational phase (storage delete)

### Within Each User Story

- Hooks before components (hooks provide state/logic for components)
- Core implementation before integration
- Story complete before moving to next priority

### Parallel Opportunities

**Phase 1 Parallel**:

```bash
T002 Create barrel export
T003 Verify dependencies
```

**Phase 2 Parallel**:

```bash
T004 ecosystemManager (no dependencies)
T005 ECOSYSTEM_REGISTRY extension (no dependencies)
```

**Phase 3 Tests Parallel (write first, before implementation)**:

```bash
T008a useNetworkAdapter tests
T009a useAllNetworks tests
T010a useContractForm tests
```

**Phase 3 Implementation Parallel (after tests pass on mocks)**:

```bash
T008 useNetworkAdapter hook
T009 useAllNetworks hook
```

**Phase 5 Can Run Parallel with Phase 3** (different files):

```bash
T019-T024 (ContractSelector work) can proceed while T010-T015 progress
```

**Phase 6 Parallel**:

```bash
T025 aria-label for delete
T026 form field labels
T027 aria-describedby
T030 focus trap verification
```

---

## Parallel Example: Phase 3 Hooks

```bash
# Launch all hooks for US1&2 together after ecosystemManager:
Task T008: "Create useNetworkAdapter hook at src/hooks/useNetworkAdapter.ts"
Task T009: "Create useAllNetworks hook at src/hooks/useAllNetworks.ts"
# Then T010 (depends on T008, T009):
Task T010: "Create useContractForm hook at src/hooks/useContractForm.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 & 2 Only)

1. Complete Phase 1: Setup (T001-T003)
2. Complete Phase 2: Foundational (T004-T007) ← CRITICAL
3. Complete Phase 3: User Story 1 & 2 (T008-T015)
4. **STOP and VALIDATE**: Test add contract flow end-to-end
5. Demo/deploy MVP if ready

### Incremental Delivery

1. Setup + Foundational → Foundation ready
2. Add User Story 1&2 → Test → Deploy (MVP!)
3. Add User Story 3 → Test → Deploy (enhanced network selection)
4. Add User Story 4 → Test → Deploy (delete capability)
5. Polish → Final release

### Parallel Team Strategy

With 2 developers after Phase 2:

- Developer A: Phase 3 (US1&2 - Add Contract)
- Developer B: Phase 5 (US4 - Delete Contract)

Both can proceed in parallel since they touch different files.

---

## Summary

| Metric                 | Value                       |
| ---------------------- | --------------------------- |
| Total Tasks            | 37                          |
| Phase 1 (Setup)        | 3 tasks                     |
| Phase 2 (Foundational) | 4 tasks                     |
| Phase 3 (US1&2 MVP)    | 11 tasks (3 tests + 8 impl) |
| Phase 4 (US3)          | 3 tasks                     |
| Phase 5 (US4)          | 6 tasks                     |
| Phase 6 (Polish)       | 10 tasks                    |
| Parallel Opportunities | 16 tasks marked [P]         |
| MVP Scope              | T001-T015 (18 tasks)        |

---

## Notes

- [P] tasks = different files, no dependencies within phase
- [US1], [US2], [US3], [US4] labels map to spec.md user stories
- US1 and US2 combined (P1 priority, interdependent)
- US3 and US4 both P2 but independent of each other
- **TDD Required (Constitution §V)**: Tests T008a, T009a, T010a MUST be written FIRST and FAIL before implementing T008, T009, T010
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- ecosystemManager (T004) is the critical path blocker - prioritize
- Toast notifications use `sonner` (available via ui-builder peer dependencies)
