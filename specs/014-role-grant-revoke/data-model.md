# Data Model: Role Grant and Revoke Actions

**Feature**: 014-role-grant-revoke  
**Date**: 2024-12-11

## Entity Definitions

### Dialog State Types

```typescript
// File: types/role-dialogs.ts

/**
 * Transaction step states for all role dialogs
 */
export type DialogTransactionStep =
  | 'form' // Initial state, user can make changes
  | 'pending' // Transaction submitted, waiting for confirmation
  | 'confirming' // Transaction being confirmed on-chain
  | 'success' // Transaction confirmed
  | 'error' // Transaction failed
  | 'cancelled'; // User rejected wallet signature

/**
 * Pending role change (single change at a time due to no batching)
 */
export interface PendingRoleChange {
  /** Type of operation */
  type: 'grant' | 'revoke';
  /** Role identifier (bytes32 hash) */
  roleId: string;
  /** Human-readable role name for display */
  roleName: string;
}

/**
 * Role checkbox item for Manage Roles dialog
 */
export interface RoleCheckboxItem {
  /** Role identifier */
  roleId: string;
  /** Human-readable name */
  roleName: string;
  /** Whether account originally had this role (snapshot at dialog open) */
  originallyAssigned: boolean;
  /** Current checkbox state */
  isChecked: boolean;
  /** Whether this checkbox differs from original (is the pending change) */
  isPendingChange: boolean;
}
```

### Dialog-Specific State

```typescript
/**
 * State for Manage Roles dialog (Authorized Accounts page)
 */
export interface ManageRolesDialogState {
  /** Target account address */
  accountAddress: string;
  /** Role checkbox items with original/current state */
  roleItems: RoleCheckboxItem[];
  /** The single pending change, if any */
  pendingChange: PendingRoleChange | null;
  /** Current transaction step */
  step: DialogTransactionStep;
  /** Error message if step is 'error' */
  errorMessage: string | null;
  /** Whether target is connected wallet (for self-revoke warning) */
  isSelfAccount: boolean;
}

/**
 * State for Assign Role dialog (Roles page)
 */
export interface AssignRoleDialogState {
  /** Address input value */
  addressInput: string;
  /** Selected role ID */
  selectedRoleId: string;
  /** Available roles (excluding Owner) */
  availableRoles: Array<{ roleId: string; roleName: string }>;
  /** Validation state */
  isAddressValid: boolean;
  /** Current transaction step */
  step: DialogTransactionStep;
  /** Error message if step is 'error' */
  errorMessage: string | null;
}

/**
 * State for Revoke Role dialog (Roles page)
 */
export interface RevokeRoleDialogState {
  /** Account to revoke from */
  accountAddress: string;
  /** Role being revoked */
  roleId: string;
  /** Role name for display */
  roleName: string;
  /** Whether this is a self-revoke */
  isSelfRevoke: boolean;
  /** Current transaction step */
  step: DialogTransactionStep;
  /** Error message if step is 'error' */
  errorMessage: string | null;
}
```

## State Transitions

### Dialog Transaction Step Flow

```
┌──────────┐
│   form   │ ◄─────────────────────────────────────┐
└────┬─────┘                                       │
     │ Submit                                      │
     ▼                                             │
┌──────────┐                                       │
│ pending  │ ───────────────────────────┐          │
└────┬─────┘                            │          │
     │ TX Submitted                     │ User     │
     ▼                                  │ Reject   │
┌──────────┐                            │          │
│confirming│                            │          │
└────┬─────┘                            │          │
     │                                  │          │
     ├─── TX Confirmed ──► ┌─────────┐  │          │
     │                     │ success │ ─┼──────────┤
     │                     └─────────┘  │ Auto-close
     │                                  │ after 1.5s
     └─── TX Failed ─────► ┌─────────┐  │          │
                           │  error  │ ─┼──────────┘
                           └─────────┘  │ Retry
                                        │
                           ┌──────────┐ │
                           │cancelled │◄┘
                           └────┬─────┘
                                │ Back to form
                                └───────────────────┘
```

### Single-Change Constraint Logic

```
User toggles checkbox for Role X:

  1. Get original state of Role X
  2. Compare current toggle to original:

     If toggle differs from original:
       → This is the new pending change
       → Reset ALL other checkboxes to their original state
       → Update pendingChange = { type, roleId, roleName }

     If toggle matches original (user reverted):
       → Clear pending change
       → pendingChange = null
```

## Relationships

```
┌─────────────────────────────────────────────────────────────┐
│                    Authorized Accounts Page                  │
├─────────────────────────────────────────────────────────────┤
│  AccountRow                                                  │
│    └── AccountActionsMenu                                    │
│          └── "Edit Roles" action ───► ManageRolesDialog     │
│                                           │                  │
│                                           ├── useGrantRole   │
│                                           └── useRevokeRole  │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                         Roles Page                           │
├─────────────────────────────────────────────────────────────┤
│  RoleDetails                                                 │
│    ├── "+ Assign" button ────────────► AssignRoleDialog     │
│    │                                       │                 │
│    │                                       └── useGrantRole  │
│    │                                                         │
│    └── AccountRow                                            │
│          └── "Revoke" button ─────────► RevokeRoleDialog    │
│                                             │                │
│                                             └── useRevokeRole│
└─────────────────────────────────────────────────────────────┘
```

## Validation Rules

### Address Input (Assign Role Dialog)

**Note**: Address validation is handled by the existing `AddressField` component from `@openzeppelin/ui-builder-ui`, which uses `adapter.isValidAddress()` for chain-specific validation.

| Rule           | Validation                     | Error Message                               |
| -------------- | ------------------------------ | ------------------------------------------- |
| Required       | Built into AddressField        | "This field is required"                    |
| Format (chain) | `adapter.isValidAddress(addr)` | "Invalid address format for selected chain" |

### Role Selection

| Rule               | Validation              | Error Message                  |
| ------------------ | ----------------------- | ------------------------------ |
| Owner excluded     | `!role.isOwnerRole`     | N/A (Owner filtered from list) |
| Selection required | `selectedRoleId !== ''` | Button disabled                |

### Pending Change (Manage Roles Dialog)

| Rule               | Validation               | Error Message   |
| ------------------ | ------------------------ | --------------- |
| Change required    | `pendingChange !== null` | Button disabled |
| Single change only | Enforced by auto-revert  | N/A             |
