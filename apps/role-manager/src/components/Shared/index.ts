/**
 * Shared Components - Barrel Export
 *
 * Re-usable UI components that can be used across the application.
 */

export { EmptyState } from './EmptyState';
export { FeatureBadge } from './FeatureBadge';
export { OutlineBadge } from './OutlineBadge';
export { PageEmptyState } from './PageEmptyState';
export { RoleTypeBadge } from './RoleTypeBadge';
export { PageHeader } from './PageHeader';
export { Pagination } from './Pagination';
export { SelectLoadingPlaceholder } from './SelectLoadingPlaceholder';
export { Skeleton } from './Skeleton';
export { StatusBadge } from './StatusBadge';
export { YouBadge } from './YouBadge';

// Role Dialog Components (Feature: 014-role-grant-revoke)
export { SelfRevokeWarning } from './SelfRevokeWarning';
export { RoleCheckboxList } from './RoleCheckboxList';
export {
  DialogPendingState,
  DialogSuccessState,
  DialogErrorState,
  DialogCancelledState,
} from './DialogTransactionStates';

// Phase 6: Error Handling Components (Feature: 014-role-grant-revoke)
export { ConfirmCloseDialog } from './ConfirmCloseDialog';
export { WalletDisconnectedAlert } from './WalletDisconnectedAlert';
export { RoleListSkeleton } from './RoleListSkeleton';
export { NoRolesEmptyState } from './NoRolesEmptyState';

// Two-Step Transfer Action Buttons (Feature: 015-ownership-transfer)
export { TransferRoleButton } from './TransferRoleButton';
export { AcceptTransferButton } from './AcceptTransferButton';

// Role Display Components (Feature: 017-evm-access-control)
export { RoleNameDisplay } from './RoleNameDisplay';

// Type-to-Confirm Dialog (Feature: 017-evm-access-control)
export { TypeToConfirmDialog } from './TypeToConfirmDialog';

// Filter Dropdown Components
export { RoleFilterItem } from './RoleFilterItem';

// Types
export type { OutlineBadgeProps } from './OutlineBadge';
export type { PaginationProps, PaginationState } from './Pagination';
export type { RoleTypeBadgeProps } from './RoleTypeBadge';
export type { SelectLoadingPlaceholderProps } from './SelectLoadingPlaceholder';
export type { SkeletonProps } from './Skeleton';
export type { StatusBadgeProps, StatusBadgeVariant } from './StatusBadge';
export type { YouBadgeProps } from './YouBadge';

// Role Dialog Component Types (Feature: 014-role-grant-revoke)
export type { SelfRevokeWarningProps } from './SelfRevokeWarning';
export type { RoleCheckboxListProps } from './RoleCheckboxList';
export type {
  DialogPendingStateProps,
  DialogSuccessStateProps,
  DialogErrorStateProps,
  DialogCancelledStateProps,
} from './DialogTransactionStates';

// Phase 6: Error Handling Component Types (Feature: 014-role-grant-revoke)
export type { ConfirmCloseDialogProps } from './ConfirmCloseDialog';
export type { WalletDisconnectedAlertProps } from './WalletDisconnectedAlert';
export type { RoleListSkeletonProps } from './RoleListSkeleton';
export type { NoRolesEmptyStateProps } from './NoRolesEmptyState';

// Two-Step Transfer Action Button Types (Feature: 015-ownership-transfer)
export type { TransferRoleButtonProps } from './TransferRoleButton';
export type { AcceptTransferButtonProps } from './AcceptTransferButton';

// Role Display Component Types (Feature: 017-evm-access-control)
export type { RoleNameDisplayProps } from './RoleNameDisplay';

// Type-to-Confirm Dialog Types (Feature: 017-evm-access-control)
export type { TypeToConfirmDialogProps } from './TypeToConfirmDialog';

// Filter Dropdown Component Types
export type { RoleFilterItemProps } from './RoleFilterItem';
