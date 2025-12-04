# Data Model: Contract Schema Loading and Storage

**Feature**: 005-contract-schema-storage  
**Date**: 2025-12-03

## Entity Relationship Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    RecentContractRecord (Extended)                       │
│                    Single entity for contract + schema                   │
├─────────────────────────────────────────────────────────────────────────┤
│ id: string (auto-generated)                                              │
│ createdAt: Date (auto-managed)                                           │
│ updatedAt: Date (auto-managed)                                           │
├─────────────────────────────────────────────────────────────────────────┤
│ networkId: string            ─┐                                          │
│ address: string              ─┴─► Composite Unique Key (existing)        │
├─────────────────────────────────────────────────────────────────────────┤
│ label?: string               ─► User-defined name (existing)             │
│ lastAccessed: number         ─► Unix ms (existing)                       │
├─────────────────────────────────────────────────────────────────────────┤
│ ════════════════════════════ NEW SCHEMA FIELDS ═════════════════════════│
├─────────────────────────────────────────────────────────────────────────┤
│ ecosystem?: Ecosystem        ─► 'stellar', 'evm', etc.                   │
│ schema?: string (JSON)       ─► Serialized ContractSchema                │
│ schemaHash?: string          ─► For quick comparison                     │
├─────────────────────────────────────────────────────────────────────────┤
│ source?: 'fetched' | 'manual' ─► How schema was obtained                 │
│ definitionOriginal?: string  ─► Original spec/Wasm for re-parsing        │
│ definitionArtifacts?: object ─► Additional adapter artifacts             │
├─────────────────────────────────────────────────────────────────────────┤
│ schemaMetadata?: {                                                       │
│   fetchedFrom?: string       ─► RPC URL or 'manual'                      │
│   fetchTimestamp?: number    ─► Unix ms                                  │
│   contractName?: string      ─► Name from schema                         │
│ }                                                                        │
└─────────────────────────────────────────────────────────────────────────┘
```

## Entity States

A `RecentContractRecord` can exist in two states:

### State 1: Basic Record (no schema)

Created when user adds a contract without loading its schema yet.

```typescript
{
  id: "abc123",
  networkId: "stellar-testnet",
  address: "CABC...",
  label: "My Token",
  lastAccessed: 1701619200000,
  // schema fields are undefined
}
```

### State 2: Full Record (with schema)

After schema is successfully loaded.

```typescript
{
  id: "abc123",
  networkId: "stellar-testnet",
  address: "CABC...",
  label: "My Token",
  lastAccessed: 1701619200000,
  // Schema fields populated
  ecosystem: "stellar",
  schema: '{"name":"MyToken","ecosystem":"stellar","functions":[...]}',
  schemaHash: "a1b2c3d4",
  source: "fetched",
  definitionOriginal: '{"spec":[...]}',
  schemaMetadata: {
    fetchedFrom: "https://soroban-testnet.stellar.org",
    fetchTimestamp: 1701619200000,
    contractName: "MyToken"
  }
}
```

## Extended RecentContractRecord

| Field                 | Type   | Required | Description                                         |
| --------------------- | ------ | -------- | --------------------------------------------------- |
| `id`                  | string | Auto     | Unique record identifier (auto-generated)           |
| `createdAt`           | Date   | Auto     | Record creation timestamp                           |
| `updatedAt`           | Date   | Auto     | Last update timestamp                               |
| `networkId`           | string | Yes      | Network identifier (e.g., `stellar-testnet`)        |
| `address`             | string | Yes      | Contract address/ID (e.g., `C...`)                  |
| `label`               | string | No       | User-defined contract name (max 64 chars)           |
| `lastAccessed`        | number | Yes      | Unix timestamp (ms) of last access                  |
| `ecosystem`           | string | No       | Ecosystem identifier (populated when schema loaded) |
| `schema`              | string | No       | JSON-serialized `ContractSchema`                    |
| `schemaHash`          | string | No       | Hash of schema for quick comparison                 |
| `source`              | enum   | No       | `'fetched'` or `'manual'`                           |
| `definitionOriginal`  | string | No       | Original contract definition for re-parsing         |
| `definitionArtifacts` | object | No       | Additional adapter-specific artifacts               |
| `schemaMetadata`      | object | No       | Metadata about schema fetch                         |

**Indexes**:

- `++id` - Auto-increment primary key
- `&[networkId+address]` - Compound unique index (existing - prevents duplicates)
- `[networkId+lastAccessed]` - For sorting recents (existing)
- `source` - NEW: For filtering fetched vs manual schemas

**Constraints**:

- Composite uniqueness: Only one record per `address + networkId` combination
- `schema` must be valid JSON parseable to `ContractSchema` (when present)
- `schemaHash` computed via `simpleHash()` from `ui-builder-utils`
- `label` max 64 characters

### ContractSchema (from ui-builder-types)

The normalized contract interface representation (serialized in `schema` field).

| Field       | Type               | Required | Description                   |
| ----------- | ------------------ | -------- | ----------------------------- |
| `name`      | string             | No       | Contract name/label           |
| `ecosystem` | Ecosystem          | Yes      | `'stellar'`, `'evm'`, etc.    |
| `functions` | ContractFunction[] | Yes      | Array of function definitions |
| `events`    | ContractEvent[]    | No       | Array of event definitions    |
| `address`   | string             | No       | Deployed contract address/ID  |
| `metadata`  | object             | No       | Ecosystem-specific context    |

### ContractFunction (from ui-builder-types)

| Field             | Type                | Required | Description                         |
| ----------------- | ------------------- | -------- | ----------------------------------- |
| `id`              | string              | Yes      | Unique function identifier          |
| `name`            | string              | Yes      | Function name                       |
| `displayName`     | string              | Yes      | User-friendly display name          |
| `description`     | string              | No       | Function documentation              |
| `inputs`          | FunctionParameter[] | Yes      | Input parameters                    |
| `outputs`         | FunctionParameter[] | No       | Output parameters                   |
| `stateMutability` | string              | No       | `'view'`, `'pure'`, `'nonpayable'`  |
| `type`            | string              | Yes      | `'function'`, `'constructor'`, etc. |
| `modifiesState`   | boolean             | Yes      | Whether function modifies state     |

## State Transitions

### Schema Loading State Machine

```
                    ┌──────────────┐
                    │    IDLE      │
                    └──────┬───────┘
                           │ User enters contract address
                           ▼
                    ┌──────────────┐
                    │   LOADING    │◄───────────────┐
                    └──────┬───────┘                │
                           │                        │
              ┌────────────┼────────────┐           │
              ▼            ▼            ▼           │
       ┌──────────┐ ┌──────────┐ ┌───────────┐     │
       │  SUCCESS │ │   ERROR  │ │ CIRCUIT   │     │
       │          │ │          │ │  BREAKER  │     │
       └────┬─────┘ └────┬─────┘ └─────┬─────┘     │
            │            │             │           │
            │            │             │ (30s)     │
            │            └─────────────┴───────────┘
            │                  User retries
            ▼
       ┌──────────────┐
       │   STORED     │
       └──────────────┘
```

### Record States

| State        | Description                            | Schema Fields |
| ------------ | -------------------------------------- | ------------- |
| Basic Record | Contract added, schema not loaded      | undefined     |
| Full Record  | Schema successfully loaded and stored  | populated     |
| Stale Record | Schema loaded but older than threshold | populated     |
| Refreshing   | Re-fetching schema from source         | populated     |

### Refresh Eligibility

| Condition              | Eligible for Refresh?        |
| ---------------------- | ---------------------------- |
| `source === 'fetched'` | ✅ Yes                       |
| `source === 'manual'`  | ❌ No (preserves user data)  |
| `source === undefined` | ❌ No (no schema to refresh) |

## Validation Rules

### RecentContractRecord

1. **address**: Must be non-empty string, validated by adapter's `isValidAddress()`
2. **networkId**: Must match a known network from ecosystem registry
3. **ecosystem**: Must be valid `Ecosystem` enum value (when present)
4. **schema**: Must be valid JSON, parseable to `ContractSchema` with non-empty `functions` array (when present)
5. **schemaHash**: Must match computed hash of `schema` field (when present)
6. **source**: Must be exactly `'fetched'` or `'manual'` (when present)
7. **label**: Max 64 characters

### Form Input Validation

| Field             | Validation                            | Error Message                        |
| ----------------- | ------------------------------------- | ------------------------------------ |
| Contract Address  | Required, valid format per adapter    | "Invalid contract address format"    |
| Network           | Required, must be supported           | "Please select a network"            |
| Manual Definition | Optional, valid JSON/Wasm if provided | "Invalid contract definition format" |

## Data Volume Assumptions

- **SC-005**: System must support up to 100 stored contracts with schemas without degradation
- Average schema size: ~5-50KB (depends on number of functions)
- Total storage budget: ~5MB for schemas
- IndexedDB quota: ~50MB default (browser-dependent)

## Query Patterns

| Query                           | Index Used                 | Expected Frequency |
| ------------------------------- | -------------------------- | ------------------ |
| Get contract by address+network | `&[networkId+address]`     | High (on load)     |
| List all contracts for network  | `[networkId+lastAccessed]` | High (sidebar)     |
| List contracts with schemas     | Full scan + filter         | Medium             |
| List refreshable schemas        | `source`                   | Low (refresh)      |
| Get all contracts               | Full scan                  | Low (export)       |

## Migration from Spec 004

Existing `RecentContractRecord` records will continue to work:

- All existing fields remain unchanged
- New schema fields are optional (undefined by default)
- No data migration needed - records gain schema data when loaded
- Dexie version upgrade adds `source` index non-destructively
