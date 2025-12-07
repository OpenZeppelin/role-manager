/**
 * Roles Components - Barrel Export
 * Feature: 008-roles-page-layout, 009-roles-page-data
 *
 * Central export point for all Roles page components.
 * Re-exports types for convenience.
 */

// =============================================================================
// Components
// =============================================================================

export { AccountRow } from './AccountRow';
export { RoleCard } from './RoleCard';
export { RoleDetails } from './RoleDetails';
export { RoleIdentifiersTable } from './RoleIdentifiersTable';
export { RolesList } from './RolesList';
export { SecurityNotice } from './SecurityNotice';

// =============================================================================
// State Components (spec 009)
// =============================================================================

export { RolesEmptyState } from './RolesEmptyState';
export { RolesErrorState } from './RolesErrorState';
export { RolesLoadingSkeleton } from './RolesLoadingSkeleton';

// TODO: Export when implemented (Phase 6)
// export { EditableDescription } from './EditableDescription';

// =============================================================================
// Component Props Types
// =============================================================================

export type { AccountRowProps } from './AccountRow';
export type { RoleCardProps } from './RoleCard';
export type { RoleDetailsProps } from './RoleDetails';
export type { RoleIdentifiersTableProps } from './RoleIdentifiersTable';
export type { RolesEmptyStateProps } from './RolesEmptyState';
export type { RolesErrorStateProps } from './RolesErrorState';
export type { RolesListProps } from './RolesList';
export type { RolesLoadingSkeletonProps } from './RolesLoadingSkeleton';

// =============================================================================
// Mock Data (DEPRECATED - for testing only)
// =============================================================================

/**
 * @deprecated Mock data is deprecated. Use useRolesPageData hook for real data.
 * These exports are retained only for backwards compatibility in existing tests.
 * Will be removed in a future version.
 */
export {
  getAccountsForRole,
  getConnectedRoleIds,
  isCurrentUserConnected,
  MOCK_CURRENT_USER,
  mockRoleAccounts,
  mockRoleIdentifiers,
  mockRoles,
} from './mockData';

// =============================================================================
// Domain Types (re-exported from types/roles.ts)
// =============================================================================

export type { Role, RoleAccount, RoleIdentifier, RoleWithDescription } from '../../types/roles';
