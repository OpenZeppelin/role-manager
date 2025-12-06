# Data Model: Roles Page Layout Skeleton

**Feature**: 008-roles-page-layout  
**Date**: 2025-12-05

## Overview

This document defines the TypeScript interfaces for the Roles page. All data is mock/static for this skeleton implementation.

## Entity Definitions

### Role

Represents a permission role in the access control system.

```typescript
/**
 * Represents a role in the access control system
 * Feature: 008-roles-page-layout
 */
interface Role {
  /** Unique role identifier (e.g., "OWNER_ROLE", "OPERATOR_ROLE") */
  id: string;

  /** Human-readable role name (e.g., "Owner", "Operator") */
  name: string;

  /** Role description explaining permissions */
  description: string;

  /** Number of accounts assigned to this role */
  memberCount: number;

  /** Whether this is the owner role (special handling) */
  isOwnerRole: boolean;
}
```

### Account

Represents a blockchain account assigned to a role.

```typescript
/**
 * Represents an account assigned to a role
 * Feature: 008-roles-page-layout
 */
interface RoleAccount {
  /** Blockchain address (e.g., "0x742d35Cc...") */
  address: string;

  /** Date when the role was assigned (ISO string) */
  assignedAt: string;

  /** Whether this is the currently connected user */
  isCurrentUser: boolean;
}
```

### RoleIdentifier

Reference data for the role identifiers table.

```typescript
/**
 * Reference data for role identifier lookup
 * Feature: 008-roles-page-layout
 */
interface RoleIdentifier {
  /** Role identifier constant (e.g., "OWNER_ROLE") */
  identifier: string;

  /** Human-readable name (e.g., "Owner") */
  name: string;

  /** Description of the role's purpose */
  description: string;
}
```

## Relationships

```
┌─────────────────┐         ┌─────────────────┐
│      Role       │ 1     n │   RoleAccount   │
├─────────────────┤─────────├─────────────────┤
│ id              │         │ address         │
│ name            │         │ assignedAt      │
│ description     │         │ isCurrentUser   │
│ memberCount     │         └─────────────────┘
│ isOwnerRole     │
└─────────────────┘

┌─────────────────┐
│ RoleIdentifier  │  (Reference/Lookup table - no relationships)
├─────────────────┤
│ identifier      │
│ name            │
│ description     │
└─────────────────┘
```

## Mock Data Structure

### roles (Role[])

8 predefined roles matching the design:

| id            | name     | memberCount | isOwnerRole |
| ------------- | -------- | ----------- | ----------- |
| OWNER_ROLE    | Owner    | 1           | true        |
| OPERATOR_ROLE | Operator | 2           | false       |
| MINTER_ROLE   | Minter   | 1           | false       |
| VIEWER_ROLE   | Viewer   | 1           | false       |
| BURNER_ROLE   | Burner   | 0           | false       |
| PAUSER_ROLE   | Pauser   | 0           | false       |
| TRANSFER_ROLE | Transfer | 0           | false       |
| APPROVE_ROLE  | Approver | 0           | false       |

### roleAccounts (Record<string, RoleAccount[]>)

Accounts grouped by role ID:

- `OWNER_ROLE`: 1 account (current user)
- `OPERATOR_ROLE`: 3 accounts (with dates)
- `MINTER_ROLE`: 1 account
- `VIEWER_ROLE`: 1 account
- Others: empty arrays

### roleIdentifiers (RoleIdentifier[])

8 identifier entries matching the reference table in design.

## State Model

The page manages a single piece of local state:

```typescript
// Selected role state
const [selectedRoleId, setSelectedRoleId] = useState<string>('OWNER_ROLE');
```

No complex state machines or transitions—simple selection.

## Future Considerations

When integrating with real data:

1. `Role` will come from adapter's `AccessControlService.getRoles()`
2. `RoleAccount` will come from `AccessControlService.getRoleMembers(roleId)`
3. Current user detection will use wallet connection state
4. `memberCount` may become derived from actual accounts array length

These changes are out of scope for the skeleton implementation.
