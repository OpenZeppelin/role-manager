# Research: Add Contract Record

**Feature**: 004-add-contract-record  
**Date**: 2025-12-02

## Research Tasks

### 1. Network Selector Integration & Ecosystem Manager

**Question**: How to integrate with the existing `NetworkSelector` component from UI Builder and get network configurations?

**Decision**: Create a **local `ecosystemManager.ts`** in Role Manager, adapted from the UI Builder's builder package pattern. The `NetworkSelector` component from `@openzeppelin/ui-builder-ui` is reusable as-is.

**Rationale**:

- The `ecosystemManager` in UI Builder is part of the **private** `@openzeppelin/ui-builder-builder` package (not published)
- It cannot be directly imported - would require copying the pattern locally
- Each adapter package (`adapter-evm`, `adapter-stellar`, etc.) directly exports its `Adapter` class and `Networks` list
- The `NetworkSelector` component is generic and accepts networks via props with accessor functions

**Why ecosystemManager can't move upstream easily**:

- Dynamic imports to all adapters would either bundle everything (bad for size) or require complex peer dependency configuration
- 17+ files in builder depend on it
- Would need a new package or significant refactoring

**Implementation Pattern**:

```typescript
// Local ecosystemManager.ts - adapted from builder package
// src/core/ecosystems/ecosystemManager.ts

/**
 * Ecosystem Manager for Role Manager
 *
 * This is a local implementation adapted from the UI Builder's builder package.
 *
 * TODO: Consider extracting to a shared @openzeppelin/ui-builder-ecosystem package
 * upstream to avoid duplication across consuming applications.
 */

import type { ContractAdapter, Ecosystem, NetworkConfig } from '@openzeppelin/ui-builder-types';

// Dynamic imports for lazy loading
async function loadAdapterPackageModule(ecosystem: Ecosystem): Promise<Record<string, unknown>> {
  switch (ecosystem) {
    case 'evm':
      return import('@openzeppelin/ui-builder-adapter-evm');
    case 'solana':
      return import('@openzeppelin/ui-builder-adapter-solana');
    case 'stellar':
      return import('@openzeppelin/ui-builder-adapter-stellar');
    case 'midnight':
      return import('@openzeppelin/ui-builder-adapter-midnight');
    default:
      throw new Error(`Unknown ecosystem: ${ecosystem}`);
  }
}

export async function getNetworksByEcosystem(ecosystem: Ecosystem): Promise<NetworkConfig[]> {
  const module = await loadAdapterPackageModule(ecosystem);
  const networksExportName = `${ecosystem}Networks`;
  return (module[networksExportName] as NetworkConfig[]) || [];
}

export async function getAdapter(networkConfig: NetworkConfig): Promise<ContractAdapter> {
  const module = await loadAdapterPackageModule(networkConfig.ecosystem);
  const AdapterClass = module[`${capitalize(networkConfig.ecosystem)}Adapter`];
  return new (AdapterClass as new (config: NetworkConfig) => ContractAdapter)(networkConfig);
}
```

```typescript
// Usage with NetworkSelector
const networks = await Promise.all(
  ECOSYSTEM_ORDER.filter(eco => getEcosystemDefaultFeatureConfig(eco).enabled)
    .map(eco => getNetworksByEcosystem(eco))
);
const allNetworks = networks.flat();

<NetworkSelector
  networks={allNetworks}
  selectedNetwork={selected}
  onSelectNetwork={setSelected}
  getNetworkLabel={(n) => n.name}
  getNetworkIcon={(n) => n.iconComponent}
  getNetworkType={(n) => n.type}
  getNetworkId={(n) => n.id}
  getEcosystem={(n) => n.ecosystem}
  groupByEcosystem
/>
```

**Alternatives Considered**:

- Import from `@openzeppelin/ui-builder-builder`: Rejected - private package, not published
- Manual network list: Rejected - would duplicate data and miss updates
- Propose upstream package immediately: Deferred - tracked as future initiative

---

### 2. Adapter Loading for Address Validation

**Question**: How to load the appropriate adapter for address validation based on selected network?

**Decision**: Use the **local** `ecosystemManager.getAdapter(networkConfig)` to get the adapter instance, then call `adapter.isValidAddress(address)` for validation.

**Rationale**:

- The `ContractAdapter` interface defines `isValidAddress(address, addressType?)` method
- Adapters are loaded lazily via `getAdapter()` which returns a `Promise<ContractAdapter>`
- Validation is synchronous once adapter is loaded (per ASSUMP-004)
- Local ecosystemManager mirrors the pattern from UI Builder's builder package

**Implementation Pattern**:

```typescript
// Hook to manage adapter for selected network
function useNetworkAdapter(networkConfig: NetworkConfig | null) {
  const [adapter, setAdapter] = useState<ContractAdapter | null>(null);

  useEffect(() => {
    if (!networkConfig) {
      setAdapter(null);
      return;
    }
    getAdapter(networkConfig).then(setAdapter);
  }, [networkConfig?.id]);

  return adapter;
}

// Validation in form
const validateAddress = (address: string) => {
  if (!adapter) return 'Select a network first';
  if (!address) return 'Address is required';
  if (!adapter.isValidAddress(address)) {
    return 'Invalid address format for selected network';
  }
  return true;
};
```

**Alternatives Considered**:

- Pre-load all adapters: Rejected - unnecessary bundle size and memory usage
- Validate server-side: Rejected - violates client-side SPA requirement

---

### 3. Dynamic Address Placeholder

**Question**: How to generate network-specific address placeholder text?

**Decision**: Use ecosystem registry's `addressExample` property combined with ecosystem name prefix for placeholder text.

**Rationale**:

- The `ECOSYSTEM_REGISTRY` already has `addressExample` for EVM ("0x...")
- Pattern should be extended for other ecosystems
- Placeholder format matches mock: "eth: 0xA1B2C3D4E5F67890ABCD1234E56789ABCDEF12"

**Implementation Pattern**:

```typescript
function getAddressPlaceholder(network: NetworkConfig | null): string {
  if (!network) return 'Select a network first';

  const ecosystemInfo = ECOSYSTEM_REGISTRY[network.ecosystem];
  const prefix = network.ecosystem === 'evm' ? 'eth' : network.ecosystem;
  const example = ecosystemInfo?.addressExample || '...';

  return `${prefix}: ${example}`;
}
```

**Note**: May need to extend `ECOSYSTEM_REGISTRY` with address examples for non-EVM ecosystems.

---

### 4. Form State Management

**Question**: What pattern to use for form state and validation?

**Decision**: Use `react-hook-form` with custom validation functions that integrate with the adapter.

**Rationale**:

- Consistent with UI Builder form patterns
- Supports async validation (for adapter loading)
- Provides good TypeScript support and performance

**Implementation Pattern**:

```typescript
interface AddContractFormData {
  name: string;
  address: string;
  networkId: string;
}

const { control, handleSubmit, watch, trigger } = useForm<AddContractFormData>({
  mode: 'onChange',
  defaultValues: { name: '', address: '', networkId: '' },
});

// Re-validate address when network changes
const networkId = watch('networkId');
useEffect(() => {
  trigger('address');
}, [networkId, trigger]);
```

**Alternatives Considered**:

- Formik: Rejected - react-hook-form is already used in UI Builder
- Uncontrolled form: Rejected - need real-time validation feedback

---

### 5. Delete Contract Implementation

**Question**: How to implement contract deletion from the dropdown?

**Decision**: Extend `useRecentContracts` hook to expose a `delete` method using the existing `EntityStorage.delete()` method.

**Rationale**:

- `EntityStorage` base class already has `delete(id)` method
- The hook pattern with `expose` function allows adding methods
- Deletion is immediate (no soft delete needed per requirements)

**Implementation Pattern**:

```typescript
// In RecentContractsStorage class
async deleteContract(id: string): Promise<void> {
  await this.delete(id);
}

// In useRecentContracts hook
expose: (repo) => ({
  addOrUpdate: repo.addOrUpdate.bind(repo),
  getByNetwork: repo.getByNetwork.bind(repo),
  deleteContract: repo.deleteContract.bind(repo), // NEW
}),
```

**UI Pattern** (in ContractSelector):

```typescript
onRemoveAccount={(contract) => {
  if (contract.id !== selectedContract?.id) {
    recentContracts.deleteContract(contract.id);
  }
}}
```

---

### 6. Dialog Component Pattern

**Question**: Which dialog component to use and how to structure it?

**Decision**: Use `Dialog` from `@openzeppelin/ui-builder-ui` (shadcn/radix-based) with controlled open state.

**Rationale**:

- UI Builder already exports Dialog components
- Follows OpenZeppelin design system
- Supports accessible modal behavior

**Implementation Pattern**:

```typescript
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from '@openzeppelin/ui-builder-ui';

function AddContractDialog({ open, onOpenChange, onSubmit }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Contract</DialogTitle>
        </DialogHeader>
        <AddContractForm onSubmit={onSubmit} onCancel={() => onOpenChange(false)} />
        <DialogFooter>
          {/* Cancel and Add buttons */}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

---

## Dependencies to Add

None required. All dependencies are already available:

- `@openzeppelin/ui-builder-ui` - Dialog, Button, Input, Label, NetworkSelector
- `@openzeppelin/ui-builder-storage` - EntityStorage, createRepositoryHook
- `@openzeppelin/ui-builder-types` - NetworkConfig, ContractAdapter, Ecosystem
- `react-hook-form` - Already used by UI Builder form components

## Open Questions Resolved

| Question                      | Resolution                                             |
| ----------------------------- | ------------------------------------------------------ |
| How to get networks?          | Local ecosystemManager.getNetworksByEcosystem()        |
| How to validate addresses?    | adapter.isValidAddress() after local getAdapter()      |
| Is ecosystemManager reusable? | No - create local copy (private package in UI Builder) |
| How to handle form state?     | react-hook-form with custom validation                 |
| How to delete contracts?      | Extend hook to expose delete method                    |
| What dialog component?        | Dialog from ui-builder-ui                              |
