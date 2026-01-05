/**
 * WalletDisconnectedAlert Component
 * Feature: 014-role-grant-revoke (Phase 6: Error Handling)
 *
 * Alert displayed when wallet disconnects while a dialog is open.
 *
 * Implements FR-039: "If wallet disconnects while dialog is open,
 * MUST show 'Wallet disconnected' error and disable submit button."
 *
 * Key behaviors:
 * - Shows warning alert about wallet disconnection
 * - Informs user they need to reconnect to continue
 */

import { WalletIcon } from 'lucide-react';

import { Alert, AlertDescription, AlertTitle } from '@openzeppelin/ui-components';

// =============================================================================
// Types
// =============================================================================

/**
 * Props for WalletDisconnectedAlert component
 */
export interface WalletDisconnectedAlertProps {
  /** Optional custom message */
  message?: string;
}

// =============================================================================
// Component
// =============================================================================

/**
 * WalletDisconnectedAlert - Warning alert for wallet disconnection
 *
 * Displayed when the user's wallet disconnects while a role dialog is open.
 * Reminds user to reconnect their wallet to continue with the transaction.
 *
 * @example
 * ```tsx
 * {!isWalletConnected && <WalletDisconnectedAlert />}
 * ```
 */
export function WalletDisconnectedAlert({ message }: WalletDisconnectedAlertProps) {
  return (
    <Alert variant="destructive">
      <WalletIcon className="h-4 w-4" />
      <AlertTitle>Wallet Disconnected</AlertTitle>
      <AlertDescription>
        {message || 'Please reconnect your wallet to continue with this action.'}
      </AlertDescription>
    </Alert>
  );
}
