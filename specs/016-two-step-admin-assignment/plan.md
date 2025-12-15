# Implementation Plan: Two-Step Admin Role Assignment

**Branch**: `016-two-step-admin-assignment` | **Date**: 2024-12-15 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/016-two-step-admin-assignment/spec.md`

## Summary

Implement two-step admin role transfer functionality for AccessControl contracts, mirroring the existing Ownership transfer UX (spec 015). The feature adds:

- Admin role synthesis and display on Roles page (like Owner role)
- Transfer Admin dialog with expiration input
- Accept Admin Transfer functionality for pending admins
- Pending admin transfer display on both Roles page and Dashboard

Technical approach: Follow established patterns from ownership transfer, with refactoring to maximize code reuse.

## Technical Context

**Language/Version**: TypeScript 5.x, React 18  
**Primary Dependencies**: `@openzeppelin/ui-builder-types`, `@openzeppelin/ui-builder-ui`, `@tanstack/react-query`, `react-hook-form`  
**Storage**: IndexedDB via `@openzeppelin/ui-builder-storage` (for contract metadata)  
**Testing**: Vitest (unit tests for hooks and utilities)  
**Target Platform**: Web SPA (Vite build)
**Project Type**: Web application (frontend-only, monorepo structure)  
**Performance Goals**: Admin state refresh on window focus; 5s block polling for expiration countdown  
**Constraints**: Chain-agnostic UI (adapter-led), offline-capable for cached data  
**Scale/Scope**: Existing Roles page and Dashboard integration

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

| Principle                   | Status  | Evidence                                                                                                                      |
| --------------------------- | ------- | ----------------------------------------------------------------------------------------------------------------------------- |
| I. Adapter-Led Architecture | ✅ PASS | Uses existing `AccessControlService` interface; `getAdminInfo()`, `transferAdminRole()`, `acceptAdminTransfer()` from adapter |
| II. Reuse-First             | ✅ PASS | Extends existing `useAccessControlMutations`, reuses `PendingTransferInfo` component, follows ownership patterns              |
| III. Type Safety            | ✅ PASS | Adds `isAdminRole` to `RoleWithDescription`; new hooks have explicit return types                                             |
| IV. UI/Design System        | ✅ PASS | Uses `@openzeppelin/ui-builder-ui` components (Dialog, Button, AddressField, etc.)                                            |
| V. Testing/TDD              | ✅ PASS | Hooks (`useTransferAdminRole`, `useAcceptAdminTransfer`, `useContractAdminInfo`) require unit tests                           |
| VI. Tooling/Persistence     | ✅ PASS | No new persistence; uses React Query for caching like existing ownership data                                                 |

**No constitution violations.**

## Project Structure

### Documentation (this feature)

```text
specs/016-two-step-admin-assignment/
├── plan.md              # This file
├── research.md          # Pattern analysis from ownership transfer
├── data-model.md        # Entity definitions and type updates
├── quickstart.md        # Implementation guide
└── tasks.md             # Phase 2 output (/speckit.tasks command)
```

### Source Code (files to create/modify)

```text
apps/role-manager/src/
├── types/
│   └── roles.ts                          # MODIFY: Add isAdminRole to RoleWithDescription
├── constants/
│   └── index.ts                          # MODIFY: Add ADMIN_ROLE_ID, ADMIN_ROLE_NAME, etc.
├── hooks/
│   ├── useContractData.ts                # MODIFY: Add useContractAdminInfo hook
│   ├── useAccessControlMutations.ts      # MODIFY: Add useTransferAdminRole, useAcceptAdminTransfer
│   ├── useRolesPageData.ts               # MODIFY: Synthesize admin role like owner role
│   ├── useAdminTransferDialog.ts         # CREATE: Dialog state management (mirrors useOwnershipTransferDialog)
│   └── useRoleChangesPageData.ts         # MODIFY: Include pending admin transfers
├── components/
│   ├── Roles/
│   │   ├── RoleDetails.tsx               # MODIFY: Support isAdminRole, pending admin transfer display
│   │   ├── RoleCard.tsx                  # MODIFY: Admin role icon (Shield/Key)
│   │   └── AccountRow.tsx                # MODIFY: Transfer Admin button for admin row
│   ├── Admin/                            # CREATE: Admin-specific components
│   │   └── TransferAdminDialog.tsx       # CREATE: Transfer admin dialog (similar to TransferOwnershipDialog)
│   └── Dashboard/
│       └── PendingTransferRow.tsx        # VERIFY: Already supports 'admin' type via props
└── pages/
    └── Roles.tsx                         # MODIFY: Wire up admin transfer handlers
```

**Structure Decision**: Follows existing monorepo structure. Admin components in new `Admin/` folder for clarity, but dialog pattern mirrors `Ownership/TransferOwnershipDialog.tsx`.

## Implementation Phases

### Phase 1: Data Layer

1. Add `useContractAdminInfo` hook (parallel to `useContractOwnership`)
2. Add `useTransferAdminRole` and `useAcceptAdminTransfer` mutation hooks
3. Update `RoleWithDescription` type with `isAdminRole` flag
4. Add admin role constants (ID, name, description)

### Phase 2: Admin Role Synthesis

1. Modify `useRolesPageData` to fetch admin info and synthesize Admin role
2. Admin role appears after Owner, before enumerated roles
3. Wire up pending admin transfer state to UI

### Phase 3: UI Components

1. Update `RoleCard` with Admin icon
2. Update `RoleDetails` to show pending admin transfer via `PendingTransferInfo`
3. Update `AccountRow` with Transfer Admin button
4. Create `TransferAdminDialog` (reuse dialog state patterns)

### Phase 4: Dialog Logic

1. Create `useAdminTransferDialog` hook (mirrors ownership pattern)
2. Wire up to Roles page
3. Add Accept Admin Transfer flow

### Phase 5: Dashboard Integration

1. Update `useRoleChangesPageData` to include pending admin transfers
2. Verify `PendingTransferRow` displays correctly

### Phase 6: Testing & Refinement

1. Unit tests for new hooks
2. Integration testing with Stellar adapter
3. Window focus refresh implementation

## Complexity Tracking

> No constitution violations to justify.

| Item               | Approach                  | Rationale                                               |
| ------------------ | ------------------------- | ------------------------------------------------------- |
| Code reuse         | Mirror ownership patterns | Minimizes new code; proven patterns                     |
| Dialog refactoring | Keep separate for now     | Merging would complicate ownership; separate is cleaner |
| Admin icon choice  | Shield icon               | Distinguishes from Owner (Crown)                        |

## Dependencies

- UI Builder adapter must expose `getAdminInfo()`, `transferAdminRole()`, `acceptAdminTransfer()`
- `AdminInfo`, `AdminState`, `PendingAdminTransfer` types from `@openzeppelin/ui-builder-types`
- `hasTwoStepAdmin` capability flag in `AccessControlCapabilities`

## Risks & Mitigations

| Risk                                   | Mitigation                                                      |
| -------------------------------------- | --------------------------------------------------------------- |
| Adapter API not yet released           | Verify types are exported; coordinate with UI Builder team      |
| Dual pending transfers (Owner + Admin) | Both tracked independently; UI handles both                     |
| Block polling overhead                 | Reuse existing `useCurrentBlock` hook with conditional enabling |
