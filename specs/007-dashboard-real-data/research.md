# Research: Dashboard Real Data Integration

**Feature**: 007-dashboard-real-data  
**Date**: 2025-12-04

## Research Topics

### 1. Contract Selection State Sharing Pattern

**Problem**: The selected contract is currently managed in `Sidebar.tsx` via `useState`. The Dashboard page (and other pages) need access to this state to display relevant data.

**Decision**: React Context + Provider pattern

**Rationale**:

- Standard React pattern for sharing state across component tree
- Avoids prop drilling through `MainLayout` → pages
- Works seamlessly with existing `react-router-dom` routing
- Allows any component to access selected contract without restructuring
- Context can also provide the loaded adapter, avoiding redundant adapter loading

**Alternatives Considered**:
| Alternative | Rejected Because |
|-------------|------------------|
| Prop drilling via MainLayout | Would require modifying MainLayout props and passing through routes; inflexible |
| URL state (query params) | Contract selection is session state, not navigation state; would clutter URLs |
| Zustand/Redux | Overkill for single piece of shared state; adds dependency |
| Local storage sync | Adds complexity; context is simpler for in-memory state |

**Implementation Notes**:

- Context will provide: `selectedContract`, `setSelectedContract`, `selectedNetwork`, `setSelectedNetwork`, `adapter`
- Provider wraps at `App.tsx` level (outside router but inside `BrowserRouter`)
- Sidebar becomes a consumer that calls `setSelectedContract`
- Dashboard becomes a consumer that reads `selectedContract` and `adapter`

---

### 2. Dashboard Data Aggregation Strategy

**Problem**: Dashboard needs to display:

- Contract info (from storage record)
- Roles count (from `useContractRoles`)
- Unique accounts count (computed from roles)
- Ownership info (from `useContractOwnership`)
- Loading/error states for each

**Decision**: Custom `useDashboardData` hook

**Rationale**:

- Single hook provides all Dashboard data needs
- Handles combined loading/error states
- Computes derived values (unique account count)
- Encapsulates data fetching logic away from UI component
- Testable in isolation

**Hook Interface**:

```typescript
interface UseDashboardDataReturn {
  // Contract info
  contractInfo: {
    label: string;
    address: string;
    networkName: string;
    explorerUrl?: string;
    contractType: string; // "Access Control", "Ownable", etc.
  } | null;

  // Statistics
  rolesCount: number | null;
  uniqueAccountsCount: number | null;
  hasAccessControl: boolean;
  hasOwnable: boolean;

  // States
  isLoading: boolean;
  isError: boolean;
  errorMessage: string | null;

  // Actions
  refetch: () => Promise<void>;

  // Export
  exportSnapshot: () => void;
  isExporting: boolean;
}
```

---

### 3. Unique Account Deduplication

**Problem**: The "Authorized Accounts" count should show unique addresses across all roles, not total role assignments.

**Decision**: Compute at hook level using Set

**Rationale**:

- Simple O(n) operation using JavaScript Set
- No external library needed
- Computed in `useDashboardData` hook when roles data changes
- Memoized to avoid recomputation on every render

**Implementation**:

```typescript
const uniqueAccountsCount = useMemo(() => {
  if (!roles || roles.length === 0) return 0;
  const uniqueAddresses = new Set<string>();
  roles.forEach((role) => {
    role.members.forEach((member) => uniqueAddresses.add(member));
  });
  return uniqueAddresses.size;
}, [roles]);
```

---

### 4. Snapshot Export Filename Generation

**Problem**: Snapshot files need unique, identifiable names following pattern: `access-snapshot-{address-truncated}-{timestamp}.json`

**Decision**: Utility function in `utils/snapshot.ts`

**Rationale**:

- Separates filename logic from hook
- Easily testable
- Reusable if needed elsewhere

**Implementation**:

```typescript
export function generateSnapshotFilename(address: string): string {
  const truncated = truncateAddress(address); // e.g., "GCKF...MTGG"
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-'); // Safe for filenames
  return `access-snapshot-${truncated}-${timestamp}.json`;
}

function truncateAddress(address: string, prefixLen = 4, suffixLen = 4): string {
  if (address.length <= prefixLen + suffixLen + 3) return address;
  return `${address.slice(0, prefixLen)}...${address.slice(-suffixLen)}`;
}
```

---

### 5. Contract Type Display Logic

**Problem**: Need to display capability-based contract type (e.g., "Access Control", "Ownable", "Access Control + Ownable")

**Decision**: Derive from `AccessControlCapabilities` in `useDashboardData`

**Rationale**:

- Capabilities already stored in `RecentContractRecord` (from spec 006)
- Simple conditional logic based on `hasAccessControl` and `hasOwnable` flags
- Consistent with spec requirement FR-002

**Implementation**:

```typescript
function getContractType(capabilities: AccessControlCapabilities | undefined): string {
  if (!capabilities) return 'Unknown';
  const { hasAccessControl, hasOwnable } = capabilities;
  if (hasAccessControl && hasOwnable) return 'Access Control + Ownable';
  if (hasAccessControl) return 'Access Control';
  if (hasOwnable) return 'Ownable';
  return 'Unknown';
}
```

---

### 6. Empty State Handling

**Problem**: Dashboard must show an empty state when no contract is selected (FR-011)

**Decision**: New `DashboardEmptyState` component

**Rationale**:

- Dedicated component follows existing `EmptyState` pattern
- Provides clear call-to-action to add/select contract
- Keeps Dashboard.tsx focused on data display logic

**Component Behavior**:

- Shows icon, title, description
- Primary button opens AddContractDialog
- Secondary text suggests selecting existing contract

---

### 7. Refresh Data Implementation

**Problem**: "Refresh Data" button should refetch roles and ownership (FR-008)

**Decision**: Expose combined `refetch` function from `useDashboardData`

**Rationale**:

- Both `useContractRoles` and `useContractOwnership` expose `refetch`
- `useDashboardData` combines them into single action
- Uses `Promise.all` for parallel refetch
- Button shows loading state during refresh

**Implementation**:

```typescript
const refetch = useCallback(async () => {
  await Promise.all([rolesRefetch(), ownershipRefetch()]);
}, [rolesRefetch, ownershipRefetch]);
```

---

## Dependencies Verification

| Dependency                  | Status       | Notes                                       |
| --------------------------- | ------------ | ------------------------------------------- |
| `useContractRoles`          | ✅ Available | From spec 006, exported in hooks/index.ts   |
| `useContractOwnership`      | ✅ Available | From spec 006, exported in hooks/index.ts   |
| `useExportSnapshot`         | ✅ Available | From spec 006, exported in hooks/index.ts   |
| `useNetworkAdapter`         | ✅ Available | From spec 004, loads adapter by ecosystem   |
| `RecentContractRecord`      | ✅ Available | Includes `capabilities` field from spec 006 |
| `AccessControlCapabilities` | ✅ Available | From `@openzeppelin/ui-builder-types`       |

---

## Risk Assessment

| Risk                         | Mitigation                                                    |
| ---------------------------- | ------------------------------------------------------------- |
| Context re-renders           | Memoize context value; split into separate contexts if needed |
| Stale data on network switch | Context handles network change; triggers data refetch         |
| Large member lists           | Deduplication is O(n); acceptable for 1000+ members           |
| Export filename conflicts    | Timestamp with seconds precision ensures uniqueness           |
