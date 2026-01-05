import type { AccessControlCapabilities, NetworkConfig } from '@openzeppelin/ui-types';
import {
  AddressDisplay,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  NetworkStatusBadge,
} from '@openzeppelin/ui-components';
import { cn } from '@openzeppelin/ui-utils';

import { FeatureBadge } from '../Shared/FeatureBadge';

/**
 * Props for ContractInfoCard component.
 * Displays contract details on the Dashboard.
 */
interface ContractInfoCardProps {
  /** Contract display name/label */
  contractName: string;
  /** Access control capabilities for badge display */
  capabilities?: AccessControlCapabilities | null;
  /** Full contract address */
  address: string;
  /** Network configuration for badge display */
  network: NetworkConfig | null;
  /** Optional block explorer URL for address link */
  explorerUrl?: string | null;
  /** Additional CSS classes */
  className?: string;
}

export function ContractInfoCard({
  contractName,
  capabilities,
  address,
  network,
  explorerUrl,
  className,
}: ContractInfoCardProps) {
  // Determine which badges to show based on detected capabilities
  const hasOwnable = capabilities?.hasOwnable ?? false;
  const hasAccessControl = capabilities?.hasAccessControl ?? false;
  const hasDetectedCapabilities = hasOwnable || hasAccessControl;

  return (
    <Card className={cn('w-full shadow-none', className)}>
      <CardHeader className="pb-4">
        <CardTitle className="text-lg font-medium">Contract Information</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex justify-between items-center">
          <span className="text-sm font-semibold text-slate-900">Contract Name</span>
          <span className="text-sm text-slate-600">{contractName}</span>
        </div>

        <div className="flex justify-between items-center">
          <span className="text-sm font-semibold text-slate-900">Contract Type</span>
          <div className="flex items-center gap-1.5">
            {hasAccessControl && <FeatureBadge variant="purple">AccessControl</FeatureBadge>}
            {hasOwnable && <FeatureBadge variant="blue">Ownable</FeatureBadge>}
            {!hasDetectedCapabilities && <FeatureBadge variant="slate">Unknown</FeatureBadge>}
          </div>
        </div>

        <div className="flex justify-between items-center">
          <span className="text-sm font-semibold text-slate-900">Contract Address</span>
          <AddressDisplay
            address={address}
            truncate={true}
            startChars={6}
            endChars={4}
            showCopyButton={true}
            explorerUrl={explorerUrl ?? undefined}
          />
        </div>

        <div className="flex justify-between items-center">
          <span className="text-sm font-semibold text-slate-900">Network / Chain</span>
          <NetworkStatusBadge network={network} />
        </div>
      </CardContent>
    </Card>
  );
}
