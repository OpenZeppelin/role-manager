import { describe, expect, it } from 'vitest';

import { isHash } from '../hash';

describe('isHash', () => {
  describe('0x-prefixed strings', () => {
    it('should return true for 0x-prefixed hex strings', () => {
      expect(isHash('0x1234')).toBe(true);
      expect(isHash('0xabc')).toBe(true);
      expect(isHash('0x0')).toBe(true);
    });

    it('should return true for full bytes32 hashes', () => {
      expect(isHash('0x0000000000000000000000000000000000000000000000000000000000000000')).toBe(
        true
      );
      expect(isHash('0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890')).toBe(
        true
      );
    });
  });

  describe('non-prefixed hex strings', () => {
    it('should return true for long hex strings (32+ chars)', () => {
      expect(isHash('abcdef1234567890abcdef1234567890')).toBe(true);
      expect(isHash('1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef')).toBe(true);
    });

    it('should return false for short hex strings without prefix', () => {
      expect(isHash('1234')).toBe(false);
      expect(isHash('abcdef')).toBe(false);
    });
  });

  describe('human-readable identifiers', () => {
    it('should return false for role name constants', () => {
      expect(isHash('ADMIN_ROLE')).toBe(false);
      expect(isHash('OWNER_ROLE')).toBe(false);
      expect(isHash('MINTER_ROLE')).toBe(false);
      expect(isHash('PAUSER_ROLE')).toBe(false);
    });

    it('should return false for simple names', () => {
      expect(isHash('admin')).toBe(false);
      expect(isHash('owner')).toBe(false);
      expect(isHash('minter')).toBe(false);
    });

    it('should return false for camelCase names', () => {
      expect(isHash('adminRole')).toBe(false);
      expect(isHash('ownerRole')).toBe(false);
    });
  });

  describe('edge cases', () => {
    it('should return false for empty string', () => {
      expect(isHash('')).toBe(false);
    });

    it('should return true for just 0x', () => {
      // Any string starting with 0x is considered a hash
      expect(isHash('0x')).toBe(true);
    });

    it('should return false for strings with non-hex characters', () => {
      expect(isHash('GHIJKL')).toBe(false);
      expect(isHash('hello_world_this_is_a_long_string')).toBe(false);
    });
  });
});
