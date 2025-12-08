/**
 * Mock Data for Authorized Accounts Page
 * Feature: 010-authorized-accounts-page
 * Updated by: 011-accounts-real-data
 *
 * Provides sample data for demonstrating all visual states of the
 * Authorized Accounts page. Includes accounts with various statuses
 * and role combinations to showcase the full UI.
 */

import type { AuthorizedAccountView, RoleBadgeInfo } from '../../types/authorized-accounts';

/**
 * Mock accounts demonstrating all visual states:
 * - Active with multiple roles
 * - Active with single role
 * - Awaiting signature status (multisig pending)
 * - Pending status with multiple roles
 * - Account with no timestamp (dateAdded: null)
 */
export const MOCK_ACCOUNTS: AuthorizedAccountView[] = [
  {
    id: '0x742d35cc6634c0532925a3b844bc9e7595f8feb6',
    address: '0x742d35Cc6634C0532925a3b844Bc9e7595f8fEb6',
    status: 'active',
    dateAdded: '2024-01-15T00:00:00.000Z',
    roles: [
      { id: 'ADMIN_ROLE', name: 'Admin' },
      { id: 'MINTER_ROLE', name: 'Minter' },
    ],
  },
  {
    id: '0x8ba1f109551bd432803012645ac136ddd64dba72',
    address: '0x8ba1f109551bD432803012645Ac136ddd64DBA72',
    status: 'active',
    dateAdded: '2024-02-20T00:00:00.000Z',
    roles: [{ id: 'OPERATOR_ROLE', name: 'Operator' }],
  },
  {
    id: '0xab5801a7d398351b8be11c439e05c5b3259aec9b',
    address: '0xAb5801a7D398351b8bE11C439e05C5B3259aeC9B',
    status: 'awaiting-signature',
    dateAdded: '2023-06-01T00:00:00.000Z',
    roles: [{ id: 'PAUSER_ROLE', name: 'Pauser' }],
  },
  {
    id: '0x1234567890123456789012345678901234567890',
    address: '0x1234567890123456789012345678901234567890',
    status: 'pending',
    dateAdded: '2024-11-30T00:00:00.000Z',
    roles: [
      { id: 'UPGRADER_ROLE', name: 'Upgrader' },
      { id: 'ADMIN_ROLE', name: 'Admin' },
      { id: 'BURNER_ROLE', name: 'Burner' },
    ],
  },
  {
    id: '0xdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef',
    address: '0xDeadBeefDeadBeefDeadBeefDeadBeefDeadBeef',
    status: 'active',
    dateAdded: null, // No timestamp available
    roles: [{ id: 'OWNER_ROLE', name: 'Owner' }],
  },
];

/**
 * Available roles extracted from mock data for filter dropdown
 * Uses RoleBadgeInfo for proper display (name) and filtering (id)
 */
export const MOCK_AVAILABLE_ROLES: RoleBadgeInfo[] = [
  { id: 'ADMIN_ROLE', name: 'Admin' },
  { id: 'MINTER_ROLE', name: 'Minter' },
  { id: 'OPERATOR_ROLE', name: 'Operator' },
  { id: 'PAUSER_ROLE', name: 'Pauser' },
  { id: 'UPGRADER_ROLE', name: 'Upgrader' },
  { id: 'BURNER_ROLE', name: 'Burner' },
  { id: 'OWNER_ROLE', name: 'Owner' },
];
