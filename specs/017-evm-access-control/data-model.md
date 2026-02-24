# Data Model: EVM Access Control Integration

**Branch**: `017-evm-access-control` | **Date**: 2026-02-11

## Overview

This document defines the entities, type changes, and data flow for EVM integration. Most types already exist — this feature primarily **extends** existing types to support chain-agnostic expiration, new capabilities, and new operations.

## Upstream Type Changes (Prerequisite — ui-types package)

These changes must land in `@openzeppelin/ui-types` before this feature branch.

### AccessControlCapabilities (extended)

```typescript
// Existing fields unchanged
interface AccessControlCapabilities {
  hasOwnable: boolean;
  hasTwoStepOwnable: boolean;
  hasAccessControl: boolean;
  hasTwoStepAdmin: boolean;
  hasEnumerableRoles: boolean;
  supportsHistory: boolean;
  verifiedAgainstOZInterfaces: boolean;
  notes?: string;

  // === NEW FIELDS (all optional, default false if omitted) ===

  /** Contract supports renouncing ownership (e.g., EVM Ownable) */
  hasRenounceOwnership?: boolean;

  /** Contract supports self-revocation of roles (e.g., EVM AccessControl) */
  hasRenounceRole?: boolean;

  /** Contract supports canceling pending admin transfers (e.g., EVM AccessControlDefaultAdminRules) */
  hasCancelAdminTransfer?: boolean;

  /** Contract supports changing/rolling back admin transfer delay (e.g., EVM AccessControlDefaultAdminRules) */
  hasAdminDelayManagement?: boolean;
}
```

### ExpirationMetadata (new)

```typescript
/**
 * Chain-agnostic expiration metadata provided by the adapter.
 * Tells the UI whether expiration is needed, its format, and display labels.
 */
interface ExpirationMetadata {
  /**
   * Whether the UI needs to show expiration for this transfer type.
   * - 'required': User must provide expiration (e.g., Stellar)
   * - 'none': No expiration concept (e.g., EVM Ownable2Step)
   * - 'contract-managed': Expiration is managed by the contract, displayed for info only
   *   (e.g., EVM AccessControlDefaultAdminRules accept schedule)
   */
  mode: 'required' | 'none' | 'contract-managed';

  /** Display label for the expiration field (e.g., "Expiration Ledger", "Accept Schedule") */
  label?: string;

  /** Unit description (e.g., "ledger number", "UNIX timestamp") */
  unit?: string;

  /** Current value for 'contract-managed' mode (e.g., the accept schedule timestamp) */
  currentValue?: number;
}
```

### AccessControlService (extended — new optional methods)

```typescript
interface AccessControlService {
  // ... all existing methods unchanged ...

  // === NEW OPTIONAL METHODS ===

  /** Renounce ownership of the contract. Irreversible. */
  renounceOwnership?(
    contractAddress: string,
    executionConfig: ExecutionConfig,
    onStatusChange?: TransactionStatusCallback,
    runtimeApiKey?: string
  ): Promise<OperationResult>;

  /** Renounce a role held by the connected account. Self-revocation only. */
  renounceRole?(
    contractAddress: string,
    roleId: string,
    account: string,
    executionConfig: ExecutionConfig,
    onStatusChange?: TransactionStatusCallback,
    runtimeApiKey?: string
  ): Promise<OperationResult>;

  /** Cancel a pending admin transfer. */
  cancelAdminTransfer?(
    contractAddress: string,
    executionConfig: ExecutionConfig,
    onStatusChange?: TransactionStatusCallback,
    runtimeApiKey?: string
  ): Promise<OperationResult>;

  /** Change the admin transfer delay. The change is itself delayed. */
  changeAdminDelay?(
    contractAddress: string,
    newDelay: number,
    executionConfig: ExecutionConfig,
    onStatusChange?: TransactionStatusCallback,
    runtimeApiKey?: string
  ): Promise<OperationResult>;

  /** Rollback a pending admin delay change. */
  rollbackAdminDelay?(
    contractAddress: string,
    executionConfig: ExecutionConfig,
    onStatusChange?: TransactionStatusCallback,
    runtimeApiKey?: string
  ): Promise<OperationResult>;

  /**
   * Get expiration metadata for a transfer type.
   * Returns adapter-driven expiration semantics.
   */
  getExpirationMetadata?(
    contractAddress: string,
    transferType: 'ownership' | 'admin'
  ): Promise<ExpirationMetadata>;
}
```

## Role Manager Type Changes

### PendingTransfer (modified — `types/pending-transfers.ts`)

The `expirationBlock` field needs to accommodate the new semantics:

```typescript
interface PendingTransfer {
  // ... existing fields ...

  /** Block/ledger/timestamp at which the transfer expires (adapter-driven meaning) */
  expirationBlock: number;

  /** Whether the transfer has expired */
  isExpired: boolean;

  // === NEW FIELDS ===

  /** Adapter-driven expiration metadata for display */
  expirationMetadata?: ExpirationMetadata;
}
```

**Migration note**: The field name `expirationBlock` stays for backward compat within this type, but the UI MUST use `expirationMetadata.label` for display labels, not hardcoded "Expiration Ledger".

### RoleChangeAction (extended — `types/role-changes.ts`)

```typescript
// Existing actions plus new ones
type RoleChangeAction =
  | 'grant'
  | 'revoke'
  | 'ownership-transfer'
  | 'admin-transfer'
  | 'renounce' // NEW: ownership or role renouncement
  | 'admin-delay' // NEW: delay change/cancel events
  | 'unknown';
```

### CHANGE_TYPE_TO_ACTION (updated mapping)

```typescript
const CHANGE_TYPE_TO_ACTION: Record<HistoryChangeType, RoleChangeAction> = {
  GRANTED: 'grant',
  REVOKED: 'revoke',
  OWNERSHIP_TRANSFER_COMPLETED: 'ownership-transfer',
  OWNERSHIP_TRANSFER_STARTED: 'ownership-transfer',
  ADMIN_TRANSFER_INITIATED: 'admin-transfer',
  ADMIN_TRANSFER_COMPLETED: 'admin-transfer',
  ROLE_ADMIN_CHANGED: 'grant',
  OWNERSHIP_RENOUNCED: 'renounce', // CHANGED: was 'ownership-transfer'
  ADMIN_RENOUNCED: 'renounce', // CHANGED: was 'admin-transfer'
  ADMIN_TRANSFER_CANCELED: 'admin-transfer', // unchanged
  ADMIN_DELAY_CHANGE_SCHEDULED: 'admin-delay', // CHANGED: was 'admin-transfer'
  ADMIN_DELAY_CHANGE_CANCELED: 'admin-delay', // CHANGED: was 'admin-transfer'
  UNKNOWN: 'unknown',
};
```

### ACTION_TYPE_CONFIG (extended display config)

```typescript
const ACTION_TYPE_CONFIG: Record<RoleChangeAction, ActionTypeConfig> = {
  grant: { label: 'Grant', variant: 'success' },
  revoke: { label: 'Revoke', variant: 'error' },
  'ownership-transfer': { label: 'Ownership Transfer', variant: 'info' },
  'admin-transfer': { label: 'Admin Transfer', variant: 'info' },
  renounce: { label: 'Renounce', variant: 'error' }, // NEW: red, destructive
  'admin-delay': { label: 'Admin Delay', variant: 'warning' }, // NEW: warning
  unknown: { label: 'Unknown', variant: 'warning' },
};
```

### AdminInfo.delayInfo (upstream extension — ui-types)

The `AdminInfo` type in `@openzeppelin/ui-types` must be extended with an optional `delayInfo` field. This is a **prerequisite upstream change** (not a Role Manager-local type).

```typescript
// Extended AdminInfo in ui-types
interface AdminInfo {
  admin: string | null;
  state?: AdminState;
  pendingTransfer?: PendingAdminTransfer;

  // === NEW FIELD ===
  /** Admin transfer delay information (populated by EVM adapter from on-chain defaultAdminDelay) */
  delayInfo?: {
    /** Current admin transfer delay in seconds */
    currentDelay: number;
    /** Pending delay change, if any */
    pendingDelay?: {
      /** New delay value in seconds */
      newDelay: number;
      /** When the new delay takes effect (UNIX timestamp) */
      effectAt: number;
    };
  };
}
```

**Data source**: The EVM adapter already reads `defaultAdminDelay` on-chain (in `onchain-reader.ts`) but currently does not include it in the `AdminInfo` response. The upstream change extends `getAdminInfo()` to populate `delayInfo` from on-chain data. The Stellar adapter omits `delayInfo` (undefined).

**Consumed by**: The `AdminDelayPanel` component reads `adminInfo.delayInfo` to display current delay, pending change, and schedule.

## Entity Relationships

```text
┌──────────────────────┐      ┌──────────────────────┐
│   ContractContext     │──────│   AccessControlService│
│  (selected contract)  │      │  (from adapter)       │
└──────────┬───────────┘      └──────────┬───────────┘
           │                              │
           │ getCapabilities()            │
           ▼                              │
┌──────────────────────┐                  │
│ AccessControlCapabilities │              │
│  hasOwnable           │                  │
│  hasRenounceOwnership │ ◄── NEW         │
│  hasRenounceRole      │ ◄── NEW         │
│  hasCancelAdminTransfer│ ◄── NEW        │
│  hasAdminDelayManagement│ ◄── NEW       │
└──────────────────────┘                  │
                                          │
           ┌──────────────────────────────┘
           │
           ▼
┌──────────────────────┐      ┌──────────────────────┐
│   OwnershipInfo       │      │   AdminInfo           │
│  owner                │      │  admin                │
│  state                │      │  state                │
│  pendingTransfer?     │      │  pendingTransfer?     │
│    └─ expirationBlock │      │    └─ expirationBlock │
└──────────────────────┘      └──────────┬───────────┘
                                          │
                               ┌──────────▼───────────┐
                               │  AdminDelayInfo       │ ◄── NEW
                               │  currentDelay         │
                               │  pendingDelay?        │
                               └──────────────────────┘

┌──────────────────────┐
│  ExpirationMetadata   │ ◄── NEW (from adapter)
│  mode: required|none  │
│       |contract-managed│
│  label?               │
│  unit?                │
│  currentValue?        │
└──────────────────────┘
```

## Data Flow: New Operations

### Renounce Ownership

```text
User clicks "Renounce Ownership"
  → TypeToConfirmDialog opens (type "RENOUNCE" to confirm)
  → User confirms
  → useAccessControlMutations.renounceOwnership()
    → service.renounceOwnership(address, executionConfig, onStatusChange)
      → Adapter executes on-chain transaction
  → On success: invalidate ['contractOwnership', address]
  → OwnershipInfo refreshes: owner = null, state = 'renounced'
```

### Renounce Role

```text
User clicks "Renounce Role" on their own role
  → TypeToConfirmDialog opens
  → User confirms
  → useAccessControlMutations.renounceRole()
    → service.renounceRole(address, roleId, connectedAccount, executionConfig, onStatusChange)
      → Adapter executes on-chain transaction
  → On success: invalidate ['contractRoles', address]
  → User's address removed from role members
```

### Cancel Admin Transfer

```text
User clicks "Cancel Admin Transfer" on pending admin transfer
  → Confirmation dialog
  → useAccessControlMutations.cancelAdminTransfer()
    → service.cancelAdminTransfer(address, executionConfig, onStatusChange)
  → On success: invalidate ['contractAdminInfo', address]
  → AdminInfo refreshes: pendingTransfer cleared, state = 'active'
```

### Change Admin Delay

```text
User enters new delay value
  → useAccessControlMutations.changeAdminDelay()
    → service.changeAdminDelay(address, newDelay, executionConfig, onStatusChange)
  → On success: invalidate admin info
  → AdminDelayInfo.pendingDelay populated with effectAt timestamp
```

### Rollback Admin Delay

```text
User clicks "Rollback" on pending delay change
  → useAccessControlMutations.rollbackAdminDelay()
    → service.rollbackAdminDelay(address, executionConfig, onStatusChange)
  → On success: invalidate admin info
  → AdminDelayInfo.pendingDelay cleared
```

## Validation Rules

| Field                    | Validation                                                                 | Source              |
| ------------------------ | -------------------------------------------------------------------------- | ------------------- |
| EVM address              | `adapter.isValidAddress(address)` — checks 0x prefix + 42 chars + checksum | Adapter             |
| Delay value              | Positive integer (seconds); min/max TBD by contract                        | Input validation    |
| Confirmation keyword     | Exact match of "RENOUNCE" (case-sensitive)                                 | TypeToConfirmDialog |
| Role ID for renounce     | Must match a role held by connected wallet                                 | Pre-filtered in UI  |
| Contract address for ops | Must be registered + capabilities checked                                  | Pre-condition       |

## State Transitions

### Ownership State

```text
active ──[transferOwnership]──► pending
pending ──[acceptOwnership]──► active (new owner)
pending ──[timeout/expired]──► expired  (Stellar only, EVM has no expiration)
active ──[renounceOwnership]──► renounced  ◄── NEW
```

### Admin State

```text
active ──[transferAdminRole]──► pending
pending ──[acceptAdminTransfer]──► active (new admin)
pending ──[cancelAdminTransfer]──► active (original admin)  ◄── NEW
pending ──[timeout/expired]──► expired
active ──[renounceOwnership on admin]──► renounced  ◄── (already defined)
```

### Admin Delay State

```text
stable ──[changeAdminDelay]──► pending (effectAt in future)
pending ──[time passes]──► stable (new delay active)
pending ──[rollbackAdminDelay]──► stable (original delay kept)  ◄── NEW
```
