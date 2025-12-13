# Tasks: Role Grant and Revoke Actions

**Input**: Design documents from `/specs/014-role-grant-revoke/`  
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, contracts/ ✅, quickstart.md ✅

**Tests**: TDD for hooks as specified in plan.md (Vitest + React Testing Library)

**Organization**: Tasks grouped by user story (dialogs) for independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1-US7)
- Include exact file paths in descriptions

## Path Conventions

- **Monorepo app**: `apps/role-manager/src/`
- **UI package**: `@openzeppelin/ui-builder-ui` (external)

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Create types and shared dialog utilities

- [x] T001 Create dialog state types in `apps/role-manager/src/types/role-dialogs.ts` (DialogTransactionStep, PendingRoleChange, RoleCheckboxItem, ManageRolesDialogState, AssignRoleDialogState, RevokeRoleDialogState)
- [x] T002 [P] Export types from `apps/role-manager/src/types/index.ts`

---

## Phase 2: Foundational (Shared Components)

**Purpose**: Create shared UI components used by ALL dialogs

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T003 Create SelfRevokeWarning component in `apps/role-manager/src/components/Shared/SelfRevokeWarning.tsx` (warning variant alert, amber background, icon, dynamic role name)
- [x] T004 [P] Create RoleCheckboxList component in `apps/role-manager/src/components/Shared/RoleCheckboxList.tsx` (checkbox list with disabled state support)
- [x] T005 [P] Create DialogTransactionStates components in `apps/role-manager/src/components/Shared/DialogTransactionStates.tsx` (DialogPendingState, DialogSuccessState, DialogErrorState)
- [x] T006 Export shared components from `apps/role-manager/src/components/Shared/index.ts`

**Checkpoint**: ✅ Foundation ready - user story implementation can now begin

---

## Phase 3: User Story 1 - Manage Roles Dialog (Priority: P1) 🎯 MVP ✅ COMPLETE

**Goal**: Administrators can grant/revoke roles via checkbox list from Authorized Accounts page

**Includes**: US1 (Manage Roles), US2 (Single-Change Constraint), US3 (Self-Revoke Warning)

**Independent Test**: Open Manage Roles for an account → verify checkboxes match assignments → toggle one role → submit → verify change persisted

### Tests for Manage Roles Dialog (TDD)

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [x] T007 [US1] Create hook test file `apps/role-manager/src/hooks/__tests__/useManageRolesDialog.test.tsx` with test setup (mock adapter, QueryClient wrapper)
- [x] T008 [US1] Add test: initializes with correct role states from data
- [x] T009 [US1] Add test: enforces single-change constraint via auto-revert (toggle A, then toggle B → A reverts)
- [x] T010 [US1] Add test: detects self-revoke when connected wallet matches target account
- [x] T011 [US1] Add test: canSubmit is false when no changes, true when pendingChange exists
- [x] T012 [US1] Add test: submitLabel reflects pending action ("Grant {Role}" or "Revoke {Role}")
- [x] T013 [US1] Add test: executes grant transaction via useGrantRole when submitting grant
- [x] T014 [US1] Add test: executes revoke transaction via useRevokeRole when submitting revoke
- [x] T015 [US1] Add test: handles transaction rejection (returns to form state with preserved inputs)
- [x] T016 [US1] Add test: handles transaction error (shows error, enables retry)
- [x] T017 [US1] Add test: auto-closes dialog after 1.5s success display

### Implementation for Manage Roles Dialog

- [x] T018 [US1] Implement useManageRolesDialog hook in `apps/role-manager/src/hooks/useManageRolesDialog.ts` (role state initialization, snapshot original state)
- [x] T019 [US1] Add toggleRole function with single-change constraint auto-revert logic
- [x] T020 [US1] Add transaction execution (submit, retry, reset) using useGrantRole/useRevokeRole
- [x] T021 [US1] Add derived state (canSubmit, submitLabel, showSelfRevokeWarning)
- [x] T022 [US1] Add success auto-close with 1.5s timeout
- [x] T023 [US1] Export hook from `apps/role-manager/src/hooks/index.ts`
- [x] T024 [P] [US1] Create ManageRolesDialog component in `apps/role-manager/src/components/AuthorizedAccounts/ManageRolesDialog.tsx` (Dialog shell, open/close handling)
- [x] T025 [US1] Add ManageRolesFormContent (account address display, RoleCheckboxList, SelfRevokeWarning, submit/cancel buttons)
- [x] T026 [US1] Add transaction state rendering (pending → confirming → success → error) using DialogTransactionStates
- [x] T027 [US1] Wire ManageRolesDialog to AuthorizedAccounts page in `apps/role-manager/src/pages/AuthorizedAccounts.tsx` (state for selected account, handleAction for 'edit-roles')
- [x] T028 [US1] Verify all hook tests pass

**Checkpoint**: ✅ Manage Roles Dialog fully functional - can grant/revoke single role with auto-revert constraint and self-revoke warning

---

## Phase 4: User Story 5 - Assign Role Dialog (Priority: P1)

**Goal**: Administrators can grant a role to a new address from the Roles page

**Independent Test**: Select role → click "+ Assign" → enter valid address → submit → verify address appears in role members

### Tests for Assign Role Dialog (TDD)

- [x] T029 [US5] Create hook test file `apps/role-manager/src/hooks/__tests__/useAssignRoleDialog.test.tsx` with test setup
- [x] T030 [US5] Add test: initializes with correct available roles (excludes Owner)
- [x] T031 [US5] Add test: submit calls useGrantRole with correct address and roleId
- [x] T032 [US5] Add test: handles transaction rejection
- [x] T033 [US5] Add test: handles transaction error with retry
- [x] T034 [US5] Add test: auto-closes after success

### Implementation for Assign Role Dialog

- [x] T035 [US5] Implement useAssignRoleDialog hook in `apps/role-manager/src/hooks/useAssignRoleDialog.ts` (available roles filter, transaction execution)
- [x] T036 [US5] Export hook from `apps/role-manager/src/hooks/index.ts`
- [x] T037 [P] [US5] Create AssignRoleDialog component in `apps/role-manager/src/components/Roles/AssignRoleDialog.tsx` (Dialog shell)
- [x] T038 [US5] Add AssignRoleFormContent with AddressField (from @openzeppelin/ui-builder-ui), role dropdown, submit/cancel buttons
- [x] T039 [US5] Add react-hook-form integration for address validation via AddressField
- [x] T040 [US5] Add transaction state rendering using DialogTransactionStates
- [x] T041 [US5] Wire AssignRoleDialog to Roles page in `apps/role-manager/src/pages/Roles.tsx` (state for assignRoleOpen, handleAssign callback)
- [x] T042 [US5] Verify all hook tests pass

**Checkpoint**: ✅ Assign Role Dialog fully functional - can grant role to new address with validation

---

## Phase 5: User Story 6 - Revoke Role Dialog (Priority: P1) ✅ COMPLETE

**Goal**: Administrators can revoke a role from an account with confirmation from the Roles page

**Includes**: Self-revoke warning (US3 shared)

**Independent Test**: Click "Revoke" on account row → see confirmation with account/role pre-filled → submit → verify account removed from role members

### Tests for Revoke Role Dialog (TDD)

- [x] T043 [US6] Create hook test file `apps/role-manager/src/hooks/__tests__/useRevokeRoleDialog.test.tsx` with test setup
- [x] T044 [US6] Add test: detects self-revoke when connected wallet matches target
- [x] T045 [US6] Add test: submit calls useRevokeRole with correct address and roleId
- [x] T046 [US6] Add test: handles transaction rejection
- [x] T047 [US6] Add test: handles transaction error with retry
- [x] T048 [US6] Add test: auto-closes after success

### Implementation for Revoke Role Dialog

- [x] T049 [US6] Implement useRevokeRoleDialog hook in `apps/role-manager/src/hooks/useRevokeRoleDialog.ts` (self-revoke detection, transaction execution)
- [x] T050 [US6] Export hook from `apps/role-manager/src/hooks/index.ts`
- [x] T051 [P] [US6] Create RevokeRoleDialog component in `apps/role-manager/src/components/Roles/RevokeRoleDialog.tsx` (Dialog shell)
- [x] T052 [US6] Add RevokeRoleConfirmContent with read-only account/role display, SelfRevokeWarning, destructive revoke button
- [x] T053 [US6] Add transaction state rendering using DialogTransactionStates
- [x] T054 [US6] Wire RevokeRoleDialog to Roles page in `apps/role-manager/src/pages/Roles.tsx` (state for revokeTarget, handleRevoke callback)
- [x] T055 [US6] Verify all hook tests pass

**Checkpoint**: ✅ Revoke Role Dialog fully functional - can revoke role with confirmation and self-revoke warning

---

## Phase 6: Error Handling & Edge Cases (Priority: P2) ✅ COMPLETE

**Goal**: Robust error handling across all dialogs (US4: Transaction Rejection, US7: Network Errors)

**Independent Test**: Reject wallet signature → verify dialog returns to form with preserved inputs. Simulate network error → verify error state with retry option.

### Implementation for Error Handling

- [x] T056 [US4] [US7] Add close-during-transaction confirmation prompt to ManageRolesDialog (FR-041)
- [x] T057 [P] [US4] [US7] Add close-during-transaction confirmation prompt to AssignRoleDialog
- [x] T058 [P] [US4] [US7] Add close-during-transaction confirmation prompt to RevokeRoleDialog
- [x] T059 [US7] Add wallet disconnection handling to all dialogs (FR-039: show error, disable submit)
- [x] T060 [US7] Add loading skeleton states to all dialogs during role data fetch (FR-034)
- [x] T061 [US7] Add empty state handling when contract has zero roles (FR-037)

**Checkpoint**: ✅ All dialogs handle errors gracefully with retry options and preserved state

---

## Phase 7: Accessibility & Polish

**Purpose**: Accessibility compliance and final polish

- [ ] T062 [P] Add aria-labels to all buttons and checkboxes in ManageRolesDialog (FR-048)
- [ ] T063 [P] Add aria-labels to all buttons and inputs in AssignRoleDialog (FR-048)
- [ ] T064 [P] Add aria-labels to all buttons in RevokeRoleDialog (FR-048)
- [ ] T065 Verify focus management: focus to first element on open, return on close (FR-044, FR-045)
- [ ] T066 Verify Escape key closes dialogs except during pending/confirming (FR-046)
- [ ] T067 Verify Tab navigation through all interactive elements (FR-047)
- [ ] T068 Run quickstart.md validation - verify all integration points work
- [ ] T069 Update hooks/index.ts exports for all new hooks
- [ ] T070 Code cleanup: remove unused imports, ensure consistent formatting

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Phase 1 (types must exist)
- **User Stories (Phase 3-5)**: All depend on Phase 2 (shared components)
  - User stories can proceed in parallel if team capacity allows
  - Or sequentially: US1 → US5 → US6
- **Error Handling (Phase 6)**: Depends on Phase 3-5 (dialogs must exist)
- **Polish (Phase 7)**: Depends on Phase 6 (all dialogs complete)

### User Story Dependencies

| Story         | Dialog            | Can Start After | Notes                             |
| ------------- | ----------------- | --------------- | --------------------------------- |
| US1 (P1)      | ManageRolesDialog | Phase 2         | Includes US2, US3 logic           |
| US5 (P1)      | AssignRoleDialog  | Phase 2         | Independent of US1                |
| US6 (P1)      | RevokeRoleDialog  | Phase 2         | Shares SelfRevokeWarning with US1 |
| US4, US7 (P2) | All dialogs       | Phase 3-5       | Cross-cutting error handling      |

### Within Each User Story

1. Tests FIRST (TDD) - ensure they FAIL
2. Hook implementation
3. Component implementation
4. Page integration
5. Verify tests PASS
6. Story complete

### Parallel Opportunities

**Phase 2 (Foundational)**:

```text
[P] T003: SelfRevokeWarning
[P] T004: RoleCheckboxList
[P] T005: DialogTransactionStates
```

**Phase 3-5 (User Stories)** - Different developers can work on:

```text
Developer A: US1 (ManageRolesDialog) - T007-T028
Developer B: US5 (AssignRoleDialog) - T029-T042
Developer C: US6 (RevokeRoleDialog) - T043-T055
```

**Phase 6 (Error Handling)**:

```text
[P] T056-T058: Close confirmation prompts (different files)
```

**Phase 7 (Accessibility)**:

```text
[P] T062-T064: aria-labels (different dialog files)
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001-T002) → ~15 min
2. Complete Phase 2: Foundational (T003-T006) → ~1 hour
3. Complete Phase 3: ManageRolesDialog (T007-T028) → ~3 hours
4. **STOP and VALIDATE**: Test US1 independently
5. Deploy/demo if ready - core role management works!

### Incremental Delivery

| Milestone | Phases  | Deliverable                                |
| --------- | ------- | ------------------------------------------ |
| MVP       | 1, 2, 3 | ManageRolesDialog from Authorized Accounts |
| +Assign   | 4       | AssignRoleDialog from Roles page           |
| +Revoke   | 5       | RevokeRoleDialog from Roles page           |
| +Polish   | 6, 7    | Full error handling & accessibility        |

### Parallel Team Strategy

With 3 developers after Phase 2 completes:

```text
Developer A: Phase 3 (US1 - ManageRolesDialog)
Developer B: Phase 4 (US5 - AssignRoleDialog)
Developer C: Phase 5 (US6 - RevokeRoleDialog)

Then all: Phase 6-7 (Error Handling & Polish)
```

---

## Summary

| Phase                   | Tasks  | Parallel | Estimated Time |
| ----------------------- | ------ | -------- | -------------- |
| Phase 1: Setup          | 2      | 1        | 15 min         |
| Phase 2: Foundational   | 4      | 3        | 1 hour         |
| Phase 3: US1 (MVP)      | 22     | 1        | 3 hours        |
| Phase 4: US5            | 14     | 1        | 2 hours        |
| Phase 5: US6            | 13     | 1        | 2 hours        |
| Phase 6: Error Handling | 6      | 3        | 1 hour         |
| Phase 7: Polish         | 9      | 3        | 1 hour         |
| **Total**               | **70** | -        | **~10 hours**  |

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each dialog (US1, US5, US6) can be deployed independently
- TDD: Write tests first, ensure they fail, then implement
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
