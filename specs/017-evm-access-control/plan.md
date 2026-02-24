# Implementation Plan: EVM Access Control Integration

**Branch**: `017-evm-access-control` | **Date**: 2026-02-11 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/017-evm-access-control/spec.md`

## Summary

Enable the EVM ecosystem in the Role Manager by integrating the new `EvmAccessControlService` from the EVM adapter. The EVM adapter already implements the full `AccessControlService` interface, and the Role Manager's architecture is ecosystem-agnostic — so the core integration is primarily configuration, contract loading changes, and new UI capabilities for operations that were previously unavailable (renounce, cancel admin transfer, admin delay management).

Key work areas:

1. **Enable EVM** — flip the registry flag, configure app credentials (WalletConnect, Etherscan API key)
2. **Contract loading** — integrate `adapter.loadContract(address)` for auto-fetching verified ABIs
3. **Chain-agnostic expiration** — replace all hardcoded "expiration ledger" with adapter-driven metadata (depends on upstream ui-types release)
4. **New chain-agnostic operations** — renounce ownership/role, cancel admin transfer, admin delay management (depends on upstream ui-types release)
5. **Role label display** — display `RoleIdentifier.label` when provided; truncated hash with copy for unlabeled roles
6. **History enhancements** — support new event types (renounce, cancel, delay change)

## Technical Context

**Language/Version**: TypeScript 5.x, React 19
**Primary Dependencies**: `@openzeppelin/ui-types` (^1.7.0 → new version with extended interface), `@openzeppelin/ui-react` (^1.1.0), `@openzeppelin/ui-components` (^1.2.1), `@openzeppelin/ui-builder-adapter-evm` (^1.5.0 → new version with updated capabilities), `@tanstack/react-query`
**Storage**: IndexedDB via `@openzeppelin/ui-storage` (for recent contracts, user preferences)
**Testing**: Vitest (unit tests for hooks and utilities, TDD for business logic)
**Target Platform**: Web SPA (Vite build)
**Project Type**: Web application (frontend-only, monorepo consumer)
**Performance Goals**: Seamless ecosystem switching (no page reloads); ABI auto-fetch within adapter's 10s budget
**Constraints**: Chain-agnostic UI (adapter-led, constitution principle I); reuse-first (constitution principle II); no hardcoded chain terms
**Scale/Scope**: All 4 pages (Dashboard, Roles, Authorized Accounts, Role Changes) + Add Contract dialog

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

| Principle                   | Status  | Evidence                                                                                                                                                   |
| --------------------------- | ------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| I. Adapter-Led Architecture | ✅ PASS | All EVM interactions via `AccessControlService` interface; new operations via optional interface methods + capability flags; no chain-specific logic in UI |
| II. Reuse-First             | ✅ PASS | Uses existing `@openzeppelin/ui-*` packages; extends existing hooks/components; follows proven patterns from spec 015/016                                  |
| III. Type Safety            | ✅ PASS | New hooks with explicit return types; capability flags drive conditional rendering; no `any` usage                                                         |
| IV. UI/Design System        | ✅ PASS | Uses `@openzeppelin/ui-components` (Dialog, Button, etc.); type-to-confirm follows existing dialog patterns                                                |
| V. Testing/TDD              | ✅ PASS | New hooks require unit tests; existing hooks remain covered; mock adapter testing                                                                          |
| VI. Tooling/Persistence     | ✅ PASS | Client-side SPA; IndexedDB for contracts; no backend dependencies; Vite build                                                                              |

**No constitution violations.**

## Project Structure

### Documentation (this feature)

```text
specs/017-evm-access-control/
├── plan.md              # This file
├── research.md          # Resolved decisions (no unknowns)
├── data-model.md        # Entity definitions and type updates
├── quickstart.md        # Implementation guide
├── checklists/
│   └── requirements.md  # Spec quality checklist
└── tasks.md             # Phase 2 output (/speckit.tasks command)
```

### Source Code (files to create/modify)

```text
apps/role-manager/
├── public/
│   └── app.config.json                      # MODIFY: Already has EVM walletui config; add walletconnect projectId
├── .env.example                             # MODIFY: Add VITE_APP_CFG_SERVICE_ETHERSCANV2_API_KEY
├── .env.local                               # MODIFY: Add Etherscan API key (gitignored)
└── src/
    ├── core/
    │   └── ecosystems/
    │       └── registry.ts                  # MODIFY: Enable EVM (enabled: true, remove disabledLabel)
    │
    ├── hooks/
    │   ├── useContractSchemaLoader.ts       # MODIFY: Integrate adapter.loadContract(address) for EVM auto-fetch
    │   ├── useContractForm.ts               # MODIFY: Handle verified/unverified contract errors from EVM adapter
    │   ├── useRolesPageData.ts              # MODIFY: Display RoleIdentifier.label; handle missing labels
    │   ├── useOwnershipTransferDialog.ts    # MODIFY: Conditional expiration based on adapter metadata
    │   ├── useAdminTransferDialog.ts        # MODIFY: Conditional expiration based on adapter metadata
    │   ├── useCurrentBlock.ts               # MODIFY: Adapt polling label to adapter metadata
    │   ├── useAccessControlMutations.ts     # MODIFY: Add renounceOwnership, renounceRole, cancelAdminTransfer,
    │   │                                    #         changeAdminDelay, rollbackAdminDelay mutations
    │   ├── useRenounceDialog.ts             # CREATE: Type-to-confirm dialog state for renounce operations
    │   ├── useCancelAdminTransferDialog.ts  # CREATE: Cancel admin transfer confirmation dialog state
    │   ├── useAdminDelayDialog.ts           # CREATE: Admin delay management dialog state
    │   ├── useContractData.ts               # MODIFY: Add admin delay info to admin data hooks
    │   └── useRoleChangesPageData.ts        # MODIFY: Support new history event types
    │
    ├── components/
    │   ├── Contracts/
    │   │   └── AddContractForm.tsx          # MODIFY: Handle auto-fetch flow for EVM verified contracts
    │   ├── Roles/
    │   │   ├── RoleCard.tsx                 # MODIFY: Display label or truncated hash; copy-to-clipboard
    │   │   ├── RoleDetails.tsx              # MODIFY: Add renounce/cancel actions based on capabilities
    │   │   ├── AccountRow.tsx               # MODIFY: Add "Renounce Role" action when hasRenounceRole
    │   │   └── PendingTransferInfo.tsx      # MODIFY: Adapter-driven expiration label
    │   ├── Ownership/
    │   │   └── TransferOwnershipDialog.tsx  # MODIFY: Conditional expiration input
    │   ├── Admin/
    │   │   ├── TransferAdminDialog.tsx      # MODIFY: Conditional expiration input; cancel action
    │   │   └── AdminDelayPanel.tsx          # CREATE: Admin delay display + change/rollback actions
    │   ├── Shared/
    │   │   ├── TypeToConfirmDialog.tsx      # CREATE: Reusable type-to-confirm confirmation dialog
    │   │   └── RoleHashDisplay.tsx          # CREATE: Truncated hash display with copy-to-clipboard
    │   └── RoleChanges/
    │       └── ChangeRow.tsx                # MODIFY: Support new event type labels
    │
    ├── types/
    │   ├── roles.ts                         # MODIFY: Update for label display types
    │   └── admin.ts                         # CREATE: Admin delay types
    │
    ├── utils/
    │   ├── role-name.ts                     # MODIFY: Handle RoleIdentifier.label display logic
    │   └── expiration.ts                    # CREATE: Adapter-driven expiration formatting utilities
    │
    └── constants/
        └── roles.ts                         # MODIFY: Add event type display labels for new history events
```

**Structure Decision**: Follows existing monorepo structure. New components in existing folders where they fit (Admin/, Shared/). New hooks follow established naming patterns. No new directories beyond what's shown.

## Implementation Phases

### Phase 1: Ecosystem Activation & Configuration (P1, no upstream dependency)

Enable EVM in the registry and configure credentials. This can begin immediately — no upstream dependency.

1. Enable EVM in `registry.ts`: set `defaultFeatureConfig.enabled: true`, remove `disabledLabel`
2. Update `public/app.config.json`: add `globalServiceConfigs.walletconnect.projectId` placeholder
3. Update `.env.example`: document `VITE_APP_CFG_SERVICE_ETHERSCANV2_API_KEY`
4. Create `.env.local` with Etherscan V2 API key (gitignored)
5. Verify `CompactEcosystemSelector` shows EVM as enabled in Add Contract dialog
6. Verify wallet switching: add EVM contract → wallet UI switches to wagmi provider → connect MetaMask

**Validation**: EVM selectable in dialog; wallet connects; chain switch works.

### Phase 2: Contract Loading for Verified Contracts (P1, no upstream dependency)

Integrate the adapter's auto-fetch ABI capability for verified contracts.

1. Verify `useContractSchemaLoader`/`useContractForm` — the hook already calls `adapter.loadContractWithMetadata(address)` which works for EVM; modify only if error handling needs adjustment
2. Handle error states: "Contract not verified", "Contract not found", network errors
3. Display verification status from `loadContractWithMetadata()` response
4. Verify `service.registerContract(address, schema)` is called after successful fetch (existing hook flow)
5. Display detected capabilities after registration
6. Test with proxy contracts (adapter handles transparently)

**Validation**: Enter verified address → ABI fetched → capabilities displayed. Unverified address → clear error.

### Phase 3: Role Label Display (P1, no upstream dependency)

Support the adapter's pre-resolved role labels for EVM.

1. Create `RoleHashDisplay` component: truncated hash with copy-to-clipboard
2. Update `RoleCard` to display `RoleIdentifier.label` when present; fall back to `RoleHashDisplay`
3. Update `role-name.ts` utility to handle label/hash display logic
4. Verify well-known roles (DEFAULT_ADMIN_ROLE, MINTER_ROLE, etc.) display labels correctly
5. Verify unlabeled roles show truncated hash with working copy button

**Validation**: EVM contract roles show labels; unknown hashes show truncated + copyable.

### Phase 4: Chain-Agnostic Expiration Refactoring (P1, depends on upstream ui-types release)

Replace all hardcoded "expiration ledger" terminology with adapter-driven metadata.

1. Create `utils/expiration.ts` with adapter-driven formatting utilities
2. Refactor `useOwnershipTransferDialog`: conditional expiration input based on adapter metadata
3. Refactor `useAdminTransferDialog`: conditional expiration input based on adapter metadata
4. Refactor `useCurrentBlock`: adapt polling label and display to adapter metadata
5. Update `PendingTransferInfo`: use adapter-driven labels for pending transfer display
6. Update `TransferOwnershipDialog`: omit expiration for EVM Ownable2Step; show adapter-provided label for Stellar
7. Update `TransferAdminDialog`: show accept schedule info for EVM AccessControlDefaultAdminRules
8. Search-and-replace all "expiration ledger" references in comments, tests, and labels
9. Verify Stellar still works identically (regression test)

**Validation**: Stellar shows ledger-based expiration. EVM Ownable2Step shows no expiration. EVM admin shows accept schedule. No hardcoded "ledger" or "block" anywhere.

### Phase 5: Renounce Operations (P2, depends on upstream ui-types release)

Add renounce ownership and renounce role capabilities.

1. Create `TypeToConfirmDialog` shared component (type-to-confirm pattern)
2. Add `useRenounceOwnership` and `useRenounceRole` to `useAccessControlMutations`
3. Create `useRenounceDialog` hook for dialog state management
4. Add "Renounce Ownership" action in `RoleDetails` when `hasRenounceOwnership` capability
5. Add "Renounce Role" action in `AccountRow` when `hasRenounceRole` capability and connected wallet holds the role
6. Wire type-to-confirm dialog with strong warning text
7. Invalidate and refetch data after successful renounce
8. Unit tests for mutation hooks and dialog state

**Validation**: Renounce actions visible only when capability present. Type-to-confirm blocks accidental execution. Ownership/role state updates after renounce.

### Phase 6: Cancel Admin Transfer & Admin Delay Management (P3, depends on upstream ui-types release)

Add cancel and delay management for AccessControlDefaultAdminRules.

1. Add `useCancelAdminTransfer`, `useChangeAdminDelay`, `useRollbackAdminDelay` to `useAccessControlMutations`
2. Create `useCancelAdminTransferDialog` hook
3. Create `useAdminDelayDialog` hook for change/rollback flow
4. Create `AdminDelayPanel` component showing current delay and pending changes
5. Add "Cancel Admin Transfer" action in Admin role details when `hasCancelAdminTransfer` + pending transfer
6. Add delay management UI in Admin role details when `hasAdminDelayManagement`
7. Unit tests for mutation hooks and dialog state

**Validation**: Cancel clears pending transfer. Delay change shows scheduled change. Rollback cancels pending delay change.

### Phase 7: History Enhancements (P2, partially depends on upstream)

Support new event types in role change history.

1. Update `ChangeRow` to display new event type labels: OWNERSHIP_RENOUNCED, ADMIN_RENOUNCED, ADMIN_TRANSFER_CANCELED, ADMIN_DELAY_CHANGE_SCHEDULED
2. Add display labels in `constants/roles.ts` for new event types
3. Verify history pagination works with EVM indexer
4. Verify graceful degradation when indexer is unavailable
5. Update `history-transformer.ts` if needed for new event shapes

**Validation**: New event types display with correct labels. History works with indexer. "Unavailable" message without indexer.

### Phase 8: Testing & Regression Verification

1. Unit tests for all new hooks (TDD per constitution principle V)
2. Unit tests for new shared components (`TypeToConfirmDialog`, `RoleHashDisplay`)
3. Verify all existing Stellar flows still work (regression)
4. Test seamless ecosystem switching (Stellar → EVM → Stellar)
5. Test graceful degradation: no indexer, non-enumerable contracts, missing capabilities
6. Test error states: unverified contracts, network errors, wallet disconnection

**Validation**: All tests pass. Stellar regression-free. EVM flows complete.

## Dependency Timeline

```text
Immediate (no upstream dependency):
  Phase 1: Ecosystem Activation & Configuration
  Phase 2: Contract Loading for Verified Contracts
  Phase 3: Role Label Display

After upstream ui-types + adapter release:
  Phase 4: Chain-Agnostic Expiration Refactoring
  Phase 5: Renounce Operations
  Phase 6: Cancel Admin Transfer & Admin Delay Management
  Phase 7: History Enhancements
  Phase 8: Testing & Regression
```

Phases 1-3 can begin immediately and deliver a working EVM integration for core operations (view roles, grant, revoke, transfer ownership, transfer admin). Phases 4-8 require the upstream ui-types release with new optional methods, capability flags, and expiration metadata.

**⚠️ DEPENDENCY GATE**: Do NOT begin Phase 4 until the updated `@openzeppelin/ui-types`, `adapter-evm`, and `adapter-stellar` packages are published and the Role Manager's `package.json` is updated with the new minimum versions. Starting Phase 4 with old packages will result in missing types and undefined methods. Phases 1-3 are safe to implement with the current package versions.

## Complexity Tracking

> No constitution violations to justify.

| Item                   | Approach                | Rationale                                                                               |
| ---------------------- | ----------------------- | --------------------------------------------------------------------------------------- |
| TypeToConfirmDialog    | New shared component    | No existing equivalent; needed for renounce. Reusable for any future destructive action |
| RoleHashDisplay        | New shared component    | No existing equivalent; needed for bytes32 hashes. Small, focused                       |
| AdminDelayPanel        | New component in Admin/ | Admin delay is unique to AccessControlDefaultAdminRules; no existing pattern to extend  |
| Expiration refactoring | Update existing dialogs | Modifying in-place is simpler than abstracting; changes are localized to dialog hooks   |

## Dependencies

- **Hard**: Updated `@openzeppelin/ui-types` with new optional methods, capability flags, and expiration metadata (for Phases 4-8)
- **Hard**: Updated `@openzeppelin/ui-builder-adapter-evm` implementing the extended interface (for Phases 4-8)
- **Hard**: Updated `@openzeppelin/ui-builder-adapter-stellar` reporting new capability flags as `false` (for Phase 4 regression safety)
- **Soft**: Access control indexer deployed for EVM networks (enriched data + history; graceful degradation if unavailable)
- **Already available**: Etherscan V2 API key, WalletConnect project ID (developer setup)

## Risks & Mitigations

| Risk                                           | Mitigation                                                                                            |
| ---------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| Upstream ui-types release delayed              | Phases 1-3 can proceed independently; core EVM integration works without new operations               |
| Etherscan rate limiting during development     | Use `.env.local` with dedicated API key; adapter has 4s/10s timeout budget                            |
| EVM adapter API surface changes before release | Pin adapter version; coordinate with UI Builder team on interface stability                           |
| Chain-agnostic expiration design complexity    | Spec clearly defines 3 modes (required/none/contract-managed); adapter provides metadata              |
| Seamless switching regression                  | Infrastructure already proven in UI Builder; minimal Role Manager changes needed                      |
| Stellar regression from expiration refactoring | Phase 4 explicitly includes Stellar regression testing; adapter-driven approach ensures compatibility |

## Post-Phase 1 Design Re-Check

| Principle                   | Status  | Evidence                                                                      |
| --------------------------- | ------- | ----------------------------------------------------------------------------- |
| I. Adapter-Led Architecture | ✅ PASS | All new operations check capability flags; no ecosystem checks in UI code     |
| II. Reuse-First             | ✅ PASS | Extends existing mutation hooks, dialog patterns, and query hooks             |
| III. Type Safety            | ✅ PASS | New types for admin delay, expiration metadata; explicit hook return types    |
| IV. UI/Design System        | ✅ PASS | TypeToConfirmDialog uses ui-components primitives; matches existing dialog UX |
| V. Testing/TDD              | ✅ PASS | New hooks require tests before implementation; mock adapter testing           |
| VI. Tooling/Persistence     | ✅ PASS | No new backend; contracts stored in IndexedDB; Vite build                     |
