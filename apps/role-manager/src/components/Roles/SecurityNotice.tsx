/**
 * SecurityNotice Component
 * Feature: 008-roles-page-layout
 *
 * Displays a security warning banner at the page bottom.
 * Static component with amber styling per FR-024/FR-025.
 */

import { AlertTriangle } from 'lucide-react';

import { Alert, AlertDescription, AlertTitle } from '@openzeppelin/ui-builder-ui';
import { cn } from '@openzeppelin/ui-builder-utils';

interface SecurityNoticeProps {
  /** Additional CSS classes */
  className?: string;
}

/**
 * Security notice warning banner
 *
 * Displays important security information about role assignments
 * and Owner role privileges with amber warning styling.
 *
 * @example
 * <SecurityNotice />
 * <SecurityNotice className="mt-6" />
 */
export function SecurityNotice({ className }: SecurityNoticeProps) {
  return (
    <Alert
      className={cn(
        'border-amber-200 bg-amber-50 text-amber-800',
        '[&>svg]:text-amber-600',
        className
      )}
    >
      <AlertTriangle className="h-4 w-4" />
      <AlertTitle className="text-amber-900">Security Notice</AlertTitle>
      <AlertDescription className="text-amber-800">
        <p className="mb-2">
          All role assignments and revocations require an on-chain transaction and must be confirmed
          in your connected wallet. These actions cannot be undone without another transaction.
        </p>
        <p>
          <strong>Owner privileges:</strong> The Owner role has full control over this contract,
          including the ability to transfer ownership and manage all other roles. Transfer ownership
          with caution.
        </p>
      </AlertDescription>
    </Alert>
  );
}
