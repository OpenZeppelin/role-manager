# Quickstart: Authorized Accounts Real Data Integration

**Feature**: 011-accounts-real-data  
**Date**: 2025-12-08

## Overview

This guide provides step-by-step instructions for implementing real data integration for the Authorized Accounts page.

## Prerequisites

- Spec 006 (Access Control Service) hooks implemented
- Spec 010 (Authorized Accounts Page Layout) components implemented
- Familiarity with `useRolesPageData` hook pattern from spec 009

## Implementation Order

1. **Types** - Update type definitions
2. **Utility** - Create transformation utility
3. **Hooks** - Create data hooks
4. **Components** - Update UI components
5. **Page** - Wire everything together

---

## Step 1: Update Type Definitions

**File**: `apps/role-manager/src/types/authorized-accounts.ts`

```typescript
// 1. Update AccountStatus - remove 'expired', add future states
export type AccountStatus = 'active' | 'pending' | 'awaiting-signature';

// 2. Update ACCOUNT_STATUS_CONFIG
export const ACCOUNT_STATUS_CONFIG: Record<
  AccountStatus,
  { label: string; variant: 'success' | 'warning' | 'info' }
> = {
  active: { label: 'Active', variant: 'success' },
  pending: { label: 'Pending', variant: 'warning' },
  'awaiting-signature': { label: 'Awaiting Signature', variant: 'info' },
};

// 3. Update AuthorizedAccount to AuthorizedAccountView
export interface AuthorizedAccountView {
  id: string;
  address: string;
  status: AccountStatus;
  dateAdded: string | null; // Changed from Date to nullable string
  roles: RoleBadgeInfo[]; // Changed from string[] to RoleBadgeInfo[]
  // Removed: expiresAt
}

// 4. Add RoleBadgeInfo
export interface RoleBadgeInfo {
  id: string;
  name: string;
}

// 5. Add enriched types (or import from contracts)
export interface EnrichedRoleMember {
  address: string;
  grantedAt?: string;
  grantedTxId?: string;
  grantedLedger?: number;
}

export interface EnrichedRoleAssignment {
  role: RoleIdentifier;
  members: EnrichedRoleMember[];
}
```

---

## Step 2: Create Transformation Utility

**File**: `apps/role-manager/src/utils/account-transformer.ts`

```typescript
import type { OwnershipInfo } from '@openzeppelin/ui-builder-types';

import type {
  AuthorizedAccountView,
  EnrichedRoleAssignment,
  RoleBadgeInfo,
} from '../types/authorized-accounts';

const OWNER_ROLE_ID = 'OWNER_ROLE';
const OWNER_ROLE_NAME = 'Owner';

/**
 * Transform role-centric data to account-centric view.
 * Aggregates roles per account and finds earliest grantedAt.
 */
export function transformRolesToAccounts(
  enrichedRoles: EnrichedRoleAssignment[],
  ownership: OwnershipInfo | null
): AuthorizedAccountView[] {
  // Map: address -> { roles, earliestDate }
  const accountMap = new Map<
    string,
    {
      roles: RoleBadgeInfo[];
      earliestDate: string | null;
    }
  >();

  // Process each role assignment
  for (const roleAssignment of enrichedRoles) {
    const roleInfo: RoleBadgeInfo = {
      id: roleAssignment.role.id,
      name: roleAssignment.role.label || roleAssignment.role.id,
    };

    for (const member of roleAssignment.members) {
      const address = member.address.toLowerCase();
      const existing = accountMap.get(address);

      if (existing) {
        // Add role to existing account
        existing.roles.push(roleInfo);
        // Update earliest date if this one is earlier
        if (member.grantedAt) {
          if (
            !existing.earliestDate ||
            new Date(member.grantedAt) < new Date(existing.earliestDate)
          ) {
            existing.earliestDate = member.grantedAt;
          }
        }
      } else {
        // Create new account entry
        accountMap.set(address, {
          roles: [roleInfo],
          earliestDate: member.grantedAt || null,
        });
      }
    }
  }

  // Add owner if present and not already in map
  if (ownership?.owner) {
    const ownerAddress = ownership.owner.toLowerCase();
    const existing = accountMap.get(ownerAddress);
    const ownerRole: RoleBadgeInfo = { id: OWNER_ROLE_ID, name: OWNER_ROLE_NAME };

    if (existing) {
      // Add Owner role to existing account
      existing.roles.push(ownerRole);
    } else {
      // Create new account for owner
      accountMap.set(ownerAddress, {
        roles: [ownerRole],
        earliestDate: null, // Owner has no grant timestamp
      });
    }
  }

  // Convert map to array
  const accounts: AuthorizedAccountView[] = Array.from(accountMap.entries()).map(
    ([address, data]) => ({
      id: address,
      address,
      status: 'active' as const,
      dateAdded: data.earliestDate,
      roles: data.roles,
    })
  );

  // Sort: timestamped (newest first), then non-timestamped (alphabetical)
  return sortAccounts(accounts);
}

/**
 * Sort accounts by dateAdded (newest first), then alphabetical.
 */
export function sortAccounts(accounts: AuthorizedAccountView[]): AuthorizedAccountView[] {
  return [...accounts].sort((a, b) => {
    if (a.dateAdded && b.dateAdded) {
      return new Date(b.dateAdded).getTime() - new Date(a.dateAdded).getTime();
    }
    if (a.dateAdded && !b.dateAdded) return -1;
    if (!a.dateAdded && b.dateAdded) return 1;
    return a.address.localeCompare(b.address);
  });
}

/**
 * Apply filters to accounts list.
 */
export function applyAccountsFilters(
  accounts: AuthorizedAccountView[],
  filters: AccountsFilterState
): AuthorizedAccountView[] {
  return accounts.filter((account) => {
    // Search filter (address)
    if (filters.searchQuery) {
      const query = filters.searchQuery.toLowerCase();
      if (!account.address.toLowerCase().includes(query)) {
        return false;
      }
    }

    // Status filter
    if (filters.statusFilter !== 'all' && account.status !== filters.statusFilter) {
      return false;
    }

    // Role filter
    if (filters.roleFilter !== 'all') {
      if (!account.roles.some((role) => role.id === filters.roleFilter)) {
        return false;
      }
    }

    return true;
  });
}
```

---

## Step 3: Create Data Hooks

### 3a. useContractRolesEnriched Hook

**File**: `apps/role-manager/src/hooks/useContractRolesEnriched.ts`

```typescript
import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';

import type { ContractAdapter } from '@openzeppelin/ui-builder-types';

import type { EnrichedRoleAssignment } from '../types/authorized-accounts';
import { DataError, wrapError } from '../utils/errors';
import { useAccessControlService } from './useAccessControlService';

const enrichedRolesQueryKey = (address: string) => ['contractRolesEnriched', address] as const;

export function useContractRolesEnriched(
  adapter: ContractAdapter | null,
  contractAddress: string,
  isContractRegistered: boolean = true
) {
  const { service, isReady } = useAccessControlService(adapter);

  const {
    data: roles,
    isLoading,
    isFetching,
    error: rawError,
    refetch: queryRefetch,
  } = useQuery({
    queryKey: enrichedRolesQueryKey(contractAddress),
    queryFn: async (): Promise<EnrichedRoleAssignment[]> => {
      if (!service) {
        throw new DataError('Service not available', 'SERVICE_UNAVAILABLE');
      }
      try {
        // Use enriched API if available, fallback to regular
        if ('getCurrentRolesEnriched' in service) {
          return await (service as any).getCurrentRolesEnriched(contractAddress);
        }
        // Fallback: convert regular roles to enriched format
        const regularRoles = await service.getCurrentRoles(contractAddress);
        return regularRoles.map((r) => ({
          role: r.role,
          members: r.members.map((address) => ({ address })),
        }));
      } catch (err) {
        throw wrapError(err, 'enriched-roles');
      }
    },
    enabled: isReady && !!contractAddress && isContractRegistered,
    staleTime: 60 * 1000,
    gcTime: 10 * 60 * 1000,
    retry: false,
  });

  const error = useMemo(() => {
    if (!rawError) return null;
    return rawError instanceof DataError ? rawError : wrapError(rawError, 'enriched-roles');
  }, [rawError]);

  return {
    roles: roles ?? [],
    isLoading,
    isFetching,
    error,
    errorMessage: error?.getUserMessage() ?? null,
    canRetry: error?.canRetry ?? false,
    hasError: error !== null,
    isEmpty: !roles || roles.length === 0,
    refetch: async () => {
      await queryRefetch();
    },
  };
}
```

### 3b. useAuthorizedAccountsPageData Hook

**File**: `apps/role-manager/src/hooks/useAuthorizedAccountsPageData.ts`

```typescript
import { useCallback, useEffect, useMemo, useState } from 'react';

import {
  DEFAULT_FILTER_STATE,
  type AccountsFilterState,
  type RoleBadgeInfo,
} from '../types/authorized-accounts';
import { applyAccountsFilters, transformRolesToAccounts } from '../utils/account-transformer';
import { useContractCapabilities } from './useContractCapabilities';
import { useContractOwnership } from './useContractData';
import { useContractRolesEnriched } from './useContractRolesEnriched';
import { useSelectedContract } from './useSelectedContract';

const DEFAULT_PAGE_SIZE = 10;

export function useAuthorizedAccountsPageData() {
  const { selectedContract, adapter, isContractRegistered } = useSelectedContract();
  const contractAddress = selectedContract?.address ?? '';
  const contractId = selectedContract?.id;

  // Filter state
  const [filters, setFilters] = useState<AccountsFilterState>(DEFAULT_FILTER_STATE);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);

  // Data fetching
  const {
    capabilities,
    isLoading: isCapabilitiesLoading,
    isSupported,
  } = useContractCapabilities(adapter, contractAddress, isContractRegistered);

  const {
    roles: enrichedRoles,
    isLoading: isRolesLoading,
    isFetching: isRolesFetching,
    refetch: refetchRoles,
    hasError: hasRolesError,
    canRetry: canRetryRoles,
    errorMessage: rolesErrorMessage,
  } = useContractRolesEnriched(adapter, contractAddress, isContractRegistered);

  const {
    ownership,
    isLoading: isOwnershipLoading,
    isFetching: isOwnershipFetching,
    refetch: refetchOwnership,
  } = useContractOwnership(adapter, contractAddress, isContractRegistered);

  // Transform to account-centric view
  const allAccounts = useMemo(
    () => transformRolesToAccounts(enrichedRoles, ownership),
    [enrichedRoles, ownership]
  );

  // Extract available roles for filter dropdown
  const availableRoles = useMemo((): RoleBadgeInfo[] => {
    const rolesMap = new Map<string, RoleBadgeInfo>();
    for (const account of allAccounts) {
      for (const role of account.roles) {
        if (!rolesMap.has(role.id)) {
          rolesMap.set(role.id, role);
        }
      }
    }
    return Array.from(rolesMap.values());
  }, [allAccounts]);

  // Apply filters
  const filteredAccounts = useMemo(
    () => applyAccountsFilters(allAccounts, filters),
    [allAccounts, filters]
  );

  // Pagination
  const totalItems = filteredAccounts.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / DEFAULT_PAGE_SIZE));
  const paginatedAccounts = useMemo(() => {
    const start = (currentPage - 1) * DEFAULT_PAGE_SIZE;
    return filteredAccounts.slice(start, start + DEFAULT_PAGE_SIZE);
  }, [filteredAccounts, currentPage]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filters]);

  // Reset state when contract changes
  useEffect(() => {
    setFilters(DEFAULT_FILTER_STATE);
    setCurrentPage(1);
  }, [contractId]);

  // Loading states
  const isLoading = isCapabilitiesLoading || isRolesLoading || isOwnershipLoading;
  const isRefreshing = !isLoading && (isRolesFetching || isOwnershipFetching);

  // Error states
  const hasError = hasRolesError;
  const errorMessage = rolesErrorMessage;
  const canRetry = canRetryRoles;

  // Actions
  const refetch = useCallback(async () => {
    await Promise.all([refetchRoles(), refetchOwnership()]);
  }, [refetchRoles, refetchOwnership]);

  const resetFilters = useCallback(() => {
    setFilters(DEFAULT_FILTER_STATE);
  }, []);

  // Pagination controls
  const pagination = {
    currentPage,
    totalPages,
    totalItems,
    pageSize: DEFAULT_PAGE_SIZE,
    hasNextPage: currentPage < totalPages,
    hasPreviousPage: currentPage > 1,
    nextPage: () => setCurrentPage((p) => Math.min(p + 1, totalPages)),
    previousPage: () => setCurrentPage((p) => Math.max(p - 1, 1)),
    goToPage: (page: number) => setCurrentPage(Math.max(1, Math.min(page, totalPages))),
  };

  // Stubbed wallet
  const connectedAddress = null;

  return {
    allAccounts,
    paginatedAccounts,
    availableRoles,
    filters,
    setFilters,
    resetFilters,
    pagination,
    capabilities,
    isSupported,
    isLoading,
    isRefreshing,
    hasError,
    errorMessage,
    canRetry,
    refetch,
    connectedAddress,
  };
}
```

---

## Step 4: Update Components

### 4a. Update AccountRow

Remove `expiresAt` handling, show "-" for missing `dateAdded`:

```typescript
// In AccountRow.tsx
{
  account.dateAdded ? formatDate(account.dateAdded) : '-';
}
// Remove the Expires column entirely
```

### 4b. Update AccountsFilterBar

Remove "Expired" from status dropdown:

```typescript
// In AccountsFilterBar.tsx - Remove this option:
// <SelectItem value="expired">Expired</SelectItem>
```

### 4c. Create AccountsEmptyState

```typescript
// apps/role-manager/src/components/AuthorizedAccounts/AccountsEmptyState.tsx
export function AccountsEmptyState({ contractName }: { contractName: string }) {
  return (
    <PageEmptyState
      title="Access Control Not Supported"
      description={`${contractName} does not implement OpenZeppelin AccessControl or Ownable interfaces.`}
      icon={Shield}
    />
  );
}
```

### 4d. Create AccountsErrorState

```typescript
// apps/role-manager/src/components/AuthorizedAccounts/AccountsErrorState.tsx
export function AccountsErrorState({
  message,
  canRetry,
  onRetry,
}: {
  message: string;
  canRetry: boolean;
  onRetry: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16">
      <AlertCircle className="h-12 w-12 text-destructive mb-4" />
      <h3 className="text-lg font-semibold">Failed to Load Accounts</h3>
      <p className="text-muted-foreground mb-4">{message}</p>
      {canRetry && (
        <Button onClick={onRetry} variant="outline">
          Try Again
        </Button>
      )}
    </div>
  );
}
```

---

## Step 5: Update Page Component

**File**: `apps/role-manager/src/pages/AuthorizedAccounts.tsx`

```typescript
import { RefreshCw } from 'lucide-react';
import { Button, Card } from '@openzeppelin/ui-builder-ui';
import { cn } from '@openzeppelin/ui-builder-utils';
import {
  AccountsFilterBar,
  AccountsLoadingSkeleton,
  AccountsTable,
  AccountsEmptyState,
  AccountsErrorState,
} from '../components/AuthorizedAccounts';
import { PageHeader } from '../components/Shared/PageHeader';
import { useAuthorizedAccountsPageData } from '../hooks';
import { useSelectedContract } from '../hooks/useSelectedContract';

export function AuthorizedAccounts() {
  const {
    paginatedAccounts,
    availableRoles,
    filters,
    setFilters,
    pagination,
    isSupported,
    isLoading,
    isRefreshing,
    hasError,
    errorMessage,
    canRetry,
    refetch,
    connectedAddress,
  } = useAuthorizedAccountsPageData();

  const { selectedContract } = useSelectedContract();
  const contractLabel = selectedContract?.label || 'Unknown Contract';

  // Loading state
  if (isLoading) {
    return <AccountsLoadingSkeleton />;
  }

  // Error state
  if (hasError) {
    return (
      <AccountsErrorState
        message={errorMessage || 'Failed to load accounts'}
        canRetry={canRetry}
        onRetry={refetch}
      />
    );
  }

  // Unsupported contract
  if (!isSupported) {
    return <AccountsEmptyState contractName={contractLabel} />;
  }

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="Authorized Accounts"
        subtitle={`Manage accounts for ${contractLabel}`}
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={refetch}
            disabled={isRefreshing}
          >
            <RefreshCw className={cn('mr-2 h-4 w-4', isRefreshing && 'animate-spin')} />
            {isRefreshing ? 'Refreshing...' : 'Refresh'}
          </Button>
        }
      />

      <Card className="p-0 shadow-none overflow-hidden">
        <AccountsFilterBar
          filters={filters}
          availableRoles={availableRoles.map((r) => r.name)}
          onFiltersChange={setFilters}
        />
        <AccountsTable
          accounts={paginatedAccounts}
          selectedIds={new Set()}
          onSelectionChange={() => {}}
          onAction={(id, action) => console.log('Action', action, id)}
        />
        {/* Add pagination controls here */}
      </Card>
    </div>
  );
}
```

---

## Testing

### Unit Tests for Transformation Utility

```typescript
// tests/utils/account-transformer.test.ts
describe('transformRolesToAccounts', () => {
  it('should aggregate multiple roles per account', () => {
    const roles = [
      { role: { id: 'admin' }, members: [{ address: '0x1' }] },
      { role: { id: 'minter' }, members: [{ address: '0x1' }] },
    ];
    const result = transformRolesToAccounts(roles, null);
    expect(result[0].roles).toHaveLength(2);
  });

  it('should use earliest grantedAt for accounts with multiple roles', () => {
    const roles = [
      { role: { id: 'admin' }, members: [{ address: '0x1', grantedAt: '2024-02-01' }] },
      { role: { id: 'minter' }, members: [{ address: '0x1', grantedAt: '2024-01-01' }] },
    ];
    const result = transformRolesToAccounts(roles, null);
    expect(result[0].dateAdded).toBe('2024-01-01');
  });

  it('should sort newest first, then alphabetical', () => {
    // ... test sorting logic
  });
});
```

---

## Checklist

- [ ] Update type definitions
- [ ] Create account-transformer utility with tests
- [ ] Create useContractRolesEnriched hook with tests
- [ ] Create useAuthorizedAccountsPageData hook with tests
- [ ] Update AccountRow component
- [ ] Update AccountsFilterBar component
- [ ] Create AccountsEmptyState component
- [ ] Create AccountsErrorState component
- [ ] Update AuthorizedAccounts page
- [ ] Add pagination controls
- [ ] Remove demo toggle and mock data
- [ ] Manual testing with real contract
