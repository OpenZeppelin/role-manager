# Data Model: Data Store Service

**Spec**: [specs/003-data-store-service/spec.md](spec.md)

## Entities

### RecentContract

Represents a smart contract the user has successfully loaded and interacted with.

| Field          | Type     | Required | Description                                                                      |
| -------------- | -------- | -------- | -------------------------------------------------------------------------------- |
| `id`           | `string` | Yes      | Unique identifier (UUID or Auto-inc), managed by storage layer.                  |
| `networkId`    | `string` | Yes      | The ID of the network (e.g., "stellar-testnet", "1"). Part of unique constraint. |
| `address`      | `string` | Yes      | The contract address. Part of unique constraint.                                 |
| `label`        | `string` | No       | User-defined nickname for the contract.                                          |
| `lastAccessed` | `number` | Yes      | Timestamp (Unix ms) of the last interaction. Used for sorting.                   |
| `createdAt`    | `Date`   | Yes      | Managed by `EntityStorage`.                                                      |
| `updatedAt`    | `Date`   | Yes      | Managed by `EntityStorage`.                                                      |

**Constraints**:

- Unique combination of `[networkId, address]`.
- Sorted by `lastAccessed` descending within a `networkId`.

### UserPreference

Represents a key-value setting for the application. Uses `KeyValueStorage` which manages records with the following structure:

| Field       | Type      | Required | Description                                             |
| ----------- | --------- | -------- | ------------------------------------------------------- |
| `key`       | `string`  | Yes      | Primary Key. The setting name (e.g., "active_network"). |
| `value`     | `unknown` | Yes      | The setting value. Can be a primitive or a JSON object. |
| `createdAt` | `Date`    | Yes      | Managed by `KeyValueStorage`.                           |
| `updatedAt` | `Date`    | Yes      | Managed by `KeyValueStorage`.                           |

## Storage Schema (Dexie)

**Database Name**: `RoleManager`

**Stores (Tables)**:

1.  **`recentContracts`**
    - Schema: `++id, &[networkId+address], [networkId+lastAccessed]`
    - Base Class: `EntityStorage<RecentContractRecord>`
    - Explanation:
      - `++id`: Auto-incrementing primary key.
      - `&[networkId+address]`: Compound unique index to ensure a contract is only stored once per network.
      - `[networkId+lastAccessed]`: Compound index to allow efficient querying of "recent contracts for network X".

2.  **`userPreferences`**
    - Schema: `&key`
    - Base Class: `KeyValueStorage<unknown>`
    - Explanation:
      - `&key`: Unique primary key (the preference key itself).

## Data Lifecycle

### Recent Contracts

1.  **Load Contract**:
    - Check if `[networkId, address]` exists.
    - If **exists**: Update `lastAccessed` to `Date.now()`.
    - If **new**: Insert new record with `lastAccessed = Date.now()`.
2.  **List**:
    - Query `recentContracts` where `networkId` equals current network.
    - Sort by `lastAccessed` descending.
3.  **Delete**:
    - User explicitly removes an item by `id`.

### User Preferences

1.  **Set Preference**:
    - `set(key, value)` performs upsert based on key.
2.  **Get Preference**:
    - `get<T>(key)` retrieves value with type casting.
    - `getOrDefault(key, defaultValue)` for fallback values.
