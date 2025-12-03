# Data Model: Add Contract Record

**Feature**: 004-add-contract-record  
**Date**: 2025-12-02

## Entities

### RecentContractRecord (Existing - No Changes)

The existing entity from `@/types/storage.ts` is sufficient for this feature.

```typescript
interface RecentContractRecord extends BaseRecord {
  // From BaseRecord:
  id: string; // Auto-generated UUID
  createdAt: number; // Unix timestamp (ms)
  updatedAt: number; // Unix timestamp (ms)

  // Domain fields:
  networkId: string; // Network identifier (e.g., "ethereum-mainnet")
  address: string; // Contract address (format varies by network)
  label?: string; // User-defined name (max 64 chars)
  lastAccessed: number; // Unix timestamp (ms) of last access
}
```

**Validation Rules**:

- `networkId`: Required, must match a valid network ID from adapter packages
- `address`: Required, must pass `adapter.isValidAddress()` for the network
- `label`: Optional, max 64 characters (control character validation removed per latest code)
- Unique constraint: `[networkId + address]` (enforced by database index)

**Address Format by Ecosystem**:

| Ecosystem | Format                | Length      | Example                                                    |
| --------- | --------------------- | ----------- | ---------------------------------------------------------- |
| EVM       | `0x` + 40 hex chars   | 42 chars    | `0xA1B2C3D4E5F67890ABCD1234E56789ABCDEF1234`               |
| Stellar   | `G` + 55 base32 chars | 56 chars    | `GCKFBEIYV2U22IO2BJ4KVJOIP7XPWQGQFKKWXR6DOSJBV7STMAQSMTGG` |
| Midnight  | TBD                   | TBD         | TBD                                                        |
| Solana    | base58, 32-44 chars   | 32-44 chars | (ecosystem currently disabled)                             |

Note: Actual validation delegated to `adapter.isValidAddress()` - these are reference examples only.

**Lifecycle**:

- **Create**: Via `addOrUpdate()` - creates new record or updates existing
- **Read**: Via `getByNetwork()` - returns records for a network sorted by lastAccessed
- **Update**: Via `addOrUpdate()` - updates lastAccessed and optionally label
- **Delete**: Via `delete(id)` - removes record permanently

---

### NetworkConfig (External - From UI Builder Types)

Referenced from `@openzeppelin/ui-builder-types`, not modified.

```typescript
interface BaseNetworkConfig {
  id: string; // Unique identifier (e.g., "ethereum-mainnet")
  name: string; // Display name (e.g., "Ethereum Mainnet")
  ecosystem: Ecosystem; // "evm" | "stellar" | "midnight" | "solana"
  network: string; // Parent network (e.g., "ethereum")
  type: NetworkType; // "mainnet" | "testnet" | "devnet"
  isTestnet: boolean; // Convenience flag
  explorerUrl?: string;
  iconComponent?: React.ComponentType<IconProps>;
}
```

---

### ContractAdapter (External - From UI Builder Types)

Referenced from `@openzeppelin/ui-builder-types`, key method used:

```typescript
interface ContractAdapter {
  // Used for address validation
  isValidAddress(address: string, addressType?: string): boolean;

  // Network config this adapter is bound to
  readonly networkConfig: NetworkConfig;

  // ... other methods not used in this feature
}
```

---

## Form Data Model

### AddContractFormData

New type for the dialog form state:

```typescript
interface AddContractFormData {
  name: string; // Maps to RecentContractRecord.label
  address: string; // Maps to RecentContractRecord.address
  networkId: string; // Maps to RecentContractRecord.networkId
}
```

**Validation**:

- `name`: Required, 1-64 characters
- `address`: Required, valid format for selected network
- `networkId`: Required, must be selected before address validation

---

## State Transitions

### Contract Record Lifecycle

```
[No Record] --addOrUpdate()--> [Created]
[Created] --addOrUpdate()--> [Updated (lastAccessed)]
[Created] --delete()--> [Deleted/No Record]
```

### Form State Machine

```
[Initial] -- user opens dialog --> [Empty Form]
[Empty Form] -- select network --> [Network Selected]
[Network Selected] -- enter name --> [Name Entered]
[Name Entered] -- enter valid address --> [Form Valid]
[Form Valid] -- click Add --> [Submitting]
[Submitting] -- success --> [Dialog Closed, Contract Selected]
[Submitting] -- error --> [Form Valid + Error Message]
[Any State] -- click Cancel/Escape --> [Dialog Closed]
```

---

## Database Schema

### Existing Table: recentContracts

```
Table: recentContracts
Primary Key: id (auto-increment)
Unique Index: [networkId + address]
Compound Index: [networkId + lastAccessed]
```

No schema changes required. Existing schema supports all operations.

---

## Relationships

```
┌─────────────────────┐
│ AddContractDialog   │
│                     │
│ - open: boolean     │
│ - onSubmit()        │
│ - onCancel()        │
└─────────┬───────────┘
          │ contains
          ▼
┌─────────────────────┐
│ AddContractForm     │
│                     │
│ - formData          │◄───── validates against
│ - selectedNetwork   │       ContractAdapter.isValidAddress()
│ - adapter           │
└─────────┬───────────┘
          │ creates/updates
          ▼
┌─────────────────────┐
│ RecentContractRecord│
│                     │
│ - id                │
│ - networkId ────────┼──────► NetworkConfig.id
│ - address           │
│ - label             │
│ - lastAccessed      │
└─────────────────────┘
```
