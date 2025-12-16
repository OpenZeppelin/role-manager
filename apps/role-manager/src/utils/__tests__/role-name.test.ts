/**
 * Tests for role-name utility functions
 */
import { describe, expect, it } from 'vitest';

import { capitalizeRoleName, getRoleName } from '../role-name';

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

describe('getRoleName', () => {
  it('should return capitalized label when provided and not a hash', () => {
    expect(getRoleName('ADMIN_ROLE', 'some-id')).toBe('Admin');
    expect(getRoleName('minter', '0x123')).toBe('Minter');
  });

  it('should return capitalized roleId when label is undefined', () => {
    expect(getRoleName(undefined, 'ADMIN_ROLE')).toBe('Admin');
    expect(getRoleName(undefined, 'MINTER_ROLE')).toBe('Minter');
  });

  it('should return truncated hash when roleId is a hash and no label', () => {
    const hash = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';
    const result = getRoleName(undefined, hash);
    // Should be truncated: first 6 chars + ... + last 4 chars
    expect(result).toMatch(/^0x1234.*cdef$/);
  });

  it('should return truncated hash when label is also a hash', () => {
    const hash = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';
    const result = getRoleName(hash, hash);
    expect(result).toMatch(/^0x1234.*cdef$/);
  });
});
