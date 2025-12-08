# Data Model: Authorized Accounts Real Data Integration

**Feature**: 011-accounts-real-data  
**Date**: 2025-12-08

## Entity Definitions

### AuthorizedAccountView

Presentation model representing an account with its role assignments, used by the UI.

| Field       | Type              | Description                              | Constraints                            |
| ----------- | ----------------- | ---------------------------------------- | -------------------------------------- |
| `id`        | `string`          | Unique identifier (address)              | Required, unique                       |
| `address`   | `string`          | Blockchain address                       | Required, 0x-prefixed                  |
| `status`    | `AccountStatus`   | Transaction-state based status           | Required, always "active" in this spec |
| `dateAdded` | `string \| null`  | ISO8601 timestamp of earliest role grant | Nullable (indexer may be unavailable)  |
| `roles`     | `RoleBadgeInfo[]` | Array of assigned roles                  | Required, min length 1                 |

**Derived From**: `EnrichedRoleAssignment[]` + `OwnershipInfo`

**Sorting**: By `dateAdded` descending (newest first), then alphabetical by `address` for null dates.

---

### RoleBadgeInfo

Minimal role information for display as badge.

| Field  | Type     | Description                    | Constraints |
| ------ | -------- | ------------------------------ | ----------- |
| `id`   | `string` | Role identifier (hash or name) | Required    |
| `name` | `string` | Human-readable role name       | Required    |

---

### AccountStatus (Updated)

Transaction-state based status enum.

| Value                | Description                 | When Used                             |
| -------------------- | --------------------------- | ------------------------------------- |
| `active`             | Role confirmed on-chain     | All accounts from adapter (this spec) |
| `pending`            | Transaction in progress     | Future: during transaction execution  |
| `awaiting-signature` | Multisig pending signatures | Future: multisig support              |

**Removed**: `expired` (OZ AccessControl has no timelock roles)

---

### EnrichedRoleMember

Member data with optional grant metadata from indexer.

| Field           | Type                  | Description                 | Constraints                  |
| --------------- | --------------------- | --------------------------- | ---------------------------- |
| `address`       | `string`              | Member's blockchain address | Required                     |
| `grantedAt`     | `string \| undefined` | ISO8601 timestamp of grant  | Optional (indexer dependent) |
| `grantedTxId`   | `string \| undefined` | Transaction hash of grant   | Optional                     |
| `grantedLedger` | `number \| undefined` | Block/ledger number         | Optional                     |

---

### EnrichedRoleAssignment

Role with enriched member data.

| Field     | Type                   | Description                         | Constraints |
| --------- | ---------------------- | ----------------------------------- | ----------- |
| `role`    | `RoleIdentifier`       | Role identifier with optional label | Required    |
| `members` | `EnrichedRoleMember[]` | Members with optional metadata      | Required    |

---

### AccountsFilterState (Updated)

Filter state for the accounts table.

| Field          | Type                     | Description                    | Default |
| -------------- | ------------------------ | ------------------------------ | ------- |
| `searchQuery`  | `string`                 | Address search query           | `""`    |
| `statusFilter` | `AccountStatus \| 'all'` | Status filter                  | `'all'` |
| `roleFilter`   | `string`                 | Role filter (role ID or 'all') | `'all'` |

**Note**: `statusFilter` updated to remove `'expired'` option.

---

### PaginationState

Client-side pagination state.

| Field         | Type     | Description               | Default |
| ------------- | -------- | ------------------------- | ------- |
| `currentPage` | `number` | Current page (1-indexed)  | `1`     |
| `pageSize`    | `number` | Items per page            | `10`    |
| `totalPages`  | `number` | Computed total pages      | Derived |
| `totalItems`  | `number` | Total items (post-filter) | Derived |

---

## Relationships

```
┌─────────────────────────────────────────────────────────────────┐
│                    Data Flow Diagram                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  AccessControlService                                           │
│  ┌─────────────────────────┐   ┌──────────────────────┐        │
│  │ getCurrentRolesEnriched │   │ getOwnership         │        │
│  │ ───────────────────────>│   │ ──────────────────>  │        │
│  │ EnrichedRoleAssignment[]│   │ OwnershipInfo        │        │
│  └───────────┬─────────────┘   └──────────┬───────────┘        │
│              │                            │                     │
│              └──────────┬─────────────────┘                     │
│                         │                                       │
│                         ▼                                       │
│              ┌──────────────────────┐                           │
│              │ transformRolesToAccounts()                       │
│              │ (role-centric → account-centric)                 │
│              └──────────┬───────────┘                           │
│                         │                                       │
│                         ▼                                       │
│              ┌──────────────────────┐                           │
│              │ AuthorizedAccountView[]                          │
│              │ (sorted by dateAdded)                            │
│              └──────────┬───────────┘                           │
│                         │                                       │
│          ┌──────────────┼──────────────┐                        │
│          │              │              │                        │
│          ▼              ▼              ▼                        │
│    ┌──────────┐  ┌──────────┐  ┌──────────┐                    │
│    │ Search   │  │ Filter   │  │ Sort     │                    │
│    │ (address)│  │ (role)   │  │ (date)   │                    │
│    └────┬─────┘  └────┬─────┘  └────┬─────┘                    │
│         │             │             │                           │
│         └─────────────┼─────────────┘                           │
│                       │                                         │
│                       ▼                                         │
│              ┌──────────────────────┐                           │
│              │ Paginate             │                           │
│              │ (client-side, 10/page)                           │
│              └──────────┬───────────┘                           │
│                         │                                       │
│                         ▼                                       │
│              ┌──────────────────────┐                           │
│              │ AccountsTable        │                           │
│              │ (UI Component)       │                           │
│              └──────────────────────┘                           │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## State Transitions

### Account Status (Future)

```
                    ┌─────────────┐
                    │   (none)    │
                    └──────┬──────┘
                           │ Grant initiated
                           ▼
                    ┌─────────────┐
                    │   pending   │
                    └──────┬──────┘
                           │ Transaction confirmed
                           ▼
                    ┌─────────────┐
                    │   active    │◄────────────────┐
                    └──────┬──────┘                 │
                           │ Revoke initiated      │
                           ▼                       │
                    ┌─────────────┐                │
                    │   pending   │────────────────┘
                    └──────┬──────┘  (if revoke fails)
                           │ Revoke confirmed
                           ▼
                    ┌─────────────┐
                    │   (removed) │
                    └─────────────┘

Note: In this spec (view-only), all accounts are "active".
      State transitions apply to future mutation specs.
```

### Multisig Flow (Future)

```
    ┌───────────────────┐
    │ Grant initiated   │
    │ (multisig)        │
    └─────────┬─────────┘
              │
              ▼
    ┌───────────────────┐
    │ awaiting-signature│
    └─────────┬─────────┘
              │ All signatures collected
              ▼
    ┌───────────────────┐
    │ pending           │
    └─────────┬─────────┘
              │ Transaction confirmed
              ▼
    ┌───────────────────┐
    │ active            │
    └───────────────────┘
```

## Validation Rules

| Entity                            | Rule                             | Error                                  |
| --------------------------------- | -------------------------------- | -------------------------------------- |
| `AuthorizedAccountView.address`   | Must be valid blockchain address | Invalid address format                 |
| `AuthorizedAccountView.roles`     | Must have at least one role      | Account should not exist without roles |
| `AccountsFilterState.searchQuery` | Case-insensitive partial match   | N/A (filter behavior)                  |
| `PaginationState.currentPage`     | Must be >= 1 and <= totalPages   | Clamp to valid range                   |

## Migration Notes

### From Spec 010 Types

| Old Type                | New Type                | Changes                                                 |
| ----------------------- | ----------------------- | ------------------------------------------------------- |
| `AccountStatus`         | `AccountStatus`         | Removed `'expired'`, added `'awaiting-signature'`       |
| `AuthorizedAccount`     | `AuthorizedAccountView` | Removed `expiresAt`, `dateAdded` is now nullable string |
| `ACCOUNT_STATUS_CONFIG` | `ACCOUNT_STATUS_CONFIG` | Removed `expired` entry, added `awaiting-signature`     |
