# Research: Two-Step Admin Role Assignment

**Feature**: 016-two-step-admin-assignment  
**Date**: 2024-12-15

## Pattern Analysis: Ownership Transfer Implementation

This feature mirrors the ownership transfer pattern from spec 015. Key patterns identified:

### 1. Mutation Hook Pattern

**Decision**: Follow `useTransferOwnership` / `useAcceptOwnership` pattern exactly

**Source**: `apps/role-manager/src/hooks/useAccessControlMutations.ts`

```typescript
// Pattern for useTransferAdminRole (lines 439-521)
export function useTransferAdminRole(
  adapter: ContractAdapter | null,
  contractAddress: string,
  options?: MutationHookOptions
): UseAccessControlMutationReturn<TransferAdminRoleArgs> {
  // Same structure as useTransferOwnership:
  // - useAccessControlService(adapter)
  // - useState for status tracking
  // - useMutation with service.transferAdminRole()
  // - Query invalidation for adminInfo
  // - Error classification (network, user rejection)
}
```

**Rationale**: Proven pattern with error handling, status tracking, and query invalidation  
**Alternatives Rejected**: Generic factory hook (over-engineering for 2 similar cases)

### 2. Data Fetching Pattern

**Decision**: Create `useContractAdminInfo` following `useContractOwnership` pattern

**Source**: `apps/role-manager/src/hooks/useContractData.ts`

```typescript
// Query key pattern (line 114)
const adminInfoQueryKey = (address: string) => ['contractAdminInfo', address] as const;

// Hook structure (lines 225-287)
export function useContractAdminInfo(
  adapter: ContractAdapter | null,
  contractAddress: string,
  isContractRegistered: boolean = true
): UseContractAdminInfoReturn {
  // Same pattern: useQuery with staleTime, refetchOnWindowFocus
}
```

**Rationale**: Consistent caching and refetch behavior with existing hooks  
**Alternatives Rejected**: Combining with ownership hook (would break single responsibility)

### 3. Role Synthesis Pattern

**Decision**: Synthesize Admin role in `useRolesPageData` like Owner role

**Source**: `apps/role-manager/src/hooks/useRolesPageData.ts` (lines 207-223)

```typescript
// Owner role synthesis pattern
const ownerRole = useMemo((): RoleWithDescription | null => {
  if (!capabilities?.hasOwnable || !hasOwner || !ownership?.owner) {
    return null;
  }
  const customDescription = customDescriptions[OWNER_ROLE_ID];
  return {
    roleId: OWNER_ROLE_ID,
    roleName: OWNER_ROLE_NAME,
    description: customDescription ?? OWNER_ROLE_DESCRIPTION,
    isCustomDescription: !!customDescription,
    members: [ownership.owner],
    isOwnerRole: true,
  };
}, [capabilities?.hasOwnable, hasOwner, ownership?.owner, customDescriptions]);

// Admin role follows same pattern
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
    roleName: ADMIN_ROLE_NAME, // "Admin"
    description: customDescription ?? ADMIN_ROLE_DESCRIPTION,
    isCustomDescription: !!customDescription,
    members: isRenounced ? [] : [adminInfo.admin!],
    isOwnerRole: false,
    isAdminRole: true, // NEW FLAG
  };
}, [capabilities?.hasTwoStepAdmin, adminInfo, customDescriptions]);
```

**Rationale**: Admin is a privileged role not returned by enumeration, like Owner  
**Alternatives Rejected**: Treating Admin as regular enumerated role (incorrect semantics)

### 4. Dialog State Pattern

**Decision**: Create `useAdminTransferDialog` mirroring `useOwnershipTransferDialog`

**Source**: `apps/role-manager/src/hooks/useOwnershipTransferDialog.ts`

Key elements to replicate:

- Form validation (self-transfer, expiration > current block)
- Transaction execution via mutation hook
- Step state machine: 'form' → 'pending' → 'confirming' → 'success'/'error'/'cancelled'
- Retry logic with stored form data
- Auto-close on success (1.5s delay)

**Rationale**: Proven UX pattern for two-step transfers  
**Alternatives Rejected**: Shared generic hook (similar but different service methods, validation messages)

### 5. Pending Transfer Display Pattern

**Decision**: Reuse `PendingTransferInfo` with admin-specific props

**Source**: `apps/role-manager/src/components/Roles/PendingTransferInfo.tsx`

```tsx
// Already supports customization (lines 87-98)
<PendingTransferInfo
  pendingRecipient={pendingAdmin}
  expirationBlock={adminInfo.pendingTransfer.expirationBlock}
  isExpired={adminState === 'expired'}
  transferLabel="Admin Role" // Customizes "Pending Admin Role Transfer"
  recipientLabel="Admin" // Customizes "Pending Admin"
  canAccept={canAcceptAdmin}
  onAccept={handleAcceptAdminTransfer}
/>
```

**Rationale**: Component already designed for reuse  
**Alternatives Rejected**: Creating separate `PendingAdminTransferInfo` (duplication)

### 6. Type Updates Required

**Decision**: Add `isAdminRole` flag to `RoleWithDescription`

**Source**: `apps/role-manager/src/types/roles.ts` (line 62)

```typescript
export interface RoleWithDescription {
  roleId: string;
  roleName: string;
  description: string | null;
  isCustomDescription: boolean;
  members: string[];
  isOwnerRole: boolean;
  isAdminRole: boolean; // NEW
}
```

**Rationale**: Parallel to `isOwnerRole` for consistent UI treatment  
**Alternatives Rejected**: Union type discrimination (more complex, less readable)

## Adapter API Verification

**Confirmed available in `@openzeppelin/ui-builder-types`**:

```typescript
// AccessControlCapabilities (line 22)
hasTwoStepAdmin: boolean;

// AdminInfo (lines 154-161)
interface AdminInfo {
  admin: string | null;
  state?: AdminState;
  pendingTransfer?: PendingAdminTransfer;
}

// AdminState (line 106)
type AdminState = 'active' | 'pending' | 'expired' | 'renounced';

// PendingAdminTransfer (lines 113-124)
interface PendingAdminTransfer {
  pendingAdmin: string;
  expirationBlock: number;
  initiatedAt?: string;
  initiatedTxId?: string;
  initiatedBlock?: number;
}

// AccessControlService methods (lines 441, 458, 484)
getAdminInfo?(contractAddress: string): Promise<AdminInfo>;
transferAdminRole?(contractAddress, newAdmin, expirationBlock, executionConfig, onStatusChange?, runtimeApiKey?): Promise<OperationResult>;
acceptAdminTransfer?(contractAddress, executionConfig, onStatusChange?, runtimeApiKey?): Promise<OperationResult>;
```

## Dashboard Integration

**Source**: `apps/role-manager/src/hooks/useRoleChangesPageData.ts`

The Dashboard's pending transfers table uses `PendingTransfer` type which already supports different transfer types:

```typescript
interface PendingTransfer {
  type: 'owner' | 'admin'; // Already supports admin
  label: string;
  currentHolder: string;
  pendingRecipient: string;
  expirationBlock: number;
  // ...
}
```

**Decision**: Add admin transfer detection alongside ownership transfer in data aggregation

## Icon Selection

**Decision**: Shield icon for Admin role

**Rationale**:

- Crown already used for Owner
- Shield conveys protection/access control semantics
- Available in lucide-react (existing dependency)

```tsx
import { Shield } from 'lucide-react';

// In RoleCard.tsx
{
  role.isAdminRole && <Shield className="h-3 w-3 text-purple-600" aria-label="Admin role" />;
}
```

## Window Focus Refresh

**Decision**: Use React Query's built-in `refetchOnWindowFocus` for admin info

**Implementation**:

```typescript
const { data: adminInfo } = useQuery({
  queryKey: adminInfoQueryKey(contractAddress),
  queryFn: () => service.getAdminInfo(contractAddress),
  refetchOnWindowFocus: true, // Standard React Query behavior
  staleTime: 1 * 60 * 1000, // Match ownership pattern
});
```

**Rationale**: Consistent with existing data hooks; no custom implementation needed
