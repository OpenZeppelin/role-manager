/**
 * Tests for account-transformer utility functions
 * Feature: 011-accounts-real-data
 *
 * TDD tests for data transformation utilities that convert role-centric
 * data to account-centric view for the Authorized Accounts page.
 *
 * Tasks: T008-T013
 */
import { describe, expect, it } from 'vitest';

import type { OwnershipInfo } from '@openzeppelin/ui-builder-types';

import type {
  AccountsFilterState,
  AuthorizedAccountView,
  EnrichedRoleAssignment,
} from '../../types/authorized-accounts';
import {
  applyAccountsFilters,
  sortAccounts,
  transformRolesToAccounts,
} from '../account-transformer';

// =============================================================================
// Test Data Fixtures
// =============================================================================

const createEnrichedRole = (
  id: string,
  label: string | undefined,
  members: Array<{ address: string; grantedAt?: string }>
): EnrichedRoleAssignment => ({
  role: { id, label },
  members,
});

const createAccount = (
  address: string,
  dateAdded: string | null,
  roles: Array<{ id: string; name: string }>
): AuthorizedAccountView => ({
  id: address,
  address: address,
  status: 'active',
  dateAdded,
  roles,
});

// =============================================================================
// T008: TDD tests for transformRolesToAccounts
// =============================================================================

describe('transformRolesToAccounts', () => {
  it('should return empty array when no roles provided', () => {
    const result = transformRolesToAccounts([], null);
    expect(result).toEqual([]);
  });

  it('should transform single role with single member', () => {
    const roles: EnrichedRoleAssignment[] = [
      createEnrichedRole('ADMIN_ROLE', 'Admin', [{ address: '0x1234' }]),
    ];

    const result = transformRolesToAccounts(roles, null);

    expect(result).toHaveLength(1);
    expect(result[0].address).toBe('0x1234');
    expect(result[0].status).toBe('active');
    expect(result[0].roles).toHaveLength(1);
    expect(result[0].roles[0]).toEqual({ id: 'ADMIN_ROLE', name: 'Admin' });
  });

  it('should use capitalized role ID as name when label is not provided', () => {
    const roles: EnrichedRoleAssignment[] = [
      createEnrichedRole('MINTER_ROLE', undefined, [{ address: '0x1234' }]),
    ];

    const result = transformRolesToAccounts(roles, null);

    // Role names are capitalized using getRoleName utility
    expect(result[0].roles[0].name).toBe('Minter Role');
  });

  it('should preserve original address case (important for Stellar)', () => {
    const roles: EnrichedRoleAssignment[] = [
      createEnrichedRole('ADMIN_ROLE', 'Admin', [{ address: '0xABCD1234' }]),
    ];

    const result = transformRolesToAccounts(roles, null);

    // Case is preserved for compatibility with case-sensitive chains (e.g., Stellar)
    expect(result[0].address).toBe('0xABCD1234');
    expect(result[0].id).toBe('0xABCD1234');
  });

  // ===========================================================================
  // T009: Multi-role account aggregation
  // ===========================================================================

  it('should aggregate multiple roles for the same account', () => {
    const roles: EnrichedRoleAssignment[] = [
      createEnrichedRole('ADMIN_ROLE', 'Admin', [{ address: '0x1234' }]),
      createEnrichedRole('MINTER_ROLE', 'Minter', [{ address: '0x1234' }]),
    ];

    const result = transformRolesToAccounts(roles, null);

    expect(result).toHaveLength(1);
    expect(result[0].roles).toHaveLength(2);
    expect(result[0].roles.map((r) => r.id)).toContain('ADMIN_ROLE');
    expect(result[0].roles.map((r) => r.id)).toContain('MINTER_ROLE');
  });

  it('should handle case-insensitive address matching for aggregation', () => {
    const roles: EnrichedRoleAssignment[] = [
      createEnrichedRole('ADMIN_ROLE', 'Admin', [{ address: '0xABCD' }]),
      createEnrichedRole('MINTER_ROLE', 'Minter', [{ address: '0xabcd' }]),
    ];

    const result = transformRolesToAccounts(roles, null);

    expect(result).toHaveLength(1);
    expect(result[0].roles).toHaveLength(2);
  });

  it('should create separate accounts for different addresses', () => {
    const roles: EnrichedRoleAssignment[] = [
      createEnrichedRole('ADMIN_ROLE', 'Admin', [{ address: '0x1111' }, { address: '0x2222' }]),
    ];

    const result = transformRolesToAccounts(roles, null);

    expect(result).toHaveLength(2);
    expect(result.map((a) => a.address)).toContain('0x1111');
    expect(result.map((a) => a.address)).toContain('0x2222');
  });

  // ===========================================================================
  // T010: Earliest timestamp selection
  // ===========================================================================

  it('should use grantedAt as dateAdded when available', () => {
    const roles: EnrichedRoleAssignment[] = [
      createEnrichedRole('ADMIN_ROLE', 'Admin', [
        { address: '0x1234', grantedAt: '2024-01-15T10:00:00Z' },
      ]),
    ];

    const result = transformRolesToAccounts(roles, null);

    expect(result[0].dateAdded).toBe('2024-01-15T10:00:00Z');
  });

  it('should use null for dateAdded when grantedAt is not available', () => {
    const roles: EnrichedRoleAssignment[] = [
      createEnrichedRole('ADMIN_ROLE', 'Admin', [{ address: '0x1234' }]),
    ];

    const result = transformRolesToAccounts(roles, null);

    expect(result[0].dateAdded).toBeNull();
  });

  it('should select earliest timestamp for account with multiple roles', () => {
    const roles: EnrichedRoleAssignment[] = [
      createEnrichedRole('ADMIN_ROLE', 'Admin', [
        { address: '0x1234', grantedAt: '2024-02-15T10:00:00Z' },
      ]),
      createEnrichedRole('MINTER_ROLE', 'Minter', [
        { address: '0x1234', grantedAt: '2024-01-01T10:00:00Z' },
      ]),
    ];

    const result = transformRolesToAccounts(roles, null);

    expect(result[0].dateAdded).toBe('2024-01-01T10:00:00Z');
  });

  it('should handle mix of timestamped and non-timestamped roles for same account', () => {
    const roles: EnrichedRoleAssignment[] = [
      createEnrichedRole('ADMIN_ROLE', 'Admin', [{ address: '0x1234' }]),
      createEnrichedRole('MINTER_ROLE', 'Minter', [
        { address: '0x1234', grantedAt: '2024-01-01T10:00:00Z' },
      ]),
    ];

    const result = transformRolesToAccounts(roles, null);

    expect(result[0].dateAdded).toBe('2024-01-01T10:00:00Z');
  });

  // ===========================================================================
  // T011: Owner integration
  // ===========================================================================

  it('should add owner as account with OWNER_ROLE when ownership provided', () => {
    const ownership: OwnershipInfo = {
      owner: '0xOwnerAddress',
    };

    const result = transformRolesToAccounts([], ownership);

    expect(result).toHaveLength(1);
    // Case is preserved for compatibility with case-sensitive chains (e.g., Stellar)
    expect(result[0].address).toBe('0xOwnerAddress');
    expect(result[0].roles).toHaveLength(1);
    expect(result[0].roles[0]).toEqual({ id: 'OWNER_ROLE', name: 'Owner' });
  });

  it('should add Owner role to existing account if owner already has other roles', () => {
    const roles: EnrichedRoleAssignment[] = [
      createEnrichedRole('ADMIN_ROLE', 'Admin', [{ address: '0xOwnerAddress' }]),
    ];
    const ownership: OwnershipInfo = {
      owner: '0xOwnerAddress',
    };

    const result = transformRolesToAccounts(roles, ownership);

    expect(result).toHaveLength(1);
    expect(result[0].roles).toHaveLength(2);
    expect(result[0].roles.map((r) => r.id)).toContain('OWNER_ROLE');
    expect(result[0].roles.map((r) => r.id)).toContain('ADMIN_ROLE');
  });

  it('should not add owner when ownership.owner is null', () => {
    const ownership: OwnershipInfo = {
      owner: null,
    };

    const result = transformRolesToAccounts([], ownership);

    expect(result).toHaveLength(0);
  });

  it('should set null dateAdded for owner-only accounts', () => {
    const ownership: OwnershipInfo = {
      owner: '0xOwnerAddress',
    };

    const result = transformRolesToAccounts([], ownership);

    expect(result[0].dateAdded).toBeNull();
  });
});

// =============================================================================
// T012: TDD tests for sortAccounts
// =============================================================================

describe('sortAccounts', () => {
  it('should return empty array for empty input', () => {
    const result = sortAccounts([]);
    expect(result).toEqual([]);
  });

  it('should sort by dateAdded descending (newest first)', () => {
    const accounts: AuthorizedAccountView[] = [
      createAccount('0x1111', '2024-01-01T00:00:00Z', [{ id: 'A', name: 'A' }]),
      createAccount('0x2222', '2024-03-01T00:00:00Z', [{ id: 'A', name: 'A' }]),
      createAccount('0x3333', '2024-02-01T00:00:00Z', [{ id: 'A', name: 'A' }]),
    ];

    const result = sortAccounts(accounts);

    expect(result[0].address).toBe('0x2222'); // March
    expect(result[1].address).toBe('0x3333'); // February
    expect(result[2].address).toBe('0x1111'); // January
  });

  it('should put timestamped accounts before non-timestamped', () => {
    const accounts: AuthorizedAccountView[] = [
      createAccount('0x1111', null, [{ id: 'A', name: 'A' }]),
      createAccount('0x2222', '2024-01-01T00:00:00Z', [{ id: 'A', name: 'A' }]),
    ];

    const result = sortAccounts(accounts);

    expect(result[0].address).toBe('0x2222'); // Has timestamp
    expect(result[1].address).toBe('0x1111'); // No timestamp
  });

  it('should sort non-timestamped accounts alphabetically by address', () => {
    const accounts: AuthorizedAccountView[] = [
      createAccount('0xcccc', null, [{ id: 'A', name: 'A' }]),
      createAccount('0xaaaa', null, [{ id: 'A', name: 'A' }]),
      createAccount('0xbbbb', null, [{ id: 'A', name: 'A' }]),
    ];

    const result = sortAccounts(accounts);

    expect(result[0].address).toBe('0xaaaa');
    expect(result[1].address).toBe('0xbbbb');
    expect(result[2].address).toBe('0xcccc');
  });

  it('should not mutate original array', () => {
    const accounts: AuthorizedAccountView[] = [
      createAccount('0x2222', '2024-01-01T00:00:00Z', [{ id: 'A', name: 'A' }]),
      createAccount('0x1111', '2024-02-01T00:00:00Z', [{ id: 'A', name: 'A' }]),
    ];
    const originalOrder = accounts.map((a) => a.address);

    sortAccounts(accounts);

    expect(accounts.map((a) => a.address)).toEqual(originalOrder);
  });

  it('should handle mixed timestamped and non-timestamped correctly', () => {
    const accounts: AuthorizedAccountView[] = [
      createAccount('0xbbbb', null, [{ id: 'A', name: 'A' }]),
      createAccount('0x1111', '2024-02-01T00:00:00Z', [{ id: 'A', name: 'A' }]),
      createAccount('0xaaaa', null, [{ id: 'A', name: 'A' }]),
      createAccount('0x2222', '2024-01-01T00:00:00Z', [{ id: 'A', name: 'A' }]),
    ];

    const result = sortAccounts(accounts);

    // First: timestamped, newest first
    expect(result[0].address).toBe('0x1111');
    expect(result[1].address).toBe('0x2222');
    // Then: non-timestamped, alphabetical
    expect(result[2].address).toBe('0xaaaa');
    expect(result[3].address).toBe('0xbbbb');
  });
});

// =============================================================================
// T013: TDD tests for applyAccountsFilters
// =============================================================================

describe('applyAccountsFilters', () => {
  const testAccounts: AuthorizedAccountView[] = [
    createAccount('0x1111aaaa', '2024-01-01T00:00:00Z', [{ id: 'ADMIN_ROLE', name: 'Admin' }]),
    createAccount('0x2222bbbb', '2024-02-01T00:00:00Z', [
      { id: 'MINTER_ROLE', name: 'Minter' },
      { id: 'ADMIN_ROLE', name: 'Admin' },
    ]),
    createAccount('0x3333cccc', null, [{ id: 'MINTER_ROLE', name: 'Minter' }]),
  ];

  describe('search filter', () => {
    it('should return all accounts when searchQuery is empty', () => {
      const filters: AccountsFilterState = {
        searchQuery: '',
        statusFilter: 'all',
        roleFilter: 'all',
      };

      const result = applyAccountsFilters(testAccounts, filters);

      expect(result).toHaveLength(3);
    });

    it('should filter by address (case-insensitive)', () => {
      const filters: AccountsFilterState = {
        searchQuery: '1111',
        statusFilter: 'all',
        roleFilter: 'all',
      };

      const result = applyAccountsFilters(testAccounts, filters);

      expect(result).toHaveLength(1);
      expect(result[0].address).toBe('0x1111aaaa');
    });

    it('should filter by partial address match', () => {
      const filters: AccountsFilterState = {
        searchQuery: 'AAAA',
        statusFilter: 'all',
        roleFilter: 'all',
      };

      const result = applyAccountsFilters(testAccounts, filters);

      expect(result).toHaveLength(1);
      expect(result[0].address).toBe('0x1111aaaa');
    });

    it('should return empty array when no address matches', () => {
      const filters: AccountsFilterState = {
        searchQuery: 'zzzzz',
        statusFilter: 'all',
        roleFilter: 'all',
      };

      const result = applyAccountsFilters(testAccounts, filters);

      expect(result).toHaveLength(0);
    });
  });

  describe('status filter', () => {
    it('should return all accounts when statusFilter is "all"', () => {
      const filters: AccountsFilterState = {
        searchQuery: '',
        statusFilter: 'all',
        roleFilter: 'all',
      };

      const result = applyAccountsFilters(testAccounts, filters);

      expect(result).toHaveLength(3);
    });

    it('should filter by specific status', () => {
      const accountsWithStatus: AuthorizedAccountView[] = [
        { ...testAccounts[0], status: 'active' },
        { ...testAccounts[1], status: 'pending' },
        { ...testAccounts[2], status: 'active' },
      ];

      const filters: AccountsFilterState = {
        searchQuery: '',
        statusFilter: 'pending',
        roleFilter: 'all',
      };

      const result = applyAccountsFilters(accountsWithStatus, filters);

      expect(result).toHaveLength(1);
      expect(result[0].status).toBe('pending');
    });
  });

  describe('role filter', () => {
    it('should return all accounts when roleFilter is "all"', () => {
      const filters: AccountsFilterState = {
        searchQuery: '',
        statusFilter: 'all',
        roleFilter: 'all',
      };

      const result = applyAccountsFilters(testAccounts, filters);

      expect(result).toHaveLength(3);
    });

    it('should filter by specific role ID', () => {
      const filters: AccountsFilterState = {
        searchQuery: '',
        statusFilter: 'all',
        roleFilter: 'ADMIN_ROLE',
      };

      const result = applyAccountsFilters(testAccounts, filters);

      expect(result).toHaveLength(2);
      expect(result.every((a) => a.roles.some((r) => r.id === 'ADMIN_ROLE'))).toBe(true);
    });

    it('should return accounts with that role even if they have other roles', () => {
      const filters: AccountsFilterState = {
        searchQuery: '',
        statusFilter: 'all',
        roleFilter: 'MINTER_ROLE',
      };

      const result = applyAccountsFilters(testAccounts, filters);

      expect(result).toHaveLength(2);
      expect(result.map((a) => a.address)).toContain('0x2222bbbb');
      expect(result.map((a) => a.address)).toContain('0x3333cccc');
    });
  });

  describe('combined filters (AND logic)', () => {
    it('should combine search and role filter with AND logic', () => {
      const filters: AccountsFilterState = {
        searchQuery: '2222',
        statusFilter: 'all',
        roleFilter: 'ADMIN_ROLE',
      };

      const result = applyAccountsFilters(testAccounts, filters);

      expect(result).toHaveLength(1);
      expect(result[0].address).toBe('0x2222bbbb');
    });

    it('should return empty when combined filters have no matches', () => {
      const filters: AccountsFilterState = {
        searchQuery: '3333',
        statusFilter: 'all',
        roleFilter: 'ADMIN_ROLE', // Account 0x3333 only has MINTER_ROLE
      };

      const result = applyAccountsFilters(testAccounts, filters);

      expect(result).toHaveLength(0);
    });

    it('should apply all three filters with AND logic', () => {
      const accountsWithStatus: AuthorizedAccountView[] = [
        { ...testAccounts[0], status: 'active' },
        { ...testAccounts[1], status: 'active' },
        { ...testAccounts[2], status: 'pending' },
      ];

      const filters: AccountsFilterState = {
        searchQuery: 'bbbb',
        statusFilter: 'active',
        roleFilter: 'MINTER_ROLE',
      };

      const result = applyAccountsFilters(accountsWithStatus, filters);

      expect(result).toHaveLength(1);
      expect(result[0].address).toBe('0x2222bbbb');
    });
  });

  describe('edge cases', () => {
    it('should handle empty accounts array', () => {
      const filters: AccountsFilterState = {
        searchQuery: 'test',
        statusFilter: 'all',
        roleFilter: 'all',
      };

      const result = applyAccountsFilters([], filters);

      expect(result).toEqual([]);
    });

    it('should not mutate original array', () => {
      const accounts = [...testAccounts];
      const filters: AccountsFilterState = {
        searchQuery: '1111',
        statusFilter: 'all',
        roleFilter: 'all',
      };

      applyAccountsFilters(accounts, filters);

      expect(accounts).toEqual(testAccounts);
    });
  });
});
