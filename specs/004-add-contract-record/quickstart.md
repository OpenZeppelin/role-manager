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

## Key Files Implemented

### 1. Components

| File                                                    | Purpose                           | Status |
| ------------------------------------------------------- | --------------------------------- | ------ |
| `src/components/Contracts/AddContractDialog.tsx`        | Main dialog wrapper               | ✅     |
| `src/components/Contracts/AddContractForm.tsx`          | Form with two-step ecosystem flow | ✅     |
| `src/components/Contracts/CompactEcosystemSelector.tsx` | Compact 2-column ecosystem picker | ✅     |
| `src/components/Contracts/index.ts`                     | Barrel export                     | ✅     |

### 2. Core Services

| File                                      | Purpose                                                 | Status |
| ----------------------------------------- | ------------------------------------------------------- | ------ |
| `src/core/ecosystems/ecosystemManager.ts` | Local adapter/network manager (adapted from UI Builder) | ✅     |
| `src/core/ecosystems/registry.ts`         | Ecosystem configs (Stellar enabled, EVM coming soon)    | ✅     |

### 3. Hooks

| File                                  | Purpose                                    | Status |
| ------------------------------------- | ------------------------------------------ | ------ |
| `src/hooks/useNetworkAdapter.ts`      | Adapter loading for address validation     | ✅     |
| `src/hooks/useAllNetworks.ts`         | Fetch networks from all enabled ecosystems | ✅     |
| `src/hooks/useNetworksByEcosystem.ts` | Lazy-load networks for single ecosystem    | ✅     |

### 4. Modifications

| File                                         | Change                            | Status |
| -------------------------------------------- | --------------------------------- | ------ |
| `src/components/Layout/Sidebar.tsx`          | Add dialog state, wire up trigger | ✅     |
| `src/hooks/useRecentContracts.ts`            | Expose `deleteContract` method    | ✅     |
| `src/core/storage/RecentContractsStorage.ts` | Add `deleteContract` method       | ✅     |

### 5. Pending

| File                                        | Change                                           | Status |
| ------------------------------------------- | ------------------------------------------------ | ------ |
| `src/components/Layout/AccountSelector.tsx` | Rename to `ContractSelector`, add delete handler | ⏳     |

## Implementation Order (Completed)

1. ✅ **Ecosystem Manager** - Create local `ecosystemManager.ts` (adapted from UI Builder)
2. ✅ **Storage Layer** - Add delete method to `RecentContractsStorage`
3. ✅ **Hook Extension** - Expose delete in `useRecentContracts`
4. ✅ **Adapter Hook** - Create `useNetworkAdapter` for validation
5. ✅ **Networks Hook** - Create `useNetworksByEcosystem` for lazy loading
6. ✅ **Ecosystem Selector** - Create `CompactEcosystemSelector` component
7. ✅ **Form Component** - Create `AddContractForm` with two-step flow
8. ✅ **Dialog Component** - Create `AddContractDialog`
9. ✅ **Integration** - Wire everything up in `Sidebar`
10. ⏳ **Selector Update** - Rename and extend `AccountSelector` → `ContractSelector`

## Two-Step Ecosystem Flow

The form uses a two-step flow for lazy adapter loading:

```
┌─────────────────────────────────────────────────────────────────┐
│ Add Contract Dialog                                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│ Blockchain                                                       │
│ ┌────────────────────┐  ┌────────────────────┐                  │
│ │ ✓ Stellar          │  │   Ethereum (EVM)   │                  │
│ │                    │  │   Coming Soon      │                  │
│ └────────────────────┘  └────────────────────┘                  │
│                                                                  │
│ Network (only shown after ecosystem selected)                    │
│ ┌────────────────────────────────────────────┐                  │
│ │ Select a network...                      ▼ │                  │
│ └────────────────────────────────────────────┘                  │
│                                                                  │
│ Contract Name (only shown after network selected)                │
│ ┌────────────────────────────────────────────┐                  │
│ │ My Contract                                │                  │
│ └────────────────────────────────────────────┘                  │
│                                                                  │
│ Contract Address                                                 │
│ ┌────────────────────────────────────────────┐                  │
│ │ GCKF...MTGG                                │                  │
│ └────────────────────────────────────────────┘                  │
│                                                                  │
│                                    [Cancel]  [Add]               │
└─────────────────────────────────────────────────────────────────┘
```

**Key behaviors:**

- First enabled ecosystem auto-selected on dialog open
- Adapters load lazily (only when ecosystem selected)
- Network dropdown appears after ecosystem selection
- Name/Address fields appear after network selection

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

### Phase 3 Complete (MVP)

- [x] User can open "Add Contract" dialog from sidebar
- [x] Dialog shows ecosystem selector with Stellar enabled, EVM "Coming Soon"
- [x] First enabled ecosystem is auto-selected on dialog open
- [x] Networks load lazily after ecosystem selection
- [x] Dialog has Network, Name, and Address fields (progressive disclosure)
- [x] Address validation works per network type (via adapter)
- [x] Form shows appropriate error messages
- [x] Successful add closes dialog
- [x] All new hook logic has unit tests
- [x] No TypeScript errors
- [x] No linting errors

### Phase 4-5 Pending

- [ ] User can delete non-selected contracts from dropdown
- [ ] Successful add auto-selects new contract (wiring needed)
- [ ] AccountSelector renamed to ContractSelector
