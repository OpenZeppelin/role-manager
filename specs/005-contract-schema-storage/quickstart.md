# Quickstart: Contract Schema Loading and Storage

**Feature**: 005-contract-schema-storage  
**Date**: 2025-12-03

## Prerequisites

1. **Local Development Setup** (if using local UI Builder packages):

   ```bash
   # From contracts-ui-builder repo
   ./scripts/pack-ui-builder.sh

   # From role-manager repo
   node scripts/setup-local-dev.cjs local
   ```

2. **Install New Dependency**:

   ```bash
   pnpm add @openzeppelin/ui-builder-renderer
   ```

3. **Update setup-local-dev.cjs** (for local dev mode):

   ```javascript
   // Add to UI_BUILDER_PACKAGES array
   '@openzeppelin/ui-builder-renderer',
   ```

## Implementation Steps

### Step 1: Extend RecentContractRecord Type

```typescript
// apps/role-manager/src/types/storage.ts
import type { BaseRecord } from '@openzeppelin/ui-builder-storage';
import type { Ecosystem } from '@openzeppelin/ui-builder-types';

export interface ContractSchemaMetadata {
  fetchedFrom?: string;
  fetchTimestamp?: number;
  contractName?: string;
}

/**
 * Extended RecentContractRecord with optional schema fields.
 * A contract can exist with just basic info, and gain schema data when loaded.
 */
export interface RecentContractRecord extends BaseRecord {
  // Existing fields (from spec 004)
  networkId: string;
  address: string;
  label?: string;
  lastAccessed: number;

  // NEW: Optional schema fields
  ecosystem?: Ecosystem;
  schema?: string; // JSON-serialized ContractSchema
  schemaHash?: string;
  source?: 'fetched' | 'manual';
  definitionOriginal?: string;
  definitionArtifacts?: Record<string, unknown>;
  schemaMetadata?: ContractSchemaMetadata;
}
```

### Step 2: Update Database Schema

```typescript
// apps/role-manager/src/core/storage/database.ts
import { createDexieDatabase } from '@openzeppelin/ui-builder-storage';

export const db = createDexieDatabase('RoleManager', [
  {
    version: 1,
    stores: {
      recentContracts: '++id, &[networkId+address], [networkId+lastAccessed]',
      userPreferences: '&key',
    },
  },
  {
    version: 2, // NEW VERSION - adds source index
    stores: {
      recentContracts: '++id, &[networkId+address], [networkId+lastAccessed], source',
      userPreferences: '&key',
    },
  },
]);
```

### Step 3: Extend RecentContractsStorage (TDD)

```typescript
// apps/role-manager/src/core/storage/__tests__/RecentContractsStorage.test.ts
// Add new tests for schema methods

describe('RecentContractsStorage - Schema Methods', () => {
  let storage: RecentContractsStorage;

  beforeEach(async () => {
    storage = new RecentContractsStorage();
    // Clear test data
  });

  it('should add schema to existing contract', async () => {
    // First add basic contract
    const id = await storage.addOrUpdate({
      networkId: 'stellar-testnet',
      address: 'CTEST...',
      label: 'Test Contract',
    });

    // Then add schema
    await storage.addOrUpdateWithSchema({
      networkId: 'stellar-testnet',
      address: 'CTEST...',
      ecosystem: 'stellar',
      schema: mockSchema,
      source: 'fetched',
    });

    const record = await storage.getByAddressAndNetwork('CTEST...', 'stellar-testnet');
    expect(record?.schema).toBeDefined();
    expect(record?.source).toBe('fetched');
  });

  it('should create contract with schema in one call', async () => {
    const id = await storage.addOrUpdateWithSchema({
      networkId: 'stellar-testnet',
      address: 'CNEW...',
      ecosystem: 'stellar',
      schema: mockSchema,
      source: 'manual',
    });

    const record = await storage.getByAddressAndNetwork('CNEW...', 'stellar-testnet');
    expect(record).toBeDefined();
    expect(record?.schema).toBeDefined();
  });

  it('should only return fetched contracts for refresh', async () => {
    await storage.addOrUpdateWithSchema({ source: 'fetched', ... });
    await storage.addOrUpdateWithSchema({ source: 'manual', ... });

    const refreshable = await storage.getRefreshableContracts();
    expect(refreshable.every((r) => r.source === 'fetched')).toBe(true);
  });

  it('should clear schema but keep basic contract info', async () => {
    await storage.addOrUpdateWithSchema({ ... });
    await storage.clearSchema(id);

    const record = await storage.getByAddressAndNetwork(...);
    expect(record?.address).toBeDefined();
    expect(record?.schema).toBeUndefined();
  });
});
```

### Step 4: Implement Schema Methods

```typescript
// apps/role-manager/src/core/storage/RecentContractsStorage.ts
// Add these methods to existing class

import { simpleHash } from '@openzeppelin/ui-builder-utils';
import type { ContractSchema } from '@openzeppelin/ui-builder-types';

// Add to RecentContractsStorage class:

async addOrUpdateWithSchema(input: ContractSchemaInput): Promise<string> {
  const schemaJson = JSON.stringify(input.schema);
  const schemaHash = simpleHash(schemaJson);

  return await withQuotaHandling(this.tableName, async () => {
    const existing = await this.getByAddressAndNetwork(input.address, input.networkId);

    const schemaFields = {
      ecosystem: input.ecosystem,
      schema: schemaJson,
      schemaHash,
      source: input.source,
      definitionOriginal: input.definitionOriginal,
      definitionArtifacts: input.definitionArtifacts,
      schemaMetadata: input.schemaMetadata,
    };

    if (existing) {
      await this.update(String(existing.id), {
        ...schemaFields,
        lastAccessed: Date.now(),
      });
      return String(existing.id);
    }

    // Create new record with schema
    return await this.save({
      networkId: input.networkId,
      address: input.address,
      lastAccessed: Date.now(),
      ...schemaFields,
    });
  });
}

async getByAddressAndNetwork(
  address: string,
  networkId: string
): Promise<RecentContractRecord | null> {
  const normalized = normalizeAddress(address);
  const result = await this.table
    .where('[networkId+address]')
    .equals([networkId, normalized])
    .first();
  return result || null;
}

async hasSchema(address: string, networkId: string): Promise<boolean> {
  const record = await this.getByAddressAndNetwork(address, networkId);
  return record?.schema !== undefined;
}

async getRefreshableContracts(olderThanHours = 24): Promise<RecentContractRecord[]> {
  const threshold = Date.now() - olderThanHours * 60 * 60 * 1000;
  const fetched = await this.table.where('source').equals('fetched').toArray();
  return fetched.filter(
    (r) => r.schemaMetadata?.fetchTimestamp &&
           r.schemaMetadata.fetchTimestamp < threshold
  );
}

async updateSchema(id: string, updates: ContractSchemaUpdateInput): Promise<void> {
  const updateData: Partial<RecentContractRecord> = {};

  if (updates.schema) {
    updateData.schema = JSON.stringify(updates.schema);
    updateData.schemaHash = simpleHash(updateData.schema);
  }
  if (updates.definitionOriginal !== undefined) {
    updateData.definitionOriginal = updates.definitionOriginal;
  }
  if (updates.definitionArtifacts !== undefined) {
    updateData.definitionArtifacts = updates.definitionArtifacts;
  }
  if (updates.schemaMetadata !== undefined) {
    updateData.schemaMetadata = updates.schemaMetadata;
  }

  await this.update(id, updateData);
}

async clearSchema(id: string): Promise<void> {
  await this.update(id, {
    ecosystem: undefined,
    schema: undefined,
    schemaHash: undefined,
    source: undefined,
    definitionOriginal: undefined,
    definitionArtifacts: undefined,
    schemaMetadata: undefined,
  });
}
```

### Step 5: Create Loading Hook with Circuit Breaker

```typescript
// apps/role-manager/src/hooks/useContractSchemaLoader.ts
import { useCallback, useRef, useState } from 'react';

import type { ContractAdapter, ContractSchema } from '@openzeppelin/ui-builder-types';
import { simpleHash } from '@openzeppelin/ui-builder-utils';

interface CircuitBreakerState {
  key: string;
  attempts: number;
  lastFailure: number;
}

export function useContractSchemaLoader(adapter: ContractAdapter | null) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isCircuitBreakerActive, setIsCircuitBreakerActive] = useState(false);
  const circuitBreakerRef = useRef<CircuitBreakerState | null>(null);

  const load = useCallback(
    async (address: string, artifacts: Record<string, unknown>) => {
      if (!adapter || isLoading) return null;

      const attemptKey = `${address}-${simpleHash(JSON.stringify(artifacts))}`;
      const now = Date.now();

      // Circuit breaker check
      if (circuitBreakerRef.current) {
        const { key, attempts, lastFailure } = circuitBreakerRef.current;
        if (key === attemptKey && attempts >= 3 && now - lastFailure < 30000) {
          setIsCircuitBreakerActive(true);
          setTimeout(() => setIsCircuitBreakerActive(false), 5000);
          return null;
        }
      }

      setIsLoading(true);
      setError(null);

      try {
        const result = await adapter.loadContractWithMetadata(artifacts);
        // Reset circuit breaker on success
        circuitBreakerRef.current = null;
        setIsLoading(false);
        return result;
      } catch (err) {
        // Update circuit breaker
        if (circuitBreakerRef.current?.key === attemptKey) {
          circuitBreakerRef.current.attempts += 1;
          circuitBreakerRef.current.lastFailure = now;
        } else {
          circuitBreakerRef.current = { key: attemptKey, attempts: 1, lastFailure: now };
        }

        setError(err instanceof Error ? err.message : 'Unknown error');
        setIsLoading(false);
        return null;
      }
    },
    [adapter, isLoading]
  );

  const reset = useCallback(() => {
    setIsLoading(false);
    setError(null);
    setIsCircuitBreakerActive(false);
    circuitBreakerRef.current = null;
  }, []);

  return { load, isLoading, error, isCircuitBreakerActive, reset };
}
```

### Step 6: Create Dynamic Form Component

```typescript
// apps/role-manager/src/components/Contracts/ContractDefinitionForm.tsx
import { useForm } from 'react-hook-form';
import { DynamicFormField } from '@openzeppelin/ui-builder-renderer';
import type { ContractAdapter, FormFieldType } from '@openzeppelin/ui-builder-types';

interface Props {
  adapter: ContractAdapter;
  onSubmit: (data: Record<string, unknown>) => Promise<void>;
  isLoading?: boolean;
}

export function ContractDefinitionForm({ adapter, onSubmit, isLoading }: Props) {
  const fields = adapter.getContractDefinitionInputs();
  const { control, handleSubmit } = useForm();

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      {fields.map((field: FormFieldType) => (
        <DynamicFormField
          key={field.id}
          field={field}
          control={control}
        />
      ))}
      <button type="submit" disabled={isLoading}>
        {isLoading ? 'Loading...' : 'Load Contract'}
      </button>
    </form>
  );
}
```

## Usage Example

```typescript
// In AddContractForm or a new component
import { useNetworkAdapter } from '@/hooks/useNetworkAdapter';
import { useContractSchemaLoader } from '@/hooks/useContractSchemaLoader';
import { ContractDefinitionForm } from '@/components/Contracts/ContractDefinitionForm';
import { recentContractsStorage } from '@/core/storage';

function ContractLoadPage() {
  const { adapter } = useNetworkAdapter(selectedNetworkId);
  const { load, isLoading, error, isCircuitBreakerActive } = useContractSchemaLoader(adapter);

  const handleSubmit = async (formData: Record<string, unknown>) => {
    const result = await load(formData.contractAddress as string, formData);

    if (result) {
      // Save contract with schema using extended method
      await recentContractsStorage.addOrUpdateWithSchema({
        address: formData.contractAddress as string,
        networkId: selectedNetworkId,
        ecosystem: 'stellar',
        schema: result.schema,
        source: result.source,
        definitionOriginal: result.contractDefinitionOriginal,
        schemaMetadata: {
          fetchedFrom: result.metadata?.rpcUrl,
          fetchTimestamp: Date.now(),
          contractName: result.schema.name,
        },
      });
    }
  };

  if (isCircuitBreakerActive) {
    return <div>Too many failed attempts. Please try again in 30 seconds.</div>;
  }

  return (
    <div>
      {adapter && (
        <ContractDefinitionForm
          adapter={adapter}
          onSubmit={handleSubmit}
          isLoading={isLoading}
        />
      )}
      {error && <div className="text-destructive">{error}</div>}
    </div>
  );
}
```

## Testing Checklist

- [ ] Database migration adds `source` index to recentContracts
- [ ] Extended type allows records with or without schema
- [ ] `addOrUpdateWithSchema` creates or updates correctly
- [ ] `getByAddressAndNetwork` returns full record
- [ ] `hasSchema` correctly detects schema presence
- [ ] `getRefreshableContracts` excludes manual schemas
- [ ] `clearSchema` removes schema but keeps basic info
- [ ] Circuit breaker activates after 3 failures
- [ ] DynamicFormField renders adapter inputs correctly
- [ ] Error messages are user-friendly

## Key Differences from Original Plan

| Aspect         | Original                         | Updated                               |
| -------------- | -------------------------------- | ------------------------------------- |
| Storage        | Separate `ContractSchemaStorage` | Extend `RecentContractsStorage`       |
| Database table | New `contractSchemas` table      | Extend existing `recentContracts`     |
| Record type    | Separate `ContractSchemaRecord`  | Extended `RecentContractRecord`       |
| Complexity     | Two storage classes              | One storage class with schema methods |
