# Data Model: Role Changes Page

**Feature**: 012-role-changes-data  
**Date**: 2025-12-08

## Overview

This document defines the data structures for the Role Changes page. The model follows patterns established in the Authorized Accounts page (spec 011) and aligns with adapter types.

---

## Entity Relationship

```text
┌─────────────────────────┐
│  HistoryQueryOptions    │  ← Request with filters + cursor
│  (API Request)          │
└───────────┬─────────────┘
            │
            ▼ API Call
┌─────────────────────────┐
│  PaginatedHistoryResult │  ← From adapter getHistory() API
│  (API Response)         │
│  ├─ items: HistoryEntry[]
│  └─ pageInfo: PageInfo
└───────────┬─────────────┘
            │
            ▼ Transform
┌─────────────────────────┐
│  RoleChangeEventView    │  ← Presentation model for UI
│  (UI Presentation)      │
└───────────┬─────────────┘
            │
            ▼ Filter state (drives server-side query params)
┌─────────────────────────┐
│  HistoryFilterState     │  ← User-controlled filters (sent to API)
└───────────┬─────────────┘
            │
            ▼ Display
┌─────────────────────────┐
│  CursorPaginationState  │  ← Cursor-based navigation
└─────────────────────────┘
```

---

## Domain Types

### RoleChangeAction

Enum representing the type of role change event.

| Value                  | Description                      |
| ---------------------- | -------------------------------- |
| `'grant'`              | Role was granted to an account   |
| `'revoke'`             | Role was revoked from an account |
| `'ownership-transfer'` | Ownership was transferred        |

```typescript
type RoleChangeAction = 'grant' | 'revoke' | 'ownership-transfer';
```

### HistoryEntry (from Adapter)

Raw event data returned by `getHistory()` API in `PaginatedHistoryResult.items`.

| Field        | Type                                      | Description                      |
| ------------ | ----------------------------------------- | -------------------------------- |
| `role.id`    | `string`                                  | Role identifier (e.g., "minter") |
| `account`    | `string`                                  | Affected address                 |
| `changeType` | `'GRANTED' \| 'REVOKED' \| 'TRANSFERRED'` | Type of change                   |
| `txId`       | `string`                                  | Transaction hash (64-char hex)   |
| `timestamp`  | `string`                                  | ISO8601 timestamp                |
| `ledger`     | `number`                                  | Block/ledger number              |

### PageInfo (from Adapter)

Pagination metadata returned with each query.

| Field         | Type                  | Description                                 |
| ------------- | --------------------- | ------------------------------------------- |
| `hasNextPage` | `boolean`             | Whether more items exist after current page |
| `endCursor`   | `string \| undefined` | Cursor to use for fetching next page        |

### HistoryQueryOptions (for API Request)

Options for querying history.

| Field     | Type                  | Description                       |
| --------- | --------------------- | --------------------------------- |
| `roleId`  | `string \| undefined` | Filter by role (server-side)      |
| `account` | `string \| undefined` | Filter by account (server-side)   |
| `limit`   | `number \| undefined` | Page size (max items per request) |
| `cursor`  | `string \| undefined` | Cursor for fetching next page     |

---

## Presentation Types

### RoleChangeEventView

Presentation model for displaying an event in the UI.

| Field             | Type               | Description        | Source                                                        |
| ----------------- | ------------------ | ------------------ | ------------------------------------------------------------- |
| `id`              | `string`           | Unique identifier  | Generated: `${timestamp}-${changeType}-${role.id}-${account}` |
| `timestamp`       | `string`           | ISO8601 timestamp  | From API `timestamp`                                          |
| `action`          | `RoleChangeAction` | Event type         | Mapped from API `changeType`                                  |
| `roleId`          | `string`           | Role identifier    | From API `role.id`                                            |
| `roleName`        | `string`           | Display name       | From API `role.id` (may need lookup for human-readable name)  |
| `account`         | `string`           | Affected address   | From API `account`                                            |
| `transactionHash` | `string \| null`   | Transaction hash   | From API `txId`                                               |
| `transactionUrl`  | `string \| null`   | Block explorer URL | Computed from `explorerUrl + txId`                            |
| `ledger`          | `number \| null`   | Block/ledger       | From API `ledger`                                             |

### Transformation Logic

```typescript
const CHANGE_TYPE_MAP: Record<string, RoleChangeAction> = {
  GRANTED: 'grant',
  REVOKED: 'revoke',
  TRANSFERRED: 'ownership-transfer',
};

function transformEntry(entry: HistoryEntry, explorerUrl: string): RoleChangeEventView {
  const action = CHANGE_TYPE_MAP[entry.changeType] ?? 'grant';
  return {
    id: `${entry.timestamp}-${entry.changeType}-${entry.role.id}-${entry.account}`,
    timestamp: entry.timestamp,
    action,
    roleId: entry.role.id,
    roleName: entry.role.id, // Could enhance with role label lookup
    account: entry.account,
    transactionHash: entry.txId ?? null,
    transactionUrl: entry.txId ? `${explorerUrl}/tx/${entry.txId}` : null,
    ledger: entry.ledger ?? null,
  };
}
```

---

## Filter State Types

### HistoryFilterState

Current filter configuration for the changes table.

| Field          | Type                        | Default | Description           |
| -------------- | --------------------------- | ------- | --------------------- |
| `actionFilter` | `RoleChangeAction \| 'all'` | `'all'` | Filter by action type |
| `roleFilter`   | `string`                    | `'all'` | Filter by role ID     |

```typescript
interface HistoryFilterState {
  actionFilter: RoleChangeAction | 'all';
  roleFilter: string; // 'all' or specific role ID
}

const DEFAULT_HISTORY_FILTER_STATE: HistoryFilterState = {
  actionFilter: 'all',
  roleFilter: 'all',
};
```

### Filter Options

| Filter      | Options                                  |
| ----------- | ---------------------------------------- |
| Action Type | All, Grant, Revoke, Ownership Transfer   |
| Role        | All, [dynamically populated from events] |

---

## Display Configuration

### ACTION_TYPE_CONFIG

Display configuration for action types.

| Action               | Label                | Icon (suggested) |
| -------------------- | -------------------- | ---------------- |
| `grant`              | "Grant"              | `UserPlus`       |
| `revoke`             | "Revoke"             | `UserMinus`      |
| `ownership-transfer` | "Ownership Transfer" | `ArrowRightLeft` |

```typescript
const ACTION_TYPE_CONFIG: Record<
  RoleChangeAction,
  { label: string; variant: 'success' | 'destructive' | 'info' }
> = {
  grant: { label: 'Grant', variant: 'success' },
  revoke: { label: 'Revoke', variant: 'destructive' },
  'ownership-transfer': { label: 'Ownership Transfer', variant: 'info' },
};
```

---

## Pagination State Types

### CursorPaginationState

State for cursor-based pagination with back navigation support.

| Field           | Type                  | Description                             |
| --------------- | --------------------- | --------------------------------------- |
| `currentCursor` | `string \| undefined` | Current cursor (undefined = first page) |
| `cursorHistory` | `string[]`            | Stack of previous cursors for back nav  |
| `hasNextPage`   | `boolean`             | From API `pageInfo.hasNextPage`         |
| `hasPrevPage`   | `boolean`             | Computed: `cursorHistory.length > 0`    |

### CursorPaginationControls

Controls for cursor-based navigation.

| Field          | Type         | Description                   |
| -------------- | ------------ | ----------------------------- |
| `hasNextPage`  | `boolean`    | Can navigate to next page     |
| `hasPrevPage`  | `boolean`    | Can navigate to previous page |
| `nextPage`     | `() => void` | Navigate to next page         |
| `prevPage`     | `() => void` | Navigate to previous page     |
| `resetToFirst` | `() => void` | Reset to first page           |
| `isLoading`    | `boolean`    | Whether pagination is loading |

> **Note**: Unlike the existing `Pagination` component, cursor-based pagination does not provide `currentPage`, `totalPages`, or `totalItems` since the API doesn't expose total counts. The `CursorPagination` component will only show Previous/Next buttons without page numbers.

---

## Hook Return Types

### UseRoleChangesPageDataReturn

Return type for the main orchestration hook.

| Field                 | Type                                    | Description                        |
| --------------------- | --------------------------------------- | ---------------------------------- |
| `events`              | `RoleChangeEventView[]`                 | Current page events (transformed)  |
| `availableRoles`      | `RoleBadgeInfo[]`                       | Roles for filter dropdown          |
| `filters`             | `HistoryFilterState`                    | Current filter state               |
| `setFilters`          | `(filters: HistoryFilterState) => void` | Update filters (resets pagination) |
| `resetFilters`        | `() => void`                            | Reset to defaults                  |
| `pagination`          | `CursorPaginationControls`              | Cursor-based pagination controls   |
| `hasContractSelected` | `boolean`                               | Whether contract is selected       |
| `capabilities`        | `AccessControlCapabilities \| null`     | Contract capabilities              |
| `supportsHistory`     | `boolean`                               | Whether history is available       |
| `isSupported`         | `boolean`                               | Whether contract has AC/Ownable    |
| `isLoading`           | `boolean`                               | Initial load in progress           |
| `isRefreshing`        | `boolean`                               | Background refresh in progress     |
| `hasError`            | `boolean`                               | Error state                        |
| `errorMessage`        | `string \| null`                        | User-friendly error message        |
| `canRetry`            | `boolean`                               | Whether retry is possible          |
| `refetch`             | `() => Promise<void>`                   | Manual refresh function            |

---

## State Transitions

### Filter State Machine

```text
[Default State] ──filter change──> [Filtered] ──reset──> [Default State]
                                      │
                                      └──contract change──> [Default State]
```

### Pagination State Machine

```text
[Page 1] ──next──> [Page N] ──previous──> [Page N-1]
   │                  │
   │                  └──filter change──> [Page 1]
   │
   └──contract change──> [Page 1]
```

---

## Validation Rules

1. **timestamp**: Must be valid ISO8601 format
2. **action**: Must be one of: 'grant', 'revoke', 'ownership-transfer'
3. **role.id**: Must be non-empty string
4. **account**: Must be valid blockchain address format
5. **transaction.hash**: If present, must be valid transaction hash format

---

## Relationships

| From                  | To                      | Relationship                          |
| --------------------- | ----------------------- | ------------------------------------- |
| `RoleChangeEventView` | `RoleBadgeInfo`         | Many events can reference same role   |
| `HistoryFilterState`  | `RoleChangeEventView[]` | Filters apply to events               |
| `PaginationControls`  | `RoleChangeEventView[]` | Pagination applies to filtered events |
