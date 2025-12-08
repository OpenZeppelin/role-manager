/**
 * Tests for role-name utility functions
 */
import { describe, expect, it } from 'vitest';

import { capitalizeRoleName, getRoleName } from '../role-name';

describe('capitalizeRoleName', () => {
  it('should capitalize simple lowercase name', () => {
    expect(capitalizeRoleName('admin')).toBe('Admin');
  });

  it('should handle SNAKE_CASE', () => {
    expect(capitalizeRoleName('ADMIN_ROLE')).toBe('Admin Role');
    expect(capitalizeRoleName('MINTER_ROLE')).toBe('Minter Role');
  });

  it('should handle camelCase', () => {
    expect(capitalizeRoleName('minterRole')).toBe('Minter Role');
    expect(capitalizeRoleName('adminRole')).toBe('Admin Role');
  });

  it('should handle already capitalized names', () => {
    expect(capitalizeRoleName('Admin')).toBe('Admin');
    expect(capitalizeRoleName('Admin Role')).toBe('Admin Role');
  });

  it('should handle mixed case', () => {
    expect(capitalizeRoleName('PAUSER')).toBe('Pauser');
    expect(capitalizeRoleName('DEFAULT_ADMIN_ROLE')).toBe('Default Admin Role');
  });
});

describe('getRoleName', () => {
  it('should return capitalized label when provided and not a hash', () => {
    expect(getRoleName('ADMIN_ROLE', 'some-id')).toBe('Admin Role');
    expect(getRoleName('minter', '0x123')).toBe('Minter');
  });

  it('should return capitalized roleId when label is undefined', () => {
    expect(getRoleName(undefined, 'ADMIN_ROLE')).toBe('Admin Role');
    expect(getRoleName(undefined, 'MINTER_ROLE')).toBe('Minter Role');
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
