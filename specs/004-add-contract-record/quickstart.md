# Quickstart: Add Contract Record

**Feature**: 004-add-contract-record  
**Date**: 2025-12-02

## Overview

This feature adds the ability for users to add and delete contract records via a dialog in the sidebar. It includes network-specific address validation using blockchain adapters.

## Prerequisites

- Node.js 18+
- pnpm 8+
- Access to `@openzeppelin/ui-builder-*` packages (via local tarball workflow)

## Quick Setup

```bash
# Navigate to role-manager app
cd apps/role-manager

# Ensure dependencies are installed
pnpm install

# Start development server
pnpm dev
```

## Key Files to Implement

### 1. Components

| File                                             | Purpose              |
| ------------------------------------------------ | -------------------- |
| `src/components/Contracts/AddContractDialog.tsx` | Main dialog wrapper  |
| `src/components/Contracts/AddContractForm.tsx`   | Form with validation |
| `src/components/Contracts/index.ts`              | Barrel export        |

### 2. Core Services

| File                                      | Purpose                                                 |
| ----------------------------------------- | ------------------------------------------------------- |
| `src/core/ecosystems/ecosystemManager.ts` | Local adapter/network manager (adapted from UI Builder) |

### 3. Hooks

| File                             | Purpose                        |
| -------------------------------- | ------------------------------ |
| `src/hooks/useContractForm.ts`   | Form state and validation      |
| `src/hooks/useNetworkAdapter.ts` | Adapter loading for validation |

### 4. Modifications

| File                                         | Change                                           |
| -------------------------------------------- | ------------------------------------------------ |
| `src/components/Layout/AccountSelector.tsx`  | Rename to `ContractSelector`, add delete handler |
| `src/components/Layout/Sidebar.tsx`          | Add dialog state, wire up trigger                |
| `src/hooks/useRecentContracts.ts`            | Expose `deleteContract` method                   |
| `src/core/storage/RecentContractsStorage.ts` | Add `deleteContract` method                      |

## Implementation Order

1. **Ecosystem Manager** - Create local `ecosystemManager.ts` (adapted from UI Builder)
2. **Storage Layer** - Add delete method to `RecentContractsStorage`
3. **Hook Extension** - Expose delete in `useRecentContracts`
4. **Adapter Hook** - Create `useNetworkAdapter` for validation
5. **Form Hook** - Create `useContractForm` with validation logic
6. **Form Component** - Create `AddContractForm`
7. **Dialog Component** - Create `AddContractDialog`
8. **Selector Update** - Rename and extend `AccountSelector` → `ContractSelector`
9. **Integration** - Wire everything up in `Sidebar`

## Testing

```bash
# Run all tests
pnpm test

# Run tests in watch mode
pnpm test:watch

# Run specific test file
pnpm test src/hooks/__tests__/useContractForm.test.ts
```

### Test Files to Create

- `src/hooks/__tests__/useContractForm.test.ts`
- `src/hooks/__tests__/useNetworkAdapter.test.ts`
- `src/core/storage/__tests__/RecentContractsStorage.delete.test.ts`

## Key Imports

```typescript
// Types
import type { ContractAdapter, NetworkConfig } from '@openzeppelin/ui-builder-types';
// UI Components
import {
  Button,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  NetworkSelector,
} from '@openzeppelin/ui-builder-ui';

// Local - Ecosystem Management (local implementation, see research.md)
import { getAdapter, getNetworksByEcosystem } from '@/core/ecosystems/ecosystemManager';
import { ECOSYSTEM_ORDER, getEcosystemDefaultFeatureConfig } from '@/core/ecosystems/registry';
import { recentContractsStorage } from '@/core/storage/RecentContractsStorage';
```

## Validation Logic

```typescript
// Address validation pattern
const validateAddress = async (address: string, networkConfig: NetworkConfig) => {
  if (!address) return 'Address is required';

  const adapter = await getAdapter(networkConfig);
  if (!adapter.isValidAddress(address)) {
    return 'Invalid address format for selected network';
  }

  return true;
};

// Name validation
const validateName = (name: string) => {
  if (!name) return 'Name is required';
  if (name.length > 64) return 'Name must be 64 characters or less';
  return true;
};
```

## Common Issues

### Adapter Loading

Adapters are loaded asynchronously. Ensure validation waits for adapter:

```typescript
// ❌ Wrong - adapter might not be loaded
if (!adapter.isValidAddress(value)) { ... }

// ✅ Correct - check adapter exists first
if (!adapter) return 'Select a network first';
if (!adapter.isValidAddress(value)) { ... }
```

### Network Change Re-validation

When network changes, re-trigger address validation:

```typescript
const networkId = watch('networkId');
useEffect(() => {
  trigger('address');
}, [networkId, trigger]);
```

### Delete Protection

Never allow deleting the currently selected contract:

```typescript
onRemoveContract={(contract) => {
  if (contract.id !== selectedContract?.id) {
    deleteContract(contract.id);
  }
}}
```

## Definition of Done

- [ ] User can open "Add Contract" dialog from sidebar
- [ ] Dialog has Name, Address, and Network fields
- [ ] Address validation works per network type
- [ ] Form shows appropriate error messages
- [ ] Successful add closes dialog and selects new contract
- [ ] User can delete non-selected contracts from dropdown
- [ ] All new logic has unit tests
- [ ] No TypeScript errors
- [ ] No linting errors
