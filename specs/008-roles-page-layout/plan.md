# Implementation Plan: Roles Page Layout Skeleton

**Branch**: `008-roles-page-layout` | **Date**: 2025-12-05 | **Spec**: [spec.md](./spec.md)  
**Input**: Feature specification from `/specs/008-roles-page-layout/spec.md`

## Summary

Build a static UI skeleton for the Roles page displaying role cards, role details with assigned accounts, a role identifiers reference table, and a security notice. All components use mock data with no blockchain interactions. Reuse `@openzeppelin/ui-builder-ui` components (Card, AddressDisplay, Alert, Button) and create new feature-specific components in `apps/role-manager/src/components/Roles/`.

## Technical Context

**Language/Version**: TypeScript 5.x, React 19.1  
**Primary Dependencies**: `@openzeppelin/ui-builder-ui`, `@openzeppelin/ui-builder-utils`, `lucide-react`, Tailwind CSS v4  
**Storage**: N/A (mock data only)  
**Testing**: Vitest (unit tests for hooks only per constitution)  
**Target Platform**: Web SPA (desktop 1280px+)  
**Project Type**: Web application (monorepo)  
**Performance Goals**: <100ms for local state changes (role selection)  
**Constraints**: Static layout with mock data, no blockchain calls  
**Scale/Scope**: Single page with ~7 components

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

| Principle                              | Status  | Notes                                                                                |
| -------------------------------------- | ------- | ------------------------------------------------------------------------------------ |
| I. Adapter-Led Architecture            | ✅ PASS | No chain interactions—mock data only                                                 |
| II. Reuse-First & Monorepo Integration | ✅ PASS | Using `@openzeppelin/ui-builder-ui` components (Card, AddressDisplay, Alert, Button) |
| III. Type Safety & Code Quality        | ✅ PASS | TypeScript strict, explicit prop interfaces planned                                  |
| IV. UI/Design System Consistency       | ✅ PASS | Tailwind v4, `cn` utility, matches design screenshots                                |
| V. Testing and TDD                     | ✅ PASS | UI-only components—no unit tests required per constitution                           |
| VI. Tooling & Persistence              | ✅ PASS | Client-side SPA, no backend                                                          |

## Project Structure

### Documentation (this feature)

```text
specs/008-roles-page-layout/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
│   └── components.ts    # Component interfaces
└── tasks.md             # Phase 2 output (created by /speckit.tasks)
```

### Source Code (repository root)

```text
apps/role-manager/src/
├── components/
│   └── Roles/                    # NEW: Feature components
│       ├── index.ts              # Barrel export
│       ├── RolesList.tsx         # Left panel role cards list
│       ├── RoleCard.tsx          # Individual role card
│       ├── RoleDetails.tsx       # Right panel role details
│       ├── AccountRow.tsx        # Account row with actions
│       ├── RoleIdentifiersTable.tsx  # Reference table
│       ├── SecurityNotice.tsx    # Warning banner
│       └── mockData.ts           # Mock data for components
├── pages/
│   └── Roles.tsx                 # UPDATE: Replace empty state with layout
└── types/
    └── roles.ts                  # NEW: Role-related type definitions
```

**Structure Decision**: New components placed in `apps/role-manager/src/components/Roles/` per clarification. This keeps feature components co-located while following the existing pattern (see `components/Dashboard/`, `components/Contracts/`).

## Component Architecture

### Reused from UI Builder

| Component                                 | Package                          | Usage                                     |
| ----------------------------------------- | -------------------------------- | ----------------------------------------- |
| `Card`, `CardHeader`, `CardContent`       | `@openzeppelin/ui-builder-ui`    | RoleCard, RoleDetails containers          |
| `AddressDisplay`                          | `@openzeppelin/ui-builder-ui`    | Account address with copy button          |
| `Alert`, `AlertTitle`, `AlertDescription` | `@openzeppelin/ui-builder-ui`    | SecurityNotice base                       |
| `Button`                                  | `@openzeppelin/ui-builder-ui`    | Action buttons (Assign, Revoke, Transfer) |
| `cn`                                      | `@openzeppelin/ui-builder-utils` | Class composition                         |

### New Components to Create

| Component              | Description                           | Props                                                   |
| ---------------------- | ------------------------------------- | ------------------------------------------------------- |
| `RolesList`            | Scrollable list of role cards         | `roles`, `selectedRoleId`, `onSelectRole`               |
| `RoleCard`             | Single role card with selection state | `role`, `isSelected`, `isConnected`, `onClick`          |
| `RoleDetails`          | Details panel for selected role       | `role`, `accounts`, `isOwnerRole`, `currentUserAddress` |
| `AccountRow`           | Account display with actions          | `account`, `isCurrentUser`, `isOwnerRole`, `onAction`   |
| `RoleIdentifiersTable` | Read-only reference table             | `identifiers`                                           |
| `SecurityNotice`       | Warning banner                        | (no props, static content)                              |

## Implementation Phases

### Phase 1: Foundation (Types + Mock Data)

1. Create `types/roles.ts` with Role, Account, RoleIdentifier interfaces
2. Create `components/Roles/mockData.ts` with static mock data

### Phase 2: Core Components

3. Create `SecurityNotice.tsx` (standalone, no dependencies)
4. Create `RoleIdentifiersTable.tsx` (table component)
5. Create `AccountRow.tsx` (uses AddressDisplay from UI Builder)
6. Create `RoleCard.tsx` (uses Card from UI Builder)

### Phase 3: Composite Components

7. Create `RoleDetails.tsx` (composes AccountRow)
8. Create `RolesList.tsx` (composes RoleCard)

### Phase 4: Page Integration

9. Update `pages/Roles.tsx` with full layout
10. Create `components/Roles/index.ts` barrel export

## Complexity Tracking

> No violations—all gates pass.

| Aspect           | Complexity     | Justification               |
| ---------------- | -------------- | --------------------------- |
| Component count  | 7 new          | Matches design requirements |
| State management | Local useState | Simple selection state only |
| Data             | Mock/static    | Per spec requirements       |
