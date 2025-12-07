# Implementation Plan: Roles Page Real Data Integration

**Branch**: `009-roles-page-data` | **Date**: 2025-12-07 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/009-roles-page-data/spec.md`

## Summary

Connect the Roles page UI skeleton (spec 008) to real blockchain data via the Access Control service hooks (spec 006). Replace mock data with live role assignments and ownership information from the adapter. Add inline description editing with local storage persistence. All data fetching hooks and UI components exist—this feature integrates them and adds the description editing capability.

## Technical Context

**Language/Version**: TypeScript 5.x, React 18.x  
**Primary Dependencies**: `@tanstack/react-query`, `@openzeppelin/ui-builder-*` packages, `lucide-react`  
**Storage**: IndexedDB via `@openzeppelin/ui-builder-storage` (Dexie)  
**Testing**: Vitest for unit/integration tests  
**Target Platform**: Web SPA (modern browsers)  
**Project Type**: Monorepo app (`apps/role-manager`)  
**Performance Goals**: 3s initial load (p95), 100ms role selection, 100ms description save  
**Constraints**: Client-side only, no backend dependencies, offline-capable for cached data  
**Scale/Scope**: Up to 100 roles, 1000 total members per contract

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

| Principle                          | Status  | Notes                                                                                    |
| ---------------------------------- | ------- | ---------------------------------------------------------------------------------------- |
| I. Adapter-Led, Chain-Agnostic     | ✅ PASS | All data via `AccessControlService` from adapter; no chain-specific logic in UI          |
| II. Reuse-First & Monorepo         | ✅ PASS | Uses existing hooks (`useContractRoles`, `useContractOwnership`), UI components, storage |
| III. Type Safety & Code Quality    | ✅ PASS | All props typed, hooks have explicit return types, no `any`                              |
| IV. UI/Design System Consistency   | ✅ PASS | Uses `@openzeppelin/ui-builder-ui` components, existing Tailwind patterns                |
| V. Testing & TDD                   | ✅ PASS | TDD for new hooks/storage methods; UI integration tested via hooks                       |
| VI. Tooling, Persistence, Autonomy | ✅ PASS | Uses IndexedDB storage, client-side SPA, works offline for cached data                   |

**Additional Constraints Check:**

- ✅ No `localStorage` for complex data (using IndexedDB)
- ✅ No hardcoded secrets (wallet connection handled by existing infrastructure)
- ✅ N/A - No transaction forms in this feature (description editing is local storage only)

## Project Structure

### Documentation (this feature)

```text
specs/009-roles-page-data/
├── plan.md              # This file
├── research.md          # Phase 0 output - technology decisions
├── data-model.md        # Phase 1 output - extended storage model
├── quickstart.md        # Phase 1 output - developer setup guide
├── contracts/           # Phase 1 output - component interfaces
│   └── components.ts    # Updated component prop types
└── tasks.md             # Phase 2 output (created by /speckit.tasks)
```

### Source Code (repository root)

```text
apps/role-manager/src/
├── pages/
│   └── Roles.tsx                    # UPDATE: Wire to real data hooks
├── components/Roles/
│   ├── RoleCard.tsx                 # UPDATE: Accept RoleAssignment type
│   ├── RolesList.tsx                # UPDATE: Accept real roles array
│   ├── RoleDetails.tsx              # UPDATE: Add inline description editing
│   ├── AccountRow.tsx               # UPDATE: Accept real member data
│   ├── RoleIdentifiersTable.tsx     # UPDATE: Accept real identifiers
│   ├── EditableDescription.tsx      # NEW: Inline edit component
│   ├── RolesLoadingSkeleton.tsx     # NEW: Loading state component
│   ├── RolesErrorState.tsx          # NEW: Error state with retry
│   ├── RolesEmptyState.tsx          # NEW: No access control message
│   └── index.ts                     # UPDATE: Export new components
├── hooks/
│   ├── useRolesPageData.ts          # NEW: Orchestrates all data fetching
│   └── useCustomRoleDescriptions.ts # NEW: Manages custom descriptions
├── core/storage/
│   └── RecentContractsStorage.ts    # UPDATE: Add custom descriptions methods
└── types/
    ├── roles.ts                     # UPDATE: Align with adapter types
    └── storage.ts                   # UPDATE: Add CustomRoleDescriptions type
```

**Structure Decision**: Single app structure (Option 1 adapted). All changes are within the existing `apps/role-manager` app package following established patterns.

## Implementation Phases

### Phase 1: Storage Layer Extension

1. Extend `RecentContractRecord` type with `customRoleDescriptions` field
2. Add storage methods: `updateRoleDescription`, `getCustomRoleDescriptions`, `clearRoleDescription`
3. Write TDD tests for storage methods

### Phase 2: Custom Description Hook

1. Create `useCustomRoleDescriptions` hook for CRUD operations
2. Wire to storage layer with optimistic updates
3. Write TDD tests for hook behavior

### Phase 3: Data Orchestration Hook

1. Create `useRolesPageData` hook combining:
   - `useContractCapabilities` for feature detection
   - `useContractRoles` for role assignments
   - `useContractOwnership` for ownership
   - `useCustomRoleDescriptions` for descriptions
2. Handle loading, error, empty states
3. Implement data refresh logic

### Phase 4: UI State Components

1. Create `RolesLoadingSkeleton` component
2. Create `RolesErrorState` component with retry
3. Create `RolesEmptyState` for unsupported contracts

### Phase 5: Inline Description Editing

1. Create `EditableDescription` component
2. Handle save (Enter/blur), cancel (Escape)
3. Add 256 character validation
4. Wire to custom descriptions hook

### Phase 6: Component Updates

1. Update `RoleCard` props to accept `RoleAssignment`
2. Update `RolesList` to accept real roles array
3. Update `RoleDetails` with `EditableDescription`
4. Update `AccountRow` for real member data with "You" badge
5. Update `RoleIdentifiersTable` with real identifiers

### Phase 7: Page Integration

1. Update `Roles.tsx` to use `useRolesPageData`
2. Replace mock data with real data flow
3. Add conditional rendering for loading/error/empty states
4. Wire action callbacks (placeholders for future mutations)

## Key Design Decisions

### Data Flow

```
Roles.tsx
  └── useRolesPageData (orchestrator)
        ├── useContractCapabilities → AccessControlCapabilities
        ├── useContractRoles → RoleAssignment[]
        ├── useContractOwnership → OwnershipInfo
        └── useCustomRoleDescriptions → Record<string, string>
```

### Description Priority Resolution

```typescript
// In useRolesPageData or RoleDetails
const getDescription = (role: RoleAssignment, customDescriptions: Record<string, string>) => {
  return (
    customDescriptions[role.roleId] ?? // 1. User-provided
    role.description ?? // 2. Adapter-provided
    null
  ); // 3. Placeholder shown
};
```

### Type Alignment Strategy

The existing `Role` type (spec 008) will be deprecated in favor of `RoleAssignment` from `@openzeppelin/ui-builder-types`. A transformation layer handles the mapping during the transition.

## Complexity Tracking

> No Constitution violations requiring justification.

| Item                      | Decision                    | Rationale                                                  |
| ------------------------- | --------------------------- | ---------------------------------------------------------- |
| Single orchestrator hook  | `useRolesPageData`          | Centralizes data fetching logic, simplifies page component |
| Separate description hook | `useCustomRoleDescriptions` | Single responsibility, reusable, easier to test            |
| Inline editing vs modal   | Inline (FR-023)             | Faster UX, spec requirement                                |
