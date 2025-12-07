# Data Model: Authorized Accounts Page

**Feature**: 010-authorized-accounts-page  
**Date**: 2025-12-07

## Overview

Type definitions for the Authorized Accounts page UI skeleton. All types are presentation-focused for mock data rendering.

## Entities

### AuthorizedAccount

Represents an account with authorization to interact with a contract.

```typescript
/**
 * Represents an authorized account with role assignments
 */
export interface AuthorizedAccount {
  /** Unique identifier - the account address */
  id: string;

  /** Ethereum address (0x prefixed, 42 characters) */
  address: string;

  /** Current authorization status */
  status: AccountStatus;

  /** Date when authorization was granted */
  dateAdded: Date;

  /** Optional expiration date (undefined = never expires) */
  expiresAt?: Date;

  /** Array of role names assigned to this account */
  roles: string[];
}
```

### AccountStatus

Enum representing the authorization status of an account.

```typescript
/**
 * Possible statuses for an authorized account
 */
export type AccountStatus = 'active' | 'expired' | 'pending';

/**
 * Display configuration for each status
 */
export const ACCOUNT_STATUS_CONFIG: Record<
  AccountStatus,
  {
    label: string;
    variant: 'success' | 'error' | 'warning';
  }
> = {
  active: { label: 'Active', variant: 'success' },
  expired: { label: 'Expired', variant: 'error' },
  pending: { label: 'Pending', variant: 'warning' },
};
```

### FilterState

Represents the current filter configuration for the accounts table.

```typescript
/**
 * Filter state for the accounts table
 */
export interface AccountsFilterState {
  /** Search query for address/ENS filtering */
  searchQuery: string;

  /** Selected status filter ('all' or specific status) */
  statusFilter: AccountStatus | 'all';

  /** Selected role filter ('all' or specific role name) */
  roleFilter: string;
}

/**
 * Default/initial filter state
 */
export const DEFAULT_FILTER_STATE: AccountsFilterState = {
  searchQuery: '',
  statusFilter: 'all',
  roleFilter: 'all',
};
```

### SelectionState

Represents the selection state for bulk operations.

```typescript
/**
 * Selection state for table rows
 * Using Set<string> for O(1) lookup and efficient add/remove
 */
export type SelectionState = Set<string>;

/**
 * Derive master checkbox state from selection
 */
export type MasterCheckboxState = 'unchecked' | 'checked' | 'indeterminate';

export function getMasterCheckboxState(
  selectedCount: number,
  totalCount: number
): MasterCheckboxState {
  if (selectedCount === 0) return 'unchecked';
  if (selectedCount === totalCount) return 'checked';
  return 'indeterminate';
}
```

## Component Props Interfaces

### AccountsTableProps

```typescript
export interface AccountsTableProps {
  /** List of accounts to display */
  accounts: AuthorizedAccount[];

  /** Set of selected account IDs */
  selectedIds: Set<string>;

  /** Callback when row selection changes */
  onSelectionChange: (selectedIds: Set<string>) => void;

  /** Callback when an action is triggered on an account */
  onAction: (accountId: string, action: AccountAction) => void;
}
```

### AccountRowProps

```typescript
export interface AccountRowProps {
  /** Account data to display */
  account: AuthorizedAccount;

  /** Whether this row is currently selected */
  isSelected: boolean;

  /** Callback when selection checkbox changes */
  onToggleSelection: () => void;

  /** Callback when an action is triggered */
  onAction: (action: AccountAction) => void;
}
```

### AccountAction

```typescript
/**
 * Available actions for an account row
 */
export type AccountAction = 'edit-roles' | 'revoke-access' | 'view-details';

/**
 * Display configuration for actions
 */
export const ACCOUNT_ACTIONS: Array<{
  id: AccountAction;
  label: string;
}> = [
  { id: 'edit-roles', label: 'Edit Roles' },
  { id: 'revoke-access', label: 'Revoke Access' },
  { id: 'view-details', label: 'View Details' },
];
```

### AccountsFilterBarProps

```typescript
export interface AccountsFilterBarProps {
  /** Current filter state */
  filters: AccountsFilterState;

  /** Available roles for the role filter dropdown */
  availableRoles: string[];

  /** Callback when filter state changes */
  onFiltersChange: (filters: AccountsFilterState) => void;
}
```

### StatusBadgeProps

```typescript
export interface StatusBadgeProps {
  /** Status to display */
  status: AccountStatus;

  /** Additional CSS classes */
  className?: string;
}
```

### RoleBadgeProps

```typescript
export interface RoleBadgeProps {
  /** Role name to display */
  role: string;

  /** Additional CSS classes */
  className?: string;
}
```

## Mock Data Structure

```typescript
/**
 * Mock data for demonstrating all visual states
 */
export const MOCK_ACCOUNTS: AuthorizedAccount[] = [
  {
    id: '1',
    address: '0x742d35Cc6634C0532925a3b844Bc9e7595f8fEb6',
    status: 'active',
    dateAdded: new Date('2024-01-15'),
    expiresAt: undefined, // Never expires
    roles: ['Admin', 'Minter'],
  },
  {
    id: '2',
    address: '0x8ba1f109551bD432803012645Ac136ddd64DBA72',
    status: 'active',
    dateAdded: new Date('2024-02-20'),
    expiresAt: new Date('2025-02-20'),
    roles: ['Operator'],
  },
  {
    id: '3',
    address: '0xAb5801a7D398351b8bE11C439e05C5B3259aeC9B',
    status: 'expired',
    dateAdded: new Date('2023-06-01'),
    expiresAt: new Date('2024-06-01'),
    roles: ['Pauser'],
  },
  {
    id: '4',
    address: '0x1234567890123456789012345678901234567890',
    status: 'pending',
    dateAdded: new Date('2024-11-30'),
    expiresAt: new Date('2025-11-30'),
    roles: ['Upgrader', 'Admin', 'Burner'],
  },
];

/**
 * Available roles extracted from mock data
 */
export const MOCK_AVAILABLE_ROLES = ['Admin', 'Minter', 'Operator', 'Pauser', 'Upgrader', 'Burner'];
```

## Relationships

```
AuthorizedAccount
├── has one AccountStatus
├── has many roles (string[])
└── belongs to Contract (implicit via page context)

AccountsFilterState
├── filters by AccountStatus
└── filters by role name

SelectionState (Set<string>)
└── contains AuthorizedAccount.id values
```

## Validation Rules

| Field       | Rule                                                      |
| ----------- | --------------------------------------------------------- |
| `address`   | Must be valid Ethereum address format (0x + 40 hex chars) |
| `status`    | Must be one of: 'active', 'expired', 'pending'            |
| `dateAdded` | Must be valid Date, required                              |
| `expiresAt` | Optional Date, if present must be after dateAdded         |
| `roles`     | Array of strings, can be empty                            |

## State Transitions

```
Account Status Lifecycle (informational only - no business logic in skeleton):

  ┌─────────┐
  │ Pending │ ──────────────────┐
  └────┬────┘                   │
       │ (approved)             │ (rejected/expired)
       ▼                        ▼
  ┌─────────┐              ┌─────────┐
  │ Active  │ ────────────>│ Expired │
  └─────────┘  (time/revoke)└─────────┘
```

Note: Status transitions are display-only in this skeleton. Real transitions will be implemented in a future spec with business logic.
