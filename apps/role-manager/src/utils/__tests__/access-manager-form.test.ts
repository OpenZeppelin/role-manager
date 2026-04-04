import { describe, expect, it } from 'vitest';

import {
  isValidAccessManagerAddress,
  isValidAccessManagerCalldata,
  normalizeFunctionSelector,
} from '../access-manager-form';

describe('access-manager-form', () => {
  describe('isValidAccessManagerAddress', () => {
    it('accepts checksummed and lowercase addresses', () => {
      expect(isValidAccessManagerAddress('0x1234567890abcdef1234567890abcdef12345678')).toBe(true);
      expect(isValidAccessManagerAddress('0xAbCdEf1234567890abcdef1234567890ABCDef12')).toBe(true);
    });

    it('rejects malformed addresses', () => {
      expect(isValidAccessManagerAddress('')).toBe(false);
      expect(isValidAccessManagerAddress('0x1234')).toBe(false);
      expect(isValidAccessManagerAddress('0xGGGG567890abcdef1234567890abcdef12345678')).toBe(false);
    });
  });

  describe('normalizeFunctionSelector', () => {
    it('normalizes valid selectors to lowercase 0x-prefixed bytes4', () => {
      expect(normalizeFunctionSelector('a9059cbb')).toBe('0xa9059cbb');
      expect(normalizeFunctionSelector('0xA9059CBB')).toBe('0xa9059cbb');
    });

    it('rejects invalid selectors', () => {
      expect(normalizeFunctionSelector('')).toBeNull();
      expect(normalizeFunctionSelector('0x123')).toBeNull();
      expect(normalizeFunctionSelector('0xGGGGGGGG')).toBeNull();
    });
  });

  describe('isValidAccessManagerCalldata', () => {
    it('accepts hex calldata with even-length bytes', () => {
      expect(isValidAccessManagerCalldata('0xa9059cbb')).toBe(true);
      expect(isValidAccessManagerCalldata('0xa9059cbb00000000')).toBe(true);
    });

    it('rejects malformed calldata', () => {
      expect(isValidAccessManagerCalldata('')).toBe(false);
      expect(isValidAccessManagerCalldata('0x')).toBe(false);
      expect(isValidAccessManagerCalldata('0xabc')).toBe(false);
      expect(isValidAccessManagerCalldata('0xGGGG')).toBe(false);
    });
  });
});
