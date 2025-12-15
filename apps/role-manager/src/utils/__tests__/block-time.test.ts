/**
 * Block Time Utility Tests
 * Feature: 015-ownership-transfer
 *
 * Tests for block time calculation and formatting utilities.
 */
import { describe, expect, it, vi } from 'vitest';

import {
  calculateBlockExpiration,
  formatTimeEstimateDisplay,
  type FormatBlocksToTimeFn,
} from '../block-time';

// =============================================================================
// Test Fixtures
// =============================================================================

/**
 * Mock formatBlocksToTime function for testing
 */
const createMockFormatter = (returnValue: string | null = '~2 hours'): FormatBlocksToTimeFn => {
  return vi.fn().mockReturnValue(returnValue);
};

// =============================================================================
// Tests
// =============================================================================

describe('calculateBlockExpiration', () => {
  describe('valid calculations', () => {
    it('should calculate blocks remaining and time estimate', () => {
      const formatter = createMockFormatter('~15 minutes');
      const result = calculateBlockExpiration(2120000, 2118912, formatter);

      expect(result).toEqual({
        blocksRemaining: 1088,
        timeEstimate: '~15 minutes',
      });
      expect(formatter).toHaveBeenCalledWith(1088);
    });

    it('should work with exact difference of 1 block', () => {
      const formatter = createMockFormatter('< 1 minute');
      const result = calculateBlockExpiration(100, 99, formatter);

      expect(result).toEqual({
        blocksRemaining: 1,
        timeEstimate: '< 1 minute',
      });
    });

    it('should work with large block differences', () => {
      const formatter = createMockFormatter('~7 days');
      const result = calculateBlockExpiration(10000000, 5000000, formatter);

      expect(result).toEqual({
        blocksRemaining: 5000000,
        timeEstimate: '~7 days',
      });
    });

    it('should handle null time estimate from formatter', () => {
      const formatter = createMockFormatter(null);
      const result = calculateBlockExpiration(2120000, 2118912, formatter);

      expect(result).toEqual({
        blocksRemaining: 1088,
        timeEstimate: null,
      });
    });
  });

  describe('null currentBlock handling', () => {
    it('should return null when currentBlock is null', () => {
      const formatter = createMockFormatter();
      const result = calculateBlockExpiration(2120000, null, formatter);

      expect(result).toBeNull();
      expect(formatter).not.toHaveBeenCalled();
    });

    it('should return null when currentBlock is undefined', () => {
      const formatter = createMockFormatter();
      const result = calculateBlockExpiration(2120000, undefined, formatter);

      expect(result).toBeNull();
      expect(formatter).not.toHaveBeenCalled();
    });
  });

  describe('expiration handling', () => {
    it('should return null when already expired (currentBlock > expirationBlock)', () => {
      const formatter = createMockFormatter();
      const result = calculateBlockExpiration(2118000, 2120000, formatter);

      expect(result).toBeNull();
      expect(formatter).not.toHaveBeenCalled();
    });

    it('should return null when exactly at expiration (currentBlock === expirationBlock)', () => {
      const formatter = createMockFormatter();
      const result = calculateBlockExpiration(2120000, 2120000, formatter);

      expect(result).toBeNull();
      expect(formatter).not.toHaveBeenCalled();
    });
  });

  describe('edge cases', () => {
    it('should work with block 0', () => {
      const formatter = createMockFormatter('~1 hour');
      const result = calculateBlockExpiration(100, 0, formatter);

      expect(result).toEqual({
        blocksRemaining: 100,
        timeEstimate: '~1 hour',
      });
    });

    it('should work with currentBlock at 0', () => {
      const formatter = createMockFormatter('~5 minutes');
      const result = calculateBlockExpiration(10, 0, formatter);

      expect(result).toEqual({
        blocksRemaining: 10,
        timeEstimate: '~5 minutes',
      });
    });
  });
});

describe('formatTimeEstimateDisplay', () => {
  describe('tilde removal', () => {
    it('should remove ~ prefix from time estimate', () => {
      expect(formatTimeEstimateDisplay('~2 hours')).toBe('2 hours');
    });

    it('should remove ~ from various time formats', () => {
      expect(formatTimeEstimateDisplay('~15 minutes')).toBe('15 minutes');
      expect(formatTimeEstimateDisplay('~3 days')).toBe('3 days');
      expect(formatTimeEstimateDisplay('~1h 30m')).toBe('1h 30m');
      expect(formatTimeEstimateDisplay('~2d 5h')).toBe('2d 5h');
    });

    it('should handle string without ~ prefix', () => {
      expect(formatTimeEstimateDisplay('2 hours')).toBe('2 hours');
      expect(formatTimeEstimateDisplay('15 minutes')).toBe('15 minutes');
    });

    it('should only remove first ~ character', () => {
      expect(formatTimeEstimateDisplay('~1~2 hours')).toBe('1~2 hours');
    });
  });

  describe('null/empty handling', () => {
    it('should return null for null input', () => {
      expect(formatTimeEstimateDisplay(null)).toBeNull();
    });

    it('should return null for empty string input (treated as falsy)', () => {
      // Empty string is falsy, so function returns null
      expect(formatTimeEstimateDisplay('')).toBeNull();
    });
  });

  describe('special cases', () => {
    it('should handle "< 1 minute" format', () => {
      expect(formatTimeEstimateDisplay('< 1 minute')).toBe('< 1 minute');
    });

    it('should handle whitespace-only strings (truthy)', () => {
      expect(formatTimeEstimateDisplay('   ')).toBe('   ');
    });

    it('should handle ~ only (returns empty string after removal)', () => {
      expect(formatTimeEstimateDisplay('~')).toBe('');
    });
  });
});
