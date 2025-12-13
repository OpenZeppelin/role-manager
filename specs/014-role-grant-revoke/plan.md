# Implementation Plan: Role Grant and Revoke Actions

**Branch**: `014-role-grant-revoke` | **Date**: 2024-12-11 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification for three dialogs: Manage Roles, Assign Role, Revoke Role

## Summary

Implement role grant and revoke functionality through three dialogs:

1. **Manage Roles Dialog** (Authorized Accounts page) - Checkbox list for granting/revoking roles
2. **Assign Role Dialog** (Roles page) - Grant role to new address via address input + role dropdown
3. **Revoke Role Dialog** (Roles page) - Revoke role from account with confirmation

All dialogs reuse existing `useGrantRole` and `useRevokeRole` hooks from `useAccessControlMutations.ts`. EOA execution only (no multisig in this iteration). Ownership transfer is out of scope.

## Technical Context

**Language/Version**: TypeScript 5.x, React 18.x  
**Primary Dependencies**: `@openzeppelin/ui-builder-ui`, `@openzeppelin/ui-builder-types`, `@tanstack/react-query`, `react-hook-form`  
**Storage**: N/A (no persistence needed; uses existing query cache)  
**Testing**: Vitest + React Testing Library (TDD for hooks)  
**Target Platform**: Browser SPA (Vite)  
**Project Type**: Monorepo app (`apps/role-manager`)  
**Performance Goals**: Dialogs open in <100ms, transaction status updates in real-time  
**Constraints**: Single role change per transaction (no batching), EOA-only  
**Scale/Scope**: 3 dialogs, ~8 components, ~2 hooks, ~3 type files

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

| Principle                               | Status  | Notes                                                                                                        |
| --------------------------------------- | ------- | ------------------------------------------------------------------------------------------------------------ |
| I. Adapter-Led, Chain-Agnostic          | ✅ PASS | Uses existing `useGrantRole`/`useRevokeRole` hooks via adapter's `AccessControlService`                      |
| II. Reuse-First & Monorepo Integration  | ✅ PASS | Reuses `@openzeppelin/ui-builder-ui` components (Dialog, Button, Checkbox, etc.) and existing mutation hooks |
| III. Type Safety, Linting, Code Quality | ✅ PASS | All new types will be explicit interfaces, no `any`, typed components                                        |
| IV. UI/Design System Consistency        | ✅ PASS | Uses existing Dialog, Button, Checkbox components from design system                                         |
| V. Testing and TDD                      | ✅ PASS | New hook logic (`useManageRolesDialog`, etc.) will have unit tests; dialog components are presentational     |
| VI. Tooling, Persistence, Autonomy      | ✅ PASS | No new persistence needed; uses React Query cache                                                            |

**Additional Constraints Check:**

- ✅ No `localStorage` for complex data
- ✅ No hardcoded secrets; relies on wallet connections
- ✅ Uses existing transaction execution via `ExecutionConfig`

## Project Structure

### Documentation (this feature)

```text
specs/014-role-grant-revoke/
├── plan.md              # This file
├── research.md          # Phase 0: Best practices, validation patterns
├── data-model.md        # Phase 1: Types and state interfaces
├── quickstart.md        # Phase 1: Integration guide
├── contracts/           # Phase 1: Component contracts/interfaces
│   ├── hooks.ts         # Hook interfaces
│   └── components.ts    # Component props interfaces
└── tasks.md             # Phase 2: Implementation tasks
```

### Source Code (repository root)

```text
apps/role-manager/src/
├── components/
│   ├── AuthorizedAccounts/
│   │   └── ManageRolesDialog.tsx    # NEW: Checkbox dialog
│   └── Roles/
│       ├── AssignRoleDialog.tsx     # NEW: Address + role dropdown
│       └── RevokeRoleDialog.tsx     # NEW: Confirmation dialog
├── hooks/
│   ├── useManageRolesDialog.ts      # NEW: Dialog state + single-change logic
│   ├── __tests__/
│   │   └── useManageRolesDialog.test.tsx  # NEW: TDD tests
│   └── index.ts                     # UPDATE: Export new hooks
├── types/
│   └── role-dialogs.ts              # NEW: Dialog state types
└── pages/
    ├── AuthorizedAccounts.tsx       # UPDATE: Wire ManageRolesDialog
    └── Roles.tsx                    # UPDATE: Wire Assign/Revoke dialogs
```

**Structure Decision**: Follows existing component organization pattern. Dialog components go in their respective page folders (AuthorizedAccounts, Roles). Shared hook logic in `hooks/` with TDD tests.

## Complexity Tracking

> No violations. Design follows existing patterns.

| Concern                  | Resolution                                                      |
| ------------------------ | --------------------------------------------------------------- |
| Single-change constraint | Handled in `useManageRolesDialog` with auto-revert logic        |
| Three dialogs            | Each is simple; shared transaction execution via existing hooks |
| Self-revoke warning      | Implemented as conditional UI in Manage/Revoke dialogs          |
