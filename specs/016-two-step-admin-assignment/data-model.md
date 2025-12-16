# Data Model: Two-Step Admin Role Assignment

**Feature**: 016-two-step-admin-assignment  
**Date**: 2024-12-15

## Type Updates

### RoleWithDescription (Modified)

**File**: `apps/role-manager/src/types/roles.ts`

```typescript
/**
 * Role data combined with resolved description.
 * Used by RoleCard and RoleDetails components.
 */
export interface RoleWithDescription {
  /** Role identifier (e.g., "ADMIN_ROLE", bytes32 hash) */
  roleId: string;
  /** Human-readable role name */
  roleName: string;
  /** Resolved description: custom > adapter > null */
  description: string | null;
  /** Whether the current description is user-provided */
  isCustomDescription: boolean;
  /** Array of member addresses */
  members: string[];
  /** Whether this is the Owner role (special UI treatment) */
  isOwnerRole: boolean;
  /** Whether this is the Admin role (special UI treatment) - NEW */
  isAdminRole: boolean;
}
```

**Migration**: Existing code sets `isOwnerRole: false` for enumerated roles; add `isAdminRole: false` in same locations.

---

## New Types

### TransferAdminRoleArgs

**File**: `apps/role-manager/src/hooks/useAccessControlMutations.ts`

```typescript
/**
 * Arguments for useTransferAdminRole mutation
 */
export interface TransferAdminRoleArgs {
  /** The new admin address */
  newAdmin: string;
  /** The block/ledger number at which the transfer expires if not accepted */
  expirationBlock: number;
  /** Execution configuration (EOA, relayer, etc.) */
  executionConfig: ExecutionConfig;
  /** Optional runtime API key for relayer */
  runtimeApiKey?: string;
}
```

### AcceptAdminTransferArgs

**File**: `apps/role-manager/src/hooks/useAccessControlMutations.ts`

```typescript
/**
 * Arguments for useAcceptAdminTransfer mutation
 */
export interface AcceptAdminTransferArgs {
  /** Execution configuration (EOA, relayer, etc.) */
  executionConfig: ExecutionConfig;
  /** Optional runtime API key for relayer */
  runtimeApiKey?: string;
}
```

### UseContractAdminInfoReturn

**File**: `apps/role-manager/src/hooks/useContractData.ts`

```typescript
/**
 * Return type for useContractAdminInfo hook
 */
export interface UseContractAdminInfoReturn {
  /** Admin information from adapter */
  adminInfo: AdminInfo | null;
  /** Whether the query is currently loading (initial fetch) */
  isLoading: boolean;
  /** Whether data is being refetched (background refresh) */
  isFetching: boolean;
  /** Error if admin info fetching failed */
  error: DataError | null;
  /** Function to manually refetch admin info */
  refetch: () => Promise<void>;
  /** Whether the contract has an admin */
  hasAdmin: boolean;
  /** Whether the error can be recovered by retrying */
  canRetry: boolean;
  /** User-friendly error message */
  errorMessage: string | null;
  /** Whether in error state */
  hasError: boolean;
}
```

### TransferAdminFormData

**File**: `apps/role-manager/src/hooks/useAdminTransferDialog.ts`

```typescript
/**
 * Form data for transfer admin dialog
 */
export interface TransferAdminFormData {
  /** The new admin's address */
  newAdminAddress: string;
  /** The block number at which the transfer expires (string for form input) */
  expirationBlock: string;
}
```

### UseAdminTransferDialogOptions

**File**: `apps/role-manager/src/hooks/useAdminTransferDialog.ts`

```typescript
/**
 * Options for useAdminTransferDialog hook
 */
export interface UseAdminTransferDialogOptions {
  /** Current admin address (for self-transfer validation) */
  currentAdmin: string;
  /** Callback when dialog should close */
  onClose: () => void;
  /** Callback on successful transfer */
  onSuccess?: () => void;
}
```

### UseAdminTransferDialogReturn

**File**: `apps/role-manager/src/hooks/useAdminTransferDialog.ts`

```typescript
/**
 * Return type for useAdminTransferDialog hook
 */
export interface UseAdminTransferDialogReturn {
  /** Current dialog step */
  step: DialogTransactionStep;
  /** Error message if step is 'error' */
  errorMessage: string | null;
  /** Current transaction status */
  txStatus: TxStatus;
  /** Whether wallet is connected */
  isWalletConnected: boolean;
  /** Current block for validation */
  currentBlock: number | null;
  /** Whether the error is a network disconnection error */
  isNetworkError: boolean;
  /** Submit the transfer */
  submit: (data: TransferAdminFormData) => Promise<void>;
  /** Retry after error */
  retry: () => Promise<void>;
  /** Reset to initial state */
  reset: () => void;
}
```

---

## Constants

### Contract Admin Role Constants

**File**: `apps/role-manager/src/constants/roles.ts`

```typescript
/**
 * Contract Admin role constants for UI display
 * Used when synthesizing the Admin role from getAdminInfo()
 *
 * IMPORTANT: Uses 'CONTRACT_ADMIN' to distinguish from enumerable 'ADMIN_ROLE'
 *
 * The Stellar access control library allows dynamic role creation - any string
 * can be used as a role name with grant_role(). This means:
 * - CONTRACT_ADMIN: Singular admin from getAdminInfo(), two-step transfer
 * - ADMIN_ROLE: Could be a dynamically created enumerable role with grant_role()
 *
 * Using distinct IDs prevents UI collision if both exist on the same contract.
 */
export const ADMIN_ROLE_ID = 'CONTRACT_ADMIN';
export const ADMIN_ROLE_NAME = 'Contract Admin';
export const ADMIN_ROLE_DESCRIPTION =
  'The Contract Admin has the highest privileges for managing access control settings. Transferred via two-step process.';
```

### Contract Admin vs Enumerable Roles

The Stellar access control library's role system is **dynamic** - `grant_role()` accepts any Symbol as a role name. This creates an important distinction:

| Concept                   | Role ID          | Source              | Members  | Management                                      |
| ------------------------- | ---------------- | ------------------- | -------- | ----------------------------------------------- |
| **Contract Admin**        | `CONTRACT_ADMIN` | `getAdminInfo()`    | Single   | `transferAdminRole()` / `acceptAdminTransfer()` |
| **Enumerable ADMIN_ROLE** | `ADMIN_ROLE`     | `getCurrentRoles()` | Multiple | `grant_role()` / `revoke_role()`                |

**Key insight**: Anyone with admin privileges can call `grant_role(account, "ADMIN_ROLE")` and the library will create storage entries for this new role. The predefined role constants (MINTER_ROLE, etc.) are only used for `#[only_role]` macro checks - the underlying role system doesn't validate role names.

---

## Query Keys

### Admin Info Query Key

**File**: `apps/role-manager/src/hooks/useContractData.ts`

```typescript
/**
 * Query key factory for contract admin info
 */
const adminInfoQueryKey = (address: string) => ['contractAdminInfo', address] as const;
```

**Also add to**: `apps/role-manager/src/hooks/useAccessControlMutations.ts` for cache invalidation.

---

## Adapter Types (Reference)

These types come from `@openzeppelin/ui-builder-types` and are NOT modified:

```typescript
// AdminState - possible states for admin role
type AdminState = 'active' | 'pending' | 'expired' | 'renounced';

// PendingAdminTransfer - details of pending transfer
interface PendingAdminTransfer {
  pendingAdmin: string;
  expirationBlock: number;
  initiatedAt?: string;
  initiatedTxId?: string;
  initiatedBlock?: number;
}

// AdminInfo - admin information from adapter
interface AdminInfo {
  admin: string | null;
  state?: AdminState;
  pendingTransfer?: PendingAdminTransfer;
}

// AccessControlCapabilities - includes hasTwoStepAdmin
interface AccessControlCapabilities {
  hasOwnable: boolean;
  hasTwoStepOwnable: boolean;
  hasAccessControl: boolean;
  hasTwoStepAdmin: boolean; // Used for feature detection
  hasEnumerableRoles: boolean;
  supportsHistory: boolean;
  verifiedAgainstOZInterfaces: boolean;
  notes?: string[];
}
```

---

## State Transitions

### Admin Role State Machine

```
                    ┌──────────────┐
                    │   active     │
                    │ (has admin)  │
                    └──────┬───────┘
                           │
            transferAdminRole(newAdmin, expiration)
                           │
                           ▼
                    ┌──────────────┐
                    │   pending    │◄────┐
                    │(awaiting     │     │ new transferAdminRole()
                    │ acceptance)  │─────┘ replaces pending
                    └──────┬───────┘
                           │
          ┌────────────────┼────────────────┐
          │                │                │
    acceptAdminTransfer()  │          expiration passed
          │                │                │
          ▼                │                ▼
   ┌──────────────┐        │         ┌──────────────┐
   │   active     │        │         │   expired    │
   │ (new admin)  │        │         │ (no change)  │
   └──────────────┘        │         └──────────────┘
                           │
                    renounceAdmin()
                           │
                           ▼
                    ┌──────────────┐
                    │  renounced   │
                    │ (no admin)   │
                    └──────────────┘
```

### Dialog Transaction Step Machine

```
     ┌────────┐
     │  form  │ (initial state)
     └────┬───┘
          │ submit()
          ▼
     ┌────────┐
     │pending │ (wallet signature requested)
     └────┬───┘
          │ signature received
          ▼
     ┌──────────┐
     │confirming│ (tx broadcast, awaiting confirmation)
     └────┬─────┘
          │
    ┌─────┼─────┬─────────────┐
    │     │     │             │
    ▼     │     ▼             ▼
┌───────┐ │ ┌───────┐    ┌──────────┐
│success│ │ │ error │    │cancelled │
└───────┘ │ └───┬───┘    └────┬─────┘
    │     │     │             │
    │auto │     │retry()      │back()
    │close│     │             │
    ▼     │     ▼             ▼
 [dialog  │  ┌────────┐   ┌────────┐
  closes] │  │  form  │   │  form  │
          │  └────────┘   └────────┘
          │
          └─(on rejection)────────────►
```

---

## Relationship Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         Roles Page                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  useRolesPageData                                               │
│  ├── useContractCapabilities (hasTwoStepAdmin detection)        │
│  ├── useContractOwnership → ownerRole (isOwnerRole: true)       │
│  ├── useContractAdminInfo → adminRole (isAdminRole: true) [NEW] │
│  └── useContractRoles → enumerated roles                        │
│                                                                  │
│  Combined roles: [ownerRole?, adminRole?, ...enumeratedRoles]   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                       RoleDetails                                │
├─────────────────────────────────────────────────────────────────┤
│  if (role.isAdminRole && adminState === 'pending'/'expired')    │
│    → PendingTransferInfo (transferLabel="Admin Role")           │
│                                                                  │
│  if (role.isAdminRole && isCurrentAdmin)                        │
│    → AccountRow with "Transfer Admin" button                     │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                   TransferAdminDialog [NEW]                      │
├─────────────────────────────────────────────────────────────────┤
│  useAdminTransferDialog                                          │
│  ├── useTransferAdminRole (mutation)                            │
│  ├── useCurrentBlock (polling)                                   │
│  └── form validation (address, expiration)                       │
└─────────────────────────────────────────────────────────────────┘
```
