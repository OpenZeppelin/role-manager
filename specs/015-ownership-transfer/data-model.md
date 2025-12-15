# Data Model: Contract Ownership Transfer

**Feature**: 015-ownership-transfer  
**Date**: 2024-12-14

## Overview

This document defines the entities, types, and data structures for the ownership transfer feature. Most types are reused from `@openzeppelin/ui-builder-types`; this document focuses on new types specific to Role Manager.

---

## Existing Types (from UI Builder)

These types are already defined and should be imported from `@openzeppelin/ui-builder-types`:

### AccessControlCapabilities

```typescript
interface AccessControlCapabilities {
  hasOwnable: boolean;
  hasTwoStepOwnable: boolean; // Key flag for two-step transfer UI
  hasAccessControl: boolean;
  hasEnumerableRoles: boolean;
  supportsHistory: boolean;
  verifiedAgainstOZInterfaces: boolean;
  notes?: string[];
}
```

### OwnershipState

```typescript
type OwnershipState = 'owned' | 'pending' | 'expired' | 'renounced';
```

### PendingOwnershipTransfer

```typescript
interface PendingOwnershipTransfer {
  pendingOwner: string;
  expirationBlock: number;
  initiatedAt?: string; // ISO8601 from indexer
  initiatedTxId?: string;
  initiatedBlock?: number;
}
```

### OwnershipInfo

```typescript
interface OwnershipInfo {
  owner: string | null;
  state?: OwnershipState;
  pendingTransfer?: PendingOwnershipTransfer;
}
```

---

## New Types (Role Manager)

### TransferOwnershipFormData

Form data for the Transfer Ownership dialog.

```typescript
/**
 * Form data for initiating an ownership transfer
 */
interface TransferOwnershipFormData {
  /** The new owner's address */
  newOwnerAddress: string;
  /** The ledger/block number at which the transfer expires (two-step only) */
  expirationLedger: string; // String for form input, parsed to number on submit
}
```

**Validation Rules:**

- `newOwnerAddress`: Required, must pass `adapter.isValidAddress()`, must not equal current owner
- `expirationLedger`: Required for two-step, must be > currentLedger

### AcceptOwnershipFormData

Form data for the Accept Ownership dialog.

```typescript
/**
 * Form data for accepting a pending ownership transfer
 * Note: No user inputs required - just confirmation
 */
interface AcceptOwnershipFormData {
  // Empty - acceptance has no parameters
}
```

### DialogStep

Shared dialog step type (reused from existing patterns).

```typescript
/**
 * Dialog transaction step states
 */
type DialogStep =
  | 'form' // Initial form state
  | 'pending' // Transaction submitted, awaiting wallet
  | 'confirming' // Wallet approved, awaiting confirmation
  | 'success' // Transaction confirmed
  | 'error' // Transaction failed
  | 'cancelled'; // User cancelled in wallet
```

### UseOwnershipTransferDialogOptions

```typescript
/**
 * Options for useOwnershipTransferDialog hook
 */
interface UseOwnershipTransferDialogOptions {
  /** Current owner address (for self-transfer validation) */
  currentOwner: string;
  /** Whether contract supports two-step transfer */
  hasTwoStepOwnable: boolean;
  /** Callback when dialog should close */
  onClose: () => void;
  /** Callback on successful transfer */
  onSuccess?: () => void;
}
```

### UseOwnershipTransferDialogReturn

```typescript
/**
 * Return type for useOwnershipTransferDialog hook
 */
interface UseOwnershipTransferDialogReturn {
  /** Current dialog step */
  step: DialogStep;
  /** Error message if step is 'error' */
  errorMessage: string | null;
  /** Current transaction status */
  txStatus: TxStatus;
  /** Whether wallet is connected */
  isWalletConnected: boolean;
  /** Whether two-step transfer is required */
  requiresExpiration: boolean;
  /** Submit the transfer */
  submit: (data: TransferOwnershipFormData) => Promise<void>;
  /** Retry after error */
  retry: () => void;
  /** Reset to initial state */
  reset: () => void;
}
```

### UseAcceptOwnershipDialogOptions

```typescript
/**
 * Options for useAcceptOwnershipDialog hook
 */
interface UseAcceptOwnershipDialogOptions {
  /** Callback when dialog should close */
  onClose: () => void;
  /** Callback on successful acceptance */
  onSuccess?: () => void;
}
```

### UseAcceptOwnershipDialogReturn

```typescript
/**
 * Return type for useAcceptOwnershipDialog hook
 */
interface UseAcceptOwnershipDialogReturn {
  /** Current dialog step */
  step: DialogStep;
  /** Error message if step is 'error' */
  errorMessage: string | null;
  /** Current transaction status */
  txStatus: TxStatus;
  /** Whether wallet is connected */
  isWalletConnected: boolean;
  /** Submit the acceptance */
  submit: () => Promise<void>;
  /** Retry after error */
  retry: () => void;
  /** Reset to initial state */
  reset: () => void;
}
```

### AcceptOwnershipArgs

Arguments for the `useAcceptOwnership` mutation hook.

```typescript
/**
 * Arguments for useAcceptOwnership mutation
 */
interface AcceptOwnershipArgs {
  /** Execution configuration (EOA, relayer, etc.) */
  executionConfig: ExecutionConfig;
  /** Optional runtime API key for relayer */
  runtimeApiKey?: string;
}
```

### UseCurrentLedgerReturn

Return type for the current ledger polling hook.

```typescript
/**
 * Return type for useCurrentLedger hook
 */
interface UseCurrentLedgerReturn {
  /** Current ledger/block number, null if not yet fetched */
  currentLedger: number | null;
  /** Whether the initial fetch is loading */
  isLoading: boolean;
  /** Error from fetching, if any */
  error: Error | null;
  /** Manually trigger a refresh */
  refetch: () => void;
}
```

### TransferOwnershipButtonProps

Props for the transfer ownership button on Owner account row.

```typescript
/**
 * Props for Transfer Ownership button on Roles page
 */
interface TransferOwnershipButtonProps {
  /** Whether contract supports two-step transfer */
  hasTwoStepOwnable: boolean;
  /** Whether connected wallet is the current owner */
  isConnectedAsOwner: boolean;
  /** Callback when Transfer Ownership is clicked */
  onTransferClick: () => void;
}

/**
 * Props for Accept Ownership action (visible to pending owner)
 */
interface AcceptOwnershipButtonProps {
  /** Whether connected wallet is the pending owner */
  isConnectedAsPendingOwner: boolean;
  /** Callback when Accept Ownership is clicked */
  onAcceptClick: () => void;
}
```

---

## State Transitions

### Ownership State Machine

```
                    ┌─────────────────────────────────────┐
                    │                                     │
                    ▼                                     │
┌──────────┐   transferOwnership()   ┌─────────┐   acceptOwnership()   ┌──────────┐
│  owned   │ ─────────────────────▶  │ pending │ ─────────────────────▶│  owned   │
│ (A = owner)                        │         │                       │ (B = owner)
└──────────┘                         └────┬────┘                       └──────────┘
                                          │
                                          │ expiration passes
                                          │ OR new transfer initiated
                                          ▼
                                     ┌─────────┐
                                     │ expired │ (back to 'owned' state)
                                     └─────────┘

┌──────────┐   renounceOwnership()   ┌───────────┐
│  owned   │ ─────────────────────▶  │ renounced │
└──────────┘                         └───────────┘
```

### Dialog Step Flow

```
┌──────┐    submit()     ┌─────────┐   wallet signs   ┌────────────┐   confirmed   ┌─────────┐
│ form │ ──────────────▶ │ pending │ ───────────────▶ │ confirming │ ────────────▶ │ success │
└──────┘                 └────┬────┘                  └─────┬──────┘               └────┬────┘
    ▲                         │                             │                          │
    │                         │ user rejects               │ tx fails                 │ auto-close
    │                         ▼                             ▼                          │
    │                   ┌───────────┐                 ┌─────────┐                      │
    │◀──── retry() ─────│ cancelled │                │  error  │◀─────────────────────┘
    │                   └───────────┘                └────┬────┘
    │                                                     │
    └────────────────────── retry() ──────────────────────┘
```

---

## Query Keys

Cache keys for React Query, consistent with existing patterns:

```typescript
// Existing (from useAccessControlMutations.ts)
const ownershipQueryKey = (address: string) => ['contractOwnership', address] as const;
const rolesQueryKey = (address: string) => ['contractRoles', address] as const;

// New for block/ledger polling (uses adapter.getCurrentBlock())
const currentBlockQueryKey = (networkId: string) => ['currentBlock', networkId] as const;
```

---

## Configuration Constants

```typescript
/** Polling interval for current block/ledger (milliseconds) */
const BLOCK_POLL_INTERVAL_MS = 5000;
```

---

## Summary

| Entity                         | Source           | Purpose                         |
| ------------------------------ | ---------------- | ------------------------------- |
| `OwnershipInfo`                | ui-builder-types | Ownership data from adapter     |
| `PendingOwnershipTransfer`     | ui-builder-types | Pending transfer details        |
| `TransferOwnershipFormData`    | NEW              | Form inputs for transfer dialog |
| `AcceptOwnershipArgs`          | NEW              | Mutation arguments for accept   |
| `UseCurrentLedgerReturn`       | NEW              | Ledger polling hook return      |
| `TransferOwnershipButtonProps` | NEW              | Roles page button props         |
