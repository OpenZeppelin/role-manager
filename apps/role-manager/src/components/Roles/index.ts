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
// State Components (spec 009 - will be added in Phase 3)
// =============================================================================

// TODO: Export when implemented
// export { EditableDescription } from './EditableDescription';
// export { RolesLoadingSkeleton } from './RolesLoadingSkeleton';
// export { RolesErrorState } from './RolesErrorState';
// export { RolesEmptyState } from './RolesEmptyState';

// =============================================================================
// Component Props Types
// =============================================================================

export type { AccountRowProps } from './AccountRow';
export type { RoleCardProps } from './RoleCard';
export type { RoleDetailsProps } from './RoleDetails';
export type { RoleIdentifiersTableProps } from './RoleIdentifiersTable';
export type { RolesListProps } from './RolesList';

// =============================================================================
// Mock Data (for development/testing)
// =============================================================================

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
