/**
 * AcceptTransferButton Component
 *
 * Reusable button for accepting pending two-step role transfers.
 * Supports different role types (Ownership, Admin, etc.)
 *
 * Styling: Green outline to indicate a positive acceptance action.
 */

import { CheckCircle } from 'lucide-react';

import { Button } from '@openzeppelin/ui-builder-ui';
import { cn } from '@openzeppelin/ui-builder-utils';

import type { PendingTransferType } from '../../types/pending-transfers';

// =============================================================================
// Types
// =============================================================================

/**
 * Props for AcceptTransferButton component
 */
export interface AcceptTransferButtonProps {
  /** Type of role being accepted (for future icon variations) */
  roleType?: PendingTransferType;
  /** Custom label (e.g., "Ownership", "Admin Role") */
  roleLabel?: string;
  /** Click handler */
  onClick: () => void;
  /** Whether the button is disabled */
  disabled?: boolean;
  /** Button size variant */
  size?: 'sm' | 'default' | 'lg';
  /** Whether to show short label ("Accept" vs "Accept Ownership") */
  shortLabel?: boolean;
  /** Additional CSS classes */
  className?: string;
}

// =============================================================================
// Constants
// =============================================================================

const DEFAULT_LABELS: Partial<Record<PendingTransferType, string>> = {
  ownership: 'Ownership',
  admin: 'Admin Role',
  multisig: 'Multisig',
};

// =============================================================================
// Component
// =============================================================================

/**
 * AcceptTransferButton - Button for accepting pending two-step transfers
 *
 * @example
 * // Ownership acceptance (full label)
 * <AcceptTransferButton
 *   roleType="ownership"
 *   onClick={handleAcceptOwnership}
 * />
 *
 * @example
 * // Short label for table rows
 * <AcceptTransferButton
 *   roleType="ownership"
 *   shortLabel
 *   onClick={handleAccept}
 * />
 *
 * @example
 * // Admin role acceptance
 * <AcceptTransferButton
 *   roleType="admin"
 *   roleLabel="Admin"
 *   onClick={handleAcceptAdmin}
 * />
 */
export function AcceptTransferButton({
  roleType = 'ownership',
  roleLabel,
  onClick,
  disabled = false,
  size = 'sm',
  shortLabel = false,
  className,
}: AcceptTransferButtonProps) {
  const label = roleLabel || DEFAULT_LABELS[roleType] || 'Transfer';
  const buttonText = shortLabel ? 'Accept' : `Accept ${label}`;

  return (
    <Button
      size={size}
      variant="outline"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'border-green-600 text-green-700 hover:bg-green-50 hover:text-green-800',
        className
      )}
      aria-label={`Accept ${label} transfer`}
    >
      <CheckCircle className={cn('mr-1.5', size === 'sm' ? 'h-3.5 w-3.5' : 'h-4 w-4')} />
      {buttonText}
    </Button>
  );
}
