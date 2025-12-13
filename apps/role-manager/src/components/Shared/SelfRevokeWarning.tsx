/**
 * SelfRevokeWarning Component
 * Feature: 014-role-grant-revoke
 *
 * Warning alert displayed when a user is about to revoke a role from themselves.
 * Uses amber/warning variant to indicate caution without blocking the action.
 *
 * UI Standards Reference (spec.md):
 * - Amber/warning background color
 * - Prominent warning icon
 * - Dynamic role name in message
 * - Positioned below form fields, above submit button
 */

import { AlertTriangle } from 'lucide-react';

import { Alert, AlertDescription, AlertTitle } from '@openzeppelin/ui-builder-ui';
import { cn } from '@openzeppelin/ui-builder-utils';

/**
 * Props for SelfRevokeWarning component
 */
export interface SelfRevokeWarningProps {
  /** Role name being revoked */
  roleName: string;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Warning alert for self-revoke scenarios.
 * Displays when user is revoking a role from their own account.
 *
 * @example
 * ```tsx
 * {showSelfRevokeWarning && (
 *   <SelfRevokeWarning roleName="Admin" />
 * )}
 * ```
 */
export function SelfRevokeWarning({
  roleName,
  className,
}: SelfRevokeWarningProps): React.ReactElement {
  return (
    <Alert
      className={cn(
        'border-amber-500/50 bg-amber-50 text-amber-800 dark:bg-amber-900/20 dark:text-amber-200 [&>svg]:text-amber-600 dark:[&>svg]:text-amber-400',
        className
      )}
      aria-live="polite"
    >
      <AlertTriangle className="h-4 w-4" />
      <AlertTitle>Warning: Self-Revoke</AlertTitle>
      <AlertDescription className="text-amber-700 dark:text-amber-300">
        You are about to revoke the <strong>{roleName}</strong> role from your own account. This
        action may limit your access to this contract.
      </AlertDescription>
    </Alert>
  );
}
