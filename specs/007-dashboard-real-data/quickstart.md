# Quickstart: Dashboard Real Data Integration

**Feature**: 007-dashboard-real-data  
**Date**: 2025-12-04

## Overview

This feature integrates the Dashboard page with real contract data. After implementation, the Dashboard will:

- Display actual contract information (name, address, network, type)
- Show live role and account statistics
- Support data refresh
- Enable JSON snapshot export

## Key Concepts

### 1. Contract Context

The application uses React Context to share the selected contract across all pages.

```tsx
// Accessing the selected contract in any component
import { useSelectedContract } from '../hooks/useSelectedContract';

function MyComponent() {
  const { selectedContract, adapter, isLoading } = useSelectedContract();

  if (!selectedContract) {
    return <div>No contract selected</div>;
  }

  return <div>Managing: {selectedContract.label}</div>;
}
```

### 2. Dashboard Data Hook

The `useDashboardData` hook aggregates all data needed for the Dashboard:

```tsx
import { useDashboardData } from '../hooks/useDashboardData';

function Dashboard() {
  const {
    contractInfo,
    rolesCount,
    uniqueAccountsCount,
    isLoading,
    hasError,
    refetch,
    exportSnapshot,
  } = useDashboardData();

  // Use the data...
}
```

### 3. Snapshot Export

Export current access control state as JSON:

```tsx
const { exportSnapshot, isExporting } = useDashboardData();

// In button click handler:
<Button onClick={exportSnapshot} disabled={isExporting}>
  {isExporting ? 'Exporting...' : 'Download Snapshot'}
</Button>;
```

Filename format: `access-snapshot-GCKF...MTGG-2025-12-04T10-30-00.json`

## File Structure

```
src/
├── context/
│   ├── ContractContext.tsx      # Context provider
│   └── index.ts
├── hooks/
│   ├── useDashboardData.ts      # Dashboard data aggregation
│   ├── useSelectedContract.ts   # Context consumer hook
│   └── index.ts
├── utils/
│   ├── snapshot.ts              # Filename generation
│   └── deduplication.ts         # Member counting
└── types/
    └── dashboard.ts             # Type definitions
```

## Testing

### Unit Tests

New hooks and utilities have unit tests:

```bash
# Run tests for this feature
pnpm test -- --grep "dashboard"
```

### Manual Testing

1. **With contract selected**:
   - Select a contract from the sidebar
   - Navigate to Dashboard
   - Verify contract info, roles count, accounts count
   - Click "Refresh Data" and verify counts update
   - Click "Download Snapshot" and verify JSON file

2. **Without contract selected**:
   - Remove all contracts or start fresh
   - Navigate to Dashboard
   - Verify empty state shows with "Add Contract" button

3. **Ownable-only contract**:
   - Load a contract that only supports Ownable
   - Verify Roles card shows "Not Supported" badge
   - Verify card is not clickable

## API Reference

### useDashboardData

```typescript
interface UseDashboardDataReturn {
  // Contract info
  contractInfo: {
    label: string;
    address: string;
    networkName: string;
    explorerUrl: string | null;
    contractType: string;
  } | null;

  // Statistics
  rolesCount: number | null;
  uniqueAccountsCount: number | null;
  hasAccessControl: boolean;
  hasOwnable: boolean;

  // State
  isLoading: boolean;
  isRefreshing: boolean;
  hasError: boolean;
  errorMessage: string | null;
  canRetry: boolean;

  // Actions
  refetch: () => Promise<void>;
  exportSnapshot: () => void;
  isExporting: boolean;
}
```

### useSelectedContract

```typescript
interface UseSelectedContractReturn {
  selectedContract: ContractRecord | null;
  setSelectedContract: (contract: ContractRecord | null) => void;
  selectedNetwork: NetworkConfig | null;
  setSelectedNetwork: (network: NetworkConfig | null) => void;
  adapter: ContractAdapter | null;
  isAdapterLoading: boolean;
  contracts: ContractRecord[];
  isContractsLoading: boolean;
}
```

## Troubleshooting

### "No contract selected" when contract is in sidebar

- Ensure the app is wrapped with `ContractProvider`
- Check browser console for context errors

### Stats show loading forever

- Verify the adapter loaded correctly
- Check network connectivity
- Look for errors in browser console

### Export downloads empty or malformed JSON

- Verify roles data loaded successfully
- Check for JavaScript errors during export
