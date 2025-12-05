# Implementation Plan: Dashboard Real Data Integration

**Branch**: `007-dashboard-real-data` | **Date**: 2025-12-04 | **Spec**: [spec.md](./spec.md)  
**Input**: Feature specification from `/specs/007-dashboard-real-data/spec.md`

## Summary

Integrate the Dashboard page with real contract data by creating a shared contract selection context and connecting existing hooks (`useContractRoles`, `useContractOwnership`, `useExportSnapshot`) to display live statistics, contract information, and enable data refresh/export functionality.

## Technical Context

**Language/Version**: TypeScript 5.x, React 18  
**Primary Dependencies**: `@tanstack/react-query`, `@openzeppelin/ui-builder-*` packages, `react-router-dom`  
**Storage**: IndexedDB via `@openzeppelin/ui-builder-storage` (existing)  
**Testing**: Vitest + React Testing Library  
**Target Platform**: Web SPA (browser)  
**Project Type**: Web application (monorepo app)  
**Performance Goals**: Dashboard render <500ms, data fetch <5s  
**Constraints**: Client-side only, no backend, adapter-led architecture  
**Scale/Scope**: Support 50+ roles, 1000+ members without degradation

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

| Principle                           | Status  | Notes                                                                        |
| ----------------------------------- | ------- | ---------------------------------------------------------------------------- |
| I. Adapter-Led, Chain-Agnostic      | ✅ PASS | Dashboard uses hooks that delegate to adapter; no chain-specific logic in UI |
| II. Reuse-First & Monorepo          | ✅ PASS | Reuses existing hooks from spec 006, UI Builder components                   |
| III. Type Safety & Linting          | ✅ PASS | All new code will be TypeScript strict, use typed hooks                      |
| IV. UI/Design System Consistency    | ✅ PASS | Uses existing Dashboard components, follows UI Builder patterns              |
| V. Testing & TDD                    | ✅ PASS | New context and utility hooks will have tests; existing hooks already tested |
| VI. Tooling, Persistence & Autonomy | ✅ PASS | No new storage; uses existing IndexedDB layer                                |

**Gate Result**: ✅ All principles satisfied. No violations to justify.

## Project Structure

### Documentation (this feature)

```text
specs/007-dashboard-real-data/
├── plan.md              # This file
├── research.md          # Phase 0 output - Context pattern research
├── data-model.md        # Phase 1 output - DashboardData, AccessSnapshot
├── quickstart.md        # Phase 1 output - Developer guide
├── contracts/           # Phase 1 output - Snapshot JSON schema
│   └── access-snapshot.schema.json
└── tasks.md             # Phase 2 output (created by /speckit.tasks)
```

### Source Code (repository root)

```text
apps/role-manager/src/
├── context/                          # NEW: Shared context providers
│   ├── ContractContext.tsx           # Contract selection context
│   └── index.ts                      # Context barrel export
├── components/
│   └── Dashboard/
│       ├── ContractInfoCard.tsx      # UPDATE: Accept props from context
│       ├── DashboardStatsCard.tsx    # Existing (no changes needed)
│       ├── PendingChangesCard.tsx    # Existing (no changes needed)
│       └── DashboardEmptyState.tsx   # NEW: Empty state component
├── hooks/
│   ├── useDashboardData.ts           # NEW: Aggregates data for Dashboard
│   ├── useSelectedContract.ts        # NEW: Convenience hook for context
│   └── index.ts                      # UPDATE: Export new hooks
├── pages/
│   └── Dashboard.tsx                 # UPDATE: Integrate with context & hooks
├── utils/
│   ├── snapshot.ts                   # NEW: Snapshot generation utility
│   └── deduplication.ts              # NEW: Member address deduplication
└── types/
    └── dashboard.ts                  # NEW: Dashboard-specific types
```

**Structure Decision**: Follows existing monorepo app structure. New `context/` directory for shared state aligns with React best practices. Utility functions separated for testability.

## Complexity Tracking

> No violations to justify - all principles passed.

---

## Phase 0: Research Summary

See [research.md](./research.md) for detailed findings.

### Key Decisions

| Topic            | Decision                                   | Rationale                                                                          |
| ---------------- | ------------------------------------------ | ---------------------------------------------------------------------------------- |
| State Sharing    | React Context + Provider pattern           | Standard React pattern; avoids prop drilling; works with existing router structure |
| Context Location | Wrap at App.tsx level                      | Ensures all pages have access to selected contract                                 |
| Data Aggregation | Custom `useDashboardData` hook             | Combines multiple hooks, handles loading/error states, computes derived values     |
| Snapshot Export  | Leverage existing `useExportSnapshot` hook | Already implemented in spec 006; just needs filename customization                 |

---

## Phase 1: Design

### Key Components

1. **ContractContext** - Provides `selectedContract`, `selectedNetwork`, `adapter` to entire app
2. **useDashboardData** - Aggregates roles, ownership, capabilities for Dashboard display
3. **Dashboard.tsx** - Updated to consume context and display real data
4. **DashboardEmptyState** - New component for no-contract-selected state

### Data Flow

```
Sidebar (selection)
    ↓ setSelectedContract()
ContractContext (state)
    ↓ useSelectedContract()
Dashboard (consumer)
    ↓ useDashboardData()
[useContractRoles, useContractOwnership, useExportSnapshot]
    ↓
Stats Cards, Contract Info, Export
```

### File Changes Summary

| File                                           | Change Type | Description                                 |
| ---------------------------------------------- | ----------- | ------------------------------------------- |
| `context/ContractContext.tsx`                  | NEW         | Contract selection context provider         |
| `hooks/useSelectedContract.ts`                 | NEW         | Convenience hook for accessing context      |
| `hooks/useDashboardData.ts`                    | NEW         | Data aggregation hook for Dashboard         |
| `utils/snapshot.ts`                            | NEW         | Snapshot filename generation                |
| `utils/deduplication.ts`                       | NEW         | Unique member counting                      |
| `types/dashboard.ts`                           | NEW         | Dashboard-specific type definitions         |
| `components/Dashboard/DashboardEmptyState.tsx` | NEW         | Empty state UI                              |
| `components/Dashboard/ContractInfoCard.tsx`    | UPDATE      | Remove hardcoded props, derive from context |
| `pages/Dashboard.tsx`                          | UPDATE      | Integrate real data via hooks               |
| `components/Layout/Sidebar.tsx`                | UPDATE      | Migrate state to context provider           |
| `App.tsx`                                      | UPDATE      | Wrap with ContractProvider                  |
| `hooks/index.ts`                               | UPDATE      | Export new hooks                            |
