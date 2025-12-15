/**
 * RoleTypeBadge Component
 *
 * Displays a role type badge with an appropriate icon.
 * Used in pending transfers tables, authorized accounts, and role displays.
 *
 * Supports two usage patterns:
 * 1. With `type` prop: For pending transfers (ownership, admin, multisig)
 * 2. With `roleName` prop: For generic role badges (shows Crown for "Owner")
 *
 * Icons:
 * - Crown: Owner role / Ownership transfers (blue)
 * - Future: Admin, Multisig icons can be added
 */

import { Crown } from 'lucide-react';

import type { PendingTransferType } from '../../types/pending-transfers';
import { OutlineBadge } from './OutlineBadge';

// =============================================================================
// Types
// =============================================================================

/**
 * Props for RoleTypeBadge component
 *
 * Use either `type` (for pending transfers) or `roleName` (for role badges).
 * If both are provided, `type` takes precedence for icon display.
 */
export interface RoleTypeBadgeProps {
  /** Type of role/transfer (for pending transfers) */
  type?: PendingTransferType;
  /** Role name (for generic role badges) */
  roleName?: string;
  /** Optional custom label (overrides default derived from type/roleName) */
  label?: string;
  /** Additional CSS classes for the badge */
  className?: string;
}

// =============================================================================
// Constants
// =============================================================================

/**
 * Default label mapping for transfer types
 */
const TYPE_LABELS: Record<PendingTransferType, string> = {
  ownership: 'Owner',
  admin: 'Admin',
  multisig: 'Multisig',
};

// =============================================================================
// Component
// =============================================================================

/**
 * RoleTypeBadge - Displays a role type with icon in an outline badge
 *
 * @example
 * // Ownership type with Crown icon (pending transfers)
 * <RoleTypeBadge type="ownership" />
 *
 * @example
 * // Role name with Crown icon (authorized accounts)
 * <RoleTypeBadge roleName="Owner" />
 *
 * @example
 * // Regular role without icon
 * <RoleTypeBadge roleName="Minter" />
 *
 * @example
 * // Custom label override
 * <RoleTypeBadge type="admin" label="Admin Role" />
 */
export function RoleTypeBadge({ type, roleName, label, className }: RoleTypeBadgeProps) {
  // Determine display label: custom label > type label > role name
  const displayLabel = label || (type ? TYPE_LABELS[type] : roleName) || '';

  // Show Crown icon for ownership transfers OR Owner role name
  const isOwner = type === 'ownership' || roleName?.toLowerCase() === 'owner';

  return (
    <OutlineBadge className={isOwner ? `gap-1 ${className || ''}`.trim() : className}>
      {isOwner && <Crown className="h-3 w-3 text-blue-600" aria-label="Owner role" />}
      {displayLabel}
    </OutlineBadge>
  );
}
