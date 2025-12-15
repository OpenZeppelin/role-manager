# Quickstart: Two-Step Admin Role Assignment

**Feature**: 016-two-step-admin-assignment  
**Date**: 2024-12-15

## Overview

This feature adds admin role transfer functionality that mirrors the existing ownership transfer UX. The key principle is **code reuse** - follow existing patterns from spec 015.

## Key Files to Reference

| Pattern          | Reference File                                     | What to Copy                                    |
| ---------------- | -------------------------------------------------- | ----------------------------------------------- |
| Data fetching    | `hooks/useContractData.ts`                         | `useContractOwnership` → `useContractAdminInfo` |
| Mutations        | `hooks/useAccessControlMutations.ts`               | `useTransferOwnership` / `useAcceptOwnership`   |
| Dialog hook      | `hooks/useOwnershipTransferDialog.ts`              | State machine, validation, retry logic          |
| Dialog component | `components/Ownership/TransferOwnershipDialog.tsx` | Form, states, accessibility                     |
| Role synthesis   | `hooks/useRolesPageData.ts`                        | `ownerRole` useMemo pattern                     |
| Pending display  | `components/Roles/PendingTransferInfo.tsx`         | Already generic - just use it                   |

## Implementation Order

### Step 1: Constants & Types

```typescript
// constants/index.ts
export const ADMIN_ROLE_ID = 'ADMIN_ROLE';
export const ADMIN_ROLE_NAME = 'Admin';
export const ADMIN_ROLE_DESCRIPTION = 'The Admin role has elevated privileges...';

// types/roles.ts - ADD to RoleWithDescription
isAdminRole: boolean;
```

### Step 2: Data Hooks

```typescript
// hooks/useContractData.ts - ADD query key
const adminInfoQueryKey = (address: string) => ['contractAdminInfo', address] as const;

// ADD hook (copy useContractOwnership pattern)
export function useContractAdminInfo(
  adapter: ContractAdapter | null,
  contractAddress: string,
  isContractRegistered: boolean = true
): UseContractAdminInfoReturn {
  const { service, isReady } = useAccessControlService(adapter);

  const { data, isLoading, isFetching, error, refetch } = useQuery({
    queryKey: adminInfoQueryKey(contractAddress),
    queryFn: async () => {
      if (!service?.getAdminInfo) {
        throw new DataError('Admin info not supported', ErrorCategory.SERVICE_UNAVAILABLE);
      }
      return service.getAdminInfo(contractAddress);
    },
    enabled: isReady && !!contractAddress && isContractRegistered,
    staleTime: 1 * 60 * 1000,
    refetchOnWindowFocus: true, // FR-026a
  });

  // ... same error handling pattern as useContractOwnership
}
```

### Step 3: Mutation Hooks

```typescript
// hooks/useAccessControlMutations.ts - ADD hooks

// 1. Add query key for invalidation
const adminInfoQueryKey = (address: string) => ['contractAdminInfo', address] as const;

// 2. Copy useTransferOwnership → useTransferAdminRole
export function useTransferAdminRole(
  adapter: ContractAdapter | null,
  contractAddress: string,
  options?: MutationHookOptions
): UseAccessControlMutationReturn<TransferAdminRoleArgs> {
  // Same structure, call service.transferAdminRole() instead
  // Invalidate adminInfoQueryKey on success
}

// 3. Copy useAcceptOwnership → useAcceptAdminTransfer
export function useAcceptAdminTransfer(
  adapter: ContractAdapter | null,
  contractAddress: string,
  options?: MutationHookOptions
): UseAccessControlMutationReturn<AcceptAdminTransferArgs> {
  // Same structure, call service.acceptAdminTransfer() instead
  // Invalidate adminInfoQueryKey on success
}
```

### Step 4: Role Synthesis

```typescript
// hooks/useRolesPageData.ts - MODIFY

// 1. Import new hooks
import { useContractAdminInfo } from './useContractData';

// 2. Fetch admin info (after ownership fetch)
const {
  adminInfo,
  isLoading: isAdminLoading,
  isFetching: isAdminFetching,
  refetch: refetchAdminInfo,
} = useContractAdminInfo(adapter, contractAddress, isContractRegistered);

// 3. Synthesize admin role (after ownerRole)
const adminRole = useMemo((): RoleWithDescription | null => {
  // No admin role if capability not present or adminInfo fetch failed
  if (!capabilities?.hasTwoStepAdmin || !adminInfo) {
    return null;
  }
  const customDescription = customDescriptions[ADMIN_ROLE_ID];
  // Handle renounced state (admin is null but AdminInfo exists)
  const isRenounced = adminInfo.admin === null && adminInfo.state === 'renounced';
  return {
    roleId: ADMIN_ROLE_ID,
    roleName: ADMIN_ROLE_NAME,
    description: customDescription ?? ADMIN_ROLE_DESCRIPTION,
    isCustomDescription: !!customDescription,
    members: isRenounced ? [] : [adminInfo.admin!],
    isOwnerRole: false,
    isAdminRole: true,
  };
}, [capabilities?.hasTwoStepAdmin, adminInfo, customDescriptions]);

// 4. Combine roles (Owner, Admin, then enumerated)
const roles = useMemo(() => {
  const result: RoleWithDescription[] = [];
  if (ownerRole) result.push(ownerRole);
  if (adminRole) result.push(adminRole);
  result.push(...transformedRoles);
  return result;
}, [ownerRole, adminRole, transformedRoles]);

// 5. Add to return: pendingAdminTransfer, adminState, refetchAdminInfo
```

### Step 5: Dialog Hook

```typescript
// hooks/useAdminTransferDialog.ts - CREATE (copy useOwnershipTransferDialog)

// Key differences:
// - Uses useTransferAdminRole instead of useTransferOwnership
// - currentAdmin instead of currentOwner
// - Validation message: "Cannot transfer to yourself"
// - Auto-close calls onSuccess with admin context
```

### Step 6: Dialog Component

```typescript
// components/Admin/TransferAdminDialog.tsx - CREATE (copy TransferOwnershipDialog)

// Key differences:
// - Uses useAdminTransferDialog
// - Title: "Initiate Admin Transfer"
// - Description references admin role
// - Success message: "Admin Transfer Initiated!"
// - Props: currentAdmin, hasPendingAdminTransfer
```

### Step 7: UI Updates

```typescript
// components/Roles/RoleCard.tsx - ADD admin icon
import { Shield } from 'lucide-react';

// In render:
{role.isAdminRole && <Shield className="h-3 w-3 text-purple-600" aria-label="Admin role" />}

// components/Roles/RoleDetails.tsx - ADD admin pending display
{role.isAdminRole && pendingAdminTransfer && (adminState === 'pending' || adminState === 'expired') && (
  <PendingTransferInfo
    pendingRecipient={pendingAdminTransfer.pendingAdmin}
    expirationBlock={pendingAdminTransfer.expirationBlock}
    isExpired={adminState === 'expired'}
    transferLabel="Admin Role"
    recipientLabel="Admin"
    canAccept={canAcceptAdmin}
    onAccept={onAcceptAdminTransfer}
  />
)}

// components/Roles/AccountRow.tsx - ADD transfer admin button
{role.isAdminRole && isCurrentUser && onTransferAdmin && (
  <TransferRoleButton roleType="admin" onClick={onTransferAdmin} />
)}
```

### Step 8: Wire Up in Pages

```typescript
// pages/Roles.tsx - WIRE UP handlers

// 1. Get admin data from useRolesPageData
const {
  adminInfo,
  pendingAdminTransfer,
  adminState,
  refetchAdminInfo,
} = useRolesPageData();

// 2. Add dialog state
const [transferAdminDialogOpen, setTransferAdminDialogOpen] = useState(false);

// 3. Compute canAcceptAdmin
const canAcceptAdmin = useMemo(() => {
  return connectedAddress &&
         pendingAdminTransfer?.pendingAdmin?.toLowerCase() === connectedAddress.toLowerCase();
}, [connectedAddress, pendingAdminTransfer]);

// 4. Pass to RoleDetails
<RoleDetails
  // ... existing props
  pendingAdminTransfer={pendingAdminTransfer}
  adminState={adminState}
  canAcceptAdmin={canAcceptAdmin}
  onTransferAdmin={() => setTransferAdminDialogOpen(true)}
  onAcceptAdminTransfer={handleAcceptAdminTransfer}
/>

// 5. Render dialog
<TransferAdminDialog
  open={transferAdminDialogOpen}
  onOpenChange={setTransferAdminDialogOpen}
  currentAdmin={adminInfo?.admin ?? ''}
  hasPendingAdminTransfer={adminState === 'pending'}
  onSuccess={() => refetchAdminInfo()}
/>
```

## Testing Checklist

- [ ] `useContractAdminInfo` returns correct state for active/pending/expired/renounced
- [ ] `useTransferAdminRole` mutation executes and invalidates cache
- [ ] `useAcceptAdminTransfer` mutation executes and invalidates cache
- [ ] Admin role appears in roles list after Owner
- [ ] Admin role has Shield icon
- [ ] Pending admin transfer shows in RoleDetails
- [ ] Pending admin transfer shows in Dashboard
- [ ] Transfer Admin button only visible to current admin
- [ ] Accept Admin button only visible to pending admin
- [ ] Dialog validates address and expiration
- [ ] Dialog shows replace warning when pending transfer exists
- [ ] Window focus triggers admin info refresh

## Common Gotchas

1. **Don't forget `isAdminRole: false`** on all enumerated roles in `useRolesPageData`
2. **Query key must match** between `useContractAdminInfo` and mutation invalidation
3. **Check for `service.getAdminInfo`** existence before calling (optional method)
4. **Admin icon color**: Use `text-purple-600` to distinguish from Owner's blue
5. **Self-transfer validation**: Compare addresses case-insensitively
