/**
 * Hook Contracts for Role Grant and Revoke
 * Feature: 014-role-grant-revoke
 *
 * Defines interfaces for dialog management hooks.
 * These hooks orchestrate dialog state and integrate with existing mutation hooks.
 */

import type {
  OperationResult,
  TransactionStatusUpdate,
  TxStatus,
} from '@openzeppelin/ui-builder-types';

import type { DialogTransactionStep, PendingRoleChange, RoleCheckboxItem } from '../data-model';

// =============================================================================
// useManageRolesDialog
// =============================================================================

/**
 * Options for useManageRolesDialog hook
 */
export interface UseManageRolesDialogOptions {
  /** Callback when dialog should close (after success or cancel) */
  onClose?: () => void;
  /** Callback on successful transaction */
  onSuccess?: (result: OperationResult) => void;
}

/**
 * Return type for useManageRolesDialog hook
 */
export interface UseManageRolesDialogReturn {
  // State
  /** Role checkbox items with current/original state */
  roleItems: RoleCheckboxItem[];
  /** The single pending change, if any */
  pendingChange: PendingRoleChange | null;
  /** Current transaction step */
  step: DialogTransactionStep;
  /** Error message if step is 'error' */
  errorMessage: string | null;
  /** Whether target account is the connected wallet */
  isSelfAccount: boolean;
  /** Transaction status for progress display */
  txStatus: TxStatus;
  /** Detailed transaction status */
  txStatusDetails: TransactionStatusUpdate | null;

  // Actions
  /** Toggle a role checkbox (handles single-change constraint) */
  toggleRole: (roleId: string) => void;
  /** Submit the pending change */
  submit: () => void;
  /** Retry after error */
  retry: () => void;
  /** Reset dialog to form state */
  reset: () => void;

  // Derived
  /** Whether submit button should be enabled */
  canSubmit: boolean;
  /** Label for submit button (e.g., "Grant Viewer" or "Revoke Pauser") */
  submitLabel: string;
  /** Whether showing self-revoke warning */
  showSelfRevokeWarning: boolean;
}

// =============================================================================
// useAssignRoleDialog
// =============================================================================

/**
 * Options for useAssignRoleDialog hook
 */
export interface UseAssignRoleDialogOptions {
  /** Pre-selected role ID (from Roles page context) */
  initialRoleId: string;
  /** Callback when dialog should close */
  onClose?: () => void;
  /** Callback on successful transaction */
  onSuccess?: (result: OperationResult) => void;
}

/**
 * Return type for useAssignRoleDialog hook
 *
 * Note: Address validation is handled by the AddressField component
 * from @openzeppelin/ui-builder-ui, which uses adapter.isValidAddress().
 * The hook receives the validated address from react-hook-form.
 */
export interface UseAssignRoleDialogReturn {
  // State
  /** Available roles (excluding Owner) */
  availableRoles: Array<{ roleId: string; roleName: string }>;
  /** Current transaction step */
  step: DialogTransactionStep;
  /** Error message if step is 'error' */
  errorMessage: string | null;
  /** Transaction status */
  txStatus: TxStatus;
  /** Detailed transaction status */
  txStatusDetails: TransactionStatusUpdate | null;

  // Actions
  /** Submit the grant transaction (receives form values from react-hook-form) */
  submit: (data: { address: string; roleId: string }) => void;
  /** Retry after error */
  retry: () => void;
  /** Reset dialog to form state */
  reset: () => void;
}

// =============================================================================
// useRevokeRoleDialog
// =============================================================================

/**
 * Options for useRevokeRoleDialog hook
 */
export interface UseRevokeRoleDialogOptions {
  /** Account to revoke from */
  accountAddress: string;
  /** Role to revoke */
  roleId: string;
  /** Role name for display */
  roleName: string;
  /** Callback when dialog should close */
  onClose?: () => void;
  /** Callback on successful transaction */
  onSuccess?: (result: OperationResult) => void;
}

/**
 * Return type for useRevokeRoleDialog hook
 */
export interface UseRevokeRoleDialogReturn {
  // State
  /** Current transaction step */
  step: DialogTransactionStep;
  /** Error message if step is 'error' */
  errorMessage: string | null;
  /** Whether this is a self-revoke */
  isSelfRevoke: boolean;
  /** Transaction status */
  txStatus: TxStatus;
  /** Detailed transaction status */
  txStatusDetails: TransactionStatusUpdate | null;

  // Actions
  /** Submit the revoke transaction */
  submit: () => void;
  /** Retry after error */
  retry: () => void;
  /** Reset dialog to form state */
  reset: () => void;

  // Derived
  /** Whether showing self-revoke warning */
  showSelfRevokeWarning: boolean;
}
