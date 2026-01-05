# Storage Layer Documentation

The application uses IndexedDB (via Dexie) for client-side persistence, powered by the `@openzeppelin/ui-storage` package.

## Database Structure

```typescript
// Database: "RoleManager"
// Version: 1

// Tables:
// - recentContracts: Stores recently accessed contracts
// - userPreferences: Stores user settings as key-value pairs
```

## Storage Services

### RecentContractsStorage

Manages recently accessed contracts with per-network isolation.

```typescript
import { recentContractsStorage } from '@/core/storage';

// Add or update a recent contract
const id = await recentContractsStorage.addOrUpdate({
  networkId: 'stellar-testnet',
  address: 'GBZXN7PIRZGNMHGA7MUUUF4GWPY5AYPV6LY4UV2GL6VJGIQRXFDNMADI',
  label: 'My Token Contract', // optional
});

// Get recent contracts for a network (ordered by lastAccessed desc)
const contracts = await recentContractsStorage.getByNetwork('stellar-testnet');

// Delete a specific contract
await recentContractsStorage.delete(id);

// Clear all recent contracts
await recentContractsStorage.clear();
```

### UserPreferencesStorage

Stores user preferences as key-value pairs.

```typescript
import { userPreferencesStorage } from '@/core/storage';

// Set a preference
await userPreferencesStorage.set('theme', 'dark');
await userPreferencesStorage.set('active_network', 'stellar-testnet');

// Get a preference (generic)
const theme = await userPreferencesStorage.get<string>('theme');

// Get with default value
const pageSize = await userPreferencesStorage.getOrDefault('page_size', 10);

// Typed convenience getters
const themeStr = await userPreferencesStorage.getString('theme');
const fontSize = await userPreferencesStorage.getNumber('font_size');
const enabled = await userPreferencesStorage.getBoolean('notifications');

// Check if a preference exists
const hasTheme = await userPreferencesStorage.has('theme');

// Delete a preference
await userPreferencesStorage.delete('theme');

// Clear all preferences
await userPreferencesStorage.clear();
```

## React Hooks

### useRecentContracts

A reactive hook for managing recent contracts in React components.

```typescript
import { useRecentContracts } from '@/core/storage';

function RecentContractsList({ networkId }: { networkId: string }) {
  const { data, loading, error, addOrUpdate, getByNetwork } = useRecentContracts(networkId);

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <ul>
      {data.map((contract) => (
        <li key={contract.id}>{contract.label || contract.address}</li>
      ))}
    </ul>
  );
}
```

## Data Models

### RecentContractRecord

```typescript
interface RecentContractRecord {
  id: string; // Auto-generated unique ID
  networkId: string; // Network identifier (e.g., 'stellar-testnet')
  address: string; // Contract address
  label?: string; // Optional user-defined label
  lastAccessed: number; // Unix timestamp (ms) of last access
  createdAt: Date; // Auto-managed creation timestamp
  updatedAt: Date; // Auto-managed update timestamp
}
```

### Constraints

- **Uniqueness**: Each `[networkId, address]` combination is unique
- **Ordering**: Records are ordered by `lastAccessed` descending (most recent first)
- **Address Length**: Maximum 256 characters
- **Label Length**: Maximum 64 characters (optional field)
- **Key Length**: Maximum 128 characters for preference keys

## Error Handling

Storage operations may throw the following errors:

| Error Code                                    | Description                       |
| --------------------------------------------- | --------------------------------- |
| `recentContracts/invalid-network-id`          | Empty or invalid network ID       |
| `recentContracts/invalid-address`             | Empty or invalid address          |
| `recentContracts/invalid-address-length`      | Address exceeds 256 characters    |
| `recentContracts/invalid-label-length`        | Label exceeds 64 characters       |
| `recentContracts/invalid-label-control-chars` | Label contains control characters |
| `recentContracts/quota-exceeded`              | Browser storage quota exceeded    |
| `userPreferences/invalid-key`                 | Empty or invalid preference key   |
| `userPreferences/key-too-long`                | Key exceeds 128 characters        |
| `userPreferences/invalid-value`               | Undefined value provided          |
| `userPreferences/quota-exceeded`              | Browser storage quota exceeded    |

## Performance

The storage layer is designed to meet the following performance requirements:

- **Query Latency**: < 100ms for listing up to 50 contracts
- **Insert/Update**: < 50ms per operation
- **Scale**: Supports 50+ contracts per network without degradation

## Testing

Storage tests use `fake-indexeddb` to mock IndexedDB in the test environment.

```bash
# Run storage tests
pnpm test --filter "**/storage/**"
```

Test files:

- `__tests__/RecentContractsStorage.test.ts` - Unit tests for recent contracts repository
- `__tests__/UserPreferencesStorage.test.ts` - Unit tests for user preferences repository
- `__tests__/perf.recentContracts.test.ts` - Performance benchmarks
