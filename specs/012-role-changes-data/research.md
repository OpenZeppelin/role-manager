# Research: Role Changes Page with Real Data

**Feature**: 012-role-changes-data  
**Date**: 2025-12-08  
**Status**: Complete

## Research Summary

This document captures research findings and decisions for implementing the Role Changes page. The feature is straightforward as it follows established patterns from the Authorized Accounts page (specs 010/011).

---

## 1. getHistory() API Pagination Strategy

### Question

How should pagination be implemented for the history API?

### Decision

Use **cursor-based server-side pagination** as the primary approach, leveraging the adapter's `PaginatedHistoryResult` response.

### Rationale

1. **API Support**: The adapter now provides cursor-based pagination with `hasNextPage` and `endCursor`
2. **Performance**: Server-side pagination is more efficient for large datasets
3. **Memory Efficiency**: Only loads current page data, reducing client memory usage
4. **Scalability**: Works well with contracts having thousands of history events

### Implementation

```typescript
// Fetch first page
const result = await service.getHistory(contractAddress, { limit: 20 });

// Check for more pages
if (result.pageInfo.hasNextPage) {
  // Fetch next page using cursor
  const nextPage = await service.getHistory(contractAddress, {
    limit: 20,
    cursor: result.pageInfo.endCursor,
  });
}
```

### Cursor History for Back Navigation

To support "Previous" button navigation, maintain a stack of cursors:

```typescript
interface CursorPaginationState {
  currentCursor: string | undefined;
  cursorHistory: string[]; // Stack of previous cursors
  hasNextPage: boolean;
}

// Go to next page: push current cursor to history, use endCursor
// Go to previous page: pop from history, use that cursor
```

---

## 2. Server-Side Filtering Strategy

### Question

How should filtering work for history events?

### Decision

Use **server-side filtering** via the `HistoryQueryOptions` parameters, with client-side filtering for action type.

### Rationale

1. **API Support**: The adapter now supports `roleId` and `account` filter parameters
2. **Performance**: Server-side filtering reduces data transfer
3. **Scalability**: Essential for contracts with large history datasets

### Implementation

```typescript
// Server-side filtering by role
const result = await service.getHistory(contractAddress, {
  roleId: filters.roleFilter !== 'all' ? filters.roleFilter : undefined,
  limit: 20,
  cursor: currentCursor,
});

// Client-side filtering for action type (changeType)
// Note: Server filters by role, client filters by action type
function filterByActionType(items: HistoryEntry[], actionFilter: string): HistoryEntry[] {
  if (actionFilter === 'all') return items;
  const changeTypeMap = {
    grant: 'GRANTED',
    revoke: 'REVOKED',
    'ownership-transfer': 'TRANSFERRED',
  };
  return items.filter((item) => item.changeType === changeTypeMap[actionFilter]);
}
```

### Filter Reset Behavior

When filters change, pagination must reset (clear cursor history) to start from the first page of filtered results.

---

## 3. Component Reuse Strategy

### Question

Which components from Authorized Accounts can be reused vs. adapted?

### Decision

**Reuse directly**:

- `PageHeader` from Shared
- `PageEmptyState` from Shared

**Adapt (create new versions)**:

- `Pagination` → `CursorPagination` (cursor-based doesn't have page numbers/totals)

- `AccountsFilterBar` → `ChangesFilterBar` (different filter options)
- `AccountsTable` → `ChangesTable` (different columns)
- `AccountRow` → `ChangeRow` (different data display)
- `AccountsLoadingSkeleton` → `ChangesLoadingSkeleton`
- `AccountsEmptyState` → `ChangesEmptyState`
- `AccountsErrorState` → `ChangesErrorState`

### Rationale

1. The components share similar structure but different data and column layouts
2. Adaptation maintains consistency while allowing customization
3. Shared components (Pagination, PageHeader) are truly generic

---

## 4. Transaction Link Generation

### Question

How to generate block explorer links for transaction hashes?

### Decision

Use the adapter's `getExplorerUrl()` method with a standard path pattern for transactions.

### Rationale

1. **ASSUMP-004**: "The adapter provides `getExplorerUrl(address)` method"
2. Follows existing patterns in the codebase (see Dashboard.tsx)

### Implementation

```typescript
function getTransactionUrl(explorerUrl: string, txHash: string): string {
  // Standard pattern for most explorers
  return `${explorerUrl}/tx/${txHash}`;
}
```

---

## 5. History Support Detection

### Question

How to determine if a contract supports history?

### Decision

Check `AccessControlCapabilities.supportsHistory` flag (per FR-003).

### Rationale

1. Adapter performs the actual capability detection
2. UI simply reads the flag and shows appropriate state
3. Matches chain-agnostic architecture principle

### Implementation

```typescript
// In useRoleChangesPageData hook
const { capabilities } = useContractCapabilities(adapter, contractAddress);

if (!capabilities?.supportsHistory) {
  // Show "history not available" state
}
```

---

## 6. Hook Architecture

### Question

What's the optimal hook structure for this page?

### Decision

Follow the `useAuthorizedAccountsPageData` pattern with a main orchestration hook.

### Structure

```text
useRoleChangesPageData (orchestration)
├── useSelectedContract (context)
├── useContractCapabilities (feature detection)
├── useContractHistory (data fetching) ← NEW
│   └── useQuery with contractAddress as key
└── Local state (filters, pagination)
```

### Rationale

1. Proven pattern from spec 011
2. Separation of concerns (data fetching vs. orchestration)
3. Testable at each layer

---

## Dependencies Verified

| Dependency                | Verification                                 |
| ------------------------- | -------------------------------------------- |
| `useSelectedContract`     | Exists in `hooks/useSelectedContract.ts`     |
| `useContractCapabilities` | Exists in `hooks/useContractCapabilities.ts` |
| `Pagination` component    | Exists in `components/Shared/Pagination.tsx` |
| `PageHeader` component    | Exists in `components/Shared/PageHeader.tsx` |
| `formatDate` utility      | Exists in `utils/date.ts`                    |
| `AddressDisplay`          | From `@openzeppelin/ui-builder-ui`           |
| `logger`                  | From `@openzeppelin/ui-builder-utils`        |

---

## Open Questions (Resolved)

All research questions have been resolved. No blockers for implementation.
