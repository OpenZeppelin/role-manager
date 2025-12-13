# Quickstart: Role Grant and Revoke Actions

**Feature**: 014-role-grant-revoke  
**Date**: 2024-12-11

## Overview

This feature adds three dialogs for managing role assignments:

1. **ManageRolesDialog** - Checkbox-based grant/revoke from Authorized Accounts page
2. **AssignRoleDialog** - Grant role to new address from Roles page
3. **RevokeRoleDialog** - Revoke role with confirmation from Roles page

All dialogs use existing `useGrantRole` and `useRevokeRole` hooks for transaction execution.

## Integration Points

### 1. Authorized Accounts Page

**File**: `pages/AuthorizedAccounts.tsx`

```tsx
import { useState } from 'react';

import { ManageRolesDialog } from '../components/AuthorizedAccounts/ManageRolesDialog';

export function AuthorizedAccounts() {
  const [manageRolesAccount, setManageRolesAccount] = useState<string | null>(null);

  // Existing code...

  const handleAction = (accountId: string, action: AccountAction) => {
    if (action === 'edit-roles') {
      const account = paginatedAccounts.find((a) => a.id === accountId);
      if (account) {
        setManageRolesAccount(account.address);
      }
    }
    // ... other actions
  };

  return (
    <>
      {/* Existing content... */}

      <ManageRolesDialog
        open={!!manageRolesAccount}
        onOpenChange={(open) => !open && setManageRolesAccount(null)}
        accountAddress={manageRolesAccount ?? ''}
        onSuccess={() => refetch()}
      />
    </>
  );
}
```

### 2. Roles Page - Assign Role

**File**: `pages/Roles.tsx`

```tsx
import { useState } from 'react';

import { AssignRoleDialog } from '../components/Roles/AssignRoleDialog';

export function Roles() {
  const [assignRoleOpen, setAssignRoleOpen] = useState(false);

  // In RoleDetails callbacks:
  const handleAssign = useCallback(() => {
    setAssignRoleOpen(true);
  }, []);

  return (
    <>
      {/* Existing content... */}

      <RoleDetails
        // ... existing props
        onAssign={handleAssign}
      />

      {selectedRole && (
        <AssignRoleDialog
          open={assignRoleOpen}
          onOpenChange={setAssignRoleOpen}
          initialRoleId={selectedRole.roleId}
          initialRoleName={selectedRole.roleName}
          onSuccess={() => refetch()}
        />
      )}
    </>
  );
}
```

### 3. Roles Page - Revoke Role

**File**: `pages/Roles.tsx`

```tsx
import { useState } from 'react';

import { RevokeRoleDialog } from '../components/Roles/RevokeRoleDialog';

export function Roles() {
  const [revokeTarget, setRevokeTarget] = useState<{
    address: string;
    roleId: string;
    roleName: string;
  } | null>(null);

  // In RoleDetails callbacks:
  const handleRevoke = useCallback(
    (address: string) => {
      if (selectedRole) {
        setRevokeTarget({
          address,
          roleId: selectedRole.roleId,
          roleName: selectedRole.roleName,
        });
      }
    },
    [selectedRole]
  );

  return (
    <>
      {/* Existing content... */}

      <RoleDetails
        // ... existing props
        onRevoke={handleRevoke}
      />

      {revokeTarget && (
        <RevokeRoleDialog
          open={!!revokeTarget}
          onOpenChange={(open) => !open && setRevokeTarget(null)}
          accountAddress={revokeTarget.address}
          roleId={revokeTarget.roleId}
          roleName={revokeTarget.roleName}
          onSuccess={() => refetch()}
        />
      )}
    </>
  );
}
```

## Hook Usage

### useManageRolesDialog

```tsx
import { useManageRolesDialog } from '../hooks/useManageRolesDialog';

function ManageRolesDialogContent({ accountAddress, onClose }) {
  const {
    roleItems,
    pendingChange,
    step,
    errorMessage,
    toggleRole,
    submit,
    retry,
    canSubmit,
    submitLabel,
    showSelfRevokeWarning,
  } = useManageRolesDialog({
    accountAddress,
    onClose,
    onSuccess: () => {
      // Dialog auto-closes after success
    },
  });

  if (step === 'pending' || step === 'confirming') {
    return <DialogLoadingState title="Processing..." />;
  }

  if (step === 'success') {
    return <DialogSuccessState title="Success!" />;
  }

  if (step === 'error') {
    return <DialogErrorState message={errorMessage} onRetry={retry} />;
  }

  return (
    <form onSubmit={submit}>
      <RoleCheckboxList items={roleItems} onToggle={toggleRole} />
      {showSelfRevokeWarning && <SelfRevokeWarning />}
      <Button type="submit" disabled={!canSubmit}>
        {submitLabel}
      </Button>
    </form>
  );
}
```

## AddressField Usage (Assign Role Dialog)

The Assign Role dialog uses the existing `AddressField` component from `@openzeppelin/ui-builder-ui` for chain-agnostic address validation:

```tsx
import { useForm } from 'react-hook-form';

import { AddressField } from '@openzeppelin/ui-builder-ui';

import { useSelectedContract } from '../../hooks/useSelectedContract';

interface AssignRoleFormValues {
  address: string;
  roleId: string;
}

function AssignRoleFormContent({ onSubmit, availableRoles, initialRoleId }) {
  const { adapter } = useSelectedContract();

  const form = useForm<AssignRoleFormValues>({
    defaultValues: {
      address: '',
      roleId: initialRoleId,
    },
  });

  return (
    <form onSubmit={form.handleSubmit(onSubmit)}>
      {/* AddressField handles chain-specific validation via adapter.isValidAddress() */}
      <AddressField
        id="account-address"
        name="address"
        label="Account Address"
        placeholder="0x..."
        helperText="Enter the address to assign the role to"
        control={form.control}
        adapter={adapter}
        validation={{ required: true }}
      />

      {/* Role dropdown... */}
    </form>
  );
}
```

**Key Benefits**:

- Chain-agnostic: validation uses `adapter.isValidAddress()`
- React Hook Form integration built-in
- Consistent error handling and accessibility
- Reuses existing tested component (Constitution Principle II)

## Testing

### Hook Tests (TDD)

```tsx
// hooks/__tests__/useManageRolesDialog.test.tsx

describe('useManageRolesDialog', () => {
  it('initializes with correct role states', () => {
    // Given account has roles A, B
    // When dialog opens
    // Then roleItems should show A, B checked, others unchecked
  });

  it('enforces single-change constraint via auto-revert', () => {
    // Given no changes made
    // When user toggles role A (grant)
    // Then pendingChange = { type: 'grant', roleId: 'A' }
    // When user toggles role B (grant)
    // Then role A reverts to original
    // And pendingChange = { type: 'grant', roleId: 'B' }
  });

  it('detects self-revoke', () => {
    // Given connected wallet matches accountAddress
    // When pendingChange is a revoke
    // Then showSelfRevokeWarning = true
  });

  it('executes grant transaction', () => {
    // Given pendingChange = { type: 'grant', roleId: 'X' }
    // When submit() called
    // Then useGrantRole.mutate() called with correct args
  });
});
```

## File Structure

```
apps/role-manager/src/
├── components/
│   ├── AuthorizedAccounts/
│   │   ├── ManageRolesDialog.tsx      # NEW
│   │   ├── RoleCheckboxList.tsx       # NEW (extracted)
│   │   └── SelfRevokeWarning.tsx      # NEW (extracted)
│   └── Roles/
│       ├── AssignRoleDialog.tsx       # NEW
│       └── RevokeRoleDialog.tsx       # NEW
├── hooks/
│   ├── useManageRolesDialog.ts        # NEW
│   ├── __tests__/
│   │   └── useManageRolesDialog.test.tsx  # NEW
│   └── index.ts                       # UPDATE: exports
├── types/
│   └── role-dialogs.ts                # NEW
└── pages/
    ├── AuthorizedAccounts.tsx         # UPDATE
    └── Roles.tsx                      # UPDATE
```

## Success Verification

After implementation, verify:

1. ✅ ManageRolesDialog opens from "Edit Roles" action in Authorized Accounts
2. ✅ Checkboxes reflect current role assignments
3. ✅ Only one change allowed at a time (auto-revert)
4. ✅ Self-revoke shows warning
5. ✅ AssignRoleDialog opens from "+ Assign" button on Roles page
6. ✅ RevokeRoleDialog opens from "Revoke" button on role member rows
7. ✅ All dialogs show transaction status during execution
8. ✅ All dialogs auto-close after 1.5s success display
9. ✅ Data refreshes after successful transactions
