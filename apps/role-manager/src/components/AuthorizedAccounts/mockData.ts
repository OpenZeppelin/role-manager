/**
 * Mock Data for Authorized Accounts Page
 * Feature: 010-authorized-accounts-page
 *
 * Provides sample data for demonstrating all visual states of the
 * Authorized Accounts page. Includes accounts with various statuses
 * and role combinations to showcase the full UI.
 */

import type { AuthorizedAccount } from '../../types/authorized-accounts';

/**
 * Mock accounts demonstrating all visual states:
 * - Active with multiple roles, never expires
 * - Active with single role, has expiration
 * - Awaiting signature status (multisig pending)
 * - Pending status with multiple roles
 */
export const MOCK_ACCOUNTS: AuthorizedAccount[] = [
  {
    id: '1',
    address: '0x742d35Cc6634C0532925a3b844Bc9e7595f8fEb6',
    status: 'active',
    dateAdded: new Date('2024-01-15'),
    expiresAt: undefined, // Never expires
    roles: ['Admin', 'Minter'],
  },
  {
    id: '2',
    address: '0x8ba1f109551bD432803012645Ac136ddd64DBA72',
    status: 'active',
    dateAdded: new Date('2024-02-20'),
    expiresAt: new Date('2025-02-20'),
    roles: ['Operator'],
  },
  {
    id: '3',
    address: '0xAb5801a7D398351b8bE11C439e05C5B3259aeC9B',
    status: 'awaiting-signature',
    dateAdded: new Date('2023-06-01'),
    expiresAt: new Date('2024-06-01'),
    roles: ['Pauser'],
  },
  {
    id: '4',
    address: '0x1234567890123456789012345678901234567890',
    status: 'pending',
    dateAdded: new Date('2024-11-30'),
    expiresAt: new Date('2025-11-30'),
    roles: ['Upgrader', 'Admin', 'Burner'],
  },
];

/**
 * Available roles extracted from mock data for filter dropdown
 */
export const MOCK_AVAILABLE_ROLES = ['Admin', 'Minter', 'Operator', 'Pauser', 'Upgrader', 'Burner'];
