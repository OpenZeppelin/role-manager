# Quickstart: Role Changes Page

**Feature**: 012-role-changes-data  
**Date**: 2025-12-08

## Overview

This guide provides a quick reference for implementing the Role Changes page. Follow the established patterns from the Authorized Accounts page (specs 010/011).

---

## 1. File Structure

Create these files in the following order:

```text
1. apps/role-manager/src/types/role-changes.ts           # Type definitions
2. apps/role-manager/src/utils/history-transformer.ts    # Transform utilities
3. apps/role-manager/src/hooks/useContractHistory.ts     # Data fetching hook
4. apps/role-manager/src/hooks/useRoleChangesPageData.ts # Orchestration hook
5. apps/role-manager/src/components/RoleChanges/         # UI components
6. apps/role-manager/src/pages/RoleChanges.tsx           # Page component
```

---

## 2. Types (role-changes.ts)

Copy pattern from `types/authorized-accounts.ts`:

```typescript
// Key types to define
export type RoleChangeAction = 'grant' | 'revoke' | 'ownership-transfer';
export type HistoryChangeType = 'GRANTED' | 'REVOKED' | 'TRANSFERRED';

// Mapping from API to UI
export const CHANGE_TYPE_TO_ACTION: Record<HistoryChangeType, RoleChangeAction> = {
  GRANTED: 'grant',
  REVOKED: 'revoke',
  TRANSFERRED: 'ownership-transfer',
};

export interface RoleChangeEventView {
  id: string;
  timestamp: string;
  action: RoleChangeAction;
  roleId: string;
  roleName: string;
  account: string;
  transactionHash: string | null;
  transactionUrl: string | null;
  ledger: number | null;
}

export interface HistoryFilterState {
  actionFilter: RoleChangeAction | 'all'; // Server-side filter via changeType param
  roleFilter: string; // Server-side filter via roleId param
}

export const DEFAULT_HISTORY_FILTER_STATE: HistoryFilterState = {
  actionFilter: 'all',
  roleFilter: 'all',
};

// Cursor-based pagination state
export interface CursorPaginationState {
  currentCursor: string | undefined;
  cursorHistory: string[]; // For back navigation
  hasNextPage: boolean;
}

export const ACTION_TYPE_CONFIG = {
  grant: { label: 'Grant', variant: 'success' },
  revoke: { label: 'Revoke', variant: 'destructive' },
  'ownership-transfer': { label: 'Ownership Transfer', variant: 'info' },
};
```

---

## 3. Data Fetching Hook (useContractHistory.ts)

Follow `useContractRolesEnriched.ts` pattern with cursor-based pagination:

```typescript
import { useQuery } from '@tanstack/react-query';

import type { HistoryQueryOptions, PaginatedHistoryResult } from '../types/role-changes';

export function useContractHistory(
  adapter: ContractAdapter | null,
  contractAddress: string,
  enabled: boolean,
  options?: HistoryQueryOptions
) {
  return useQuery({
    // Include cursor in query key for proper caching per page
    queryKey: [
      'contract-history',
      contractAddress,
      options?.roleId,
      options?.cursor,
      options?.limit,
    ],
    queryFn: async (): Promise<PaginatedHistoryResult> => {
      const service = adapter?.getAccessControlService();
      if (!service) {
        return { items: [], pageInfo: { hasNextPage: false } };
      }
      return service.getHistory(contractAddress, options);
    },
    enabled: enabled && !!adapter && !!contractAddress,
    staleTime: 30_000, // 30 seconds
  });
}
```

---

## 4. Orchestration Hook (useRoleChangesPageData.ts)

Follow `useAuthorizedAccountsPageData.ts` pattern with cursor-based pagination:

```typescript
export function useRoleChangesPageData(): UseRoleChangesPageDataReturn {
  // Context
  const { selectedContract, adapter, isContractRegistered } = useSelectedContract();
  const contractAddress = selectedContract?.address ?? '';
  const contractId = selectedContract?.id;

  // Filter state
  const [filters, setFilters] = useState(DEFAULT_HISTORY_FILTER_STATE);

  // Cursor-based pagination state
  const [paginationState, setPaginationState] = useState<CursorPaginationState>({
    currentCursor: undefined,
    cursorHistory: [],
    hasNextPage: false,
  });

  // Build query options with server-side filters (role and action type)
  const queryOptions: HistoryQueryOptions = useMemo(
    () => ({
      limit: 20,
      cursor: paginationState.currentCursor,
      roleId: filters.roleFilter !== 'all' ? filters.roleFilter : undefined,
      changeType: filters.actionFilter !== 'all' ? mapActionToChangeType(filters.actionFilter) : undefined,
    }),
    [paginationState.currentCursor, filters.roleFilter, filters.actionFilter]
  );

  // Data fetching with cursor
  const { capabilities, isSupported } = useContractCapabilities(...);
  const { data, isLoading, ... } = useContractHistory(adapter, contractAddress, isContractRegistered, queryOptions);

  // Transform to view models (server already filtered by action type and role)
  const events = useMemo(() => {
    return transformEntries(data?.items ?? [], explorerUrl);
  }, [data?.items]);

  // Update hasNextPage from API response
  useEffect(() => {
    if (data?.pageInfo) {
      setPaginationState((prev) => ({ ...prev, hasNextPage: data.pageInfo.hasNextPage }));
    }
  }, [data?.pageInfo]);

  // Reset pagination on contract or filter change
  useEffect(() => {
    setPaginationState({ currentCursor: undefined, cursorHistory: [], hasNextPage: false });
  }, [contractId, filters.roleFilter]);

  // Pagination controls
  const pagination: CursorPaginationControls = useMemo(() => ({
    hasNextPage: paginationState.hasNextPage,
    hasPrevPage: paginationState.cursorHistory.length > 0,
    nextPage: () => {
      if (data?.pageInfo.endCursor) {
        setPaginationState((prev) => ({
          currentCursor: data.pageInfo.endCursor,
          cursorHistory: prev.currentCursor
            ? [...prev.cursorHistory, prev.currentCursor]
            : prev.cursorHistory,
          hasNextPage: false, // Will be updated when new data loads
        }));
      }
    },
    prevPage: () => {
      setPaginationState((prev) => {
        const newHistory = [...prev.cursorHistory];
        const prevCursor = newHistory.pop();
        return {
          currentCursor: prevCursor,
          cursorHistory: newHistory,
          hasNextPage: true, // We know there's at least a next page (current one)
        };
      });
    },
    resetToFirst: () => {
      setPaginationState({ currentCursor: undefined, cursorHistory: [], hasNextPage: false });
    },
    isLoading,
  }), [paginationState, data?.pageInfo, isLoading]);

  return { events, filters, setFilters, pagination, ... };
}
```

---

## 5. Components

### ChangesFilterBar.tsx

Adapt from `AccountsFilterBar.tsx`:

```tsx
export function ChangesFilterBar({ filters, availableRoles, onFiltersChange }) {
  return (
    <div className="flex items-center gap-4 p-4 border-b">
      {/* Action Type Dropdown */}
      <Select
        value={filters.actionFilter}
        onValueChange={(value) => onFiltersChange({ ...filters, actionFilter: value })}
      >
        {/* Options: All, Grant, Revoke, Ownership Transfer */}
      </Select>

      {/* Role Dropdown */}
      <Select
        value={filters.roleFilter}
        onValueChange={(value) => onFiltersChange({ ...filters, roleFilter: value })}
      >
        {/* Options: All, ...availableRoles */}
      </Select>
    </div>
  );
}
```

### ChangesTable.tsx

Adapt from `AccountsTable.tsx`:

```tsx
const COLUMNS = [
  { id: 'timestamp', label: 'Date/Time' },
  { id: 'action', label: 'Action' },
  { id: 'role', label: 'Role' },
  { id: 'account', label: 'Account' },
  { id: 'transaction', label: 'Transaction' },
];

export function ChangesTable({ events, emptyState }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>...</thead>
        <tbody>
          {events.length === 0 && emptyState ? (
            <tr>
              <td colSpan={5}>{emptyState}</td>
            </tr>
          ) : (
            events.map((event) => <ChangeRow key={event.id} event={event} />)
          )}
        </tbody>
      </table>
    </div>
  );
}
```

### ChangeRow.tsx

Adapt from `AccountRow.tsx`:

```tsx
export function ChangeRow({ event }) {
  return (
    <tr className="border-b hover:bg-accent/50">
      <td>{formatDate(event.timestamp)}</td>
      <td>
        <StatusBadge variant={ACTION_TYPE_CONFIG[event.action].variant}>
          {ACTION_TYPE_CONFIG[event.action].label}
        </StatusBadge>
      </td>
      <td>
        <OutlineBadge>{event.roleName}</OutlineBadge>
      </td>
      <td>
        <AddressDisplay address={event.account} truncate />
      </td>
      <td>
        {event.transactionUrl ? (
          <a href={event.transactionUrl} target="_blank" rel="noopener noreferrer">
            {truncateHash(event.transactionHash)}
          </a>
        ) : (
          '-'
        )}
      </td>
    </tr>
  );
}
```

---

## 6. Page Component (RoleChanges.tsx)

Follow `AuthorizedAccounts.tsx` pattern:

```tsx
export function RoleChanges() {
  const {
    events,
    availableRoles,
    filters,
    setFilters,
    pagination,
    hasContractSelected,
    supportsHistory,
    isSupported,
    isLoading,
    isRefreshing,
    hasError,
    errorMessage,
    canRetry,
    refetch,
  } = useRoleChangesPageData();

  // Loading state
  if (isLoading) return <ChangesLoadingSkeleton />;

  // Error state
  if (hasError) return <ChangesErrorState message={errorMessage} onRetry={refetch} />;

  // No contract selected
  if (!hasContractSelected) return <PageEmptyState title="No Contract Selected" />;

  // Contract doesn't support AC/Ownable
  if (!isSupported) return <ChangesEmptyState contractName={...} />;

  // History not available
  if (!supportsHistory) return <ChangesEmptyState historyNotSupported />;

  // Main content
  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="Role Changes"
        subtitle={...}
        actions={<RefreshButton onClick={refetch} isRefreshing={isRefreshing} />}
      />
      <Card>
        <ChangesFilterBar ... />
        <ChangesTable events={events} />
        {pagination.totalItems > pagination.pageSize && (
          <Pagination {...pagination} itemLabel="events" />
        )}
      </Card>
    </div>
  );
}
```

---

## 7. Testing

### Hook Tests (useRoleChangesPageData.test.tsx)

Follow `useAuthorizedAccountsPageData.test.tsx` pattern:

```typescript
describe('useRoleChangesPageData', () => {
  it('returns empty state when no contract selected');
  it('fetches history when contract is selected');
  it('transforms events to view models');
  it('filters events by action type');
  it('filters events by role');
  it('combines filters with AND logic');
  it('paginates filtered results');
  it('resets filters on contract change');
  it('resets pagination on filter change');
  it('handles history not supported');
  it('handles fetch errors');
});
```

---

## Key Patterns Reference

| Pattern            | Reference File                                           |
| ------------------ | -------------------------------------------------------- |
| Type definitions   | `types/authorized-accounts.ts`                           |
| Data fetching hook | `hooks/useContractRolesEnriched.ts`                      |
| Orchestration hook | `hooks/useAuthorizedAccountsPageData.ts`                 |
| Filter bar         | `components/AuthorizedAccounts/AccountsFilterBar.tsx`    |
| Data table         | `components/AuthorizedAccounts/AccountsTable.tsx`        |
| Table row          | `components/AuthorizedAccounts/AccountRow.tsx`           |
| Page component     | `pages/AuthorizedAccounts.tsx`                           |
| Hook tests         | `hooks/__tests__/useAuthorizedAccountsPageData.test.tsx` |
