/**
 * Roles Components - Barrel Export
 * Feature: 008-roles-page-layout
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

export type { Role, RoleAccount, RoleIdentifier } from '../../types/roles';
