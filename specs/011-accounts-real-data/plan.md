# Implementation Plan: Authorized Accounts Real Data Integration

**Branch**: `011-accounts-real-data` | **Date**: 2025-12-08 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/011-accounts-real-data/spec.md`

## Summary

This feature integrates real blockchain data into the Authorized Accounts page skeleton (spec 010) by:

1. Creating a new `useAuthorizedAccountsPageData` hook that aggregates role data from `getCurrentRolesEnriched()` into an account-centric view
2. Implementing client-side search, filtering, sorting, and pagination
3. Adding refresh functionality with background updates
4. Updating UI components to handle real data, loading states, and errors

The implementation follows the established patterns from the Roles page (spec 009) and reuses existing hooks and components.

## Technical Context

**Language/Version**: TypeScript 5.x, React 18.x  
**Primary Dependencies**: React, @tanstack/react-query, @openzeppelin/ui-builder-\* packages (types, utils, ui, storage)  
**Storage**: React-query cache for data; IndexedDB via @openzeppelin/ui-builder-storage for contract records  
**Testing**: Vitest with React Testing Library  
**Target Platform**: Web SPA (browser), client-side only  
**Project Type**: Monorepo web application (apps/role-manager)  
**Performance Goals**: <3s initial page load (p95), <100ms client-side filtering/pagination  
**Constraints**: Client-side pagination only (API doesn't support server-side), offline-capable for cached data  
**Scale/Scope**: ~100 unique authorized accounts per contract (client-side processing acceptable)

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

| Principle                      | Status  | Evidence                                                                                       |
| ------------------------------ | ------- | ---------------------------------------------------------------------------------------------- |
| I. Adapter-Led, Chain-Agnostic | ✅ PASS | Uses `AccessControlService.getCurrentRolesEnriched()` interface; no chain-specific logic in UI |
| II. Reuse-First & Monorepo     | ✅ PASS | Reuses ui-builder-\* packages, existing hooks from spec 006, UI components from spec 010       |
| III. Type Safety & Quality     | ✅ PASS | TypeScript strict mode; uses `logger` from ui-builder-utils; typed hooks and components        |
| IV. UI/Design System           | ✅ PASS | Uses ui-builder-ui components; Tailwind CSS with `cn` utility; follows Roles page patterns     |
| V. Testing & TDD               | ✅ PASS | TDD for data transformation hook; Vitest for unit tests; mock adapters for testing             |
| VI. Tooling & Autonomy         | ✅ PASS | Client-side SPA; react-query caching; no backend dependencies                                  |

**Gate Result**: PASS - No violations detected.

## Project Structure

### Documentation (this feature)

```text
specs/011-accounts-real-data/
├── plan.md              # This file
├── research.md          # Phase 0 output - research findings
├── data-model.md        # Phase 1 output - entity definitions
├── quickstart.md        # Phase 1 output - implementation guide
├── contracts/           # Phase 1 output - TypeScript interfaces
│   └── hooks.ts         # Hook contracts and types
└── tasks.md             # Phase 2 output (created by /speckit.tasks)
```

### Source Code (repository root)

```text
apps/role-manager/
├── src/
│   ├── components/
│   │   └── AuthorizedAccounts/     # Existing from spec 010
│   │       ├── AccountRow.tsx      # UPDATE: Handle real data, remove expiresAt
│   │       ├── AccountsFilterBar.tsx # UPDATE: Remove "Expired" status option
│   │       ├── AccountsTable.tsx   # UPDATE: Wire to real data
│   │       ├── AccountsLoadingSkeleton.tsx # KEEP as-is
│   │       ├── AccountsEmptyState.tsx # NEW: Empty state for unsupported contracts
│   │       ├── AccountsErrorState.tsx # NEW: Error state with retry
│   │       └── index.ts            # UPDATE: Export new components
│   ├── hooks/
│   │   ├── useAuthorizedAccountsPageData.ts # NEW: Main orchestration hook
│   │   ├── useContractRolesEnriched.ts      # NEW: Hook wrapping enriched API
│   │   └── index.ts                # UPDATE: Export new hooks
│   ├── pages/
│   │   └── AuthorizedAccounts.tsx  # UPDATE: Wire to real data hook
│   ├── types/
│   │   └── authorized-accounts.ts  # UPDATE: Remove Expired status, add enriched types
│   └── utils/
│       └── account-transformer.ts  # NEW: Role→Account transformation logic
└── tests/
    └── hooks/
        ├── useAuthorizedAccountsPageData.test.tsx # NEW: Hook tests
        └── useContractRolesEnriched.test.tsx      # NEW: Enriched hook tests
```

**Structure Decision**: Follows existing apps/role-manager structure. New files concentrated in hooks/ and components/AuthorizedAccounts/. Transformation logic extracted to utils/ for testability.

## Complexity Tracking

No violations requiring justification. Implementation follows established patterns from spec 009 (Roles page).

## Phase 0: Research Summary

See [research.md](./research.md) for detailed findings.

**Key Decisions**:

1. Create new `useContractRolesEnriched` hook wrapping `getCurrentRolesEnriched()` API
2. Data transformation in dedicated utility function for testability
3. Client-side pagination following `usePaginatedRoles` pattern
4. Sorting: newest first (by grantedAt), then alphabetical fallback

## Phase 1: Design Artifacts

- [data-model.md](./data-model.md) - Entity definitions and relationships
- [contracts/hooks.ts](./contracts/hooks.ts) - TypeScript interfaces for hooks
- [quickstart.md](./quickstart.md) - Implementation guide

## Implementation Phases

### Phase 1: Data Layer (P1 - Core)

- Create `useContractRolesEnriched` hook
- Create `useAuthorizedAccountsPageData` orchestration hook
- Implement role→account transformation utility
- Add unit tests (TDD)

### Phase 2: UI Integration (P1 - Core)

- Update AuthorizedAccounts page to use real data hook
- Wire loading/error/empty states
- Update AccountRow to handle missing timestamps
- Remove demo toggle and mock data

### Phase 3: Search & Filtering (P2)

- Implement client-side search
- Implement role filter with real roles
- Update status filter (remove Expired)

### Phase 4: Pagination (P2)

- Implement client-side pagination
- Add pagination controls
- Handle filter+pagination interaction

### Phase 5: Refresh & Polish (P2)

- Add Refresh button with loading indicator
- Final testing and polish

## Next Steps

Run `/speckit.tasks` to generate detailed task breakdown.
