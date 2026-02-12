/**
 * Role-related types for the Roles Page feature
 * Feature: 009-roles-page-data
 *
 * These types define the data structures for roles, accounts, and role identifiers
 * used throughout the Roles page components.
 *
 * Note: The legacy `Role` interface was removed in spec 009 and replaced by
 * `RoleWithDescription` which better represents the resolved view model with
 * custom descriptions from local storage merged with adapter-provided data.
 */

// =============================================================================
// Domain Types
// =============================================================================

/**
 * Represents an account assigned to a role
 */
export interface RoleAccount {
  /** Blockchain address (e.g., "0x742d35Cc...") */
  address: string;
  /** Date when the role was assigned (ISO string) */
  assignedAt: string;
  /** Whether this is the currently connected user */
  isCurrentUser: boolean;
}

/**
 * Reference data for role identifier lookup
 */
export interface RoleIdentifier {
  /** Role identifier constant (e.g., "OWNER_ROLE") */
  identifier: string;
  /** Human-readable name (e.g., "Owner") */
  name: string;
  /** Description (custom or default, nullable) */
  description: string | null;
}

// =============================================================================
// View Model Types (spec 009)
// =============================================================================

/**
 * Role data combined with resolved description.
 * Used by RoleCard and RoleDetails components.
 * Combines adapter data with custom descriptions from local storage.
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
  /** Whether this is the Admin role (special UI treatment) - Feature: 016-two-step-admin-assignment */
  isAdminRole: boolean;
  /**
   * Whether the role name is a truncated hash (for display purposes).
   * When true, RoleCard should render AddressDisplay (with copy-to-clipboard)
   * instead of plain text. Feature: 017-evm-access-control (T018)
   */
  isHashDisplay: boolean;
}
