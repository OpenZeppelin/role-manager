/**
 * Tests for expiration utility functions
 * Feature: 017-evm-access-control (Phase 6 — US5)
 * Task: T032
 *
 * Tests all 3 expiration modes:
 * - 'required': User must provide expiration (e.g., Stellar ledger)
 * - 'none': No expiration concept (e.g., EVM Ownable2Step)
 * - 'contract-managed': Contract manages expiration (e.g., EVM AccessControlDefaultAdminRules)
 *
 * Also tests behavior when metadata is undefined (e.g., still loading).
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { ExpirationMetadata } from '@openzeppelin/ui-types';

import {
  formatContractManagedExpiration,
  formatExpirationTimestamp,
  getContractManagedDescription,
  getCurrentValueLabel,
  getExpirationLabel,
  getExpirationPlaceholder,
  getExpirationStatusLabel,
  getExpirationUnitPlural,
  getTimestampTimeRemaining,
  hasNoExpiration,
  isContractManagedExpiration,
  isTimestampBasedExpiration,
  requiresExpirationInput,
} from '../expiration';

// =============================================================================
// Test Fixtures
// =============================================================================

/** Stellar: user must provide a ledger number */
const stellarMetadata: ExpirationMetadata = {
  mode: 'required',
  label: 'Expiration Ledger',
  unit: 'ledger number',
};

/** EVM Ownable2Step: no expiration concept */
const evmOwnershipMetadata: ExpirationMetadata = {
  mode: 'none',
};

/** EVM AccessControlDefaultAdminRules: contract-managed accept schedule */
const evmAdminMetadata: ExpirationMetadata = {
  mode: 'contract-managed',
  label: 'Accept Schedule',
  unit: 'UNIX timestamp',
  currentValue: 1739500000, // Feb 2025 (future timestamp)
};

/** EVM admin metadata with past timestamp */
const evmAdminMetadataPast: ExpirationMetadata = {
  mode: 'contract-managed',
  label: 'Accept Schedule',
  unit: 'UNIX timestamp',
  currentValue: 1000000000, // Sep 2001 (past timestamp)
};

/** EVM admin metadata without currentValue */
const evmAdminMetadataNoValue: ExpirationMetadata = {
  mode: 'contract-managed',
  label: 'Accept Schedule',
  unit: 'UNIX timestamp',
};

// =============================================================================
// Mode Check Tests
// =============================================================================

describe('requiresExpirationInput', () => {
  it('should return true for required mode (Stellar)', () => {
    expect(requiresExpirationInput(stellarMetadata)).toBe(true);
  });

  it('should return false for none mode (EVM Ownable2Step)', () => {
    expect(requiresExpirationInput(evmOwnershipMetadata)).toBe(false);
  });

  it('should return false for contract-managed mode (EVM admin)', () => {
    expect(requiresExpirationInput(evmAdminMetadata)).toBe(false);
  });

  it('should return false for undefined metadata (loading state)', () => {
    expect(requiresExpirationInput(undefined)).toBe(false);
  });
});

describe('hasNoExpiration', () => {
  it('should return true for none mode (EVM Ownable2Step)', () => {
    expect(hasNoExpiration(evmOwnershipMetadata)).toBe(true);
  });

  it('should return false for required mode (Stellar)', () => {
    expect(hasNoExpiration(stellarMetadata)).toBe(false);
  });

  it('should return false for contract-managed mode', () => {
    expect(hasNoExpiration(evmAdminMetadata)).toBe(false);
  });

  it('should return false for undefined metadata', () => {
    expect(hasNoExpiration(undefined)).toBe(false);
  });
});

describe('isContractManagedExpiration', () => {
  it('should return true for contract-managed mode (EVM admin)', () => {
    expect(isContractManagedExpiration(evmAdminMetadata)).toBe(true);
  });

  it('should return false for required mode (Stellar)', () => {
    expect(isContractManagedExpiration(stellarMetadata)).toBe(false);
  });

  it('should return false for none mode', () => {
    expect(isContractManagedExpiration(evmOwnershipMetadata)).toBe(false);
  });

  it('should return false for undefined metadata', () => {
    expect(isContractManagedExpiration(undefined)).toBe(false);
  });
});

// =============================================================================
// Label Helper Tests
// =============================================================================

describe('getExpirationLabel', () => {
  it('should return adapter label for Stellar', () => {
    expect(getExpirationLabel(stellarMetadata)).toBe('Expiration Ledger');
  });

  it('should return adapter label for EVM admin', () => {
    expect(getExpirationLabel(evmAdminMetadata)).toBe('Accept Schedule');
  });

  it('should return default fallback for EVM ownership (no label)', () => {
    expect(getExpirationLabel(evmOwnershipMetadata)).toBe('Expiration');
  });

  it('should return default fallback for undefined metadata', () => {
    expect(getExpirationLabel(undefined)).toBe('Expiration');
  });

  it('should use custom fallback when provided', () => {
    expect(getExpirationLabel(undefined, 'Custom Fallback')).toBe('Custom Fallback');
  });
});

describe('getCurrentValueLabel', () => {
  it('should return "Current Ledger" for ledger unit (Stellar)', () => {
    expect(getCurrentValueLabel(stellarMetadata)).toBe('Current Ledger');
  });

  it('should return "Current" for timestamp unit (EVM admin)', () => {
    expect(getCurrentValueLabel(evmAdminMetadata)).toBe('Current');
  });

  it('should return "Current" for no unit (EVM ownership)', () => {
    expect(getCurrentValueLabel(evmOwnershipMetadata)).toBe('Current');
  });

  it('should return "Current" for undefined metadata', () => {
    expect(getCurrentValueLabel(undefined)).toBe('Current');
  });

  it('should return "Current Block" for block unit', () => {
    const metadata: ExpirationMetadata = {
      mode: 'required',
      label: 'Expiration Block',
      unit: 'block number',
    };
    expect(getCurrentValueLabel(metadata)).toBe('Current Block');
  });
});

describe('getExpirationPlaceholder', () => {
  it('should return ledger placeholder for Stellar', () => {
    expect(getExpirationPlaceholder(stellarMetadata)).toBe('Enter ledger number');
  });

  it('should return generic placeholder for undefined metadata', () => {
    expect(getExpirationPlaceholder(undefined)).toBe('Enter value');
  });

  it('should return block placeholder for block unit', () => {
    const metadata: ExpirationMetadata = {
      mode: 'required',
      label: 'Expiration Block',
      unit: 'block number',
    };
    expect(getExpirationPlaceholder(metadata)).toBe('Enter block number');
  });
});

// =============================================================================
// Contract-Managed Formatting Tests
// =============================================================================

describe('formatContractManagedExpiration', () => {
  beforeEach(() => {
    // Fix "now" to a known time so timestamp comparisons are deterministic
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2025-06-01T00:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should return null for required mode', () => {
    expect(formatContractManagedExpiration(stellarMetadata)).toBeNull();
  });

  it('should return null for none mode', () => {
    expect(formatContractManagedExpiration(evmOwnershipMetadata)).toBeNull();
  });

  it('should return null for undefined metadata', () => {
    expect(formatContractManagedExpiration(undefined)).toBeNull();
  });

  it('should return null when currentValue is undefined', () => {
    expect(formatContractManagedExpiration(evmAdminMetadataNoValue)).toBeNull();
  });

  it('should format future UNIX timestamp as localized date string', () => {
    const futureMetadata: ExpirationMetadata = {
      mode: 'contract-managed',
      label: 'Accept Schedule',
      unit: 'UNIX timestamp',
      currentValue: 1748908800, // 2025-06-03T00:00:00Z (2 days in the future)
    };

    const result = formatContractManagedExpiration(futureMetadata);
    expect(result).not.toBeNull();
    expect(result).not.toBe('Immediately acceptable');
    // Should be a date string (locale-dependent, so just check it's non-empty)
    expect(result!.length).toBeGreaterThan(0);
  });

  it('should return "Immediately acceptable" for past UNIX timestamp', () => {
    expect(formatContractManagedExpiration(evmAdminMetadataPast)).toBe('Immediately acceptable');
  });

  it('should handle UNIX timestamp in milliseconds (auto-detect)', () => {
    const msMetadata: ExpirationMetadata = {
      mode: 'contract-managed',
      label: 'Accept Schedule',
      unit: 'UNIX timestamp',
      currentValue: 1000000000000, // Already in milliseconds, Sep 2001 → past
    };

    expect(formatContractManagedExpiration(msMetadata)).toBe('Immediately acceptable');
  });

  it('should format non-timestamp values as localized numbers', () => {
    const genericMetadata: ExpirationMetadata = {
      mode: 'contract-managed',
      label: 'Delay',
      unit: 'seconds',
      currentValue: 86400,
    };

    const result = formatContractManagedExpiration(genericMetadata);
    expect(result).not.toBeNull();
    // 86400 formatted as locale string
    expect(result).toBe((86400).toLocaleString());
  });
});

describe('getContractManagedDescription', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2025-06-01T00:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should return null for required mode', () => {
    expect(getContractManagedDescription(stellarMetadata)).toBeNull();
  });

  it('should return null for none mode', () => {
    expect(getContractManagedDescription(evmOwnershipMetadata)).toBeNull();
  });

  it('should return null for undefined metadata', () => {
    expect(getContractManagedDescription(undefined)).toBeNull();
  });

  it('should return description with formatted value for contract-managed', () => {
    const result = getContractManagedDescription(evmAdminMetadataPast);
    expect(result).toBe('Accept Schedule: Immediately acceptable');
  });

  it('should return generic description when no currentValue', () => {
    const result = getContractManagedDescription(evmAdminMetadataNoValue);
    expect(result).toBe('Accept Schedule is determined by the contract.');
  });

  it('should use fallback label when metadata has no label', () => {
    const noLabelMetadata: ExpirationMetadata = {
      mode: 'contract-managed',
      unit: 'seconds',
    };

    const result = getContractManagedDescription(noLabelMetadata);
    expect(result).toBe('Accept schedule is determined by the contract.');
  });
});

// =============================================================================
// Expiration Unit Plural Tests
// =============================================================================

describe('getExpirationUnitPlural', () => {
  it('should return "ledgers" for Stellar (ledger number)', () => {
    expect(getExpirationUnitPlural(stellarMetadata)).toBe('ledgers');
  });

  it('should return "blocks" for block number unit', () => {
    const metadata: ExpirationMetadata = {
      mode: 'required',
      label: 'Expiration Block',
      unit: 'block number',
    };
    expect(getExpirationUnitPlural(metadata)).toBe('blocks');
  });

  it('should return fallback for undefined metadata', () => {
    expect(getExpirationUnitPlural(undefined)).toBe('units');
    expect(getExpirationUnitPlural(undefined, 'units')).toBe('units');
  });

  it('should pluralize unknown/adapter-specific units', () => {
    const metadata: ExpirationMetadata = {
      mode: 'required',
      label: 'Expiration',
      unit: 'slot',
    };
    expect(getExpirationUnitPlural(metadata)).toBe('slots');
    expect(getExpirationUnitPlural(metadata, 'units')).toBe('slots');
  });
});

// =============================================================================
// Expiration Status Label Tests
// =============================================================================

describe('getExpirationStatusLabel', () => {
  it('should return "Expires at Ledger:" for Stellar (not expired)', () => {
    expect(getExpirationStatusLabel(false, stellarMetadata)).toBe('Expires at Ledger:');
  });

  it('should return "Expired at Ledger:" for Stellar (expired)', () => {
    expect(getExpirationStatusLabel(true, stellarMetadata)).toBe('Expired at Ledger:');
  });

  it('should return "Expires at:" for UNIX timestamp unit (not expired)', () => {
    expect(getExpirationStatusLabel(false, evmAdminMetadata)).toBe('Expires at:');
  });

  it('should return "Expired at:" for UNIX timestamp unit (expired)', () => {
    expect(getExpirationStatusLabel(true, evmAdminMetadata)).toBe('Expired at:');
  });

  it('should return "Expires at:" for undefined metadata (not expired)', () => {
    expect(getExpirationStatusLabel(false, undefined)).toBe('Expires at:');
  });

  it('should return "Expired at:" for undefined metadata (expired)', () => {
    expect(getExpirationStatusLabel(true, undefined)).toBe('Expired at:');
  });

  it('should return "Expires at Block:" for block unit', () => {
    const metadata: ExpirationMetadata = {
      mode: 'required',
      label: 'Expiration Block',
      unit: 'block number',
    };
    expect(getExpirationStatusLabel(false, metadata)).toBe('Expires at Block:');
  });
});

// =============================================================================
// Timestamp-Based Expiration (Contract-Managed) Tests
// =============================================================================

describe('isTimestampBasedExpiration', () => {
  it('should return true for contract-managed with "UNIX timestamp" unit', () => {
    const metadata: ExpirationMetadata = {
      mode: 'contract-managed',
      unit: 'UNIX timestamp',
    };
    expect(isTimestampBasedExpiration(metadata)).toBe(true);
  });

  it('should return true for contract-managed with "Timestamp in seconds" unit', () => {
    const metadata: ExpirationMetadata = {
      mode: 'contract-managed',
      unit: 'Timestamp in seconds',
    };
    expect(isTimestampBasedExpiration(metadata)).toBe(true);
  });

  it('should return false for contract-managed with "block number" unit', () => {
    const metadata: ExpirationMetadata = {
      mode: 'contract-managed',
      unit: 'block number',
    };
    expect(isTimestampBasedExpiration(metadata)).toBe(false);
  });

  it('should return false for required mode even with "timestamp" unit', () => {
    const metadata: ExpirationMetadata = {
      mode: 'required',
      unit: 'timestamp',
    };
    expect(isTimestampBasedExpiration(metadata)).toBe(false);
  });

  it('should return false for undefined metadata', () => {
    expect(isTimestampBasedExpiration(undefined)).toBe(false);
  });
});

describe('formatExpirationTimestamp', () => {
  it('should format a real timestamp as a non-empty string containing "2026"', () => {
    const result = formatExpirationTimestamp(1771235892);
    expect(result).toBeTruthy();
    expect(result).toContain('2026');
  });

  it('should return "—" for 0', () => {
    expect(formatExpirationTimestamp(0)).toBe('—');
  });

  it('should return "—" for negative values', () => {
    expect(formatExpirationTimestamp(-100)).toBe('—');
  });
});

describe('getTimestampTimeRemaining', () => {
  it('should return null for a timestamp in the past', () => {
    const past = Math.floor(Date.now() / 1000) - 100;
    expect(getTimestampTimeRemaining(past)).toBeNull();
  });

  it('should return a non-null string for a timestamp in the future', () => {
    const future = Math.floor(Date.now() / 1000) + 3600;
    const result = getTimestampTimeRemaining(future);
    expect(result).not.toBeNull();
    expect(result).toMatch(/hour|minute/i);
  });

  it('should return null for 0', () => {
    expect(getTimestampTimeRemaining(0)).toBeNull();
  });
});
