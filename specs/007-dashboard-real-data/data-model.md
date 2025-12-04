# Data Model: Dashboard Real Data Integration

**Feature**: 007-dashboard-real-data  
**Date**: 2025-12-04

## Entities

### 1. ContractContextValue

**Purpose**: Shared state provided by ContractContext to entire application.

```typescript
interface ContractContextValue {
  // Selected contract from storage
  selectedContract: ContractRecord | null;
  setSelectedContract: (contract: ContractRecord | null) => void;

  // Selected network
  selectedNetwork: NetworkConfig | null;
  setSelectedNetwork: (network: NetworkConfig | null) => void;

  // Loaded adapter for selected network
  adapter: ContractAdapter | null;
  isAdapterLoading: boolean;

  // List of contracts for current network
  contracts: ContractRecord[];
  isContractsLoading: boolean;
}
```

**Relationships**:

- `selectedContract` references `RecentContractRecord` from storage
- `selectedNetwork` references `NetworkConfig` from adapter packages
- `adapter` is loaded based on `selectedNetwork.ecosystem`
- `contracts` filtered by `selectedNetwork.id`

---

### 2. DashboardData

**Purpose**: Aggregated view model for Dashboard display.

```typescript
interface DashboardData {
  // Contract information (from selectedContract + network)
  contractInfo: {
    label: string;
    address: string;
    networkId: string;
    networkName: string;
    explorerUrl: string | null;
    // Capabilities used for FeatureBadge display (AccessControl, Ownable badges)
    capabilities: AccessControlCapabilities | null;
  } | null;

  // Statistics
  statistics: {
    rolesCount: number | null; // null when loading or N/A
    uniqueAccountsCount: number | null; // null when loading
    hasAccessControl: boolean;
    hasOwnable: boolean;
  };

  // Data state
  state: {
    isLoading: boolean;
    isRefreshing: boolean;
    hasError: boolean;
    errorMessage: string | null;
    canRetry: boolean;
  };
}
```

**Note**: Contract type display uses `FeatureBadge` components directly from capabilities (e.g., "AccessControl", "Ownable" badges) rather than a string classification.

**Derived From**:

- `contractInfo` ← `RecentContractRecord` + `NetworkConfig`
- `statistics.rolesCount` ← `useContractRoles().roles.length`
- `statistics.uniqueAccountsCount` ← computed from `roles[].members`
- `state` ← combined from `useContractRoles` and `useContractOwnership`

---

### 3. AccessSnapshot (Export Format)

**Purpose**: JSON export format for access control state download.

```typescript
interface AccessSnapshot {
  // Metadata
  version: '1.0';
  exportedAt: string; // ISO 8601 timestamp

  // Contract identification
  contract: {
    address: string;
    label: string | null;
    networkId: string;
    networkName: string;
  };

  // Capabilities
  capabilities: {
    hasAccessControl: boolean;
    hasOwnable: boolean;
    hasEnumerableRoles?: boolean;
  };

  // Access control state
  roles: Array<{
    roleId: string;
    roleName: string;
    members: string[]; // Array of addresses
  }>;

  // Ownership state
  ownership: {
    owner: string | null;
    pendingOwner?: string | null;
  };
}
```

**Serialization Rules**:

- JSON format with 2-space indentation
- Addresses stored as full strings (not truncated)
- Timestamps in ISO 8601 format
- `null` values preserved (not omitted)

**Filename Pattern**: `access-snapshot-{address-truncated}-{ISO-timestamp}.json`

- Address truncated to `{first4}...{last4}` (e.g., `GCKF...MTGG`)
- Timestamp with colons replaced by dashes for filesystem safety

---

### 4. UseDashboardDataReturn

**Purpose**: Return type for `useDashboardData` hook.

```typescript
interface UseDashboardDataReturn {
  // Contract info (null if no contract selected)
  contractInfo: DashboardData['contractInfo'];

  // Statistics
  rolesCount: number | null;
  uniqueAccountsCount: number | null;
  hasAccessControl: boolean;
  hasOwnable: boolean;

  // State flags
  isLoading: boolean;
  isRefreshing: boolean;
  hasError: boolean;
  errorMessage: string | null;
  canRetry: boolean;

  // Actions
  refetch: () => Promise<void>;

  // Export (delegates to useExportSnapshot)
  exportSnapshot: () => void;
  isExporting: boolean;
  exportError: string | null;
}
```

---

## Existing Entities (Referenced)

### RecentContractRecord (from spec 006)

```typescript
interface RecentContractRecord {
  id: string;
  networkId: string;
  address: string;
  label?: string;
  lastAccessed: number;
  createdAt: number;

  // Schema fields (from spec 005)
  ecosystem?: string;
  schema?: string; // JSON-serialized ContractSchema
  schemaHash?: string;
  source?: 'fetched' | 'manual';
  definitionOriginal?: string;
  schemaMetadata?: object;

  // Capabilities (from spec 006)
  capabilities?: AccessControlCapabilities;
}
```

### AccessControlCapabilities (from @openzeppelin/ui-builder-types)

```typescript
interface AccessControlCapabilities {
  hasAccessControl: boolean;
  hasOwnable: boolean;
  hasEnumerableRoles?: boolean;
  // ... additional capability flags
}
```

### RoleAssignment (from @openzeppelin/ui-builder-types)

```typescript
interface RoleAssignment {
  roleId: string;
  roleName: string;
  members: string[];
}
```

---

## State Transitions

### Dashboard Loading States

```
NO_CONTRACT_SELECTED
    ↓ user selects contract
LOADING_DATA
    ↓ data fetched successfully
DATA_LOADED
    ↓ user clicks "Refresh Data"
REFRESHING
    ↓ refresh complete
DATA_LOADED

LOADING_DATA / REFRESHING
    ↓ error occurs
ERROR_STATE
    ↓ user clicks "Retry"
LOADING_DATA
```

### State Determination Logic

```typescript
// Pseudo-code for state derivation
const state = useMemo(() => {
  if (!selectedContract) return 'NO_CONTRACT_SELECTED';
  if (rolesLoading || ownershipLoading) {
    return isRefreshing ? 'REFRESHING' : 'LOADING_DATA';
  }
  if (rolesError || ownershipError) return 'ERROR_STATE';
  return 'DATA_LOADED';
}, [selectedContract, rolesLoading, ownershipLoading, rolesError, ownershipError, isRefreshing]);
```

---

## Validation Rules

| Field                             | Rule                                                     |
| --------------------------------- | -------------------------------------------------------- |
| `AccessSnapshot.version`          | Must be `'1.0'`                                          |
| `AccessSnapshot.exportedAt`       | Valid ISO 8601 timestamp                                 |
| `AccessSnapshot.contract.address` | Non-empty string                                         |
| `AccessSnapshot.roles[].members`  | Array of valid address strings                           |
| `uniqueAccountsCount`             | Non-negative integer, `null` if data unavailable         |
| `rolesCount`                      | Non-negative integer, `null` if not supported or loading |
