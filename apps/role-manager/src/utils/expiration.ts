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

import type { ExpirationMetadata } from '@openzeppelin/ui-types';

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
