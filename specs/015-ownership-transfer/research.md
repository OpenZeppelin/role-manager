# Research: Contract Ownership Transfer

**Feature**: 015-ownership-transfer  
**Date**: 2024-12-14

## Overview

This document consolidates research findings for implementing the ownership transfer feature. Each section addresses a specific technical question or unknown from the feature specification.

---

## 1. acceptOwnership API Availability

### Question

Is `acceptOwnership()` available in the generic `AccessControlService` interface, or only in adapter-specific implementations?

### Finding

**`acceptOwnership()` is now available in the generic `AccessControlService` interface** (added in ui-builder-types 0.16.0+).

```typescript
// From @openzeppelin/ui-builder-types/src/adapters/access-control.ts
export interface AccessControlService {
  // ... other methods ...

  /**
   * Accept a pending ownership transfer (two-step Ownable)
   * @param contractAddress The contract address
   * @param executionConfig Execution configuration
   * @param onStatusChange Optional callback for status updates
   * @param runtimeApiKey Optional session-only API key
   * @returns Promise resolving to operation result
   */
  acceptOwnership(
    contractAddress: string,
    executionConfig: ExecutionConfig,
    onStatusChange?: (status: TxStatus, details: TransactionStatusUpdate) => void,
    runtimeApiKey?: string
  ): Promise<OperationResult>;
}
```

### Decision

Create `useAcceptOwnership` hook that:

1. Uses `useAccessControlService` to get the service instance
2. Calls `service.acceptOwnership()` directly (no casting needed)
3. Only enables the action when `hasTwoStepOwnable` is true
4. Follows the same pattern as `useTransferOwnership` hook

### Notes

- The method is part of the generic interface, ensuring chain-agnostic implementation
- Adapters that don't support two-step ownership can throw an appropriate error if called

---

## 2. Current Ledger Retrieval

### Question

How do we get the current ledger/block number for display and validation?

### Finding

**The `getCurrentBlock()` method is now available in the `ContractAdapter` interface** (added in ui-builder packages 0.16.0+).

```typescript
// From ContractAdapter interface
interface ContractAdapter {
  // ... other methods ...

  /**
   * Get the current block/ledger number
   * @returns Promise resolving to current block number
   */
  getCurrentBlock(): Promise<number>;
}
```

This provides a chain-agnostic way to retrieve the current block/ledger without ecosystem-specific code.

### Decision

Create `useCurrentLedger` hook that:

1. Only activates when contract has `hasTwoStepOwnable` capability
2. Uses `adapter.getCurrentBlock()` directly
3. Polls every 5-10 seconds using React Query's `refetchInterval`
4. Returns `{ currentLedger: number | null, isLoading: boolean, error: Error | null, refetch: () => void }`

### Implementation Approach

```typescript
// Chain-agnostic implementation using adapter method
export function useCurrentLedger(
  adapter: ContractAdapter | null,
  options?: { pollInterval?: number; enabled?: boolean }
): UseCurrentLedgerReturn {
  return useQuery({
    queryKey: ['currentBlock', adapter?.networkConfig.id],
    queryFn: () => adapter!.getCurrentBlock(),
    enabled: !!adapter && (options?.enabled ?? true),
    refetchInterval: options?.pollInterval ?? 5000,
  });
}
```

---

## 3. Dialog Patterns

### Question

What existing patterns should we follow for the transfer dialogs?

### Finding

The 014-role-grant-revoke feature established comprehensive dialog patterns:

**From `AssignRoleDialog.tsx`:**

```typescript
// Dialog state management via hook
const { step, errorMessage, txStatus, isWalletConnected, submit, retry, reset } =
  useAssignRoleDialog({ initialRoleId, onClose, onSuccess });

// Step-based rendering
switch (step) {
  case 'pending':
  case 'confirming':
    return <DialogPendingState ... />;
  case 'success':
    return <DialogSuccessState ... />;
  case 'error':
    return <DialogErrorState ... />;
  case 'cancelled':
    return <DialogCancelledState ... />;
  case 'form':
  default:
    return <FormContent ... />;
}
```

**Key patterns to reuse:**

1. `useMultiMutationExecution` for transaction execution flow
2. `DialogTransactionStates` components for consistent status display
3. `ConfirmCloseDialog` for close-during-transaction handling
4. `WalletDisconnectedAlert` for wallet connection issues
5. Form validation via `react-hook-form` with adapter-based address validation

### Decision

- Follow identical structure for `TransferOwnershipDialog` and `AcceptOwnershipDialog`
- Create corresponding `useOwnershipTransferDialog` and `useAcceptOwnershipDialog` hooks
- Reuse all `DialogTransactionStates` components

---

## 4. UI Integration Points

### Question

Where should ownership transfer actions be placed in the UI?

### Finding (from mockup review)

Based on the provided mockup designs:

**Roles Page (Primary action location):**

- Owner appears at the **top** of the role list (before other roles like Operator, Minter, etc.)
- When Owner role is selected, the right panel shows owner details with assigned accounts
- "Transfer Ownership" button appears on the **account row item** (next to the connected user's address)
- Button is only visible when the connected wallet is the current owner

**Dashboard Page (Pending status display):**

- After a two-step ownership transfer is initiated, it appears in the **"Pending Role Changes"** table
- Shows "Transfer Ownership" with timestamp and status indicator (e.g., "2/2" for two-step process)

### Decision

**Roles Page Integration:**

1. Ensure Owner role displays at the top of the role list
2. Add "Transfer Ownership" button to the account row in the Owner details panel
3. Button only visible when connected wallet matches the current owner address
4. Opens `TransferOwnershipDialog` on click

**Dashboard Integration:**

1. Pending ownership transfers appear in existing "Pending Role Changes" section
2. For two-step transfers, display shows progress indicator (step count)
3. Clicking the pending item could navigate to Roles page or show Accept dialog

**Accept Ownership:**

- "Accept Ownership" action visible on Roles page when connected wallet is the pending owner
- Alternatively accessible from Dashboard's pending changes section

---

## 5. Ownership State Display

### Question

How should different ownership states be displayed?

### Finding

From `OwnershipInfo` type and `OwnershipState` enum:

| State       | Display                                                                                                    |
| ----------- | ---------------------------------------------------------------------------------------------------------- |
| `owned`     | Owner address, "Transfer Ownership" button (if connected = owner)                                          |
| `pending`   | Owner address, pending owner address, expiration, "Accept Ownership" button (if connected = pending owner) |
| `expired`   | Owner address, "Transfer Expired" badge, pending details crossed out                                       |
| `renounced` | "No Owner (Renounced)" message, no actions available                                                       |

### Decision

- Use color-coded badges for state indication
- Green: Active owner (owned)
- Yellow/Amber: Pending transfer
- Red: Expired transfer
- Gray: Renounced

---

## Summary

| Research Item       | Decision                                     | Impact                     |
| ------------------- | -------------------------------------------- | -------------------------- |
| acceptOwnership API | Use generic interface directly (no casting)  | Low - standard hook        |
| Current ledger      | Use `adapter.getCurrentBlock()` with polling | Low - standard hook        |
| Expiration valid.   | Validate expiration > current block          | Low - simple validation    |
| Dialog patterns     | Follow 014 patterns exactly                  | Low - established patterns |
| Transfer action     | Roles page - button on owner's account row   | Low - existing patterns    |
| Pending display     | Dashboard - "Pending Role Changes" table     | Low - existing component   |
| State display       | Color-coded badges per state                 | Low - UI styling           |

All research questions resolved. Proceeding to Phase 1 design.
