# Tasks: EVM Access Control Integration

**Input**: Design documents from `/specs/017-evm-access-control/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, quickstart.md
**Tests**: Included per constitution principle V (TDD for business logic hooks)
**Organization**: Tasks grouped by user story. Phases 1-4 have no upstream dependency; Phases 5-9 require the upstream ui-types + adapter release.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2)
- Include exact file paths in descriptions

## Phase Cross-Reference (tasks.md → plan.md)

| Tasks Phase            | Plan Phase     | Description                                 |
| ---------------------- | -------------- | ------------------------------------------- |
| Phase 1 (Setup)        | Plan Phase 1   | Ecosystem activation & configuration        |
| Phase 2 (Foundational) | Plan Phase 3   | Shared components & utilities (role labels) |
| Phase 3 (US1)          | Plan Phase 1-2 | Add EVM contract + connect wallet           |
| Phase 4 (US2+3)        | Plan Phase 2   | View roles, ownership, capabilities         |
| Phase 5 (US4)          | —              | Grant/revoke (implicit in plan Phase 2)     |
| Phase 6 (US5)          | Plan Phase 4   | Chain-agnostic expiration + transfers       |
| Phase 7 (US6)          | Plan Phase 5   | Renounce operations                         |
| Phase 8 (US7)          | Plan Phase 6   | Cancel admin transfer + admin delay         |
| Phase 9 (US8)          | Plan Phase 7   | History enhancements                        |
| Phase 10 (Polish)      | Plan Phase 8   | Testing & regression                        |

> Note: Tasks are organized by **user story** (for traceability), while the plan is organized by **technical concern**. Phase numbers intentionally differ.

## Path Conventions

- App root: `apps/role-manager/`
- Source: `apps/role-manager/src/`
- Tests: `apps/role-manager/src/hooks/__tests__/` and `apps/role-manager/src/components/*/__tests__/`

---

## Phase 1: Setup (Configuration & Credentials)

**Purpose**: Enable EVM in the registry and configure credentials. No upstream dependency.

- [x] T001 Enable EVM ecosystem: set `defaultFeatureConfig.enabled: true`, remove `disabledLabel` (keep `showInUI: true`) in `apps/role-manager/src/core/ecosystems/registry.ts`
- [x] T002 [P] Add `globalServiceConfigs.walletconnect.projectId` placeholder to `apps/role-manager/public/app.config.json`
- [x] T003 [P] Add `VITE_APP_CFG_SERVICE_ETHERSCANV2_API_KEY` documentation to `apps/role-manager/.env.example`
- [x] T004 [P] Create `apps/role-manager/.env.local` with Etherscan V2 API key (gitignored, developer setup)

**Checkpoint**: EVM appears as selectable ecosystem in Add Contract dialog. App builds and runs.

---

## Phase 2: Foundational (Shared Components & Utilities)

**Purpose**: Create reusable components and utilities that multiple user stories depend on. No upstream dependency.

- [x] T005 ~~Create `RoleHashDisplay` shared component~~ — Reuse `AddressDisplay` from `@openzeppelin/ui-components` (already supports truncated hash + copy-to-clipboard). No new component needed.
- [x] T006 [P] Update `getRoleName` utility to handle `RoleIdentifier.label` display logic (label → truncated hash fallback) in `apps/role-manager/src/utils/role-name.ts`
- [x] T007 [P] Write unit test for `getRoleName` with label, without label, and with long hash in `apps/role-manager/src/utils/__tests__/role-name.test.ts`

**Checkpoint**: Shared components available. Utility handles both labeled and unlabeled roles.

---

## Phase 3: User Story 1 — Add EVM Contract and Connect Wallet (Priority: P1) 🎯 MVP

**Goal**: Users can select EVM in the Add Contract dialog, pick a network, enter a verified address, and connect an EVM wallet.

**Independent Test**: Open Add Contract dialog → select EVM → pick Sepolia → enter verified address → wallet connect UI appears → connect MetaMask → address shown in header.

### Tests for User Story 1

- [x] T008 [P] [US1] Write unit test for `useContractForm` handling EVM verified/unverified contract errors in `apps/role-manager/src/hooks/__tests__/useContractForm.test.ts`

### Implementation for User Story 1

- [x] T009 [US1] Verify `CompactEcosystemSelector` shows EVM as enabled option — registry flag `enabled: true, showInUI: true` from T001 makes EVM clickable. No code changes needed.
- [x] T010 [US1] Verify `AddContractForm` handles EVM address format (0x-prefixed, 42 chars) via adapter's `isValidAddress()` — `DynamicFormField` delegates validation to adapter. No code changes needed.
- [x] T011 [US1] Verify `useContractSchemaLoader` works with EVM adapter's `loadContractWithMetadata(address)` — hook already calls `adapter.loadContractWithMetadata(artifacts)` generically; error message from adapter (e.g., "Contract not verified") surfaced via `setError()`. No code changes needed.
- [x] T012 [US1] Verify `useContractForm` surfaces verification errors clearly to the user — errors flow through `AddContractDialog` → `schemaLoader.error` → `DialogErrorState` with retry option. No code changes needed.
- [x] T013 [US1] Verify wallet switching works: `WalletSyncProvider` syncs network → `WalletStateProvider` loads wagmi provider for EVM → MetaMask connectable. Code verified; manual E2E confirmed.
- [x] T013a [US1] Verify connected EVM wallet address displays in the application header — `WalletHeaderSection` renders `WalletConnectionWithSettings` when any network is selected (ecosystem-agnostic). Code verified; manual E2E confirmed.
- [x] T014 [US1] Verify chain switching: `NetworkSwitchManager` mounted by `WalletSyncProvider` when adapter target differs from wallet chain → prompts chain switch. Code verified; manual E2E confirmed.
- [x] T015 [US1] Verify ecosystem switching: `WalletStateProvider` uses dynamic key props; adapter singletons swap without page reload. Code verified; manual E2E confirmed.

**Checkpoint**: EVM contracts can be added. Wallet connects. Chain switching works. Ecosystem switching seamless.

---

## Phase 4: User Story 2+3 — View Roles, Ownership, and Capabilities (Priority: P1)

**Goal**: After adding an EVM contract, users see roles with labels, ownership state, admin state, and detected capabilities. These stories are combined because viewing roles (US3) depends on successful contract loading (US2).

**Independent Test**: Add verified EVM contract → navigate to Roles page → see role assignments with labels → see Owner/Admin roles → see capabilities summary.

### Implementation for User Story 2 (Contract Loading)

- [x] T016 [US2] Verify `AccessControlCapabilitiesSummary` displays EVM-detected capabilities (Ownable, Ownable2Step, AccessControl, AccessControlEnumerable, AccessControlDefaultAdminRules) in `apps/role-manager/src/components/Contracts/AccessControlCapabilitiesSummary.tsx`
- [x] T017 [US2] Verify proxy contract detection works through the adapter — no Role Manager changes needed, just E2E validation. Manual test.

### Implementation for User Story 3 (View Roles & Ownership)

- [x] T018 [P] [US3] Update `RoleCard` to display `RoleIdentifier.label` when present, fall back to `RoleHashDisplay` for unlabeled hashes in `apps/role-manager/src/components/Roles/RoleCard.tsx`
- [x] T019 [P] [US3] Verify `useRolesPageData` correctly transforms EVM roles — `getRoleName` already handles `assignment.role.label` in `apps/role-manager/src/hooks/useRolesPageData.ts`
- [x] T020 [US3] Verify synthesized Owner role displays for EVM Ownable contracts in `apps/role-manager/src/hooks/useRolesPageData.ts`
- [x] T021 [US3] Verify synthesized Admin role displays for EVM AccessControlDefaultAdminRules contracts in `apps/role-manager/src/hooks/useRolesPageData.ts`
- [x] T022 [US3] Verify enriched roles fallback: when indexer unavailable, `getCurrentRoles()` used without error in `apps/role-manager/src/hooks/useContractRolesEnriched.ts`
- [x] T023 [US3] Verify Authorized Accounts page works with EVM contracts (ecosystem-agnostic — should work) in `apps/role-manager/src/hooks/useAuthorizedAccountsPageData.ts`
- [x] T024 [US3] Verify Dashboard stats work with EVM contracts (ecosystem-agnostic — should work) in `apps/role-manager/src/hooks/useDashboardData.ts`

**Checkpoint**: All read operations work for EVM contracts. Roles show labels. Owner/Admin roles display. Dashboard and Authorized Accounts pages work.

---

## Phase 5: User Story 4 — Grant and Revoke Roles (Priority: P1)

**Goal**: Role admins can grant and revoke roles on EVM contracts with correct transaction status flow.

**Independent Test**: Grant a role → see it in roles list → revoke it → see it removed. Reject in wallet → form state preserved.

### Tests for User Story 4

- [x] T025 [P] [US4] Write unit test for `useGrantRole` and `useRevokeRole` mutations with EVM adapter mock in `apps/role-manager/src/hooks/__tests__/useAccessControlMutations.test.tsx`

### Implementation for User Story 4

- [x] T026 [US4] Verify `AssignRoleDialog` works with EVM address validation via `adapter.isValidAddress()` in `apps/role-manager/src/components/Roles/AssignRoleDialog.tsx`
- [x] T027 [US4] Verify `RevokeRoleDialog` works for EVM contracts in `apps/role-manager/src/components/Roles/RevokeRoleDialog.tsx`
- [x] T028 [US4] Verify transaction status flow (signing → submitting → confirming → confirmed) displays correctly for EVM transactions. Manual E2E test.
- [x] T029 [US4] Verify wallet rejection preserves form state and shows retry option. Manual E2E test.

**Checkpoint**: Grant and revoke work on EVM. Transaction status updates correctly. Error recovery works.

---

## ⚠️ DEPENDENCY GATE: Upstream Release Required

**Phases 6-9 require the updated `@openzeppelin/ui-types`, `@openzeppelin/ui-builder-adapter-evm`, and `@openzeppelin/ui-builder-adapter-stellar` packages.**

- [x] T030 Update `@openzeppelin/ui-types`, `@openzeppelin/ui-builder-adapter-evm`, `@openzeppelin/ui-builder-adapter-stellar` to new minimum versions in `apps/role-manager/package.json`
- [x] T031 Run `pnpm install` and verify TypeScript compilation succeeds with new types

---

## Phase 6: User Story 5 — Transfer Ownership and Admin (Priority: P2)

**Goal**: Chain-agnostic expiration handling — EVM Ownable2Step has no expiration; EVM admin uses delay-based schedule; Stellar uses user-specified ledger. Transfers work correctly for each.

**Independent Test**: Initiate EVM ownership transfer (no expiration input) → see pending state → accept from new wallet. Initiate Stellar transfer → see expiration ledger input (regression test).

### Tests for User Story 5

- [x] T032 [P] [US5] Write unit test for `formatExpiration` utility covering all 3 modes (required, none, contract-managed) in `apps/role-manager/src/utils/__tests__/expiration.test.ts`
- [x] T033 [P] [US5] Write unit test for `useOwnershipTransferDialog` with conditional expiration based on adapter metadata in `apps/role-manager/src/hooks/__tests__/useOwnershipTransferDialog.test.tsx`

### Implementation for User Story 5

- [x] T034 [US5] Create `utils/expiration.ts` with adapter-driven expiration formatting utilities (format timestamp, display label, check mode) in `apps/role-manager/src/utils/expiration.ts`
- [x] T035 [US5] Refactor `useOwnershipTransferDialog` to conditionally show/hide expiration input based on `getExpirationMetadata` response in `apps/role-manager/src/hooks/useOwnershipTransferDialog.ts`
- [x] T036 [US5] Update `TransferOwnershipDialog` to omit expiration input for EVM Ownable2Step (mode: 'none') and show adapter label for Stellar (mode: 'required') in `apps/role-manager/src/components/Ownership/TransferOwnershipDialog.tsx`
- [x] T037 [US5] Refactor `useAdminTransferDialog` to conditionally handle expiration based on adapter metadata in `apps/role-manager/src/hooks/useAdminTransferDialog.ts`
- [x] T038 [US5] Update `TransferAdminDialog` to show accept schedule info for EVM AccessControlDefaultAdminRules (mode: 'contract-managed') in `apps/role-manager/src/components/Admin/TransferAdminDialog.tsx`
- [x] T039 [US5] Update `PendingTransferInfo` to use adapter-driven labels instead of hardcoded "Expiration Ledger" in `apps/role-manager/src/components/Roles/PendingTransferInfo.tsx`
- [x] T040 [US5] Update `PendingTransferRow` to use adapter-driven expiration labels in `apps/role-manager/src/components/Dashboard/PendingTransferRow.tsx`
- [x] T041 [US5] Update `usePendingTransfers` to include `expirationMetadata` from adapter in `apps/role-manager/src/hooks/usePendingTransfers.ts`
- [x] T041a [US5] Refactor `useCurrentBlock` to adapt polling label and display to adapter-driven expiration metadata (plan Phase 4 step 4) in `apps/role-manager/src/hooks/useCurrentBlock.ts`
- [x] T042 [US5] Search-and-replace all hardcoded "expiration ledger" / "Expiration Ledger" strings in display labels, comments, and tests across `apps/role-manager/src/`
- [x] T042a [US5] Verify single-step Ownable contracts (no Ownable2Step) support direct `transferOwnership` without acceptance step (FR-024). Manual E2E test.
- [x] T043 [US5] Verify Stellar ownership/admin transfers still work identically (regression test). Manual E2E test.

**Checkpoint**: Transfer dialogs adapt to ecosystem. EVM has no expiration / shows schedule. Stellar unchanged. No hardcoded "ledger" strings.

---

## Phase 7: User Story 6 — Renounce Ownership and Roles (Priority: P2)

**Goal**: Users can renounce ownership or roles via type-to-confirm dialog when the adapter reports the capability.

**Independent Test**: Connect as owner on EVM Ownable contract → see "Renounce Ownership" → type "RENOUNCE" → submit → owner becomes null. Connect with role → see "Renounce Role" → confirm → removed from role.

### Tests for User Story 6

- [x] T044 [P] [US6] ~~Write unit test for `TypeToConfirmDialog`~~ — Skipped per constitution principle V: UI components do not require unit tests unless they contain complex internal logic. `TypeToConfirmDialog` is a presentational component with straightforward conditional rendering.
- [x] T045 [P] [US6] Write unit test for `useRenounceOwnership` mutation hook in `apps/role-manager/src/hooks/__tests__/useAccessControlMutations.test.tsx`
- [x] T046 [P] [US6] Write unit test for `useRenounceRole` mutation hook in `apps/role-manager/src/hooks/__tests__/useAccessControlMutations.test.tsx`
- [x] T047 [P] [US6] Write unit test for `useRenounceDialog` hook state management in `apps/role-manager/src/hooks/__tests__/useRenounceDialog.test.tsx`

### Implementation for User Story 6

- [x] T048 [US6] Create `TypeToConfirmDialog` shared component with keyword input, disabled/enabled submit, warning text per FR-027 in `apps/role-manager/src/components/Shared/TypeToConfirmDialog.tsx`
- [x] T049 [US6] Add `useRenounceOwnership` mutation to `useAccessControlMutations` — calls `service.renounceOwnership()`, invalidates `['contractOwnership']` in `apps/role-manager/src/hooks/useAccessControlMutations.ts`
- [x] T050 [US6] Add `useRenounceRole` mutation to `useAccessControlMutations` — calls `service.renounceRole()` with connected wallet address, invalidates `['contractRoles']` in `apps/role-manager/src/hooks/useAccessControlMutations.ts`
- [x] T051 [US6] Create `useRenounceDialog` hook for dialog state management (open, close, confirm, isPending) in `apps/role-manager/src/hooks/useRenounceDialog.ts`
- [x] T052 [US6] Add "Renounce Ownership" action in `RoleDetails` when `capabilities.hasRenounceOwnership` is true and user is owner in `apps/role-manager/src/components/Roles/RoleDetails.tsx`
- [x] T053 [US6] Add "Renounce Role" action in `AccountRow` when `capabilities.hasRenounceRole` is true and row is connected wallet in `apps/role-manager/src/components/Roles/AccountRow.tsx`
- [x] T054 [US6] Wire `TypeToConfirmDialog` with contextual warning text: ownership renounce vs. role renounce per FR-027 in `apps/role-manager/src/pages/Roles.tsx`
- [x] T055 [US6] Add analytics event emission for renounce operations in `apps/role-manager/src/hooks/useRoleManagerAnalytics.ts`

**Checkpoint**: Renounce actions appear based on capabilities. Type-to-confirm blocks accidental execution. State updates after renounce. Analytics emitted.

---

## Phase 8: User Story 7 — Cancel Admin Transfer and Admin Delay (Priority: P3)

**Goal**: Admins can cancel pending admin transfers and manage transfer delay on AccessControlDefaultAdminRules contracts.

**Independent Test**: Initiate admin transfer → cancel → pending cleared. View admin delay → change → see pending delay → rollback.

### Tests for User Story 7

- [x] T056 [P] [US7] Write unit test for `useCancelAdminTransfer` mutation hook in `apps/role-manager/src/hooks/__tests__/useAccessControlMutations.test.tsx`
- [x] T057 [P] [US7] Write unit test for `useChangeAdminDelay` and `useRollbackAdminDelay` mutation hooks in `apps/role-manager/src/hooks/__tests__/useAccessControlMutations.test.tsx`
- [x] T058 [P] [US7] Write unit test for `useAdminDelayDialog` hook state management in `apps/role-manager/src/hooks/__tests__/useAdminDelayDialog.test.tsx`

### Implementation for User Story 7

- [x] T059 [US7] Create admin delay types (`AdminDelayInfo` view model) in `apps/role-manager/src/types/admin.ts`
- [x] T060 [US7] Add `useCancelAdminTransfer` mutation to `useAccessControlMutations` — calls `service.cancelAdminTransfer()`, invalidates `['contractAdminInfo']` in `apps/role-manager/src/hooks/useAccessControlMutations.ts`
- [x] T061 [US7] Add `useChangeAdminDelay` mutation — calls `service.changeAdminDelay(address, newDelay)` with delay in seconds, invalidates admin info in `apps/role-manager/src/hooks/useAccessControlMutations.ts`
- [x] T062 [US7] Add `useRollbackAdminDelay` mutation — calls `service.rollbackAdminDelay()`, invalidates admin info in `apps/role-manager/src/hooks/useAccessControlMutations.ts`
- [x] T063 [US7] Create `useCancelAdminTransferDialog` hook for cancel confirmation dialog state in `apps/role-manager/src/hooks/useCancelAdminTransferDialog.ts`
- [x] T064 [US7] Create `useAdminDelayDialog` hook for delay change/rollback dialog state in `apps/role-manager/src/hooks/useAdminDelayDialog.ts`
- [x] T065 [US7] Create `AdminDelayPanel` component showing current delay, pending change, schedule timestamp, and change/rollback actions in `apps/role-manager/src/components/Admin/AdminDelayPanel.tsx`
- [x] T066 [US7] Add "Cancel Admin Transfer" action in Admin role details when `hasCancelAdminTransfer` + pending transfer in `apps/role-manager/src/components/Roles/RoleDetails.tsx`
- [x] T067 [US7] Add delay management UI in Admin role details when `hasAdminDelayManagement` — mount `AdminDelayPanel` in `apps/role-manager/src/components/Roles/RoleDetails.tsx`
- [x] T068 [US7] Update `useContractData` to expose `adminInfo.delayInfo` for Admin delay display in `apps/role-manager/src/hooks/useContractData.ts`
- [x] T069 [US7] Add analytics event emission for cancel and delay operations in `apps/role-manager/src/hooks/useRoleManagerAnalytics.ts`

**Checkpoint**: Cancel clears pending admin transfer. Delay panel shows current/pending. Change/rollback work. Analytics emitted.

---

## Phase 9: User Story 8 — History Enhancements (Priority: P2)

**Goal**: Role Changes page displays new event types (renounce, cancel, delay change) with correct labels.

**Independent Test**: View Role Changes page for EVM contract with indexed history → see renounce, cancel, delay events with correct labels and styling.

### Implementation for User Story 8

- [ ] T070 [US8] Add new `RoleChangeAction` types (`'renounce'`, `'admin-delay'`) and update `CHANGE_TYPE_TO_ACTION` mappings in `apps/role-manager/src/types/role-changes.ts`
- [ ] T071 [US8] Add display config for new action types (renounce: red/error, admin-delay: yellow/warning) in `apps/role-manager/src/types/role-changes.ts`
- [ ] T072 [US8] Update `ChangeRow` to render new event type labels and badges in `apps/role-manager/src/components/RoleChanges/ChangeRow.tsx`
- [ ] T073 [US8] Update `history-transformer.ts` if needed for new event shapes from EVM indexer in `apps/role-manager/src/utils/history-transformer.ts`
- [ ] T074 [US8] Verify history pagination works with EVM indexer. Manual E2E test.
- [ ] T075 [US8] Verify graceful degradation when indexer unavailable — "History unavailable" message shown. Manual E2E test.

**Checkpoint**: New event types display correctly. History works with and without indexer.

---

## Phase 10: Polish & Cross-Cutting Concerns

**Purpose**: Regression testing, cleanup, and validation across all stories.

- [ ] T076 Verify all existing Stellar flows still work — add contract, view roles, grant, revoke, transfer ownership, transfer admin. Regression E2E test.
- [ ] T077 Verify seamless ecosystem switching: Stellar → EVM → Stellar — no page reloads, no flashes, app state preserved. E2E test.
- [ ] T078 Verify no hardcoded "ledger" or "block" labels in UI display strings: run `grep -rn "expiration ledger\|Expiration Ledger" --include="*.tsx" --include="*.ts" apps/role-manager/src/` — expect zero matches.
- [ ] T079 Verify graceful degradation: no indexer, non-enumerable contracts, missing capabilities — appropriate messages shown.
- [ ] T079a Verify `getAdminInfo()` failure handling: when service throws or is unavailable, Admin role MUST NOT be displayed and no error is shown (FR-050). Test with mock adapter.
- [ ] T079b Verify backward compatibility with older adapters: when new optional methods (`renounceOwnership`, `renounceRole`, etc.) are missing from the service, corresponding UI actions MUST NOT appear — no crash, no error (FR-051). Test with mock adapter missing optional methods.
- [ ] T080 [P] Code cleanup: remove any TODO/FIXME markers introduced during implementation.
- [ ] T081 [P] Run full test suite: `pnpm test` — all tests pass.
- [ ] T082 Run quickstart.md validation — follow the quickstart guide end-to-end to confirm it works.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: No dependencies — can run in parallel with Phase 1
- **US1 (Phase 3)**: Depends on Phase 1 (registry enabled)
- **US2+3 (Phase 4)**: Depends on Phase 3 (contract can be added)
- **US4 (Phase 5)**: Depends on Phase 4 (contract added and roles visible)
- **⚠️ DEPENDENCY GATE**: T030-T031 must complete (upstream packages updated)
- **US5 (Phase 6)**: Depends on gate + Phase 5
- **US6 (Phase 7)**: Depends on gate + Phase 5 (can run parallel with Phase 6)
- **US7 (Phase 8)**: Depends on gate + Phase 5 (can run parallel with Phases 6-7)
- **US8 (Phase 9)**: Depends on gate (can run parallel with Phases 6-8)
- **Polish (Phase 10)**: Depends on all desired phases being complete

### User Story Dependencies

```text
Phase 1 (Setup) ──► Phase 3 (US1) ──► Phase 4 (US2+3) ──► Phase 5 (US4)
                                                                    │
Phase 2 (Foundation) ─────────────────────────────────────── parallel ─┘
                                                                    │
                              ⚠️ DEPENDENCY GATE (T030-T031) ◄─────┘
                                         │
                    ┌────────────────────┼────────────────────┐
                    ▼                    ▼                    ▼
              Phase 6 (US5)      Phase 7 (US6)        Phase 8 (US7)
              Expiration         Renounce              Admin Delay
                    │                    │                    │
                    └────────────────────┼────────────────────┘
                                         ▼
                                   Phase 9 (US8)
                                   History
                                         │
                                         ▼
                                  Phase 10 (Polish)
```

### Parallel Opportunities

**Pre-gate parallel work** (Phases 1-5):

- T002, T003, T004 can all run in parallel (different files)
- T005, T006, T007 can all run in parallel (different files)
- T008, T016, T018, T019 touch different files — can parallel within their phases

**Post-gate parallel work** (Phases 6-9):

- Phase 6, 7, 8, and 9 can all proceed in parallel once the dependency gate is passed
- Within Phase 7: T044, T045, T046, T047 (tests) can all run in parallel
- Within Phase 8: T056, T057, T058 (tests) can all run in parallel

---

## Implementation Strategy

### MVP First (Phases 1-5 Only — No Upstream Dependency)

1. Complete Phase 1: Setup (T001-T004)
2. Complete Phase 2: Foundational (T005-T007)
3. Complete Phase 3: US1 — Add EVM Contract + Wallet (T008-T015)
4. **STOP and VALIDATE**: EVM contract addable, wallet connects, chain switches
5. Complete Phase 4: US2+3 — View Roles + Capabilities (T016-T024)
6. Complete Phase 5: US4 — Grant/Revoke (T025-T029)
7. **STOP and VALIDATE**: Full EVM read + write operations work

**At this point, EVM integration is functional for all core operations (view, grant, revoke, transfer). This is a shippable MVP.**

### After Upstream Release (Phases 6-9)

8. Pass dependency gate (T030-T031)
9. Complete Phases 6-9 in parallel (or priority order: US5 → US6 → US8 → US7)
10. Complete Phase 10: Polish + regression

### Incremental Delivery

Each phase adds testable value without breaking previous work:

- Phase 3: EVM contract can be added and wallet connects
- Phase 4: Roles, ownership, admin visible
- Phase 5: Grant/revoke work → **MVP complete**
- Phase 6: Transfers work with correct expiration handling
- Phase 7: Renounce operations available
- Phase 8: Admin delay management available
- Phase 9: History shows new event types
- Phase 10: Fully polished and regression-tested

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Tests follow TDD: write tests → verify they fail → implement → verify they pass
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- Total tasks: 87
- Tasks per story: US1=9, US2=2, US3=7, US4=5, US5=14, US6=12, US7=14, US8=6
- Setup: 4, Foundational: 3, Gate: 2, Polish: 9
