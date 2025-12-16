# Tasks: Two-Step Admin Role Assignment

**Feature**: 016-two-step-admin-assignment  
**Branch**: `016-two-step-admin-assignment`  
**Generated**: 2024-12-15

---

## Phase 1: Setup

**Goal**: Prepare project structure for admin transfer feature.

- [x] T001 Create `apps/role-manager/src/components/Admin/` directory
- [x] T002 Create barrel export file `apps/role-manager/src/components/Admin/index.ts`

---

## Phase 2: Foundational (Data Layer)

**Goal**: Create shared types, constants, and hooks that support multiple user stories. These MUST be completed before user story phases.

**Dependencies**: Phase 1 (Setup)

### Constants & Types

- [x] T003 [P] Add `ADMIN_ROLE_ID`, `ADMIN_ROLE_NAME`, `ADMIN_ROLE_DESCRIPTION` constants to `apps/role-manager/src/constants/index.ts`
- [x] T004 [P] Add `isAdminRole: boolean` field to `RoleWithDescription` interface in `apps/role-manager/src/types/roles.ts`

### Data Fetching Hook

- [x] T005 Add `adminInfoQueryKey` query key factory to `apps/role-manager/src/hooks/useContractData.ts`
- [x] T006 Create `useContractAdminInfo` hook in `apps/role-manager/src/hooks/useContractData.ts` following `useContractOwnership` pattern (includes `refetchOnWindowFocus: true`)
- [x] T007 Add `useContractAdminInfo` export to `apps/role-manager/src/hooks/index.ts`

### Mutation Hooks

- [x] T008 [P] Add `TransferAdminRoleArgs` and `AcceptAdminTransferArgs` interfaces to `apps/role-manager/src/hooks/useAccessControlMutations.ts`
- [x] T009 Create `useTransferAdminRole` mutation hook in `apps/role-manager/src/hooks/useAccessControlMutations.ts` (copy `useTransferOwnership` pattern, invalidate `adminInfoQueryKey`)
- [x] T010 Create `useAcceptAdminTransfer` mutation hook in `apps/role-manager/src/hooks/useAccessControlMutations.ts` (copy `useAcceptOwnership` pattern, invalidate `adminInfoQueryKey`)
- [x] T011 Add `useTransferAdminRole`, `useAcceptAdminTransfer` exports to `apps/role-manager/src/hooks/index.ts`

**Checkpoint**: Foundation ready - user story implementation can now begin

---

## Phase 3: User Story 3 - View Admin Status (Priority: P1) 🎯 MVP

**Goal**: As a User, I can see the current admin status including any pending transfers on the Roles page.

**Independent Test**: View contracts with various admin states (active, pending, expired, renounced) and verify correct display with Shield icon and appropriate status.

**Dependencies**: Phase 2 (Foundational)

### Admin Role Synthesis

- [x] T012 [US3] Import `useContractAdminInfo` and admin constants in `apps/role-manager/src/hooks/useRolesPageData.ts`
- [x] T013 [US3] Call `useContractAdminInfo` in `useRolesPageData` when `capabilities.hasTwoStepAdmin` is true
- [x] T014 [US3] Create `adminRole` useMemo in `useRolesPageData.ts` to synthesize Admin role (with `isAdminRole: true`, `isOwnerRole: false`)
- [x] T015 [US3] Update roles combination in `useRolesPageData.ts`: `[ownerRole?, adminRole?, ...enumeratedRoles]`
- [x] T016 [US3] Add `isAdminRole: false` default to all enumerated roles in `useRolesPageData.ts`
- [x] T017 [US3] Add `adminInfo`, `pendingAdminTransfer`, `adminState`, `refetchAdminInfo` to `useRolesPageData` return object

### UI Updates

- [x] T018 [P] [US3] Add Shield icon import from `lucide-react` to `apps/role-manager/src/components/Roles/RoleCard.tsx`
- [x] T019 [US3] Add Admin role icon display in `RoleCard.tsx`: `{role.isAdminRole && <Shield className="h-3 w-3 text-purple-600" aria-label="Admin role" />}`
- [x] T020 [US3] Ensure Admin role details panel shows admin address with consistent formatting in `apps/role-manager/src/components/Roles/RoleDetails.tsx`

**Checkpoint**: Admin role visible in Roles page with Shield icon and status display

---

## Phase 4: User Story 1 - Initiate Admin Transfer (Priority: P1)

**Goal**: As the Current Admin, I can initiate an admin role transfer by specifying the new admin address and expiration.

**Independent Test**: Open Transfer Admin dialog, enter valid address and expiration ledger, submit transaction, verify pending transfer created.

**Dependencies**: Phase 2 (Foundational), Phase 3 (US3 - Admin role visible)

### Dialog Hook

- [x] T021 [US1] Create `apps/role-manager/src/hooks/useAdminTransferDialog.ts` with types: `TransferAdminFormData`, `UseAdminTransferDialogOptions`, `UseAdminTransferDialogReturn`
- [x] T022 [US1] Implement `useAdminTransferDialog` hook in same file (copy `useOwnershipTransferDialog` pattern, use `useTransferAdminRole` mutation)
- [x] T023 [US1] Add `useAdminTransferDialog` export to `apps/role-manager/src/hooks/index.ts`

### Dialog Component

- [x] T024 [US1] Create `apps/role-manager/src/components/Admin/TransferAdminDialog.tsx` with: address input, expiration input, current ledger display, validation messages, transaction states (copy `TransferOwnershipDialog` structure)
- [x] T025 [US1] Add `TransferAdminDialog` export to `apps/role-manager/src/components/Admin/index.ts`

### Integration

- [x] T026 [US1] Add "Transfer Admin" button to admin account row in `apps/role-manager/src/components/Roles/AccountRow.tsx` (visible only when `role.isAdminRole && isCurrentUser`)
- [x] T027 [US1] Add `transferAdminDialogOpen` state and `TransferAdminDialog` to `apps/role-manager/src/pages/Roles.tsx`
- [x] T028 [US1] Wire up `onTransferAdmin` handler from RoleDetails to open TransferAdminDialog in `Roles.tsx`

### UI Action Restrictions (Bug Fixes)

- [x] T028a Hide "Assign" button for Contract Admin role in `RoleDetails.tsx` (only show for enumerable roles)
- [x] T028b Hide "Revoke" button for Contract Admin role in `AccountRow.tsx` (only show for enumerable roles)

> **Why**: The Stellar library allows dynamic role creation via `grant_role(account, "ANY_STRING")`.
> Without these restrictions, clicking "Assign" on Contract Admin would accidentally create an
> enumerable "CONTRACT_ADMIN" role via `grant_role()`, separate from the actual contract admin.
> Owner and Contract Admin are singular roles managed via two-step transfer, not `grant_role`/`revoke_role`.

**Checkpoint**: Current admin can initiate transfer via dialog

---

## Phase 5: User Story 2 - Accept Pending Admin Transfer (Priority: P1)

**Goal**: As the Pending Admin, I can accept the admin transfer before it expires.

**Independent Test**: View contract with pending admin transfer as pending admin, click "Accept Admin Role", verify admin role transfers.

**Dependencies**: Phase 2 (Foundational)

### Dialog Hook

- [x] T029 [US2] Create `apps/role-manager/src/hooks/useAcceptAdminTransferDialog.ts` with types: `UseAcceptAdminTransferDialogOptions`, `UseAcceptAdminTransferDialogReturn`
- [x] T030 [US2] Implement `useAcceptAdminTransferDialog` hook in same file (copy `useAcceptOwnershipDialog` pattern, use `useAcceptAdminTransfer` mutation)
- [x] T031 [US2] Add `useAcceptAdminTransferDialog` export to `apps/role-manager/src/hooks/index.ts`

### Dialog Component

- [x] T032 [US2] Create `apps/role-manager/src/components/Admin/AcceptAdminTransferDialog.tsx` with: confirmation content, contract address display, transaction states
- [x] T033 [US2] Add `AcceptAdminTransferDialog` export to `apps/role-manager/src/components/Admin/index.ts`

### Pending Transfer Display

- [x] T034 [US2] Add `PendingTransferInfo` display for admin role in `apps/role-manager/src/components/Roles/RoleDetails.tsx` with `transferLabel="Admin Role"`, `recipientLabel="Admin"`
- [x] T035 [US2] Compute `canAcceptAdmin` in `Roles.tsx`: connected wallet matches pending admin address
- [x] T036 [US2] Pass `pendingAdminTransfer`, `adminState`, `canAcceptAdmin`, `onAcceptAdminTransfer` props to RoleDetails

### Integration

- [x] T037 [US2] Add `acceptAdminDialogOpen` state and `AcceptAdminTransferDialog` to `apps/role-manager/src/pages/Roles.tsx`
- [x] T038 [US2] Wire up `onAcceptAdminTransfer` handler to open AcceptAdminTransferDialog in `Roles.tsx`
- [x] T039 [US2] Add "Connect the pending admin wallet to accept this transfer" message when wrong wallet connected

**Checkpoint**: Pending admin can accept transfer via PendingTransferInfo or dialog

---

## Phase 6: User Story 4 - View Pending Admin Transfer in Dashboard (Priority: P2)

**Goal**: As a User, I can see pending admin transfers in the Dashboard's "Pending Role Changes" section.

**Independent Test**: Create pending admin transfer, view Dashboard, verify entry shows "Transfer Admin Role" label, pending admin address, and expiration.

**Dependencies**: Phase 3 (US3 - Admin role synthesis), Phase 5 (US2 - Accept flow)

- [ ] T040 [US4] Add admin transfer aggregation to `apps/role-manager/src/hooks/useRoleChangesPageData.ts` (parallel to ownership transfer detection)
- [ ] T041 [US4] Create `PendingTransfer` entry with `type: 'admin'`, `label: 'Transfer Admin Role'` for pending admin transfers
- [ ] T042 [US4] Ensure `PendingTransferRow` displays admin transfers with correct icon and styling
- [ ] T043 [US4] Wire AcceptAdminTransferDialog to Dashboard pending transfer Accept button

**Checkpoint**: Pending admin transfers visible in Dashboard

---

## Phase 7: User Story 5 - Handle Network Errors (Priority: P2)

**Goal**: As a User, I see clear error messages and can retry on network errors.

**Independent Test**: Simulate network error during admin transfer submission, verify error handling and retry functionality.

**Dependencies**: Phase 4 (US1), Phase 5 (US2) - dialogs must exist

- [ ] T044 [US5] Ensure TransferAdminDialog displays network error message with retry button (FR-028, FR-028a, FR-028b)
- [ ] T045 [US5] Ensure AcceptAdminTransferDialog displays network error message with retry button
- [ ] T046 [US5] Add wallet disconnection detection and error display to both admin dialogs (FR-030)

**Checkpoint**: Error handling and retry functional for admin transfer operations

---

## Phase 8: Polish & Cross-Cutting Concerns

**Goal**: Final polish, edge cases, and cross-cutting requirements.

**Dependencies**: All previous phases

### Validation Edge Cases

- [ ] T047 Add self-transfer prevention with error message "Cannot transfer to yourself" in TransferAdminDialog (FR-015)
- [ ] T048 Add "This will replace the existing pending transfer" warning when initiating transfer while one is pending (Edge Case: Replace Pending Transfer)
- [ ] T049 Validate expiration > current block with message "Expiration must be greater than current block" (FR-013, FR-016)

### Accessibility

- [ ] T050 Verify focus moves to first interactive element when admin dialogs open (FR-032)
- [ ] T051 Verify focus returns to trigger element when admin dialogs close (FR-033)
- [ ] T052 Verify Escape key closes admin dialogs (except during pending/confirming) (FR-034)
- [ ] T053 Verify all interactive elements are keyboard accessible via Tab in admin dialogs (FR-035)
- [ ] T054 Verify Shield icon has `aria-label="Admin role"` for screen reader (FR-002d, FR-035c)

### Edge Cases

- [ ] T055 Handle renounced admin state: show "No Admin (Renounced)" with no transfer actions (Edge Case: No Admin)
- [ ] T056 Handle `getAdminInfo()` returning null: graceful degradation, Admin role not displayed (FR-001c)
- [ ] T057 Handle dual pending transfers (Owner + Admin): both displayed independently (FR-003a, Edge Case: Dual Pending)

---

## Dependencies Graph

```
Phase 1 (Setup)
    │
    ▼
Phase 2 (Foundational: Types, Constants, Hooks)
    │
    ├──────────────┬──────────────┐
    ▼              ▼              │
Phase 3 (US3)   Phase 5 (US2)    │
View Status     Accept Transfer   │
    │              │              │
    ▼              │              │
Phase 4 (US1) ◄────┘              │
Initiate Transfer                 │
    │                             │
    ├──────────────┬──────────────┘
    ▼              ▼
Phase 6 (US4)   Phase 7 (US5)
Dashboard       Error Handling
    │              │
    └──────┬───────┘
           ▼
    Phase 8 (Polish)
```

**Parallel Opportunities**:

- T003, T004: Constants and types can run in parallel
- T008: Mutation types can run in parallel with data fetching hook
- T018: Icon import can run in parallel with role synthesis tasks
- Phase 3 (US3), Phase 5 (US2): Can start in parallel after Phase 2
- Phase 6 (US4), Phase 7 (US5): Can run in parallel after dependencies

---

## Parallel Example: Phase 2 (Foundational)

```bash
# Launch constants and types in parallel:
Task T003: "Add ADMIN_ROLE constants to constants/index.ts"
Task T004: "Add isAdminRole to RoleWithDescription in types/roles.ts"
Task T008: "Add mutation arg types to useAccessControlMutations.ts"
```

---

## Implementation Strategy

### MVP (Minimum Viable Product)

**MVP Scope**: Phase 1 + Phase 2 + User Story 3 (View Admin Status)

This enables:

- Admin role visible in Roles page with Shield icon
- Admin status correctly displayed (active/pending/expired/renounced)
- Foundation ready for transfer operations

**MVP Tasks**: T001-T020 (20 tasks)

### Incremental Delivery

1. **Increment 1**: Setup + Foundational + US3 → Admin role visible
2. **Increment 2**: US1 (Initiate Transfer) → Admins can start transfers
3. **Increment 3**: US2 (Accept Transfer) → Complete two-step flow
4. **Increment 4**: US4 (Dashboard) → Unified pending view
5. **Increment 5**: US5 + Polish → Production-ready

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup + Foundational together
2. Once Foundational is done:
   - Developer A: User Story 3 (View Status)
   - Developer B: User Story 2 (Accept Transfer)
3. After US3 complete:
   - Developer A: User Story 1 (Initiate Transfer)
4. After US1 + US2 complete:
   - Developer A: User Story 4 (Dashboard)
   - Developer B: User Story 5 (Errors)
5. Team together: Polish phase

---

## Summary

| Phase     | User Story           | Tasks  | Priority |
| --------- | -------------------- | ------ | -------- |
| 1         | Setup                | 2      | -        |
| 2         | Foundational         | 9      | -        |
| 3         | US3 - View Status    | 9      | P1       |
| 4         | US1 - Initiate       | 10     | P1       |
| 5         | US2 - Accept         | 11     | P1       |
| 6         | US4 - Dashboard      | 4      | P2       |
| 7         | US5 - Error Handling | 3      | P2       |
| 8         | Polish               | 11     | -        |
| **Total** |                      | **59** |          |

**Parallel Opportunities**: 7 tasks marked [P]  
**Tests Included**: No (not requested in spec)  
**MVP Tasks**: 20 tasks (Phases 1-3)

---

## Notes

- [P] tasks = different files, no dependencies on incomplete tasks
- [USx] label maps task to specific user story for traceability
- Each user story should be independently testable
- Commit after each task or logical group
- Follow existing ownership transfer patterns closely (spec 015)
- Reuse `PendingTransferInfo` component - DO NOT duplicate
- Query key MUST match between `useContractAdminInfo` and mutation invalidation

### Critical: Role ID Distinction

Use `CONTRACT_ADMIN` (not `ADMIN_ROLE`) for the synthesized contract admin:

| Role                  | ID               | Source           | Actions                   |
| --------------------- | ---------------- | ---------------- | ------------------------- |
| Contract Admin        | `CONTRACT_ADMIN` | `getAdminInfo()` | Transfer Admin (two-step) |
| Enumerable ADMIN_ROLE | `ADMIN_ROLE`     | `grant_role()`   | Assign / Revoke           |

The Stellar library allows dynamic role creation - `grant_role(account, "ADMIN_ROLE")` would create a separate enumerable role. Using distinct IDs prevents UI collision and accidental role creation.
