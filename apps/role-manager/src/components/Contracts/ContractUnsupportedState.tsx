/**
 * ContractUnsupportedState Component
 *
 * Displays when a contract doesn't implement required access control interfaces.
 * Shows detected capabilities for debugging and allows user to try a different contract.
 */

import { ShieldX } from 'lucide-react';

import type { AccessControlCapabilities } from '@openzeppelin/ui-types';
import { Button } from '@openzeppelin/ui-components';

import { AccessControlCapabilitiesSummary } from './AccessControlCapabilitiesSummary';

interface ContractUnsupportedStateProps {
  /**
   * Detected capabilities (even if unsupported)
   */
  capabilities?: AccessControlCapabilities | null;

  /**
   * Callback when cancel button is clicked
   */
  onCancel: () => void;

  /**
   * Callback when "Try Different Contract" button is clicked
   */
  onTryAgain: () => void;
}

/**
 * Displays a warning state when contract doesn't implement required interfaces
 */
export function ContractUnsupportedState({
  capabilities,
  onCancel,
  onTryAgain,
}: ContractUnsupportedStateProps): React.ReactElement {
  return (
    <div className="flex flex-col gap-4 py-4">
      {/* Warning banner */}
      <div className="flex items-start gap-3 rounded-lg border border-amber-500/50 bg-amber-500/10 p-4">
        <ShieldX className="mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />
        <div className="flex-1">
          <p className="font-medium text-amber-700 dark:text-amber-300">Contract not supported</p>
          <p className="mt-1 text-sm text-amber-600/80 dark:text-amber-400/80">
            This contract does not implement standard OpenZeppelin Access Control or Ownable
            interfaces.
          </p>
        </div>
      </div>

      {/* Show detected capabilities for debugging */}
      {capabilities && (
        <AccessControlCapabilitiesSummary
          capabilities={capabilities}
          headerText="Detected Capabilities"
        />
      )}

      {/* Help text */}
      <p className="text-sm text-muted-foreground">
        The Role Manager requires contracts to implement at least one of these interfaces to manage
        access permissions.
      </p>

      {/* Action buttons */}
      <div className="flex justify-end gap-2">
        <Button variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
        <Button onClick={onTryAgain}>Try Different Contract</Button>
      </div>
    </div>
  );
}
