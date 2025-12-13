/**
 * Role Dialog Types
 * Feature: 014-role-grant-revoke
 *
 * Type definitions for the role grant/revoke dialog components and hooks.
 */

// =============================================================================
// Transaction Step Types
// =============================================================================

/**
 * Transaction step states for all role dialogs.
 * Represents the lifecycle of a dialog from form input through transaction completion.
 */
export type DialogTransactionStep =
  | 'form' // Initial state, user can make changes
  | 'pending' // Transaction submitted, waiting for wallet confirmation
  | 'confirming' // Transaction being confirmed on-chain
  | 'success' // Transaction confirmed successfully
  | 'error' // Transaction failed
  | 'cancelled'; // User rejected wallet signature

// =============================================================================
// Pending Change Types
// =============================================================================

/**
 * Pending role change (single change at a time due to no batching).
 * Used by ManageRolesDialog to track the single allowed change.
 */
export interface PendingRoleChange {
  /** Type of operation */
  type: 'grant' | 'revoke';
  /** Role identifier (bytes32 hash) */
  roleId: string;
  /** Human-readable role name for display */
  roleName: string;
}

// =============================================================================
// Role Checkbox Types
// =============================================================================

/**
 * Role checkbox item for Manage Roles dialog.
 * Tracks both original and current state for single-change constraint enforcement.
 */
export interface RoleCheckboxItem {
  /** Role identifier */
  roleId: string;
  /** Human-readable name */
  roleName: string;
  /** Whether account originally had this role (snapshot at dialog open) */
  originallyAssigned: boolean;
  /** Current checkbox state */
  isChecked: boolean;
  /** Whether this checkbox differs from original (is the pending change) */
  isPendingChange: boolean;
}

// =============================================================================
// Dialog State Types
// =============================================================================

/**
 * State for Manage Roles dialog (Authorized Accounts page).
 * Supports checkbox list with single-change constraint.
 */
export interface ManageRolesDialogState {
  /** Target account address */
  accountAddress: string;
  /** Role checkbox items with original/current state */
  roleItems: RoleCheckboxItem[];
  /** The single pending change, if any */
  pendingChange: PendingRoleChange | null;
  /** Current transaction step */
  step: DialogTransactionStep;
  /** Error message if step is 'error' */
  errorMessage: string | null;
  /** Whether target is connected wallet (for self-revoke warning) */
  isSelfAccount: boolean;
}

/**
 * State for Assign Role dialog (Roles page).
 * Supports address input with role selection.
 */
export interface AssignRoleDialogState {
  /** Address input value */
  addressInput: string;
  /** Selected role ID */
  selectedRoleId: string;
  /** Available roles (excluding Owner) */
  availableRoles: Array<{ roleId: string; roleName: string }>;
  /** Validation state */
  isAddressValid: boolean;
  /** Current transaction step */
  step: DialogTransactionStep;
  /** Error message if step is 'error' */
  errorMessage: string | null;
}

/**
 * State for Revoke Role dialog (Roles page).
 * Pre-populated with account and role from context.
 */
export interface RevokeRoleDialogState {
  /** Account to revoke from */
  accountAddress: string;
  /** Role being revoked */
  roleId: string;
  /** Role name for display */
  roleName: string;
  /** Whether this is a self-revoke */
  isSelfRevoke: boolean;
  /** Current transaction step */
  step: DialogTransactionStep;
  /** Error message if step is 'error' */
  errorMessage: string | null;
}
