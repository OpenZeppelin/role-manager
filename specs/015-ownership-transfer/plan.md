# Implementation Plan: Contract Ownership Transfer

**Branch**: `015-ownership-transfer` | **Date**: 2024-12-14 | **Spec**: [spec.md](./spec.md)  
**Input**: Feature specification from `/specs/015-ownership-transfer/spec.md`

## Summary

Implement ownership transfer UI for Ownable contracts, supporting both single-step (EVM) and two-step (Stellar) transfer flows. The feature adds "Transfer Ownership" button to the Owner role on the Roles page and "Accept Ownership" action for pending owners, leveraging the existing `useTransferOwnership` hook and creating a new `useAcceptOwnership` hook. For two-step transfers, users input a raw ledger number for expiration with current ledger polling display.

## Technical Context

**Language/Version**: TypeScript 5.x, React 19.x  
**Primary Dependencies**: `@openzeppelin/ui-builder-*` packages (types, ui, utils, adapter-stellar, adapter-evm), `@tanstack/react-query`, `react-hook-form`  
**Storage**: N/A (uses React Query cache for ownership state)  
**Testing**: Vitest with React Testing Library, TDD for hooks  
**Target Platform**: Browser SPA (Vite build)  
**Project Type**: Web application (frontend-only)  
**Performance Goals**: Current ledger polling every 5 seconds (5000ms), UI updates within 5 seconds of transaction confirmation  
**Constraints**: Chain-agnostic UI, adapter-led architecture, no chain-specific logic in components  
**Scale/Scope**: 2 dialogs, 1 new hook, 1 page integration, ~4-6 component files

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

### Pre-Design Check

| Principle                       | Status  | Notes                                                                                                   |
| ------------------------------- | ------- | ------------------------------------------------------------------------------------------------------- |
| I. Adapter-Led, Chain-Agnostic  | ✅ PASS | UI consumes `AccessControlService` interface; `hasTwoStepOwnable` capability flag drives conditional UI |
| II. Reuse-First & Monorepo      | ✅ PASS | Reuses `useTransferOwnership`, `useContractOwnership`, dialog patterns from 014-role-grant-revoke       |
| III. Type Safety & Code Quality | ✅ PASS | Explicit return types on hooks, typed props interfaces, no `any` types                                  |
| IV. UI/Design System            | ✅ PASS | Uses `@openzeppelin/ui-builder-ui` components (Dialog, Button, AddressField), existing patterns         |
| V. Testing & TDD                | ✅ PASS | TDD for `useAcceptOwnership`, `useOwnershipTransferDialog`, and `useCurrentLedger` hooks                |
| VI. Tooling & Persistence       | ✅ PASS | Standalone SPA, no backend; React Query cache for ownership data                                        |

**Gate Result**: ✅ All gates pass. Proceeding to Phase 0.

### Post-Design Re-check

| Principle                       | Status  | Notes                                                                                    |
| ------------------------------- | ------- | ---------------------------------------------------------------------------------------- |
| I. Adapter-Led, Chain-Agnostic  | ✅ PASS | Uses capability flags for UI branching; `acceptOwnership` available in generic interface |
| II. Reuse-First & Monorepo      | ✅ PASS | Reuses existing dialog patterns, transaction state components, form validation patterns  |
| III. Type Safety & Code Quality | ✅ PASS | All new types defined in `contracts/hooks.ts`; explicit interfaces for all hooks         |
| IV. UI/Design System            | ✅ PASS | Uses existing `DialogTransactionStates`, `AddressField`, form patterns                   |
| V. Testing & TDD                | ✅ PASS | TDD approach defined in quickstart; test files specified for all new hooks               |
| VI. Tooling & Persistence       | ✅ PASS | No new storage; uses React Query cache consistent with existing patterns                 |

**Post-Design Gate Result**: ✅ All gates pass. Design is constitution-compliant.

## Project Structure

### Documentation (this feature)

```text
specs/015-ownership-transfer/
├── plan.md              # This file
├── spec.md              # Feature specification
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output (API contracts)
│   └── hooks.ts         # Hook interface definitions
├── checklists/
│   └── requirements.md  # Requirements checklist
└── tasks.md             # Phase 2 output (created by /speckit.tasks)
```

### Source Code (repository root)

```text
apps/role-manager/src/
├── components/
│   ├── Roles/
│   │   └── OwnerAccountRow.tsx           # MODIFY: Add Transfer Ownership button
│   └── Ownership/                        # NEW directory
│       ├── TransferOwnershipDialog.tsx   # NEW: Initiate transfer dialog
│       ├── AcceptOwnershipDialog.tsx     # NEW: Accept transfer dialog
│       └── index.ts                      # Barrel export
├── hooks/
│   ├── useAccessControlMutations.ts      # MODIFY: Add useAcceptOwnership hook
│   ├── useOwnershipTransferDialog.ts     # NEW: Dialog state management
│   ├── useAcceptOwnershipDialog.ts       # NEW: Accept dialog state
│   ├── useCurrentLedger.ts               # NEW: Ledger polling hook
│   └── __tests__/
│       ├── useAccessControlMutations.test.tsx  # MODIFY: Add useAcceptOwnership tests
│       ├── useOwnershipTransferDialog.test.tsx # NEW
│       ├── useAcceptOwnershipDialog.test.tsx   # NEW
│       └── useCurrentLedger.test.tsx           # NEW
├── pages/
│   └── Roles.tsx                         # MODIFY: Ensure Owner at top, wire dialogs
```

**Structure Decision**: Web application frontend structure. New ownership components go in `components/Ownership/`. Transfer button added to existing Owner account row component on Roles page. Hooks follow existing patterns in `hooks/`.

## Complexity Tracking

> No violations detected. Design follows established patterns.

| Area                    | Approach                              | Rationale                             |
| ----------------------- | ------------------------------------- | ------------------------------------- |
| Two-step vs Single-step | Capability flag (`hasTwoStepOwnable`) | Adapter-led, matches existing pattern |
| Expiration Input        | Raw ledger with polling               | User requested; shows current ledger  |
| Accept Ownership        | New hook + dialog                     | Mirrors grant/revoke pattern          |

## Key Dependencies

| Dependency                                 | Version | Purpose                                                                                      |
| ------------------------------------------ | ------- | -------------------------------------------------------------------------------------------- |
| `@openzeppelin/ui-builder-types`           | 0.16.0+ | `AccessControlCapabilities`, `OwnershipInfo`, `AccessControlService.acceptOwnership()` types |
| `@openzeppelin/ui-builder-adapter-stellar` | 0.16.0  | Stellar implementation of `AccessControlService` including `acceptOwnership()`               |
| `@openzeppelin/ui-builder-ui`              | 0.16.0  | Dialog, Button, AddressField components                                                      |
| `@tanstack/react-query`                    | 5.x     | Query invalidation, data fetching                                                            |
| `react-hook-form`                          | 7.x     | Form state management                                                                        |

## Critical Implementation Notes

1. **acceptOwnership Method**: The `acceptOwnership()` method is now available in the generic `AccessControlService` interface (ui-builder-types 0.16.0+). The hook can call it directly without type-guards or casting.

2. **Ledger Polling**: The `getCurrentBlock()` method is now available on the `ContractAdapter` interface. The `useCurrentLedger` hook can use `adapter.getCurrentBlock()` directly with React Query polling.

3. **Expiration Validation**: Validate expiration is strictly greater than the current block (no minimum margin assumed).

4. **Query Key Consistency**: Use existing `ownershipQueryKey` pattern from `useAccessControlMutations.ts` for cache invalidation.

---

## Next Steps

1. Read `research.md` for detailed research findings
2. Read `data-model.md` for entity definitions
3. Read `quickstart.md` for implementation checklist
4. Run `/speckit.tasks` to generate task breakdown
