/**
 * Tests for snapshot utility functions
 * Feature: 007-dashboard-real-data, Phase 6
 *
 * These tests cover the snapshot filename generation utility
 * which creates unique, filesystem-safe filenames for access snapshots.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { generateSnapshotFilename, truncateAddress } from '../snapshot';

describe('truncateAddress', () => {
  it('truncates a long address to prefix...suffix format', () => {
    // Stellar address example (56 chars)
    const address = 'GCKFBEIYV2U22IO2BJ4KVJOIP7XPWQGQFKKWXR6DOSJBV7STMAQSMTGG';
    const result = truncateAddress(address);

    expect(result).toBe('GCKF...MTGG');
  });

  it('truncates an Ethereum address correctly', () => {
    const address = '0x1234567890abcdef1234567890abcdef12345678';
    const result = truncateAddress(address);

    expect(result).toBe('0x12...5678');
  });

  it('uses default prefix and suffix length of 4', () => {
    const address = 'ABCDEFGHIJKLMNOP';
    const result = truncateAddress(address);

    expect(result.startsWith('ABCD')).toBe(true);
    expect(result.endsWith('MNOP')).toBe(true);
    expect(result).toBe('ABCD...MNOP');
  });

  it('allows custom prefix length', () => {
    const address = 'ABCDEFGHIJKLMNOP';
    const result = truncateAddress(address, 6);

    expect(result).toBe('ABCDEF...MNOP');
  });

  it('allows custom suffix length', () => {
    const address = 'ABCDEFGHIJKLMNOP';
    const result = truncateAddress(address, 4, 6);

    expect(result).toBe('ABCD...KLMNOP');
  });

  it('allows custom prefix and suffix lengths', () => {
    const address = 'ABCDEFGHIJKLMNOP';
    const result = truncateAddress(address, 6, 6);

    expect(result).toBe('ABCDEF...KLMNOP');
  });

  it('returns full address if shorter than or equal to prefix + suffix', () => {
    // Address of 8 chars, default is 4+4=8, so should return full address (at threshold)
    const shortAddress = 'ABCDEFGH';
    const result = truncateAddress(shortAddress);

    expect(result).toBe('ABCDEFGH');
  });

  it('returns full address if exactly at the truncation threshold', () => {
    // 7 chars < 8 (4+4), below the threshold
    const address = 'ABCDEFG';
    const result = truncateAddress(address);

    expect(result).toBe('ABCDEFG');
  });

  it('truncates address that is just above the threshold', () => {
    // 9 chars > 8 (4+4), should truncate
    const address = 'ABCDEFGHI';
    const result = truncateAddress(address);

    expect(result).toBe('ABCD...FGHI');
  });

  it('handles empty string', () => {
    const result = truncateAddress('');

    expect(result).toBe('');
  });

  it('handles single character address', () => {
    const result = truncateAddress('A');

    expect(result).toBe('A');
  });
});

describe('generateSnapshotFilename', () => {
  beforeEach(() => {
    // Mock Date to have consistent timestamps in tests
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2025-12-04T10:30:45.123Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('generates filename with truncated address and timestamp', () => {
    const address = 'GCKFBEIYV2U22IO2BJ4KVJOIP7XPWQGQFKKWXR6DOSJBV7STMAQSMTGG';
    const result = generateSnapshotFilename(address);

    expect(result).toBe('access-snapshot-GCKF...MTGG-2025-12-04T10-30-45-123Z.json');
  });

  it('replaces colons and periods in timestamp for filesystem safety', () => {
    const address = '0x1234567890abcdef1234567890abcdef12345678';
    const result = generateSnapshotFilename(address);

    // Check that the timestamp portion doesn't contain : or .
    // The format is: access-snapshot-{truncated}-{timestamp}.json
    // Extract just the timestamp portion (after the last truncated address segment)
    const timestampMatch = result.match(/\d{4}-\d{2}-\d{2}T[\d-]+Z/);
    expect(timestampMatch).not.toBeNull();
    const timestampPortion = timestampMatch![0];

    // Timestamp should not contain : or . (they should be replaced with -)
    expect(timestampPortion).not.toContain(':');
    expect(timestampPortion).not.toContain('.');
  });

  it('generates unique filenames for different timestamps', () => {
    const address = 'GCKFBEIYV2U22IO2BJ4KVJOIP7XPWQGQFKKWXR6DOSJBV7STMAQSMTGG';

    const result1 = generateSnapshotFilename(address);

    // Advance time by 1 second
    vi.setSystemTime(new Date('2025-12-04T10:30:46.123Z'));

    const result2 = generateSnapshotFilename(address);

    expect(result1).not.toBe(result2);
  });

  it('includes .json extension', () => {
    const address = 'GCKFBEIYV2U22IO2BJ4KVJOIP7XPWQGQFKKWXR6DOSJBV7STMAQSMTGG';
    const result = generateSnapshotFilename(address);

    expect(result.endsWith('.json')).toBe(true);
  });

  it('starts with access-snapshot prefix', () => {
    const address = 'GCKFBEIYV2U22IO2BJ4KVJOIP7XPWQGQFKKWXR6DOSJBV7STMAQSMTGG';
    const result = generateSnapshotFilename(address);

    expect(result.startsWith('access-snapshot-')).toBe(true);
  });

  it('generates valid filename for short addresses', () => {
    const shortAddress = 'SHORT';
    const result = generateSnapshotFilename(shortAddress);

    // Short address should be used as-is (no truncation)
    expect(result).toBe('access-snapshot-SHORT-2025-12-04T10-30-45-123Z.json');
  });

  it('handles Ethereum address format', () => {
    const address = '0x1234567890abcdef1234567890abcdef12345678';
    const result = generateSnapshotFilename(address);

    expect(result).toBe('access-snapshot-0x12...5678-2025-12-04T10-30-45-123Z.json');
  });
});
