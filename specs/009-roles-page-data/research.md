# Research: Roles Page Real Data Integration

**Branch**: `009-roles-page-data` | **Date**: 2025-12-07

## Overview

This document records technology decisions and research findings for the Roles Page Real Data Integration feature. Most infrastructure already exists from previous specs; this feature focuses on integration decisions.

---

## 1. Data Fetching Strategy

### Decision: Use existing react-query hooks from spec 006

### Rationale

- `useContractRoles`, `useContractOwnership`, and `useContractCapabilities` hooks are already implemented
- React Query provides caching, automatic refetching, and error handling out of the box
- Maintains consistency with existing codebase patterns

### Alternatives Considered

| Alternative                        | Rejected Because                                           |
| ---------------------------------- | ---------------------------------------------------------- |
| Direct service calls in components | Would duplicate caching logic, lose react-query benefits   |
| Zustand/Redux global state         | Over-engineering; react-query already handles server state |
| SWR                                | Project already standardized on react-query                |

---

## 2. Custom Description Storage

### Decision: Extend `RecentContractRecord` with `customRoleDescriptions` field

### Rationale

- Keeps all contract-related data in one record
- Leverages existing IndexedDB infrastructure
- Descriptions are contract-specific, not global
- Storage schema:
  ```typescript
  customRoleDescriptions?: Record<string, string>; // roleId → description
  ```

### Alternatives Considered

| Alternative                       | Rejected Because                                              |
| --------------------------------- | ------------------------------------------------------------- |
| Separate `RoleDescriptions` table | Adds complexity; descriptions are tightly coupled to contract |
| localStorage                      | Violates constitution (complex data must use IndexedDB)       |
| In-memory only                    | Descriptions must persist across sessions                     |

---

## 3. Type Alignment: Role vs RoleAssignment

### Decision: Use adapter's `RoleAssignment` type directly; deprecate local `Role` type

### Rationale

- `RoleAssignment` from `@openzeppelin/ui-builder-types` is the canonical type
- Avoids transformation overhead and potential mismatches
- Aligns with constitution's reuse-first principle

### Migration Approach

1. Update component props to accept `RoleAssignment`
2. Add `customDescription` via hook, not type extension
3. Remove mock data exports after integration complete

### Type Mapping

| Local `Role` field | `RoleAssignment` equivalent            |
| ------------------ | -------------------------------------- |
| `id`               | `roleId`                               |
| `name`             | `roleName`                             |
| `description`      | `description` (nullable)               |
| `memberCount`      | `members.length`                       |
| `isOwnerRole`      | Derived from `roleId === 'OWNER_ROLE'` |

---

## 4. Inline Description Editing UX

### Decision: Simple inline text input with Enter/Escape handling

### Rationale

- Spec requires inline editing in details panel (FR-023)
- 256 character limit (per clarification) doesn't need textarea
- Matches existing UI patterns in the codebase

### Implementation Pattern

```tsx
// EditableDescription component
const [isEditing, setIsEditing] = useState(false);
const [value, setValue] = useState(currentDescription);

// Save: Enter key or blur
// Cancel: Escape key
// Validation: Max 256 characters (show error if exceeded)
```

### Accessibility

- Use `aria-label` for edit button
- Focus management on edit mode enter/exit
- Error messages via `aria-live` region

---

## 5. Loading & Error States

### Decision: Dedicated state components with retry actions

### Rationale

- Improves user experience with clear feedback
- Consistent with spec requirements (FR-019, FR-020, FR-021)
- Reusable across the page

### Components

| Component              | Purpose                                                                 |
| ---------------------- | ----------------------------------------------------------------------- |
| `RolesLoadingSkeleton` | Skeleton UI matching roles list + details panel layout                  |
| `RolesErrorState`      | Error message + retry button, handles both roles and ownership failures |
| `RolesEmptyState`      | "Contract doesn't support access control" message                       |

---

## 6. "You" Badge Detection

### Decision: Compare connected wallet address with role member addresses

### Rationale

- Spec requirement (FR-012)
- Connected wallet available via existing context/hook
- Case-insensitive comparison (addresses may have different casing)

### Implementation

```typescript
const isCurrentUser = connectedAddress
  ? member.toLowerCase() === connectedAddress.toLowerCase()
  : false;
```

---

## 7. Data Refresh Strategy

### Decision: Manual refresh button + automatic refresh after mutations

### Rationale

- Spec requires manual refresh support (FR-017)
- Post-mutation refresh handled by react-query's `invalidateQueries`
- No polling to avoid unnecessary network requests

### Implementation

- Expose `refetch` from `useRolesPageData` hook
- Call `refetch` after mutation success (handled in spec 006 mutation hooks)
- Show subtle loading indicator during refresh (FR-003 from NFR)

---

## 8. Owner Role Handling

### Decision: Synthesize Owner role from ownership data when `hasOwnable: true`

### Rationale

- Owner role comes from `useContractOwnership`, not `useContractRoles`
- Need to present as a "role" in the UI for consistency
- Marked with `isOwnerRole: true` for special UI treatment (crown icon, transfer button)

### Implementation

```typescript
// In useRolesPageData
const ownerRole: RoleAssignment | null = ownership?.owner
  ? {
      roleId: 'OWNER_ROLE',
      roleName: 'Owner',
      description: 'Contract owner with full administrative privileges',
      members: [ownership.owner],
    }
  : null;

// Prepend to roles list
const allRoles = ownerRole ? [ownerRole, ...roles] : roles;
```

---

## Summary

All technology decisions leverage existing infrastructure from specs 003-006 and 008. No new external dependencies required. The main implementation work is:

1. **Storage extension**: Add `customRoleDescriptions` field
2. **New hooks**: `useCustomRoleDescriptions`, `useRolesPageData`
3. **New components**: `EditableDescription`, loading/error/empty states
4. **Component updates**: Wire existing components to real data types
