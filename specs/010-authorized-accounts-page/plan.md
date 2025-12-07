# Implementation Plan: Authorized Accounts Page Layout

**Branch**: `010-authorized-accounts-page` | **Date**: 2025-12-07 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/010-authorized-accounts-page/spec.md`

## Summary

Build a UI skeleton for the Authorized Accounts page with mock data, focusing on reusable components. The page displays a table of authorized accounts with filtering, selection, and action capabilities. Components should be imported from `@openzeppelin/ui-builder-ui` where available, with new components created in `components/AuthorizedAccounts/` following existing patterns from the Roles page.

## Technical Context

**Language/Version**: TypeScript 5.x, React 18.x  
**Primary Dependencies**: `@openzeppelin/ui-builder-ui`, `@openzeppelin/ui-builder-utils`, `lucide-react`, Tailwind CSS v4  
**Storage**: N/A (mock data only, no persistence)  
**Testing**: Vitest (hooks/logic only per constitution), Storybook for visual components  
**Target Platform**: Web SPA (Vite build)  
**Project Type**: Web application (monorepo with role-manager app)  
**Performance Goals**: Render within 2 seconds, smooth interactions at 60fps  
**Constraints**: No business logic, mock data only, reuse existing components  
**Scale/Scope**: Single page with ~5-10 new components

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

| Principle                   | Status  | Notes                                                                                                |
| --------------------------- | ------- | ---------------------------------------------------------------------------------------------------- |
| I. Adapter-Led Architecture | ✅ PASS | No chain logic - UI skeleton with mock data only                                                     |
| II. Reuse-First & Monorepo  | ✅ PASS | Using `@openzeppelin/ui-builder-ui` components (Input, Select, Checkbox, Card, Button, DropdownMenu) |
| III. Type Safety & Linting  | ✅ PASS | All components will be typed with explicit props interfaces                                          |
| IV. UI/Design System        | ✅ PASS | Using design system components, Tailwind CSS, `cn` utility                                           |
| V. Testing & TDD            | ✅ PASS | Mock data file needs no tests; visual components exempt per constitution                             |
| VI. Tooling & Persistence   | ✅ PASS | No persistence in skeleton - standalone SPA remains intact                                           |

**Gate Status**: PASSED - Proceed to Phase 0

## Project Structure

### Documentation (this feature)

```text
specs/010-authorized-accounts-page/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
└── tasks.md             # Phase 2 output (created by /speckit.tasks)
```

### Source Code (repository root)

```text
apps/role-manager/src/
├── components/
│   ├── AuthorizedAccounts/          # NEW - Feature components
│   │   ├── index.ts                 # Barrel exports
│   │   ├── AccountsTable.tsx        # Main data table component
│   │   ├── AccountRow.tsx           # Single row with all columns
│   │   ├── AccountsFilterBar.tsx    # Search + dropdowns
│   │   ├── AccountsEmptyState.tsx   # Empty state with CTA
│   │   ├── AccountsLoadingSkeleton.tsx  # Loading skeleton
│   │   ├── StatusBadge.tsx          # Status indicator badge
│   │   ├── RoleBadge.tsx            # Role indicator badge
│   │   ├── AccountActionsMenu.tsx   # Row actions dropdown
│   │   └── mockData.ts              # Mock account data
│   └── Shared/                      # Existing - reuse PageHeader, EmptyState
├── pages/
│   └── AuthorizedAccounts.tsx       # UPDATE - Wire up components
└── types/
    └── authorized-accounts.ts       # NEW - Type definitions
```

**Structure Decision**: Follows existing pattern from `components/Roles/` with feature-specific component folder, shared components in `Shared/`, and page-level integration.

## Complexity Tracking

> No constitution violations - table not needed.

## Component Reuse Analysis

### From `@openzeppelin/ui-builder-ui`

**UI Primitives** (appropriate for filter bar - no form submission needed):

| Component                                                                        | Usage                                             |
| -------------------------------------------------------------------------------- | ------------------------------------------------- |
| `Button`                                                                         | Action buttons (Add Account, Grant Authorization) |
| `Card`                                                                           | Table container                                   |
| `Checkbox`                                                                       | Row selection, master checkbox                    |
| `Input`                                                                          | Search input field (raw primitive)                |
| `Select`, `SelectTrigger`, `SelectContent`, `SelectItem`, `SelectValue`          | Filter dropdowns (raw primitives)                 |
| `DropdownMenu`, `DropdownMenuTrigger`, `DropdownMenuContent`, `DropdownMenuItem` | Row actions menu                                  |

**Note**: Using raw UI primitives instead of Field components (`TextField`, `SelectField`) because:

- Filter bar doesn't submit to a form
- No validation/error states needed
- Field components require React Hook Form `control` prop

### From `components/Shared/`

| Component        | Usage                               |
| ---------------- | ----------------------------------- |
| `PageHeader`     | Page title, subtitle, action button |
| `EmptyState`     | Empty accounts state                |
| `PageEmptyState` | Wrapped empty state with card       |
| `Skeleton`       | Loading placeholders                |

### New Components Required

| Component                 | Purpose                                             |
| ------------------------- | --------------------------------------------------- |
| `AccountsTable`           | Table wrapper with header row and body              |
| `AccountRow`              | Single account row with all columns                 |
| `AccountsFilterBar`       | Search + Status + Roles filters                     |
| `AccountsEmptyState`      | Specialized empty state for accounts                |
| `AccountsLoadingSkeleton` | Table loading skeleton                              |
| `StatusBadge`             | Status indicator (Active/Expired/Pending)           |
| `RoleBadge`               | Role name badge (reusable for multiple roles)       |
| `AccountActionsMenu`      | Actions dropdown (Edit Roles, Revoke, View Details) |

## Phased Delivery

### Phase 1: Foundation (P1 - Empty State)

- Types and mock data
- AccountsEmptyState
- AccountsLoadingSkeleton
- Page structure with PageHeader

### Phase 2: Table (P2 - Populated State)

- AccountsTable and AccountRow
- StatusBadge and RoleBadge
- AccountActionsMenu
- Checkbox selection

### Phase 3: Filters (P3 - Filter Bar)

- AccountsFilterBar with search and dropdowns
- State management for filter values
- Placeholder filter handlers (logger.info)
