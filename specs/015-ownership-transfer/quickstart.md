# Quickstart: Contract Ownership Transfer

**Feature**: 015-ownership-transfer  
**Branch**: `015-ownership-transfer`  
**Date**: 2024-12-14

## Overview

This quickstart provides a step-by-step implementation guide for the ownership transfer feature. Follow phases in order; each phase builds on the previous.

---

## Phase 1: Hooks (TDD)

### 1.1 Create useAcceptOwnership Hook

**File**: `apps/role-manager/src/hooks/useAccessControlMutations.ts`

Add the `useAcceptOwnership` hook following the existing `useTransferOwnership` pattern:

```typescript
// Add to existing file after useTransferOwnership

export interface AcceptOwnershipArgs {
  executionConfig: ExecutionConfig;
  runtimeApiKey?: string;
}

export function useAcceptOwnership(
  adapter: ContractAdapter | null,
  contractAddress: string,
  options?: MutationHookOptions
): UseAccessControlMutationReturn<AcceptOwnershipArgs> {
  // Implementation follows useTransferOwnership pattern
  // Key difference: calls service.acceptOwnership() with no expirationLedger
}
```

**TDD**: Write tests in `hooks/__tests__/useAccessControlMutations.test.tsx` first.

### 1.2 Create useCurrentLedger Hook

**File**: `apps/role-manager/src/hooks/useCurrentLedger.ts` (NEW)

```typescript
export function useCurrentLedger(
  adapter: ContractAdapter | null,
  options?: UseCurrentLedgerOptions
): UseCurrentLedgerReturn {
  // Uses useQuery with refetchInterval for polling
  // Calls adapter.getCurrentBlock() directly (chain-agnostic)
  return useQuery({
    queryKey: ['currentBlock', adapter?.networkConfig.id],
    queryFn: () => adapter!.getCurrentBlock(),
    enabled: !!adapter && (options?.enabled ?? true),
    refetchInterval: options?.pollInterval ?? 5000,
  });
}
```

**TDD**: Write tests in `hooks/__tests__/useCurrentLedger.test.tsx` first.

### 1.3 Create useOwnershipTransferDialog Hook

**File**: `apps/role-manager/src/hooks/useOwnershipTransferDialog.ts` (NEW)

Follow `useAssignRoleDialog` pattern:

```typescript
export function useOwnershipTransferDialog(
  options: UseOwnershipTransferDialogOptions
): UseOwnershipTransferDialogReturn {
  // Uses useTransferOwnership mutation
  // Uses useCurrentLedger for validation
  // Manages dialog step state
}
```

**TDD**: Write tests in `hooks/__tests__/useOwnershipTransferDialog.test.tsx` first.

### 1.4 Create useAcceptOwnershipDialog Hook

**File**: `apps/role-manager/src/hooks/useAcceptOwnershipDialog.ts` (NEW)

```typescript
export function useAcceptOwnershipDialog(
  options: UseAcceptOwnershipDialogOptions
): UseAcceptOwnershipDialogReturn {
  // Uses useAcceptOwnership mutation
  // Manages dialog step state
}
```

**TDD**: Write tests in `hooks/__tests__/useAcceptOwnershipDialog.test.tsx` first.

---

## Phase 2: Components

### 2.1 Create TransferOwnershipDialog

**File**: `apps/role-manager/src/components/Ownership/TransferOwnershipDialog.tsx` (NEW)

Follow `AssignRoleDialog` structure:

```tsx
export function TransferOwnershipDialog({
  open,
  onOpenChange,
  currentOwner,
  hasTwoStepOwnable,
  onSuccess,
}: TransferOwnershipDialogProps) {
  const { step, submit, retry, reset, ... } = useOwnershipTransferDialog({...});

  // Render based on step (form, pending, success, error, cancelled)
}
```

### 2.2 Create AcceptOwnershipDialog

**File**: `apps/role-manager/src/components/Ownership/AcceptOwnershipDialog.tsx` (NEW)

```tsx
export function AcceptOwnershipDialog({
  open,
  onOpenChange,
  onSuccess,
}: AcceptOwnershipDialogProps) {
  const { step, submit, retry, reset, ... } = useAcceptOwnershipDialog({...});

  // Simple confirmation dialog - no form inputs
}
```

### 2.3 Create Barrel Export

**File**: `apps/role-manager/src/components/Ownership/index.ts` (NEW)

```typescript
export { TransferOwnershipDialog } from './TransferOwnershipDialog';
export { AcceptOwnershipDialog } from './AcceptOwnershipDialog';
```

---

## Phase 3: Integration

### 3.1 Update Roles Page

**File**: `apps/role-manager/src/pages/Roles.tsx`

Ensure Owner role appears at top and wire up dialogs:

```tsx
// Add imports
import { TransferOwnershipDialog, AcceptOwnershipDialog } from '../components/Ownership';

// Add state for dialogs
const [isTransferDialogOpen, setIsTransferDialogOpen] = useState(false);
const [isAcceptDialogOpen, setIsAcceptDialogOpen] = useState(false);

// Ensure Owner role is sorted to top of role list
const sortedRoles = useMemo(() => {
  return [...roles].sort((a, b) => {
    if (a.name === 'Owner') return -1;
    if (b.name === 'Owner') return 1;
    return 0;
  });
}, [roles]);

// Add dialogs
<TransferOwnershipDialog
  open={isTransferDialogOpen}
  onOpenChange={setIsTransferDialogOpen}
  currentOwner={ownership?.owner ?? ''}
  hasTwoStepOwnable={capabilities?.hasTwoStepOwnable ?? false}
/>

<AcceptOwnershipDialog
  open={isAcceptDialogOpen}
  onOpenChange={setIsAcceptDialogOpen}
/>
```

### 3.2 Update Owner Account Row

**File**: `apps/role-manager/src/components/Roles/OwnerAccountRow.tsx` (or existing account row component)

Add "Transfer Ownership" button to owner's account row:

```tsx
// In the account row for Owner role
{
  isOwnerRole && isConnectedAsOwner && (
    <Button variant="outline" size="sm" onClick={() => onTransferClick?.()}>
      <Crown className="h-4 w-4 mr-2" />
      Transfer Ownership
    </Button>
  );
}
```

---

## Phase 4: Update Hook Exports

### 4.1 Update hooks/index.ts

Add exports for new hooks:

```typescript
export { useCurrentLedger } from './useCurrentLedger';
export { useOwnershipTransferDialog } from './useOwnershipTransferDialog';
export { useAcceptOwnershipDialog } from './useAcceptOwnershipDialog';
// useAcceptOwnership is exported from useAccessControlMutations
```

---

## Testing Checklist

### Unit Tests (TDD - write first)

- [ ] `useAcceptOwnership` - success, error, status tracking, query invalidation
- [ ] `useCurrentLedger` - polling, error handling, manual refetch
- [ ] `useOwnershipTransferDialog` - step transitions, form validation
- [ ] `useAcceptOwnershipDialog` - step transitions, error handling

### Manual Testing

- [ ] Single-step transfer (no expiration input)
- [ ] Two-step transfer initiation with valid expiration
- [ ] Two-step transfer acceptance
- [ ] Expiration validation (past, too soon)
- [ ] Self-transfer prevention
- [ ] Wallet disconnection handling
- [ ] Transaction cancellation
- [ ] Network error retry

---

## Key Files Summary

| File                                               | Status | Purpose                    |
| -------------------------------------------------- | ------ | -------------------------- |
| `hooks/useAccessControlMutations.ts`               | MODIFY | Add useAcceptOwnership     |
| `hooks/useCurrentLedger.ts`                        | NEW    | Ledger polling hook        |
| `hooks/useOwnershipTransferDialog.ts`              | NEW    | Transfer dialog state      |
| `hooks/useAcceptOwnershipDialog.ts`                | NEW    | Accept dialog state        |
| `components/Ownership/TransferOwnershipDialog.tsx` | NEW    | Transfer dialog UI         |
| `components/Ownership/AcceptOwnershipDialog.tsx`   | NEW    | Accept dialog UI           |
| `components/Roles/OwnerAccountRow.tsx`             | MODIFY | Add transfer button        |
| `pages/Roles.tsx`                                  | MODIFY | Owner at top, wire dialogs |

---

## Dependencies

Before starting, ensure:

1. UI Builder packages are at version 0.16.0+
2. `AccessControlCapabilities.hasTwoStepOwnable` is available
3. `OwnershipInfo.state` and `pendingTransfer` fields are populated
4. Stellar adapter has `acceptOwnership()` method

Run `pnpm install` to ensure dependencies are up to date.

---

## Next Step

Run `/speckit.tasks` to generate the detailed task breakdown with time estimates.
