import {
  AddressDisplay,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@openzeppelin/ui-builder-ui';
import { cn } from '@openzeppelin/ui-builder-utils';

interface ContractInfoCardProps {
  contractName: string;
  contractType: string;
  address: string;
  networkName: string;
  explorerUrl?: string;
  className?: string;
}

export function ContractInfoCard({
  contractName,
  contractType,
  address,
  networkName,
  explorerUrl,
  className,
}: ContractInfoCardProps) {
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
          <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-800">
            {contractType}
          </span>
        </div>

        <div className="flex justify-between items-center">
          <span className="text-sm font-semibold text-slate-900">Contract Address</span>
          <AddressDisplay
            address={address}
            showCopyButton={true}
            explorerUrl={explorerUrl}
            className="bg-transparent p-0 text-slate-600"
          />
        </div>

        <div className="flex justify-between items-center">
          <span className="text-sm font-semibold text-slate-900">Network / Chain</span>
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-900 font-medium">{networkName}</span>
            <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-500 border border-slate-200">
              {networkName}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
