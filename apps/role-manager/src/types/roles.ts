/**
 * Role-related types for the Roles Page Layout feature
 * Feature: 008-roles-page-layout, 009-roles-page-data
 *
 * These types define the data structures for roles, accounts, and role identifiers
 * used throughout the Roles page components.
 */

// =============================================================================
// Domain Types
// =============================================================================

/**
 * Represents a role in the access control system
 */
export interface Role {
  /** Unique role identifier (e.g., "OWNER_ROLE", "OPERATOR_ROLE") */
  id: string;
  /** Human-readable role name (e.g., "Owner", "Operator") */
  name: string;
  /** Role description explaining permissions */
  description: string;
  /** Number of accounts assigned to this role */
  memberCount: number;
  /** Whether this is the owner role (special handling) */
  isOwnerRole: boolean;
}

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
}
