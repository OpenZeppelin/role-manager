/**
 * Expiration Utilities
 * Feature: 017-evm-access-control (Phase 6 — US5)
 *
 * Adapter-driven expiration formatting utilities.
 * The UI uses ExpirationMetadata from the adapter to determine:
 * - Whether to show an expiration input (mode: 'required')
 * - Whether to hide expiration entirely (mode: 'none')
 * - Whether to show read-only contract-managed info (mode: 'contract-managed')
 *
 * These utilities ensure the UI never hardcodes chain-specific terms
 * like "ledger" or "block" — all labels come from the adapter.
 */

import pluralize from 'pluralize';

import type { ExpirationMetadata } from '@openzeppelin/ui-types';
import { formatSecondsToReadable } from '@openzeppelin/ui-utils';

// =============================================================================
// Mode Checks
// =============================================================================

/**
 * Whether the expiration mode requires user input (e.g., Stellar ledger number).
 * Returns false if metadata is undefined (e.g., still loading).
 */
export function requiresExpirationInput(metadata: ExpirationMetadata | undefined): boolean {
  return metadata?.mode === 'required';
}

/**
 * Whether the chain has no expiration concept for this transfer type
 * (e.g., EVM Ownable2Step ownership transfer).
 */
export function hasNoExpiration(metadata: ExpirationMetadata | undefined): boolean {
  return metadata?.mode === 'none';
}

/**
 * Whether expiration is managed by the contract itself
 * (e.g., EVM AccessControlDefaultAdminRules accept schedule).
 */
export function isContractManagedExpiration(metadata: ExpirationMetadata | undefined): boolean {
  return metadata?.mode === 'contract-managed';
}

// =============================================================================
// Label Helpers
// =============================================================================

/**
 * Get the display label for the expiration field.
 * Uses the adapter-provided label, falling back to a generic default.
 *
 * @param metadata - Expiration metadata from the adapter
 * @param fallback - Fallback label when metadata has no label (default: "Expiration")
 */
export function getExpirationLabel(
  metadata: ExpirationMetadata | undefined,
  fallback = 'Expiration'
): string {
  return metadata?.label ?? fallback;
}

/**
 * Get the label for the "current value" display next to the expiration input.
 * Derives from the unit description:
 * - "ledger number" → "Current Ledger"
 * - "block number"  → "Current Block"
 * - Otherwise       → "Current"
 */
export function getCurrentValueLabel(metadata: ExpirationMetadata | undefined): string {
  const unit = metadata?.unit?.toLowerCase();
  if (!unit) return 'Current';
  if (unit.includes('ledger')) return 'Current Ledger';
  if (unit.includes('block')) return 'Current Block';
  return 'Current';
}

/**
 * Get a placeholder hint for the expiration input based on the unit.
 * - "ledger number" → "Enter ledger number"
 * - "block number"  → "Enter block number"
 * - Otherwise       → "Enter value"
 */
export function getExpirationPlaceholder(metadata: ExpirationMetadata | undefined): string {
  const unit = metadata?.unit?.toLowerCase();
  if (!unit) return 'Enter value';
  if (unit.includes('ledger')) return 'Enter ledger number';
  if (unit.includes('block')) return 'Enter block number';
  return 'Enter value';
}

// =============================================================================
// Contract-Managed Formatting
// =============================================================================

/**
 * Format a contract-managed expiration value for display.
 *
 * For UNIX timestamps: formats as a human-readable date/time string.
 * If the timestamp is in the past, returns "Immediately acceptable" (FR-041).
 * For other units: returns the value as a localized number string.
 *
 * @param metadata - Expiration metadata (must be 'contract-managed' with a currentValue)
 * @returns Formatted string, or null if no value to display
 */
export function formatContractManagedExpiration(
  metadata: ExpirationMetadata | undefined
): string | null {
  if (!metadata || metadata.mode !== 'contract-managed' || metadata.currentValue == null) {
    return null;
  }

  const value = metadata.currentValue;

  if (metadata.unit?.toLowerCase().includes('timestamp')) {
    // UNIX timestamp in seconds (EVM convention) — convert to milliseconds
    const timestampMs = value < 1e12 ? value * 1000 : value;

    if (timestampMs <= Date.now()) {
      return 'Immediately acceptable';
    }

    return new Date(timestampMs).toLocaleString();
  }

  // Generic numeric display
  return value.toLocaleString();
}

/**
 * Get a descriptive summary for contract-managed expiration.
 * Used in transfer dialogs to show informational text about the accept schedule.
 *
 * @returns A human-readable description, or null if metadata is not contract-managed
 */
export function getContractManagedDescription(
  metadata: ExpirationMetadata | undefined
): string | null {
  if (!metadata || metadata.mode !== 'contract-managed') return null;

  const label = metadata.label ?? 'Accept schedule';
  const formatted = formatContractManagedExpiration(metadata);

  if (!formatted) {
    return `${label} is determined by the contract.`;
  }

  return `${label}: ${formatted}`;
}

// =============================================================================
// Expiration Display Label for Pending Transfers
// =============================================================================

/**
 * Get the plural unit label for counts (e.g. "X ledgers remaining", "X blocks remaining").
 * Uses adapter-provided unit text, with light normalization, and pluralizes it via library.
 *
 * Examples:
 * - "ledger number" -> "ledgers"
 * - "block number" -> "blocks"
 * - "slot" -> "slots"
 *
 * @param metadata - Expiration metadata from the adapter
 * @param fallback - Fallback when unit is unavailable (default: "units")
 * @returns Pluralized unit label suitable for "<count> <unit> remaining"
 */
export function getExpirationUnitPlural(
  metadata: ExpirationMetadata | undefined,
  fallback = 'units'
): string {
  const rawUnit = metadata?.unit?.toLowerCase().trim();
  if (!rawUnit) return fallback;

  // Normalize known verbose suffixes without hardcoding specific chains.
  const normalizedUnit = rawUnit.replace(/\s+numbers?$/i, '').trim();
  if (!normalizedUnit) return fallback;

  return pluralize(normalizedUnit);
}

/**
 * Get the "expires at" / "expired at" label for pending transfer displays.
 * Uses adapter-driven labels instead of hardcoded "Block" or "Ledger".
 *
 * @param isExpired - Whether the transfer has already expired
 * @param metadata - Expiration metadata from the adapter
 * @returns Label like "Expires at Ledger:" or "Expired at Block:" etc.
 */
export function getExpirationStatusLabel(
  isExpired: boolean,
  metadata: ExpirationMetadata | undefined
): string {
  const unit = metadata?.unit?.toLowerCase();
  let suffix = '';

  if (unit?.includes('ledger')) suffix = ' Ledger';
  else if (unit?.includes('block')) suffix = ' Block';
  else if (unit?.includes('timestamp')) suffix = '';

  return isExpired ? `Expired at${suffix}:` : `Expires at${suffix}:`;
}

// =============================================================================
// Timestamp-Based Expiration (Contract-Managed)
// =============================================================================

/**
 * Whether the metadata indicates a timestamp-based contract-managed expiration.
 * True when the mode is 'contract-managed' AND the unit contains "timestamp".
 *
 * @param metadata - Expiration metadata from the adapter
 * @returns true if this is a timestamp-based contract-managed expiration
 */
export function isTimestampBasedExpiration(metadata: ExpirationMetadata | undefined): boolean {
  return (
    metadata?.mode === 'contract-managed' && !!metadata.unit?.toLowerCase().includes('timestamp')
  );
}

/**
 * Format a Unix timestamp (seconds since epoch) as a human-readable date string.
 * Returns '—' for non-positive values.
 *
 * @param timestampSeconds - Unix timestamp in seconds
 * @returns Formatted date string or '—'
 */
export function formatExpirationTimestamp(timestampSeconds: number): string {
  if (timestampSeconds <= 0) return '—';
  return new Date(timestampSeconds * 1000).toLocaleString();
}

/**
 * Compute the time remaining from now until the given timestamp and format it
 * as a human-readable duration using `formatSecondsToReadable`.
 *
 * @param timestampSeconds - Unix timestamp in seconds
 * @returns Formatted duration string, or null if the timestamp is already past
 */
export function getTimestampTimeRemaining(timestampSeconds: number): string | null {
  const remaining = timestampSeconds - Math.floor(Date.now() / 1000);
  if (remaining <= 0) return null;
  return formatSecondsToReadable(remaining);
}
