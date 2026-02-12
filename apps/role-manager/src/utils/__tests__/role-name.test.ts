/**
 * Tests for role-name utility functions
 * Feature: 009-roles-page-data, 017-evm-access-control (T007)
 *
 * Covers:
 * - capitalizeRoleName: snake_case, camelCase, _ROLE suffix stripping
 * - getRoleName: label → roleId → truncated hash fallback
 * - isRoleDisplayHash: determines whether display value is a hash
 */
import { describe, expect, it } from 'vitest';

import { capitalizeRoleName, getRoleName, isRoleDisplayHash } from '../role-name';

// =============================================================================
// Test Constants
// =============================================================================

/** Standard bytes32 hash (66 chars including 0x prefix) */
const BYTES32_HASH = '0x9f2df0ed4ee1b4e2db1603f44f9a0e6b1a9b5c6d7e8f0a1b2c3d4e5f6a7b8c9d';

/** Short 0x-prefixed hash (not a full bytes32 but still detected as hash) */
const SHORT_HASH = '0x1234567890abcdef';

/** DEFAULT_ADMIN_ROLE hash (well-known EVM constant) */
const DEFAULT_ADMIN_HASH = '0x0000000000000000000000000000000000000000000000000000000000000000';

// =============================================================================
// capitalizeRoleName
// =============================================================================

describe('capitalizeRoleName', () => {
  it('should capitalize simple lowercase name', () => {
    expect(capitalizeRoleName('admin')).toBe('Admin');
  });

  it('should handle SNAKE_CASE and strip _ROLE suffix', () => {
    expect(capitalizeRoleName('ADMIN_ROLE')).toBe('Admin');
    expect(capitalizeRoleName('MINTER_ROLE')).toBe('Minter');
  });

  it('should handle camelCase and strip Role suffix', () => {
    expect(capitalizeRoleName('minterRole')).toBe('Minter');
    expect(capitalizeRoleName('adminRole')).toBe('Admin');
  });

  it('should handle already capitalized names', () => {
    expect(capitalizeRoleName('Admin')).toBe('Admin');
    expect(capitalizeRoleName('Admin Role')).toBe('Admin');
  });

  it('should handle mixed case and strip _ROLE suffix', () => {
    expect(capitalizeRoleName('PAUSER')).toBe('Pauser');
    expect(capitalizeRoleName('DEFAULT_ADMIN_ROLE')).toBe('Default Admin');
  });

  it('should handle names without _ROLE suffix', () => {
    expect(capitalizeRoleName('BURNER')).toBe('Burner');
    expect(capitalizeRoleName('TRANSFER')).toBe('Transfer');
    expect(capitalizeRoleName('OPERATOR')).toBe('Operator');
  });
});

// =============================================================================
// getRoleName
// =============================================================================

describe('getRoleName', () => {
  // --- Priority 1: Adapter-provided label (non-hash) ---

  it('should return capitalized label when provided and not a hash', () => {
    expect(getRoleName('ADMIN_ROLE', 'some-id')).toBe('Admin');
    expect(getRoleName('minter', SHORT_HASH)).toBe('Minter');
  });

  it('should capitalize well-known EVM role labels from adapter', () => {
    expect(getRoleName('MINTER_ROLE', BYTES32_HASH)).toBe('Minter');
    expect(getRoleName('PAUSER_ROLE', BYTES32_HASH)).toBe('Pauser');
    expect(getRoleName('BURNER_ROLE', BYTES32_HASH)).toBe('Burner');
    expect(getRoleName('UPGRADER_ROLE', BYTES32_HASH)).toBe('Upgrader');
    expect(getRoleName('DEFAULT_ADMIN_ROLE', DEFAULT_ADMIN_HASH)).toBe('Default Admin');
  });

  // --- Priority 2: Readable roleId (when no label) ---

  it('should return capitalized roleId when label is undefined', () => {
    expect(getRoleName(undefined, 'ADMIN_ROLE')).toBe('Admin');
    expect(getRoleName(undefined, 'MINTER_ROLE')).toBe('Minter');
  });

  it('should return capitalized roleId when label is empty string', () => {
    expect(getRoleName('', 'ADMIN_ROLE')).toBe('Admin');
  });

  // --- Priority 3: Hash fallback ---

  it('should return truncated hash when roleId is a full bytes32 hash and no label', () => {
    const hash = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';
    const result = getRoleName(undefined, hash);
    // Should be truncated: first 6 chars + ... + last 4 chars
    expect(result).toMatch(/^0x1234.*cdef$/);
    // Should NOT be the full hash
    expect(result.length).toBeLessThan(hash.length);
  });

  it('should return truncated hash when label is also a hash', () => {
    const hash = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';
    const result = getRoleName(hash, hash);
    expect(result).toMatch(/^0x1234.*cdef$/);
  });

  it('should truncate the default admin role hash (all zeros)', () => {
    const result = getRoleName(undefined, DEFAULT_ADMIN_HASH);
    expect(result).toMatch(/^0x0000.*0000$/);
    expect(result.length).toBeLessThan(DEFAULT_ADMIN_HASH.length);
  });

  it('should use label over roleId when label is readable but roleId is a hash', () => {
    expect(getRoleName('MINTER_ROLE', BYTES32_HASH)).toBe('Minter');
  });
});

// =============================================================================
// isRoleDisplayHash
// =============================================================================

describe('isRoleDisplayHash', () => {
  // --- Returns false: human-readable display ---

  it('should return false when adapter provides a readable label', () => {
    expect(isRoleDisplayHash('MINTER_ROLE', BYTES32_HASH)).toBe(false);
    expect(isRoleDisplayHash('admin', SHORT_HASH)).toBe(false);
    expect(isRoleDisplayHash('DEFAULT_ADMIN_ROLE', DEFAULT_ADMIN_HASH)).toBe(false);
  });

  it('should return false when roleId is a readable string (no label)', () => {
    expect(isRoleDisplayHash(undefined, 'ADMIN_ROLE')).toBe(false);
    expect(isRoleDisplayHash(undefined, 'minter')).toBe(false);
    expect(isRoleDisplayHash(undefined, 'OPERATOR')).toBe(false);
  });

  // --- Returns true: hash fallback ---

  it('should return true when roleId is a hash and no label provided', () => {
    expect(isRoleDisplayHash(undefined, BYTES32_HASH)).toBe(true);
    expect(isRoleDisplayHash(undefined, SHORT_HASH)).toBe(true);
    expect(isRoleDisplayHash(undefined, DEFAULT_ADMIN_HASH)).toBe(true);
  });

  it('should return true when label is also a hash (both hash)', () => {
    expect(isRoleDisplayHash(BYTES32_HASH, BYTES32_HASH)).toBe(true);
  });

  it('should return true when label is empty and roleId is a hash', () => {
    expect(isRoleDisplayHash('', BYTES32_HASH)).toBe(true);
  });

  // --- Consistency with getRoleName ---

  it('should be consistent with getRoleName output', () => {
    const testCases: [string | undefined, string][] = [
      ['MINTER_ROLE', BYTES32_HASH],
      [undefined, BYTES32_HASH],
      [undefined, 'admin'],
      [BYTES32_HASH, BYTES32_HASH],
      ['', DEFAULT_ADMIN_HASH],
      ['PAUSER_ROLE', SHORT_HASH],
    ];

    for (const [label, roleId] of testCases) {
      const name = getRoleName(label, roleId);
      const isHash = isRoleDisplayHash(label, roleId);

      // If isHash is true, the name should contain "..." (truncated) or 0x prefix
      // If isHash is false, the name should be a capitalized readable string
      if (isHash) {
        expect(name).toMatch(/0x/);
      } else {
        expect(name).not.toMatch(/^0x[0-9a-f]/i);
      }
    }
  });
});
