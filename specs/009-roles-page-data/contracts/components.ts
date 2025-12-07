/**
 * Component Interface Contracts
 * Feature: 009-roles-page-data
 *
 * Defines the updated prop interfaces for Roles page components
 * after integrating with real data from the Access Control service.
 *
 * These interfaces supersede the mock data types from spec 008.
 */

// =============================================================================
// External Types (from @openzeppelin/ui-builder-types)
// =============================================================================

// These are reference copies; actual types come from the package
interface RoleAssignment {
  roleId: string;
  roleName: string;
  description?: string;
  members: string[];
}

// =============================================================================
// View Model Types
// =============================================================================

/**
 * Role data with resolved description and computed properties.
 * Used throughout the Roles page components.
 */
export interface RoleWithDescription {
  /** Role identifier (e.g., "ADMIN_ROLE", bytes32 hash) */
  roleId: string;
  /** Human-readable role name */
  roleName: string;
  /** Resolved description: custom > adapter > null */
  description: string | null;
  /** Whether the current description is user-provided */
  isCustomDescription: boolean;
  /** Array of member addresses */
  members: string[];
  /** Whether this is the Owner role (special UI treatment) */
  isOwnerRole: boolean;
}

/**
 * Role identifier for the reference table.
 */
export interface RoleIdentifier {
  /** Role identifier constant (e.g., "OWNER_ROLE") */
  identifier: string;
  /** Human-readable name (e.g., "Owner") */
  name: string;
  /** Description (custom or default) */
  description: string | null;
}

// =============================================================================
// Component Props - Updated for Real Data
// =============================================================================

/**
 * Props for RoleCard component.
 * Displays a single role in the roles list.
 */
export interface RoleCardProps {
  /** Role data with resolved description */
  role: RoleWithDescription;
  /** Whether this card is currently selected */
  isSelected: boolean;
  /** Whether the connected user has this role */
  isConnectedRole: boolean;
  /** Click handler for selection */
  onClick: () => void;
}

/**
 * Props for RolesList component.
 * Displays the scrollable list of role cards.
 */
export interface RolesListProps {
  /** Array of roles to display */
  roles: RoleWithDescription[];
  /** Currently selected role ID */
  selectedRoleId: string | null;
  /** Role IDs that the connected user belongs to */
  connectedRoleIds: string[];
  /** Callback when a role is selected */
  onSelectRole: (roleId: string) => void;
}

/**
 * Props for RoleDetails component.
 * Displays details and members for a selected role.
 */
export interface RoleDetailsProps {
  /** Selected role data */
  role: RoleWithDescription;
  /** Member accounts with metadata */
  accounts: AccountData[];
  /** Whether connected user has this role */
  isConnected: boolean;
  /** Custom description update handler */
  onDescriptionChange?: (description: string) => Promise<void>;
  /** Assign action (placeholder for future) */
  onAssign?: () => void;
  /** Revoke action (placeholder for future) */
  onRevoke?: (address: string) => void;
  /** Transfer ownership action (placeholder for future) */
  onTransferOwnership?: () => void;
}

/**
 * Account data for display in role details.
 */
export interface AccountData {
  /** Blockchain address */
  address: string;
  /** Assignment date (if available from adapter) */
  assignedAt?: Date;
  /** Whether this is the connected user */
  isCurrentUser: boolean;
}

/**
 * Props for AccountRow component.
 * Displays a single account in the assigned accounts list.
 */
export interface AccountRowProps {
  /** Account address */
  address: string;
  /** Assignment date (optional) */
  assignedAt?: Date;
  /** Whether this is the connected user */
  isCurrentUser: boolean;
  /** Whether to show Owner-specific actions */
  isOwnerRole: boolean;
  /** Revoke action handler (non-owner roles) */
  onRevoke?: () => void;
  /** Transfer ownership handler (owner role only) */
  onTransferOwnership?: () => void;
}

/**
 * Props for RoleIdentifiersTable component.
 * Displays the reference table of role identifiers.
 */
export interface RoleIdentifiersTableProps {
  /** Array of role identifiers to display */
  identifiers: RoleIdentifier[];
}

/**
 * Props for EditableDescription component.
 * NEW: Inline description editing.
 */
export interface EditableDescriptionProps {
  /** Current description value */
  value: string | null;
  /** Placeholder text when no description */
  placeholder?: string;
  /** Whether editing is enabled */
  disabled?: boolean;
  /** Save handler (receives new value) */
  onSave: (value: string) => Promise<void>;
  /** Maximum character limit */
  maxLength?: number;
}

/**
 * Props for RolesLoadingSkeleton component.
 * NEW: Loading state UI.
 */
export interface RolesLoadingSkeletonProps {
  /** Number of skeleton cards to show */
  cardCount?: number;
}

/**
 * Props for RolesErrorState component.
 * NEW: Error state with retry.
 */
export interface RolesErrorStateProps {
  /** Error message to display */
  message: string;
  /** Whether retry is available */
  canRetry: boolean;
  /** Retry handler */
  onRetry: () => void;
}

/**
 * Props for RolesEmptyState component.
 * NEW: No access control support message.
 */
export interface RolesEmptyStateProps {
  /** Contract name/label for context */
  contractName?: string;
}

// =============================================================================
// Hook Return Types
// =============================================================================

/**
 * Return type for useCustomRoleDescriptions hook.
 */
export interface UseCustomRoleDescriptionsReturn {
  /** Map of roleId -> custom description */
  descriptions: Record<string, string>;
  /** Whether loading from storage */
  isLoading: boolean;
  /** Update a role's custom description */
  updateDescription: (roleId: string, description: string) => Promise<void>;
  /** Clear a role's custom description */
  clearDescription: (roleId: string) => Promise<void>;
}

/**
 * Return type for useRolesPageData hook.
 */
export interface UseRolesPageDataReturn {
  /** All roles with resolved descriptions */
  roles: RoleWithDescription[];
  /** Currently selected role ID */
  selectedRoleId: string | null;
  /** Set selected role */
  setSelectedRoleId: (id: string) => void;
  /** Selected role data (convenience) */
  selectedRole: RoleWithDescription | null;

  /** Capabilities (hasAccessControl, hasOwnable) */
  capabilities: {
    hasAccessControl: boolean;
    hasOwnable: boolean;
  } | null;
  /** Whether contract is supported */
  isSupported: boolean;

  /** Loading states */
  isLoading: boolean;
  isCapabilitiesLoading: boolean;
  isRolesLoading: boolean;
  isOwnershipLoading: boolean;

  /** Error states */
  hasError: boolean;
  errorMessage: string | null;
  canRetry: boolean;

  /** Actions */
  refetch: () => Promise<void>;
  updateRoleDescription: (roleId: string, description: string) => Promise<void>;

  /** Connected wallet */
  connectedAddress: string | null;
  /** Role IDs the connected user belongs to */
  connectedRoleIds: string[];

  /** Role identifiers for reference table */
  roleIdentifiers: RoleIdentifier[];
}
