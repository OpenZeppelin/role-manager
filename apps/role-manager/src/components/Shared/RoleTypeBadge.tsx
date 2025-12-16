/**
 * RoleTypeBadge Component
 * Updated by: 016-two-step-admin-assignment (T042)
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
 * - Shield: Contract Admin transfers only (purple) - NOT for regular Admin roles
 * - Future: Multisig icons can be added
 *
 * Note: The shield icon is reserved for Contract Admin (two-step admin transfer),
 * not for the regular enumerated "ADMIN_ROLE" from AccessControl.
 */

import { Crown, Shield } from 'lucide-react';

import { cn } from '@openzeppelin/ui-builder-utils';

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
 * // Admin type with Shield icon (pending transfers)
 * <RoleTypeBadge type="admin" />
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

  // Show Shield icon ONLY for Contract Admin transfers (type='admin')
  // NOT for regular enumerated Admin roles - shield is reserved for the
  // official Contract Admin two-step transfer events only (T042)
  const isContractAdmin = type === 'admin';

  // Determine if icon should be shown
  const hasIcon = isOwner || isContractAdmin;

  return (
    <OutlineBadge className={cn(hasIcon && 'gap-1', className)}>
      {isOwner && <Crown className="h-3 w-3 text-blue-600" aria-label="Owner role" />}
      {isContractAdmin && (
        <Shield className="h-3 w-3 text-purple-600" aria-label="Contract Admin role" />
      )}
      {displayLabel}
    </OutlineBadge>
  );
}
