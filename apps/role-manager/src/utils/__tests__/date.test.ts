/**
 * Date Utility Tests
 *
 * Tests for date formatting and parsing utilities used across the application.
 */

import { describe, expect, it } from 'vitest';

import {
  formatDate,
  formatDateTime,
  formatToISOLocalString,
  parseISOString,
} from '../date';

describe('formatDate', () => {
  it('should format ISO date string to M/D/YYYY format', () => {
    // Use midday times to avoid timezone boundary issues
    expect(formatDate('2024-11-15T12:00:00Z')).toBe('11/15/2024');
    expect(formatDate('2024-01-05T12:00:00Z')).toBe('1/5/2024');
    expect(formatDate('2024-12-15T12:00:00Z')).toBe('12/15/2024');
  });

  it('should return empty string for empty input', () => {
    expect(formatDate('')).toBe('');
  });

  it('should return empty string for invalid date', () => {
    expect(formatDate('invalid-date')).toBe('');
    expect(formatDate('not-a-date')).toBe('');
  });
});

describe('formatDateTime', () => {
  it('should format ISO date string to M/D/YYYY, h:mm AM/PM format', () => {
    // Note: Output depends on local timezone, so we just check the format
    const result = formatDateTime('2024-11-15T10:30:00Z');
    expect(result).toMatch(/^\d{1,2}\/\d{1,2}\/\d{4}, \d{1,2}:\d{2} (AM|PM)$/);
  });

  it('should return empty string for empty input', () => {
    expect(formatDateTime('')).toBe('');
  });

  it('should return empty string for invalid date', () => {
    expect(formatDateTime('invalid-date')).toBe('');
  });
});

describe('formatToISOLocalString', () => {
  it('should format date to start of day by default (00:00:00)', () => {
    const date = new Date(2024, 11, 5, 14, 30, 45); // Dec 5, 2024 at 14:30:45
    const result = formatToISOLocalString(date);
    expect(result).toBe('2024-12-05T00:00:00');
  });

  it('should format date to end of day when endOfDay is true (23:59:59)', () => {
    const date = new Date(2024, 11, 5, 14, 30, 45); // Dec 5, 2024 at 14:30:45
    const result = formatToISOLocalString(date, true);
    expect(result).toBe('2024-12-05T23:59:59');
  });

  it('should pad single-digit months and days with zeros', () => {
    const date = new Date(2024, 0, 5); // Jan 5, 2024
    expect(formatToISOLocalString(date)).toBe('2024-01-05T00:00:00');
  });

  it('should handle year boundaries correctly', () => {
    const newYear = new Date(2025, 0, 1);
    expect(formatToISOLocalString(newYear)).toBe('2025-01-01T00:00:00');

    const newYearEve = new Date(2024, 11, 31);
    expect(formatToISOLocalString(newYearEve, true)).toBe('2024-12-31T23:59:59');
  });

  it('should ignore the input time and always use start/end of day', () => {
    // Even if input has specific time, output should be start of day
    const morningDate = new Date(2024, 5, 15, 8, 0, 0);
    const eveningDate = new Date(2024, 5, 15, 20, 30, 45);

    expect(formatToISOLocalString(morningDate)).toBe('2024-06-15T00:00:00');
    expect(formatToISOLocalString(eveningDate)).toBe('2024-06-15T00:00:00');

    // End of day should also ignore input time
    expect(formatToISOLocalString(morningDate, true)).toBe('2024-06-15T23:59:59');
    expect(formatToISOLocalString(eveningDate, true)).toBe('2024-06-15T23:59:59');
  });
});

describe('parseISOString', () => {
  it('should parse valid ISO string to Date object', () => {
    const result = parseISOString('2024-12-05T10:30:00');
    expect(result).toBeInstanceOf(Date);
    expect(result?.getFullYear()).toBe(2024);
    expect(result?.getMonth()).toBe(11); // December is month 11
    expect(result?.getDate()).toBe(5);
  });

  it('should parse ISO string with timezone', () => {
    const result = parseISOString('2024-12-05T10:30:00Z');
    expect(result).toBeInstanceOf(Date);
  });

  it('should return undefined for undefined input', () => {
    expect(parseISOString(undefined)).toBeUndefined();
  });

  it('should return undefined for empty string', () => {
    expect(parseISOString('')).toBeUndefined();
  });

  it('should return undefined for invalid date string', () => {
    expect(parseISOString('invalid-date')).toBeUndefined();
    expect(parseISOString('not-a-date')).toBeUndefined();
  });

  it('should handle edge case dates', () => {
    // Leap year date
    const leapYear = parseISOString('2024-02-29T00:00:00');
    expect(leapYear?.getDate()).toBe(29);

    // End of year
    const endOfYear = parseISOString('2024-12-31T23:59:59');
    expect(endOfYear?.getMonth()).toBe(11);
    expect(endOfYear?.getDate()).toBe(31);
  });
});
