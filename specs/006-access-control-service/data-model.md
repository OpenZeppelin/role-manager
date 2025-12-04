# Data Model: Access Control Service

## Entities

### 1. AccessControlCapabilities

Describes the supported features of a contract. Persisted in `RecentContractRecord`.

| Field                         | Type       | Description                         |
| ----------------------------- | ---------- | ----------------------------------- |
| `hasOwnable`                  | `boolean`  | Implements Ownable interface        |
| `hasAccessControl`            | `boolean`  | Implements AccessControl interface  |
| `hasEnumerableRoles`          | `boolean`  | Roles can be enumerated directly    |
| `supportsHistory`             | `boolean`  | Historical data available (indexer) |
| `verifiedAgainstOZInterfaces` | `boolean`  | Conformance checked                 |
| `notes`                       | `string[]` | Detection warnings/remarks          |

### 2. RoleAssignment

Represents a single role and its members.

| Field        | Type       | Description                          |
| ------------ | ---------- | ------------------------------------ |
| `role.id`    | `string`   | Stable identifier (e.g. bytes32 hex) |
| `role.label` | `string`   | Human-readable name (e.g. "MINTER")  |
| `members`    | `string[]` | List of member addresses             |

### 3. OwnershipInfo

Current contract ownership state.

| Field   | Type             | Description                        |
| ------- | ---------------- | ---------------------------------- |
| `owner` | `string \| null` | Owner address or null if renounced |

### 4. RecentContractRecord (Extended)

Extension of the existing storage record.

| Field             | Type                        | Description                |
| ----------------- | --------------------------- | -------------------------- |
| ...base fields... |                             | Existing fields            |
| `capabilities`    | `AccessControlCapabilities` | **NEW**: Detected features |

## Persistence Strategy

- **Location**: IndexedDB (`ui-builder-storage`)
- **Timing**: Saved _after_ successful `loadContract` AND validation (must be supported).
- **Validation**: Contract must have `hasOwnable=true` OR `hasAccessControl=true`.
