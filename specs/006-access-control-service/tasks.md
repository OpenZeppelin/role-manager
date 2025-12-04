# Tasks: Access Control Service & Hooks

**Feature Branch**: `006-access-control-service`
**Status**: Ready
**Total Tasks**: 21

## Phase 1: Setup

Goal: Initialize project structure and update shared types for Access Control integration.

- [x] T001 [P] Create hooks directory structure for access control service `apps/role-manager/src/hooks/`
- [x] T002 [P] Update `apps/role-manager/src/types/storage.ts` to include `AccessControlCapabilities` in `RecentContractRecord`

## Phase 2: Foundational

Goal: Implement the core service wrapper hook that enables adapter access.

- [x] T003 [P] Implement `useAccessControlService` hook in `apps/role-manager/src/hooks/useAccessControlService.ts` to unwrap service from adapter

## Phase 3: Load Contract & Detect Features (US1)

Goal: Implement feature detection logic and validation-gated persistence.

- [x] T004 [US1] Create test file `apps/role-manager/src/hooks/__tests__/useContractCapabilities.test.tsx` with mock adapter
- [x] T005 [US1] Implement `useContractCapabilities` hook in `apps/role-manager/src/hooks/useContractCapabilities.ts` using react-query
- [x] T006 [US1] Update `apps/role-manager/src/components/Contracts/AddContractDialog.tsx` to integrate feature detection validation (trigger after schema loaded, before save)
- [x] T007 [US1] Implement rollback/cleanup logic in `AddContractDialog.tsx` if validation fails [Gap: CHK005]

## Phase 4: View Roles and Members (US2)

Goal: Implement hooks for fetching and displaying role assignments.

- [x] T008 [US2] Create test file `apps/role-manager/src/hooks/__tests__/useContractData.test.tsx` for roles and ownership
- [x] T009 [US2] Implement `useContractRoles` hook in `apps/role-manager/src/hooks/useContractData.ts`
- [x] T010 [US2] Implement pagination handling logic for large role lists in `useContractData.ts` [Gap: CHK021]

## Phase 5: View and Manage Ownership (US3)

Goal: Implement hooks for ownership management.

- [x] T011 [US3] Implement `useContractOwnership` hook in `apps/role-manager/src/hooks/useContractData.ts`

## Phase 6: Grant and Revoke Roles (US4)

Goal: Implement mutation hooks for modifying access control state.

- [x] T012 [US4] Create test file `apps/role-manager/src/hooks/__tests__/useAccessControlMutations.test.tsx`
- [x] T013 [US4] Implement `useGrantRole` mutation hook in `apps/role-manager/src/hooks/useAccessControlMutations.ts` (ensure wallet connection check)
- [x] T014 [US4] Implement `useRevokeRole` mutation hook in `apps/role-manager/src/hooks/useAccessControlMutations.ts` (ensure wallet connection check)
- [x] T015 [US4] Implement `useTransferOwnership` mutation hook in `apps/role-manager/src/hooks/useAccessControlMutations.ts` (ensure wallet connection check)
- [x] T016 [US4] Implement network disconnection handling in mutation hooks [Gap: CHK018]
- [x] T017 [US4] Implement user rejection handling in mutation hooks [Gap: CHK019]
- [x] T018 [US4] Implement concurrent modification safeguards (optimistic UI updates/invalidation) [Gap: CHK022]

## Phase 7: Export Access Snapshot (US5)

Goal: Implement utility hook for exporting state.

- [x] T019 [US5] Implement `useExportSnapshot` hook in `apps/role-manager/src/hooks/useAccessControlMutations.ts` (or dedicated file)

## Phase 8: Polish & Cross-Cutting

Goal: Final cleanup and edge case handling.

- [ ] T020 Implement error boundary wrapper for "partial data" scenarios (indexer down) in `apps/role-manager/src/components/ErrorBoundary.tsx`
- [ ] T021 Implement handling for contracts that pass validation but fail later calls in `apps/role-manager/src/hooks/useContractData.ts` [Gap: CHK020]

## Dependencies

1. T001, T002 -> T003
2. T003 -> T004, T005
3. T005 -> T006, T007
4. T003 -> T008, T009, T010, T011
5. T003 -> T012, T013, T014, T015, T016, T017, T018, T019

## Parallel Execution

- T001 and T002 can be done in parallel
- T004 (Tests) and T005 (Implementation) can be developed iteratively
- T009 (Roles) and T011 (Ownership) are independent
- Mutation hooks (T013, T014, T015) are independent

## Implementation Strategy

1. **MVP**: Complete Phase 1-3 to allow loading and validating Access Control contracts.
2. **Core Features**: Phase 4-6 to enable viewing and modifying permissions.
3. **Utilities**: Phase 7-8 for export and advanced error handling.
