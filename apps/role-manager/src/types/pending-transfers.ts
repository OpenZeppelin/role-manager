/**
 * Pending Transfers Type Definitions
 * Feature: 015-ownership-transfer (Phase 6.5)
 *
 * These types define the data structures for displaying pending transfers
 * in the Dashboard's Pending Role Changes table.
 *
 * Design Notes:
 * - Generic `PendingTransfer` model supports ownership, admin role, and multisig transfers
 * - Flat table design (no expandable rows)
 * - "Accept" button shown for transfers where connected wallet can accept
 */

// =============================================================================
// Transfer Types
// =============================================================================

/**
 * Type of pending transfer
 * - ownership: Two-step Ownable transfer pending acceptance
 * - admin: Admin role transfer (future)
 * - multisig: Multisig signer change (future)
 */
export type PendingTransferType = 'ownership' | 'admin' | 'multisig';

// =============================================================================
// Core Data Model
// =============================================================================

/**
 * Unified pending transfer model for Dashboard display.
 *
 * Supports multiple transfer types with a consistent structure
 * for rendering in a flat table format.
 */
export interface PendingTransfer {
  /** Unique identifier for the transfer */
  id: string;

  /** Type of transfer (ownership, admin, multisig) */
  type: PendingTransferType;

  /** Display label for the transfer (e.g., "Owner", "Admin Role") */
  label: string;

  /** Current holder's address */
  currentHolder: string;

  /** Pending recipient's address */
  pendingRecipient: string;

  /** Block/ledger number at which the transfer expires */
  expirationBlock: number;

  /** Whether the transfer has expired (derived from current block) */
  isExpired: boolean;

  /** Progress indicator (e.g., { current: 1, total: 2 } for two-step) */
  step: {
    current: number;
    total: number;
  };

  /** Whether the connected wallet can accept this transfer */
  canAccept: boolean;

  /** Optional timestamp when transfer was initiated */
  initiatedAt?: string;
}

// =============================================================================
// Hook Return Types
// =============================================================================

/**
 * Options for usePendingTransfers hook
 */
export interface UsePendingTransfersOptions {
  /** Whether to include expired transfers in results (default: false) */
  includeExpired?: boolean;
}

/**
 * Return type for usePendingTransfers hook
 */
export interface UsePendingTransfersReturn {
  /** Array of pending transfers */
  transfers: PendingTransfer[];

  /** Whether data is loading */
  isLoading: boolean;

  /** Whether data is being refreshed in background */
  isRefreshing: boolean;

  /** Whether there was an error fetching data */
  hasError: boolean;

  /** User-friendly error message */
  errorMessage: string | null;

  /** Function to refresh pending transfers data */
  refetch: () => Promise<void>;
}
