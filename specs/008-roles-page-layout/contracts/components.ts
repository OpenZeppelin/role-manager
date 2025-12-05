/**
 * Component Contracts: Roles Page Layout Skeleton
 * Feature: 008-roles-page-layout
 *
 * This file defines the TypeScript interfaces for all components.
 * These contracts serve as the API specification for implementation.
 */

// =============================================================================
// Domain Types (from data-model.md)
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

// =============================================================================
// Component Props Contracts
// =============================================================================

/**
 * RoleCard - Individual role card in the roles list
 *
 * Displays role name, member count, description, and selection state.
 * Owner role shows crown icon and "Connected" badge when user is owner.
 *
 * @example
 * <RoleCard
 *   role={ownerRole}
 *   isSelected={true}
 *   isConnected={true}
 *   onClick={() => setSelectedRoleId(ownerRole.id)}
 * />
 */
export interface RoleCardProps {
  /** Role data to display */
  role: Role;
  /** Whether this card is currently selected */
  isSelected: boolean;
  /** Whether the current user is assigned to this role (for "Connected" badge) */
  isConnected: boolean;
  /** Click handler for selection */
  onClick: () => void;
  /** Additional CSS classes */
  className?: string;
}

/**
 * RolesList - Scrollable list of role cards (left panel)
 *
 * Renders a vertical list of RoleCard components with selection management.
 *
 * @example
 * <RolesList
 *   roles={mockRoles}
 *   selectedRoleId="OWNER_ROLE"
 *   connectedRoleIds={["OWNER_ROLE"]}
 *   onSelectRole={(roleId) => setSelectedRoleId(roleId)}
 * />
 */
export interface RolesListProps {
  /** Array of roles to display */
  roles: Role[];
  /** Currently selected role ID */
  selectedRoleId: string;
  /** Role IDs where current user is a member (for "Connected" badge) */
  connectedRoleIds: string[];
  /** Callback when a role is selected */
  onSelectRole: (roleId: string) => void;
  /** Additional CSS classes */
  className?: string;
}

/**
 * AccountRow - Single account row with address, date, and action button
 *
 * Uses AddressDisplay from UI Builder for address rendering with copy.
 * Shows "You" badge for current user, date for non-owner roles.
 *
 * @example
 * <AccountRow
 *   account={mockAccount}
 *   isOwnerRole={false}
 *   onRevoke={() => console.log('Revoke clicked')}
 * />
 */
export interface AccountRowProps {
  /** Account data to display */
  account: RoleAccount;
  /** Whether this is the Owner role (affects action button) */
  isOwnerRole: boolean;
  /** Action callback - Revoke for non-owner, Transfer for owner */
  onAction?: () => void;
  /** Additional CSS classes */
  className?: string;
}

/**
 * RoleDetails - Right panel showing selected role details
 *
 * Displays role name, description, assigned accounts list, and action buttons.
 * Owner role shows "Transfer Ownership", others show "+ Assign" and "Revoke".
 *
 * @example
 * <RoleDetails
 *   role={selectedRole}
 *   accounts={roleAccounts}
 *   onAssign={() => console.log('Assign clicked')}
 *   onRevoke={(address) => console.log('Revoke', address)}
 *   onTransferOwnership={() => console.log('Transfer clicked')}
 * />
 */
export interface RoleDetailsProps {
  /** Selected role data */
  role: Role;
  /** Accounts assigned to this role */
  accounts: RoleAccount[];
  /** Callback for "+ Assign" button (non-owner roles only) */
  onAssign?: () => void;
  /** Callback for "Revoke" button with account address */
  onRevoke?: (address: string) => void;
  /** Callback for "Transfer Ownership" button (owner role only) */
  onTransferOwnership?: () => void;
  /** Additional CSS classes */
  className?: string;
}

/**
 * RoleIdentifiersTable - Read-only reference table
 *
 * Displays all available role identifiers with names and descriptions.
 * No interactive elements—purely informational.
 *
 * @example
 * <RoleIdentifiersTable identifiers={mockIdentifiers} />
 */
export interface RoleIdentifiersTableProps {
  /** Array of role identifiers to display */
  identifiers: RoleIdentifier[];
  /** Additional CSS classes */
  className?: string;
}

/**
 * SecurityNotice - Warning banner at page bottom
 *
 * Static component with no props—displays security information
 * about role assignments and Owner role privileges.
 *
 * @example
 * <SecurityNotice />
 */
export interface SecurityNoticeProps {
  /** Additional CSS classes */
  className?: string;
}

// =============================================================================
// Page Component Contract
// =============================================================================

/**
 * RolesPage - Main page component (updates existing pages/Roles.tsx)
 *
 * Layout structure:
 * - PageHeader (existing component)
 * - Two-panel layout: RolesList (left) + RoleDetails (right)
 * - RoleIdentifiersTable (below panels)
 * - SecurityNotice (bottom)
 *
 * State:
 * - selectedRoleId: string (default: "OWNER_ROLE")
 *
 * No props—uses mock data internally.
 */

// =============================================================================
// Barrel Export Contract
// =============================================================================

/**
 * components/Roles/index.ts should export:
 *
 * - RoleCard
 * - RolesList
 * - AccountRow
 * - RoleDetails
 * - RoleIdentifiersTable
 * - SecurityNotice
 *
 * Types should be exported from types/roles.ts:
 * - Role
 * - RoleAccount
 * - RoleIdentifier
 */
