/**
 * Shared Components - Barrel Export
 *
 * Re-usable UI components that can be used across the application.
 */

export { EmptyState } from './EmptyState';
export { FeatureBadge } from './FeatureBadge';
export { OutlineBadge } from './OutlineBadge';
export { PageEmptyState } from './PageEmptyState';
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

// Types
export type { OutlineBadgeProps } from './OutlineBadge';
export type { PaginationProps, PaginationState } from './Pagination';
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
