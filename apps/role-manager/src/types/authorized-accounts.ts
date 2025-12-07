/**
 * Type definitions for the Authorized Accounts page
 * Feature: 010-authorized-accounts-page
 *
 * Presentation-focused types for the Authorized Accounts UI skeleton.
 * All types support mock data rendering without business logic.
 */

// =============================================================================
// Domain Types
// =============================================================================

/**
 * Possible statuses for an authorized account
 */
export type AccountStatus = 'active' | 'expired' | 'pending';

/**
 * Display configuration for each status
 */
export const ACCOUNT_STATUS_CONFIG: Record<
  AccountStatus,
  {
    label: string;
    variant: 'success' | 'error' | 'warning';
  }
> = {
  active: { label: 'Active', variant: 'success' },
  expired: { label: 'Expired', variant: 'error' },
  pending: { label: 'Pending', variant: 'warning' },
};

/**
 * Represents an authorized account with role assignments
 */
export interface AuthorizedAccount {
  /** Unique identifier - the account address */
  id: string;

  /** Ethereum address (0x prefixed, 42 characters) */
  address: string;

  /** Current authorization status */
  status: AccountStatus;

  /** Date when authorization was granted */
  dateAdded: Date;

  /** Optional expiration date (undefined = never expires) */
  expiresAt?: Date;

  /** Array of role names assigned to this account */
  roles: string[];
}

// =============================================================================
// Filter State Types
// =============================================================================

/**
 * Filter state for the accounts table
 */
export interface AccountsFilterState {
  /** Search query for address/ENS filtering */
  searchQuery: string;

  /** Selected status filter ('all' or specific status) */
  statusFilter: AccountStatus | 'all';

  /** Selected role filter ('all' or specific role name) */
  roleFilter: string;
}

/**
 * Default/initial filter state
 */
export const DEFAULT_FILTER_STATE: AccountsFilterState = {
  searchQuery: '',
  statusFilter: 'all',
  roleFilter: 'all',
};

// =============================================================================
// Selection State Types
// =============================================================================

/**
 * Selection state for table rows
 * Using Set<string> for O(1) lookup and efficient add/remove
 */
export type SelectionState = Set<string>;

/**
 * Derive master checkbox state from selection
 */
export type MasterCheckboxState = 'unchecked' | 'checked' | 'indeterminate';

/**
 * Helper to derive master checkbox state from selection
 */
export function getMasterCheckboxState(
  selectedCount: number,
  totalCount: number
): MasterCheckboxState {
  if (selectedCount === 0) return 'unchecked';
  if (selectedCount === totalCount) return 'checked';
  return 'indeterminate';
}

// =============================================================================
// Action Types
// =============================================================================

/**
 * Available actions for an account row
 */
export type AccountAction = 'edit-roles' | 'revoke-access' | 'view-details';

/**
 * Display configuration for actions
 */
export const ACCOUNT_ACTIONS: Array<{
  id: AccountAction;
  label: string;
}> = [
  { id: 'edit-roles', label: 'Edit Roles' },
  { id: 'revoke-access', label: 'Revoke Access' },
  { id: 'view-details', label: 'View Details' },
];

// =============================================================================
// Component Props Interfaces
// =============================================================================

/**
 * Props for AccountsTable component
 */
export interface AccountsTableProps {
  /** List of accounts to display */
  accounts: AuthorizedAccount[];

  /** Set of selected account IDs */
  selectedIds: Set<string>;

  /** Callback when row selection changes */
  onSelectionChange: (selectedIds: Set<string>) => void;

  /** Callback when an action is triggered on an account */
  onAction: (accountId: string, action: AccountAction) => void;
}

/**
 * Props for AccountRow component
 */
export interface AccountRowProps {
  /** Account data to display */
  account: AuthorizedAccount;

  /** Whether this row is currently selected */
  isSelected: boolean;

  /** Callback when selection checkbox changes */
  onToggleSelection: () => void;

  /** Callback when an action is triggered */
  onAction: (action: AccountAction) => void;
}

/**
 * Props for AccountsFilterBar component
 */
export interface AccountsFilterBarProps {
  /** Current filter state */
  filters: AccountsFilterState;

  /** Available roles for the role filter dropdown */
  availableRoles: string[];

  /** Callback when filter state changes */
  onFiltersChange: (filters: AccountsFilterState) => void;

  /** Whether the filter bar is disabled (used for initial shell state) */
  disabled?: boolean;
}

/**
 * Props for StatusBadge component
 */
export interface StatusBadgeProps {
  /** Status to display */
  status: AccountStatus;

  /** Additional CSS classes */
  className?: string;
}

/**
 * Props for RoleBadge component
 */
export interface RoleBadgeProps {
  /** Role name to display */
  role: string;

  /** Additional CSS classes */
  className?: string;
}

/**
 * Props for AccountActionsMenu component
 */
export interface AccountActionsMenuProps {
  /** Callback when an action is triggered */
  onAction: (action: AccountAction) => void;

  /** Additional CSS classes */
  className?: string;
}

/**
 * Props for AccountsEmptyState component
 */
export interface AccountsEmptyStateProps {
  /** Callback when the CTA button is clicked */
  onGrantAuthorization?: () => void;

  /** Additional CSS classes */
  className?: string;
}

/**
 * Props for AccountsLoadingSkeleton component
 */
export interface AccountsLoadingSkeletonProps {
  /** Number of skeleton rows to show in the table */
  rowCount?: number;

  /** Additional CSS classes */
  className?: string;
}
