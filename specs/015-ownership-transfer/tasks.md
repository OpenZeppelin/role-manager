# Tasks: Contract Ownership Transfer

**Feature**: 015-ownership-transfer  
**Branch**: `015-ownership-transfer`  
**Generated**: 2024-12-14

---

## Phase 1: Setup

**Goal**: Prepare project structure for ownership transfer feature.

- [x] T001 Create `apps/role-manager/src/components/Ownership/` directory
- [x] T002 Create barrel export file `apps/role-manager/src/components/Ownership/index.ts`

---

## Phase 2: Foundational Hooks (TDD)

**Goal**: Create shared hooks that support multiple user stories. These must be completed before user story phases.

**Dependencies**: None (blocking for all user story phases)

### useCurrentLedger Hook

- [x] T003 [P] Create test file `apps/role-manager/src/hooks/__tests__/useCurrentLedger.test.tsx` with tests for: initial fetch, polling, error handling, manual refetch, enabled toggle
- [x] T004 Create `apps/role-manager/src/hooks/useCurrentLedger.ts` implementing `UseCurrentLedgerReturn` interface from contracts/hooks.ts
- [x] T005 Add `useCurrentLedger` export to `apps/role-manager/src/hooks/index.ts`

### useAcceptOwnership Hook

- [x] T006 [P] Add tests for `useAcceptOwnership` to `apps/role-manager/src/hooks/__tests__/useAccessControlMutations.test.tsx`: success flow, error handling, status tracking, query invalidation, user rejection
- [x] T007 Add `useAcceptOwnership` hook to `apps/role-manager/src/hooks/useAccessControlMutations.ts` implementing `UseAcceptOwnershipReturn` interface

---

## Phase 3: User Story 1 - Initiate Ownership Transfer (P1)

**Goal**: As a Contract Owner, I can initiate an ownership transfer by specifying new owner address and expiration.

**Independent Test**: Open Transfer Ownership dialog, enter valid address and expiration, submit transaction, verify pending transfer created.

**Dependencies**: Phase 2 (useCurrentLedger)

### Hooks

- [x] T008 [P] [US1] Create test file `apps/role-manager/src/hooks/__tests__/useOwnershipTransferDialog.test.tsx` with tests for: step transitions, form validation (address, self-transfer, expiration), submit flow, retry, reset
- [x] T009 [US1] Create `apps/role-manager/src/hooks/useOwnershipTransferDialog.ts` implementing `UseOwnershipTransferDialogReturn` interface
- [x] T010 [US1] Add `useOwnershipTransferDialog` export to `apps/role-manager/src/hooks/index.ts`

### Components

- [x] T011 [US1] Create `apps/role-manager/src/components/Ownership/TransferOwnershipDialog.tsx` with: address input, expiration input (two-step only), current ledger display, validation messages, transaction states
- [x] T012 [US1] Add `TransferOwnershipDialog` export to `apps/role-manager/src/components/Ownership/index.ts`

### Integration

- [x] T013 [US1] Modify `apps/role-manager/src/components/Roles/OwnerAccountRow.tsx` (or equivalent) to add "Transfer Ownership" button visible only when connected wallet is current owner
- [x] T014 [US1] Add dialog state and `TransferOwnershipDialog` to `apps/role-manager/src/pages/Roles.tsx`

---

## Phase 4: User Story 2 - Accept Pending Ownership Transfer (P1)

**Goal**: As the Pending Owner, I can accept the ownership transfer before it expires.

**Independent Test**: View contract with pending transfer as pending owner, click "Accept Ownership", verify ownership transfers.

**Dependencies**: Phase 2 (useAcceptOwnership)

### Hooks

- [ ] T015 [P] [US2] Create test file `apps/role-manager/src/hooks/__tests__/useAcceptOwnershipDialog.test.tsx` with tests for: step transitions, submit flow, error handling, retry, reset
- [ ] T016 [US2] Create `apps/role-manager/src/hooks/useAcceptOwnershipDialog.ts` implementing `UseAcceptOwnershipDialogReturn` interface
- [ ] T017 [US2] Add `useAcceptOwnershipDialog` export to `apps/role-manager/src/hooks/index.ts`

### Components

- [ ] T018 [US2] Create `apps/role-manager/src/components/Ownership/AcceptOwnershipDialog.tsx` with: confirmation content, contract address display, transaction states
- [ ] T019 [US2] Add `AcceptOwnershipDialog` export to `apps/role-manager/src/components/Ownership/index.ts`

### Integration

- [ ] T020 [US2] Add "Accept Ownership" button visibility logic to Owner role panel (visible when connected wallet is pending owner)
- [ ] T021 [US2] Add dialog state and `AcceptOwnershipDialog` to `apps/role-manager/src/pages/Roles.tsx`

---

## Phase 5: User Story 3 - View Ownership Status (P1)

**Goal**: As a User, I can see current ownership status including pending transfers.

**Independent Test**: View contracts with various ownership states (owned, pending, expired, renounced) and verify correct display.

**Dependencies**: None (can run in parallel with Phase 3-4)

- [ ] T022 [P] [US3] Modify `apps/role-manager/src/pages/Roles.tsx` to sort Owner role to top of role list (before other roles)
- [ ] T023 [US3] Ensure Owner role details panel shows current owner address with consistent formatting (FR-002, FR-005)
- [ ] T024 [US3] Add loading/skeleton state for ownership data in Owner role panel (FR-005c)
- [ ] T025 [US3] Add conditional rendering to hide Owner role when `hasOwnable` is false (FR-004)

---

## Phase 6: User Story 4 - View Pending Transfer Details (P2)

**Goal**: As a User, I can see detailed pending transfer information.

**Independent Test**: View contract with pending transfer and verify all metadata displayed correctly.

**Dependencies**: Phase 5 (US3)

- [ ] T026 [US4] Display pending owner address in Owner role details when state is 'pending' (FR-003)
- [ ] T027 [US4] Display expiration ledger/block number in Owner role details for pending transfers
- [ ] T028 [US4] Add "Transfer Expired" status display when pending transfer has expired

---

## Phase 7: User Story 5 - Handle Network Errors (P2)

**Goal**: As a User, I see clear error messages and can retry on network errors.

**Independent Test**: Simulate network error during transaction submission and verify error handling and retry.

**Dependencies**: Phase 3, Phase 4 (dialogs must exist)

- [ ] T029 [US5] Ensure TransferOwnershipDialog displays network error message with retry button
- [ ] T030 [US5] Ensure AcceptOwnershipDialog displays network error message with retry button
- [ ] T031 [US5] Add wallet disconnection detection and error display to both dialogs (FR-026)

---

## Phase 8: Polish & Cross-Cutting Concerns

**Goal**: Final polish, edge cases, and cross-cutting requirements.

**Dependencies**: All previous phases

### Validation Edge Cases

- [ ] T032 Add self-transfer prevention with error message "Cannot transfer to yourself" (FR-012, FR-012a)
- [ ] T033 Add "This will replace the existing pending transfer" warning when initiating transfer while one is pending
- [ ] T034 Add "Connect the pending owner wallet to accept" message when wrong wallet connected

### Dashboard Integration

- [ ] T035 Ensure pending ownership transfers appear in Dashboard "Pending Role Changes" table (FR-005a)
- [ ] T036 Display "Transfer Ownership" label with step progress indicator in pending changes (FR-005b)

### Accessibility

- [ ] T037 Verify focus moves to first interactive element when dialogs open (FR-028)
- [ ] T038 Verify focus returns to trigger element when dialogs close (FR-029)
- [ ] T039 Verify Escape key closes dialogs (except during pending/confirming) (FR-030)
- [ ] T040 Verify all interactive elements are keyboard accessible via Tab (FR-031)

### Single-Step Adaptation

- [ ] T041 Ensure expiration input and current ledger display are omitted for single-step contracts (FR-032)
- [ ] T042 Verify single-step transfers complete immediately without Accept step (FR-033)

---

## Dependencies Graph

```
Phase 1 (Setup)
    │
    ▼
Phase 2 (Foundational)
    │
    ├──────────────┬──────────────┐
    ▼              ▼              ▼
Phase 3 (US1)   Phase 4 (US2)   Phase 5 (US3)
    │              │              │
    └──────────────┴──────┬───────┘
                          ▼
                    Phase 6 (US4)
                          │
    ┌─────────────────────┤
    ▼                     ▼
Phase 7 (US5)       Phase 8 (Polish)
```

**Parallel Opportunities**:

- T003, T006: Foundational hook tests can run in parallel
- T008, T015: Dialog hook tests can run in parallel
- Phase 3, 4, 5: Can be developed in parallel after Phase 2 completes
- T022: Can run in parallel with Phase 3-4

---

## Implementation Strategy

### MVP (Minimum Viable Product)

**MVP Scope**: User Story 1 + User Story 3 (Initiate transfer + View status)

This enables:

- Current owners to initiate transfers
- All users to view ownership status
- Basic two-step transfer flow (acceptance can follow)

**MVP Tasks**: T001-T014, T022-T025 (20 tasks)

### Incremental Delivery

1. **Increment 1**: Phase 1-2 + US3 (Setup + Foundational + View Status)
2. **Increment 2**: US1 (Initiate Transfer) - Core feature
3. **Increment 3**: US2 (Accept Transfer) - Complete two-step flow
4. **Increment 4**: US4 + US5 + Polish - Enhanced experience

---

## Summary

| Phase     | User Story              | Tasks  | Priority |
| --------- | ----------------------- | ------ | -------- |
| 1         | Setup                   | 2      | -        |
| 2         | Foundational            | 5      | -        |
| 3         | US1 - Initiate Transfer | 7      | P1       |
| 4         | US2 - Accept Transfer   | 7      | P1       |
| 5         | US3 - View Status       | 4      | P1       |
| 6         | US4 - View Details      | 3      | P2       |
| 7         | US5 - Error Handling    | 3      | P2       |
| 8         | Polish                  | 11     | -        |
| **Total** |                         | **42** |          |

**Parallel Opportunities**: 8 tasks marked [P]  
**Tests Included**: Yes (TDD approach per plan.md)  
**MVP Tasks**: 20 tasks (Phases 1-3, 5)
