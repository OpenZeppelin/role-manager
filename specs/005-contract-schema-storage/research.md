# Research: Contract Schema Loading and Storage

**Feature**: 005-contract-schema-storage  
**Date**: 2025-12-03

## Research Tasks

### 1. Dynamic Form Rendering with DynamicFormField

**Decision**: Use `DynamicFormField` from `@openzeppelin/ui-builder-renderer`

**Rationale**:

- Already implemented and tested in Builder UI
- Handles all `FormFieldType` variants (text, code-editor, blockchain-address, etc.)
- Integrates with react-hook-form for validation
- Adapter's `getContractDefinitionInputs()` returns `FormFieldType[]` directly

**Alternatives Considered**:

- Custom form component: Rejected - violates reuse-first principle (Constitution II)
- Direct adapter form integration: Rejected - couples UI to specific adapter implementations

**Integration Pattern**:

```typescript
// From adapter
const fields = adapter.getContractDefinitionInputs();

// In component
{fields.map((field) => (
  <DynamicFormField key={field.id} field={field} control={control} />
))}
```

### 2. Contract Schema Storage Pattern

**Decision**: Extend existing `RecentContractRecord` with optional schema fields

**Rationale**:

- Same entity: A "contract" in Role Manager is identified by `address + networkId`
- 1:1 relationship: Every contract added will need its schema loaded
- Simpler architecture: One storage class, one table, one source of truth
- Natural flow: Add contract → Load schema → Store together
- Less code: Extend existing class instead of creating new one

**Alternatives Considered**:

- Separate `ContractSchemaStorage`: Rejected - unnecessary complexity for Role Manager's use case. Unlike Builder UI (which has form configs, multiple UIs per contract), Role Manager has a simple 1:1 contract-to-schema relationship.
- Reuse Builder's `ContractUIStorage`: Rejected - includes form config fields not needed for Role Manager

**Extended Record Design**:

```typescript
interface RecentContractRecord extends BaseRecord {
  // Existing fields (from spec 004)
  networkId: string;
  address: string; // = contractId
  label?: string;
  lastAccessed: number;

  // NEW: Optional schema fields (populated when schema is loaded)
  ecosystem?: Ecosystem;
  schema?: string; // JSON-serialized ContractSchema
  schemaHash?: string; // For quick comparison
  source?: 'fetched' | 'manual';
  definitionOriginal?: string; // Original spec/Wasm for re-parsing
  definitionArtifacts?: Record<string, unknown>;
  schemaMetadata?: {
    fetchedFrom?: string;
    fetchTimestamp?: number;
    contractName?: string;
  };
}
```

**Benefits**:

- A contract can exist without a schema (just basic record)
- A contract can have a schema attached when loaded
- Single source of truth for contract data
- Existing compound unique key `[networkId+address]` already prevents duplicates

### 3. Circuit Breaker Pattern for RPC Failures

**Decision**: Implement circuit breaker matching Builder UI's `useContractLoader.ts`

**Rationale**:

- Prevents API abuse during transient failures
- Improves UX by showing clear "try again later" state
- Pattern already proven in Builder UI

**Implementation Details**:

- Track failures per `address + networkId` combination
- After 3 consecutive failures within 30 seconds, block further attempts
- Auto-reset after successful load
- Show user-friendly circuit breaker message for 5 seconds

**Key Code Pattern** (from Builder UI):

```typescript
interface CircuitBreakerState {
  key: string; // address-networkId
  attempts: number; // Consecutive failures
  lastFailure: number; // Timestamp
}

// Check before loading
if (attempts >= 3 && timeSinceLastFailure < 30000) {
  setCircuitBreakerActive(true);
  return; // Block the attempt
}
```

### 4. Schema Comparison for Refresh

**Decision**: Use adapter's `compareContractDefinitions()` if available, fallback to JSON diff

**Rationale**:

- Adapters may have chain-specific comparison logic (e.g., EVM's ABI comparison service)
- Stellar adapter may not have this method yet - fallback needed
- Function-level diff provides actionable information to users

**Implementation Approach**:

```typescript
// Check if adapter supports comparison
if (adapter.compareContractDefinitions) {
  return await adapter.compareContractDefinitions(storedSchema, freshSchema);
}

// Fallback: Simple JSON comparison of functions array
const storedFunctions = JSON.parse(storedSchema).functions;
const freshFunctions = JSON.parse(freshSchema).functions;
return compareFunctions(storedFunctions, freshFunctions);
```

**Diff Output Format** (matches Builder UI):

```typescript
interface SchemaDiff {
  identical: boolean;
  differences: Array<{
    type: 'added' | 'removed' | 'modified';
    name: string;
    details: string;
  }>;
  summary: string;
}
```

### 5. Manual Definition Handling (JSON Spec / Wasm Binary)

**Decision**: Architecture supports manual definition; awaiting Stellar adapter enhancement

**Current Stellar Adapter Status** (verified 2025-12-03):

The Stellar adapter's `getContractDefinitionInputs()` currently returns **only** the `contractAddress` field:

```typescript
// adapter.ts lines 184-196
public getContractDefinitionInputs(): FormFieldType[] {
  return [
    {
      id: 'contractAddress',
      name: 'contractAddress',
      label: 'Contract ID',
      type: 'blockchain-address',
      validation: { required: true },
      placeholder: 'C...',
      helperText: 'Enter the Stellar contract ID (C...).',
    },
  ];
}
```

**Documented Future Plan** (adapter.ts lines 157-180):

The adapter has a detailed NOTE documenting the planned approach:

- Add optional `contractDefinition` field (type: `code-editor`, language: `json`)
- File upload support for both JSON and Wasm binary content
- Auto-detect content type (JSON vs Wasm using magic bytes `\0asm`)
- For JSON: Parse and validate as Soroban spec
- For Wasm: Extract embedded spec from binary locally (no RPC)
- Set `source: 'manual'` for user-provided definitions

**Role Manager Strategy**:

- Architecture is ready: dynamic form rendering + storage with `source: 'manual'`
- When adapter adds `contractDefinition` to inputs, Role Manager automatically supports it
- US2 (Manual Definition) is **blocked** until adapter enhancement
- MVP proceeds with RPC-only loading (US1, US3, US4)

### 6. Package Integration Requirements

**Decision**: Add `@openzeppelin/ui-builder-renderer` as new dependency

**Script Updates Required**:

1. **`scripts/setup-local-dev.cjs`** - Add to `UI_BUILDER_PACKAGES` array:

```javascript
const UI_BUILDER_PACKAGES = [
  // ... existing packages
  '@openzeppelin/ui-builder-renderer', // NEW
];
```

2. **`apps/role-manager/package.json`** - Add dependency:

```json
{
  "dependencies": {
    "@openzeppelin/ui-builder-renderer": "latest"
  }
}
```

**Rationale**:

- `pack-ui-builder.sh` auto-packs all packages, no changes needed
- `setup-local-dev.cjs` needs the package in its list for local dev mode

### 7. Database Migration Strategy

**Decision**: Add new indexes to existing `recentContracts` store via Dexie version upgrade

**Implementation**:

```typescript
// database.ts
export const db = createDexieDatabase('RoleManager', [
  {
    version: 1,
    stores: {
      recentContracts: '++id, &[networkId+address], [networkId+lastAccessed]',
      userPreferences: '&key',
    },
  },
  {
    version: 2, // NEW - adds index for source filtering
    stores: {
      recentContracts: '++id, &[networkId+address], [networkId+lastAccessed], source',
      userPreferences: '&key',
    },
  },
]);
```

**Rationale**:

- Dexie handles version migrations automatically
- Existing compound unique index `[networkId+address]` already prevents duplicates
- New `source` index enables efficient queries for refreshable schemas

## Summary of Decisions

| Area              | Decision                                       | Confidence |
| ----------------- | ---------------------------------------------- | ---------- |
| Form Rendering    | `DynamicFormField` from renderer               | High       |
| Storage Pattern   | Extend `RecentContractRecord` with schema data | High       |
| Circuit Breaker   | 3 failures / 30s timeout                       | High       |
| Schema Comparison | Adapter method + JSON fallback                 | Medium     |
| Manual Definition | JSON spec first, Wasm future                   | High       |
| Package Setup     | Add renderer to setup scripts                  | High       |
| Database          | Dexie version 2 adds source index              | High       |
