# Data Model: Roles Page Real Data Integration

**Branch**: `009-roles-page-data` | **Date**: 2025-12-07

## Overview

This document defines the data model extensions required for the Roles Page Real Data Integration feature. The primary change is adding custom role descriptions storage to the existing `RecentContractRecord`.

---

## Entity Extensions

### RecentContractRecord (Extended)

**Location**: `apps/role-manager/src/types/storage.ts`

```typescript
export interface RecentContractRecord extends BaseRecord {
  // ... existing fields ...

  /** Network identifier (e.g., stellar-testnet) */
  networkId: string;
  /** Contract address/ID */
  address: string;
  /** User-defined label (max 64 chars) */
  label?: string;
  /** Unix timestamp (ms) of last access */
  lastAccessed: number;

  // Schema fields (from spec 005)
  ecosystem?: Ecosystem;
  schema?: string;
  schemaHash?: string;
  source?: ContractSchemaSource;
  definitionOriginal?: string;
  definitionArtifacts?: Record<string, unknown>;
  schemaMetadata?: ContractSchemaMetadata;

  // Access Control fields (from spec 006)
  capabilities?: AccessControlCapabilities;

  // NEW: Custom role descriptions (spec 009)
  /** User-provided role descriptions, keyed by role identifier */
  customRoleDescriptions?: CustomRoleDescriptions;
}
```

### CustomRoleDescriptions (New Type)

**Location**: `apps/role-manager/src/types/storage.ts`

```typescript
/**
 * User-provided custom descriptions for roles.
 * Keyed by role identifier (e.g., "ADMIN_ROLE", "MINTER_ROLE").
 * Values are user-entered descriptions (max 256 characters).
 *
 * @example
 * {
 *   "ADMIN_ROLE": "Full system administrator with all permissions",
 *   "MINTER_ROLE": "Can create new tokens"
 * }
 */
export type CustomRoleDescriptions = Record<string, string>;
```

---

## Adapter Types (Reference)

These types come from `@openzeppelin/ui-builder-types` and are used directly:

### RoleAssignment

```typescript
interface RoleAssignment {
  /** Role identifier (e.g., "ADMIN_ROLE", bytes32 hash) */
  roleId: string;
  /** Human-readable role name */
  roleName: string;
  /** Role description from adapter (nullable) */
  description?: string;
  /** Array of member addresses assigned to this role */
  members: string[];
}
```

### OwnershipInfo

```typescript
interface OwnershipInfo {
  /** Current owner address (null if no owner or renounced) */
  owner: string | null;
}
```

### AccessControlCapabilities

```typescript
interface AccessControlCapabilities {
  /** Contract implements AccessControl interface */
  hasAccessControl: boolean;
  /** Contract implements Ownable interface */
  hasOwnable: boolean;
  /** Contract implements AccessControlEnumerable */
  hasEnumerableRoles?: boolean;
}
```

---

## Derived Types

### RoleWithDescription (View Model)

Used in UI components to combine adapter data with custom descriptions:

```typescript
/**
 * Role data combined with resolved description.
 * Used by RoleCard and RoleDetails components.
 */
interface RoleWithDescription {
  /** Role identifier */
  roleId: string;
  /** Human-readable role name */
  roleName: string;
  /** Resolved description (custom > adapter > null) */
  description: string | null;
  /** Whether this description is user-provided */
  isCustomDescription: boolean;
  /** Member addresses */
  members: string[];
  /** Whether this is the Owner role (special handling) */
  isOwnerRole: boolean;
}
```

### RolesPageData (Hook Return)

```typescript
/**
 * Return type for useRolesPageData hook
 */
interface RolesPageData {
  /** All roles including Owner (if applicable) */
  roles: RoleWithDescription[];
  /** Currently selected role ID */
  selectedRoleId: string | null;
  /** Set selected role */
  setSelectedRoleId: (id: string) => void;
  /** Selected role data */
  selectedRole: RoleWithDescription | null;

  /** Access control capabilities */
  capabilities: AccessControlCapabilities | null;
  /** Whether contract is supported (has AC or Ownable) */
  isSupported: boolean;

  /** Loading states */
  isLoading: boolean;
  isCapabilitiesLoading: boolean;
  isRolesLoading: boolean;
  isOwnershipLoading: boolean;

  /** Error states */
  error: Error | null;
  rolesError: Error | null;
  ownershipError: Error | null;

  /** Actions */
  refetch: () => Promise<void>;
  updateRoleDescription: (roleId: string, description: string) => Promise<void>;

  /** Connected wallet for "You" badge */
  connectedAddress: string | null;
}
```

---

## Storage Methods

### New Methods for RecentContractsStorage

```typescript
class RecentContractsStorage extends EntityStorage<RecentContractRecord> {
  // ... existing methods ...

  /**
   * Update a custom role description for a contract.
   *
   * @param id - Contract record ID
   * @param roleId - Role identifier (e.g., "ADMIN_ROLE")
   * @param description - Custom description (max 256 chars) or empty to clear
   */
  async updateRoleDescription(id: string, roleId: string, description: string): Promise<void>;

  /**
   * Get all custom role descriptions for a contract.
   *
   * @param id - Contract record ID
   * @returns Custom descriptions map or empty object
   */
  async getCustomRoleDescriptions(id: string): Promise<CustomRoleDescriptions>;

  /**
   * Clear a specific custom role description.
   *
   * @param id - Contract record ID
   * @param roleId - Role identifier to clear
   */
  async clearRoleDescription(id: string, roleId: string): Promise<void>;
}
```

---

## Validation Rules

| Field                            | Rule                | Error Code                     |
| -------------------------------- | ------------------- | ------------------------------ |
| `customRoleDescriptions[roleId]` | Max 256 characters  | `storage/description-too-long` |
| `customRoleDescriptions[roleId]` | Trimmed before save | N/A (auto-trimmed)             |
| `roleId` key                     | Non-empty string    | `storage/invalid-role-id`      |

---

## State Transitions

### Description Editing Flow

```
┌─────────────────┐
│  Display Mode   │
│  (read-only)    │
└────────┬────────┘
         │ Click on description
         ▼
┌─────────────────┐
│   Edit Mode     │
│  (text input)   │
└────────┬────────┘
         │
    ┌────┴────┐
    │         │
    ▼         ▼
┌───────┐ ┌───────┐
│ Save  │ │Cancel │
│(Enter/│ │(Esc)  │
│ blur) │ └───┬───┘
└───┬───┘     │
    │         │
    ▼         ▼
┌─────────────────┐
│  Persist to     │◄─── Only on Save
│  IndexedDB      │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Display Mode   │
│  (updated)      │
└─────────────────┘
```

---

## Index Considerations

No new IndexedDB indexes required. Custom descriptions are stored as a JSON field within the existing `recentContracts` table and don't need querying by description content.

---

## Migration

No database migration required. The `customRoleDescriptions` field is optional and will be `undefined` for existing records. The UI handles this gracefully by showing adapter-provided descriptions or placeholder text.
