# Implementation Plan: Role Changes Page with Real Data

**Branch**: `012-role-changes-data` | **Date**: 2025-12-08 | **Spec**: [spec.md](./spec.md)  
**Input**: Feature specification from `/specs/012-role-changes-data/spec.md`

## Summary

Build the Role Changes page to display a chronological audit trail of role-related events (grants, revokes, ownership transfers) for selected contracts. The page leverages the adapter's `getHistory()` API with **cursor-based server-side pagination** (`hasNextPage`, `endCursor`) and **server-side role filtering** (`roleId` parameter). Adapts table components from the Authorized Accounts page.

## Technical Context

**Language/Version**: TypeScript 5.x with React 19  
**Primary Dependencies**:

- `@openzeppelin/ui-builder-ui` (UI components)
- `@openzeppelin/ui-builder-utils` (cn utility, logger)
- `@openzeppelin/ui-builder-types` (adapter types)
- `@tanstack/react-query` (data fetching/caching)
- `lucide-react` (icons)

**Storage**: N/A (read-only page, no local persistence needed)  
**Testing**: Vitest with React Testing Library  
**Target Platform**: Web SPA (client-side)  
**Project Type**: Web (monorepo structure)  
**Performance Goals**:

- Page load: <3s (p95)
- Filter/pagination: <500ms
- Refresh: background without content flicker

**Constraints**:

- View-only (no mutations)
- Server-side filtering supported via `roleId` parameter
- Cursor-based pagination with `hasNextPage` and `endCursor`

**Scale/Scope**: Contracts with 100-1000+ historical events (efficient with server-side pagination)

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

| Principle                           | Status  | Notes                                                                      |
| ----------------------------------- | ------- | -------------------------------------------------------------------------- |
| **I. Adapter-Led, Chain-Agnostic**  | ✅ PASS | Uses adapter's `getHistory()` API; no chain-specific logic in UI           |
| **II. Reuse-First & Monorepo**      | ✅ PASS | Reuses `ui-builder-*` packages and adapts Authorized Accounts components   |
| **III. Type Safety & Code Quality** | ✅ PASS | TypeScript with explicit types; uses `logger` (no console)                 |
| **IV. UI/Design System**            | ✅ PASS | Uses `ui-builder-ui` components; Tailwind CSS v4 with `cn` utility         |
| **V. Testing & TDD**                | ✅ PASS | TDD for hook logic; presentational components without complex logic exempt |
| **VI. Tooling & Autonomy**          | ✅ PASS | Client-side SPA; no backend dependencies                                   |

**Gate Result**: ✅ ALL PASS - Proceed to Phase 0

## Project Structure

### Documentation (this feature)

```text
specs/012-role-changes-data/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output (TypeScript interfaces)
└── tasks.md             # Phase 2 output (created by /speckit.tasks)
```

### Source Code (repository root)

```text
apps/role-manager/src/
├── components/
│   ├── RoleChanges/                  # NEW: Role Changes page components
│   │   ├── index.ts                  # Barrel export
│   │   ├── ChangesTable.tsx          # History events table
│   │   ├── ChangeRow.tsx             # Single event row
│   │   ├── ChangesFilterBar.tsx      # Action type + role filters
│   │   ├── ChangesLoadingSkeleton.tsx # Loading state
│   │   ├── ChangesEmptyState.tsx     # Empty/unsupported state
│   │   ├── ChangesErrorState.tsx     # Error state with retry
│   │   └── CursorPagination.tsx      # NEW: Cursor-based pagination (no page numbers)
├── hooks/
│   ├── useRoleChangesPageData.ts     # NEW: Main orchestration hook
│   └── useContractHistory.ts         # NEW: History data fetching hook
├── pages/
│   └── RoleChanges.tsx               # NEW: Page component
├── types/
│   └── role-changes.ts               # NEW: Type definitions
└── utils/
    └── history-transformer.ts        # NEW: Data transformation utils

apps/role-manager/src/hooks/__tests__/
├── useContractHistory.test.ts        # NEW: Hook tests (optional per Constitution V)
└── useRoleChangesPageData.test.ts    # NEW: Hook tests (optional per Constitution V)
```

**Structure Decision**: Follows established patterns from `AuthorizedAccounts/` feature. Components mirror the existing structure for consistency and maintainability.

## Complexity Tracking

> No violations detected. Design follows established patterns.
