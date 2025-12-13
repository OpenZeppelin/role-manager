/**
 * Component Contracts for Role Grant and Revoke
 * Feature: 014-role-grant-revoke
 *
 * Defines props interfaces for dialog components.
 */

import type { PendingRoleChange, RoleCheckboxItem } from '../data-model';

// =============================================================================
// ManageRolesDialog
// =============================================================================

/**
 * Props for ManageRolesDialog component
 */
export interface ManageRolesDialogProps {
  /** Whether dialog is open */
  open: boolean;
  /** Callback when open state changes */
  onOpenChange: (open: boolean) => void;
  /** Target account address */
  accountAddress: string;
  /** Callback when transaction succeeds (for parent to refresh data) */
  onSuccess?: () => void;
}

// =============================================================================
// ManageRolesDialogContent (internal)
// =============================================================================

/**
 * Props for the dialog content (form state)
 */
export interface ManageRolesFormContentProps {
  /** Account address being modified */
  accountAddress: string;
  /** Role checkbox items */
  roleItems: RoleCheckboxItem[];
  /** Current pending change */
  pendingChange: PendingRoleChange | null;
  /** Whether target is connected wallet */
  isSelfAccount: boolean;
  /** Toggle a role checkbox */
  onToggleRole: (roleId: string) => void;
  /** Cancel and close dialog */
  onCancel: () => void;
  /** Submit the change */
  onSubmit: () => void;
  /** Whether submit is enabled */
  canSubmit: boolean;
  /** Submit button label */
  submitLabel: string;
  /** Whether to show self-revoke warning */
  showSelfRevokeWarning: boolean;
}

// =============================================================================
// AssignRoleDialog
// =============================================================================

/**
 * Props for AssignRoleDialog component
 */
export interface AssignRoleDialogProps {
  /** Whether dialog is open */
  open: boolean;
  /** Callback when open state changes */
  onOpenChange: (open: boolean) => void;
  /** Pre-selected role ID (from context) */
  initialRoleId: string;
  /** Pre-selected role name (for display) */
  initialRoleName: string;
  /** Callback when transaction succeeds */
  onSuccess?: () => void;
}

/**
 * Props for AssignRoleFormContent (internal)
 *
 * Note: This component uses AddressField from @openzeppelin/ui-builder-ui
 * for address input with chain-agnostic validation via adapter.isValidAddress().
 * Form state is managed by react-hook-form.
 */
export interface AssignRoleFormContentProps {
  /** Pre-selected role ID */
  initialRoleId: string;
  /** Available roles (excluding Owner) */
  availableRoles: Array<{ roleId: string; roleName: string }>;
  /** Cancel handler */
  onCancel: () => void;
  /** Submit handler (receives validated form data) */
  onSubmit: (data: { address: string; roleId: string }) => void;
  /** Whether form is submitting */
  isSubmitting: boolean;
}

// =============================================================================
// RevokeRoleDialog
// =============================================================================

/**
 * Props for RevokeRoleDialog component
 */
export interface RevokeRoleDialogProps {
  /** Whether dialog is open */
  open: boolean;
  /** Callback when open state changes */
  onOpenChange: (open: boolean) => void;
  /** Account to revoke from */
  accountAddress: string;
  /** Role ID to revoke */
  roleId: string;
  /** Role name for display */
  roleName: string;
  /** Callback when transaction succeeds */
  onSuccess?: () => void;
}

/**
 * Props for RevokeRoleConfirmContent (internal)
 */
export interface RevokeRoleConfirmContentProps {
  /** Account address */
  accountAddress: string;
  /** Role name being revoked */
  roleName: string;
  /** Whether this is self-revoke */
  isSelfRevoke: boolean;
  /** Cancel handler */
  onCancel: () => void;
  /** Confirm handler */
  onConfirm: () => void;
}

// =============================================================================
// Shared Dialog State Components
// =============================================================================

/**
 * Props for transaction pending state
 */
export interface DialogPendingStateProps {
  /** Title to display */
  title: string;
  /** Description text */
  description: string;
  /** Transaction status for progress */
  txStatus: string;
}

/**
 * Props for transaction success state
 */
export interface DialogSuccessStateProps {
  /** Title to display */
  title: string;
  /** Description text */
  description: string;
}

/**
 * Props for transaction error state
 */
export interface DialogErrorStateProps {
  /** Title to display */
  title: string;
  /** Error message */
  message: string;
  /** Whether retry is available */
  canRetry: boolean;
  /** Retry handler */
  onRetry?: () => void;
  /** Cancel handler */
  onCancel: () => void;
}

// =============================================================================
// RoleCheckboxList (shared component)
// =============================================================================

/**
 * Props for RoleCheckboxList component
 */
export interface RoleCheckboxListProps {
  /** Role items to display */
  items: RoleCheckboxItem[];
  /** Toggle handler */
  onToggle: (roleId: string) => void;
  /** Whether interaction is disabled (during transaction) */
  disabled?: boolean;
}

// =============================================================================
// SelfRevokeWarning (shared component)
// =============================================================================

/**
 * Props for SelfRevokeWarning component
 */
export interface SelfRevokeWarningProps {
  /** Role name being revoked */
  roleName: string;
}
