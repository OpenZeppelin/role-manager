import {
  AddressDisplay,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  NetworkStatusBadge,
} from '@openzeppelin/ui-components';
import type { AccessControlCapabilities, NetworkConfig } from '@openzeppelin/ui-types';
import { cn } from '@openzeppelin/ui-utils';

import { CONTRACT_FEATURES, CONTRACT_TYPES, resolveCapabilities } from '../../constants';
import { FeatureBadge } from '../Shared/FeatureBadge';

/**
 * Props for ContractInfoCard component.
 * Displays contract details on the Dashboard.
 */
interface ContractInfoCardProps {
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
  capabilities,
  address,
  network,
  explorerUrl,
  className,
}: ContractInfoCardProps) {
  const typeBadges = resolveCapabilities(capabilities, CONTRACT_TYPES);
  const featureBadges = resolveCapabilities(capabilities, CONTRACT_FEATURES);

  return (
    <Card className={cn('w-full shadow-none', className)}>
      <CardHeader className="pb-4">
        <CardTitle className="text-lg font-medium">Contract Information</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex justify-between items-center">
          <span className="text-sm font-semibold text-slate-900">Contract</span>
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
          <span className="text-sm font-semibold text-slate-900">Contract Type</span>
          <div className="flex items-center gap-1.5">
            {typeBadges.length > 0 ? (
              typeBadges.map(({ label, variant, description }) => (
                <FeatureBadge key={label} variant={variant} tooltip={description}>
                  {label}
                </FeatureBadge>
              ))
            ) : (
              <FeatureBadge variant="slate">Unknown</FeatureBadge>
            )}
          </div>
        </div>

        {featureBadges.length > 0 && (
          <div className="flex justify-between items-start">
            <span className="text-sm font-semibold text-slate-900 pt-0.5">Contract Features</span>
            <div className="flex flex-wrap justify-end gap-1.5">
              {featureBadges.map(({ label, variant, description }) => (
                <FeatureBadge key={label} variant={variant} tooltip={description}>
                  {label}
                </FeatureBadge>
              ))}
            </div>
          </div>
        )}

        <div className="flex justify-between items-center">
          <span className="text-sm font-semibold text-slate-900">Network / Chain</span>
          <NetworkStatusBadge network={network} />
        </div>
      </CardContent>
    </Card>
  );
}
