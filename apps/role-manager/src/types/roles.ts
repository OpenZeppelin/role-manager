/**
 * Role-related types for the Roles Page Layout feature
 * Feature: 008-roles-page-layout
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
  /** Description of the role's purpose */
  description: string;
}
