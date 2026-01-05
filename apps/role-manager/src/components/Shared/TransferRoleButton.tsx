/**
 * TransferRoleButton Component
 *
 * Reusable button for initiating two-step role transfers.
 * Supports different role types (Ownership, Admin, etc.)
 *
 * Styling: Blue outline to indicate an action that initiates a transfer.
 */

import { Crown, Shield } from 'lucide-react';

import { Button } from '@openzeppelin/ui-components';
import { cn } from '@openzeppelin/ui-utils';

import type { PendingTransferType } from '../../types/pending-transfers';

// =============================================================================
// Types
// =============================================================================

/**
 * Props for TransferRoleButton component
 */
export interface TransferRoleButtonProps {
  /** Type of role being transferred (affects icon) */
  roleType?: PendingTransferType;
  /** Custom label (e.g., "Ownership", "Admin Role") */
  roleLabel?: string;
  /** Click handler */
  onClick: () => void;
  /** Whether the button is disabled */
  disabled?: boolean;
  /** Button size variant */
  size?: 'sm' | 'default' | 'lg';
  /** Additional CSS classes */
  className?: string;
}

// =============================================================================
// Constants
// =============================================================================

const ROLE_ICONS: Partial<Record<PendingTransferType, typeof Crown>> = {
  ownership: Crown,
  admin: Shield,
  multisig: Shield,
};

const DEFAULT_LABELS: Partial<Record<PendingTransferType, string>> = {
  ownership: 'Ownership',
  admin: 'Admin Role',
  multisig: 'Multisig',
};

// =============================================================================
// Component
// =============================================================================

/**
 * TransferRoleButton - Button for initiating two-step role transfers
 *
 * @example
 * // Ownership transfer
 * <TransferRoleButton
 *   roleType="ownership"
 *   onClick={handleTransferOwnership}
 * />
 *
 * @example
 * // Admin role transfer
 * <TransferRoleButton
 *   roleType="admin"
 *   roleLabel="Admin"
 *   onClick={handleTransferAdmin}
 * />
 */
export function TransferRoleButton({
  roleType = 'ownership',
  roleLabel,
  onClick,
  disabled = false,
  size = 'sm',
  className,
}: TransferRoleButtonProps) {
  const Icon = ROLE_ICONS[roleType] ?? Crown;
  const label = roleLabel || DEFAULT_LABELS[roleType] || 'Role';

  return (
    <Button
      size={size}
      variant="outline"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'border-blue-600 text-blue-700 hover:bg-blue-50 hover:text-blue-800',
        size === 'sm' && 'h-7 px-3 text-xs',
        className
      )}
      aria-label={`Transfer ${label}`}
    >
      <Icon className={cn('mr-1', size === 'sm' ? 'h-3 w-3' : 'h-4 w-4')} />
      Transfer {label}
    </Button>
  );
}
