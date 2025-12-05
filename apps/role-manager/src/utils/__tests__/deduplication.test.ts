/**
 * Tests for deduplication utility functions
 * Feature: 007-dashboard-real-data
 *
 * Tests the getUniqueAccountsCount function that computes
 * unique member addresses across role assignments.
 */

import { describe, expect, it } from 'vitest';

import type { RoleAssignment } from '@openzeppelin/ui-builder-types';

import { getUniqueAccountsCount } from '../deduplication';

describe('getUniqueAccountsCount', () => {
  it('returns 0 for empty roles array', () => {
    const result = getUniqueAccountsCount([]);
    expect(result).toBe(0);
  });

  it('returns 0 for null/undefined input', () => {
    expect(getUniqueAccountsCount(null as unknown as RoleAssignment[])).toBe(0);
    expect(getUniqueAccountsCount(undefined as unknown as RoleAssignment[])).toBe(0);
  });

  it('counts unique members across roles', () => {
    const roles: RoleAssignment[] = [
      { role: { id: '0x1', label: 'ADMIN' }, members: ['0xabc', '0xdef'] },
      { role: { id: '0x2', label: 'MINTER' }, members: ['0xdef', '0x123'] },
    ];

    const result = getUniqueAccountsCount(roles);

    // 0xabc, 0xdef, 0x123 = 3 unique
    expect(result).toBe(3);
  });

  it('handles single role correctly', () => {
    const roles: RoleAssignment[] = [
      { role: { id: '0x1', label: 'ADMIN' }, members: ['0xabc', '0xdef', '0x123'] },
    ];

    const result = getUniqueAccountsCount(roles);

    expect(result).toBe(3);
  });

  it('deduplicates same address appearing in same role', () => {
    const roles: RoleAssignment[] = [
      { role: { id: '0x1', label: 'ADMIN' }, members: ['0xabc', '0xabc', '0xabc'] },
    ];

    const result = getUniqueAccountsCount(roles);

    expect(result).toBe(1);
  });

  it('deduplicates same address appearing in multiple roles', () => {
    const roles: RoleAssignment[] = [
      { role: { id: '0x1', label: 'ADMIN' }, members: ['0xabc'] },
      { role: { id: '0x2', label: 'MINTER' }, members: ['0xabc'] },
      { role: { id: '0x3', label: 'PAUSER' }, members: ['0xabc'] },
    ];

    const result = getUniqueAccountsCount(roles);

    expect(result).toBe(1);
  });

  it('handles roles with empty members array', () => {
    const roles: RoleAssignment[] = [
      { role: { id: '0x1', label: 'ADMIN' }, members: [] },
      { role: { id: '0x2', label: 'MINTER' }, members: ['0xabc'] },
    ];

    const result = getUniqueAccountsCount(roles);

    expect(result).toBe(1);
  });

  it('handles roles with undefined members', () => {
    const roles: RoleAssignment[] = [
      { role: { id: '0x1', label: 'ADMIN' }, members: undefined as unknown as string[] },
      { role: { id: '0x2', label: 'MINTER' }, members: ['0xabc'] },
    ];

    const result = getUniqueAccountsCount(roles);

    expect(result).toBe(1);
  });

  it('is case-sensitive (treats different cases as different addresses)', () => {
    const roles: RoleAssignment[] = [
      { role: { id: '0x1', label: 'ADMIN' }, members: ['0xABC', '0xabc'] },
    ];

    const result = getUniqueAccountsCount(roles);

    // JavaScript Set is case-sensitive
    expect(result).toBe(2);
  });

  it('handles Stellar addresses correctly', () => {
    const roles: RoleAssignment[] = [
      {
        role: { id: '0x1', label: 'ADMIN' },
        members: [
          'GCKFBEIYV2U22IO2BJ4KVJOIP7XPWQGQFKKWXR6DOSJBV7STMAQSMTGG',
          'GDQP2KPQGKIHYJGXNUIYOMHARUARCA7DJT5FO2FFOOUJ3ZPMZQZXZXHC',
        ],
      },
      {
        role: { id: '0x2', label: 'MINTER' },
        members: [
          'GCKFBEIYV2U22IO2BJ4KVJOIP7XPWQGQFKKWXR6DOSJBV7STMAQSMTGG', // duplicate
        ],
      },
    ];

    const result = getUniqueAccountsCount(roles);

    expect(result).toBe(2);
  });

  it('handles large number of roles efficiently', () => {
    const roles: RoleAssignment[] = [];
    const uniqueAddresses = new Set<string>();

    // Create 50 roles with some overlapping members
    for (let i = 0; i < 50; i++) {
      const members: string[] = [];
      for (let j = 0; j < 20; j++) {
        // Each address appears in ~5 roles
        const address = `0x${(i + j) % 100}`;
        members.push(address);
        uniqueAddresses.add(address);
      }
      roles.push({
        role: { id: `role${i}`, label: `ROLE_${i}` },
        members,
      });
    }

    const startTime = performance.now();
    const result = getUniqueAccountsCount(roles);
    const endTime = performance.now();

    // Should complete quickly (< 100ms for 1000 total members)
    expect(endTime - startTime).toBeLessThan(100);
    expect(result).toBe(uniqueAddresses.size);
  });
});
