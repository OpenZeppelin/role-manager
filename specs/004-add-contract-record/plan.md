# Implementation Plan: Add Contract Record

**Branch**: `004-add-contract-record` | **Date**: 2025-12-02 | **Spec**: [spec.md](./spec.md)  
**Input**: Feature specification from `/specs/004-add-contract-record/spec.md`

## Summary

Implement an "Add Contract" dialog triggered from the contract selector in the sidebar. The dialog contains three fields (Contract Name, Contract Address, Network Selector) with network-specific address validation via the adapter pattern. The feature also includes contract deletion from the dropdown. Uses existing UI Builder components and storage infrastructure.

## Technical Context

**Language/Version**: TypeScript 5.9, React 19  
**Primary Dependencies**: `@openzeppelin/ui-builder-ui`, `@openzeppelin/ui-builder-storage`, `@openzeppelin/ui-builder-types`, `react-hook-form`  
**Storage**: IndexedDB via Dexie (`@openzeppelin/ui-builder-storage`) - existing `RecentContractsStorage`  
**Testing**: Vitest for unit/integration tests  
**Target Platform**: Web SPA (browser), client-side only  
**Project Type**: Monorepo app (`apps/role-manager`)  
**Performance Goals**: <100ms form interaction response (SC-005)  
**Constraints**: Offline-capable, no backend dependencies, chain-agnostic UI  
**Scale/Scope**: 50+ networks, unlimited contracts per user

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

| Principle                           | Status  | Evidence                                                                   |
| ----------------------------------- | ------- | -------------------------------------------------------------------------- |
| I. Adapter-Led, Chain-Agnostic      | ✅ PASS | Address validation via `adapter.isValidAddress()`, no chain logic in UI    |
| II. Reuse-First & Monorepo          | ✅ PASS | Uses existing UI Builder components (Dialog, NetworkSelector, form fields) |
| III. Type Safety & Code Quality     | ✅ PASS | TypeScript strict mode, typed props interfaces                             |
| IV. UI/Design System Consistency    | ✅ PASS | Uses `@openzeppelin/ui-builder-ui` components and Tailwind                 |
| V. Testing & TDD                    | ✅ PASS | Hook logic and storage operations will have unit tests                     |
| VI. Tooling, Persistence & Autonomy | ✅ PASS | Uses `@openzeppelin/ui-builder-storage` for IndexedDB persistence          |

**Additional Constraints Check**:

- ✅ No localStorage for complex data (using IndexedDB)
- ✅ No hardcoded chain secrets (adapter handles validation)
- ✅ Form uses react-hook-form pattern consistent with UI Builder
- ✅ Toast notifications available via `sonner` (peer dependency of ui-builder packages)

## Project Structure

### Documentation (this feature)

```text
specs/004-add-contract-record/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output (component interfaces)
└── tasks.md             # Phase 2 output (created by /speckit.tasks)
```

### Source Code (repository root)

```text
apps/role-manager/src/
├── components/
│   ├── Layout/
│   │   ├── AccountSelector.tsx      # MODIFY: Rename to ContractSelector, add delete handler
│   │   └── Sidebar.tsx              # MODIFY: Wire up dialog trigger ✅
│   └── Contracts/                   # NEW: Feature components
│       ├── AddContractDialog.tsx    # NEW: Main dialog component ✅
│       ├── AddContractForm.tsx      # NEW: Form with two-step ecosystem flow ✅
│       ├── CompactEcosystemSelector.tsx # NEW: Compact ecosystem picker ✅
│       └── index.ts                 # NEW: Barrel export ✅
├── hooks/
│   ├── __tests__/                   # NEW: Hook tests (TDD per Constitution §V)
│   │   ├── useNetworkAdapter.test.ts# NEW: Adapter hook tests ✅
│   │   └── useAllNetworks.test.ts   # NEW: Networks hook tests ✅
│   ├── useRecentContracts.ts        # MODIFY: Add delete method exposure ✅
│   ├── useNetworkAdapter.ts         # NEW: Adapter loading hook ✅
│   ├── useAllNetworks.ts            # NEW: Fetch networks from all ecosystems ✅
│   └── useNetworksByEcosystem.ts    # NEW: Lazy-load networks per ecosystem ✅
├── core/
│   ├── ecosystems/
│   │   ├── registry.ts              # MODIFY: Updated ecosystem configs ✅
│   │   └── ecosystemManager.ts      # NEW: Local adapter/network manager ✅
│   └── storage/
│       └── RecentContractsStorage.ts # MODIFY: Add delete method ✅
└── types/
    └── contracts.ts                 # NEW: Contract-specific types ✅
```

**Structure Decision**: Single app within monorepo. New components go in `components/Contracts/` following existing pattern. Hooks follow existing pattern in `hooks/`.

## Complexity Tracking

No constitution violations requiring justification. Design follows existing patterns.
