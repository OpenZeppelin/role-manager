/**
 * Mock data for the Roles Page Layout feature
 * Feature: 008-roles-page-layout
 *
 * @deprecated This file is deprecated as of spec 009-roles-page-data.
 * The Roles page now uses useRolesPageData hook to fetch real data from
 * the adapter. This mock data is retained only for backwards compatibility
 * in existing tests. Use real data hooks instead:
 *
 * ```tsx
 * import { useRolesPageData } from '@/hooks';
 * const { roles, selectedRole, ... } = useRolesPageData();
 * ```
 *
 * This file will be removed in a future version.
 *
 * Original purpose: Static mock data for development and testing.
 * All data structures match the interfaces defined in types/roles.ts.
 */

import type { Role, RoleAccount, RoleIdentifier } from '../../types/roles';

// =============================================================================
// Constants
// =============================================================================

/**
 * Mock current user address for testing "You" badge functionality
 */
export const MOCK_CURRENT_USER = '0x742d35Cc8A30E9f4C4B4d8b6E9B6E3A5C4b4d8b6';

// =============================================================================
// Mock Roles
// =============================================================================

/**
 * 8 predefined roles matching the design specifications
 * Per data-model.md and spec.md FR-022
 */
export const mockRoles: Role[] = [
  {
    id: 'OWNER_ROLE',
    name: 'Owner',
    description: 'Full administrative access to contract (single account only)',
    memberCount: 1,
    isOwnerRole: true,
  },
  {
    id: 'OPERATOR_ROLE',
    name: 'Operator',
    description: 'Can perform operational tasks and manage day-to-day contract functions',
    memberCount: 3,
    isOwnerRole: false,
  },
  {
    id: 'MINTER_ROLE',
    name: 'Minter',
    description: 'Can create new tokens and manage token supply',
    memberCount: 1,
    isOwnerRole: false,
  },
  {
    id: 'VIEWER_ROLE',
    name: 'Viewer',
    description: 'Read-only access to contract data and state',
    memberCount: 1,
    isOwnerRole: false,
  },
  {
    id: 'BURNER_ROLE',
    name: 'Burner',
    description: 'Can destroy tokens and reduce token supply',
    memberCount: 0,
    isOwnerRole: false,
  },
  {
    id: 'PAUSER_ROLE',
    name: 'Pauser',
    description: 'Can pause and unpause contract operations',
    memberCount: 0,
    isOwnerRole: false,
  },
  {
    id: 'TRANSFER_ROLE',
    name: 'Transfer',
    description: 'Can transfer tokens between accounts',
    memberCount: 0,
    isOwnerRole: false,
  },
  {
    id: 'APPROVE_ROLE',
    name: 'Approver',
    description: 'Can approve token allowances and spending limits',
    memberCount: 0,
    isOwnerRole: false,
  },
];

// =============================================================================
// Mock Role Accounts
// =============================================================================

/**
 * Accounts grouped by role ID
 * Per data-model.md: 0-3 accounts per role for testing various states
 */
export const mockRoleAccounts: Record<string, RoleAccount[]> = {
  OWNER_ROLE: [
    {
      address: MOCK_CURRENT_USER,
      assignedAt: '', // Owner role doesn't show assignment date
      isCurrentUser: true,
    },
  ],
  OPERATOR_ROLE: [
    {
      address: '0x1234567890AbCdEf1234567890AbCdEf12345678',
      assignedAt: '2024-11-15T10:30:00Z',
      isCurrentUser: false,
    },
    {
      address: '0xAbCdEf1234567890AbCdEf1234567890AbCdEf12',
      assignedAt: '2024-10-22T14:15:00Z',
      isCurrentUser: false,
    },
    {
      address: '0x9876543210FeDcBa9876543210FeDcBa98765432',
      assignedAt: '2024-09-05T08:45:00Z',
      isCurrentUser: false,
    },
  ],
  MINTER_ROLE: [
    {
      address: '0xFeDcBa9876543210FeDcBa9876543210FeDcBa98',
      assignedAt: '2024-12-01T16:20:00Z',
      isCurrentUser: false,
    },
  ],
  VIEWER_ROLE: [
    {
      address: '0x5555555555555555555555555555555555555555',
      assignedAt: '2024-08-10T12:00:00Z',
      isCurrentUser: false,
    },
  ],
  BURNER_ROLE: [],
  PAUSER_ROLE: [],
  TRANSFER_ROLE: [],
  APPROVE_ROLE: [],
};

// =============================================================================
// Mock Role Identifiers
// =============================================================================

/**
 * 8 identifier entries for the reference table
 * Per spec.md FR-022
 */
export const mockRoleIdentifiers: RoleIdentifier[] = [
  {
    identifier: 'OWNER_ROLE',
    name: 'Owner',
    description: 'Full administrative access to contract (single account only)',
  },
  {
    identifier: 'OPERATOR_ROLE',
    name: 'Operator',
    description: 'Can perform operational tasks and manage day-to-day contract functions',
  },
  {
    identifier: 'MINTER_ROLE',
    name: 'Minter',
    description: 'Can create new tokens and manage token supply',
  },
  {
    identifier: 'BURNER_ROLE',
    name: 'Burner',
    description: 'Can destroy tokens and reduce token supply',
  },
  {
    identifier: 'PAUSER_ROLE',
    name: 'Pauser',
    description: 'Can pause and unpause contract operations',
  },
  {
    identifier: 'VIEWER_ROLE',
    name: 'Viewer',
    description: 'Read-only access to contract data and state',
  },
  {
    identifier: 'TRANSFER_ROLE',
    name: 'Transfer',
    description: 'Can transfer tokens between accounts',
  },
  {
    identifier: 'APPROVE_ROLE',
    name: 'Approver',
    description: 'Can approve token allowances and spending limits',
  },
];

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Get accounts for a specific role ID
 * @param roleId - The role identifier
 * @returns Array of accounts assigned to the role, or empty array if none
 */
export function getAccountsForRole(roleId: string): RoleAccount[] {
  return mockRoleAccounts[roleId] || [];
}

/**
 * Check if the current user is connected to a specific role
 * @param roleId - The role identifier
 * @returns true if the current user is assigned to the role
 */
export function isCurrentUserConnected(roleId: string): boolean {
  const accounts = mockRoleAccounts[roleId] || [];
  return accounts.some((account) => account.isCurrentUser);
}

/**
 * Get role IDs where the current user is connected
 * @returns Array of role IDs where current user is a member
 */
export function getConnectedRoleIds(): string[] {
  return Object.entries(mockRoleAccounts)
    .filter(([, accounts]) => accounts.some((account) => account.isCurrentUser))
    .map(([roleId]) => roleId);
}
