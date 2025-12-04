/**
 * DialogSuccessState Component
 *
 * Displays success state with contract info, address display with explorer link,
 * and access control capabilities summary.
 */

import { CheckCircle2 } from 'lucide-react';

import type { AccessControlCapabilities } from '@openzeppelin/ui-builder-types';
import { AddressDisplay, Button } from '@openzeppelin/ui-builder-ui';

import { AccessControlCapabilitiesSummary } from './AccessControlCapabilitiesSummary';

interface DialogSuccessStateProps {
  /**
   * Contract name/label
   */
  contractName: string;

  /**
   * Contract address
   */
  contractAddress: string;

  /**
   * Optional explorer URL for the contract
   */
  explorerUrl?: string | null;

  /**
   * Detected access control capabilities
   */
  capabilities?: AccessControlCapabilities | null;

  /**
   * Callback when done button is clicked
   */
  onComplete: () => void;
}

/**
 * Displays a success state after contract has been added successfully
 */
export function DialogSuccessState({
  contractName,
  contractAddress,
  explorerUrl,
  capabilities,
  onComplete,
}: DialogSuccessStateProps): React.ReactElement {
  return (
    <div className="flex flex-col gap-4 py-4">
      {/* Success header */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
          <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
        </div>
        <div>
          <p className="font-medium">Contract added successfully!</p>
          <p className="text-sm text-muted-foreground">{contractName}</p>
        </div>
      </div>

      {/* Contract address with explorer link */}
      <div className="rounded-lg border bg-muted/50 p-3">
        <div className="mb-2 text-xs text-muted-foreground">Contract Address</div>
        <AddressDisplay
          address={contractAddress}
          truncate={true}
          startChars={10}
          endChars={8}
          showCopyButton={true}
          explorerUrl={explorerUrl ?? undefined}
          className="bg-background"
        />
      </div>

      {/* Access Control Capabilities Summary */}
      {capabilities && <AccessControlCapabilitiesSummary capabilities={capabilities} />}

      {/* Done button */}
      <div className="flex justify-end">
        <Button onClick={onComplete}>Done</Button>
      </div>
    </div>
  );
}
