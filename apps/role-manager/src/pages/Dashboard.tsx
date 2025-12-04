/**
 * Dashboard Page
 * Feature: 007-dashboard-real-data
 *
 * Displays an overview of the selected contract's access control configuration.
 * Shows contract info, role statistics, and provides refresh/export actions.
 */
import { Download, RefreshCw, Shield, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import { Button } from '@openzeppelin/ui-builder-ui';
import { logger } from '@openzeppelin/ui-builder-utils';

import { ContractInfoCard } from '../components/Dashboard/ContractInfoCard';
import { DashboardEmptyState } from '../components/Dashboard/DashboardEmptyState';
import { DashboardStatsCard } from '../components/Dashboard/DashboardStatsCard';
import { PendingChangesCard } from '../components/Dashboard/PendingChangesCard';
import { PageHeader } from '../components/Shared/PageHeader';
import { useSelectedContract } from '../hooks';

export function Dashboard() {
  const navigate = useNavigate();
  const { selectedContract, selectedNetwork, adapter } = useSelectedContract();

  // Determine if we have a contract selected
  const hasContract = selectedContract !== null;

  // Compute derived values for the selected contract
  const explorerUrl =
    adapter && selectedContract ? adapter.getExplorerUrl(selectedContract.address) : null;
  const contractName = selectedContract?.label || selectedContract?.address || 'Unknown Contract';

  // If no contract is selected, show empty state
  if (!hasContract) {
    return (
      <div className="p-6 space-y-6">
        <PageHeader
          title="Dashboard"
          subtitle="Overview of your contract access control and roles."
        />
        <DashboardEmptyState />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="Dashboard"
        subtitle="Overview of your contract access control and roles."
        actions={
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={() => logger.info('Dashboard', 'Refresh Data clicked')}
              className="bg-white"
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh Data
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => logger.info('Dashboard', 'Download Snapshot clicked')}
              className="bg-white"
            >
              <Download className="mr-2 h-4 w-4" />
              Download Snapshot
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column */}
        <div className="lg:col-span-2 space-y-6">
          <ContractInfoCard
            contractName={contractName}
            capabilities={selectedContract.capabilities}
            address={selectedContract.address}
            network={selectedNetwork}
            explorerUrl={explorerUrl}
          />

          <PendingChangesCard />
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          <DashboardStatsCard
            title="Roles"
            count={5}
            label="Configured in system"
            icon={<Shield className="h-5 w-5" />}
            onClick={() => navigate('/roles')}
          />

          <DashboardStatsCard
            title="Authorized Accounts"
            count={12}
            label="With active permissions"
            icon={<Users className="h-5 w-5" />}
            onClick={() => navigate('/authorized-accounts')}
          />
        </div>
      </div>
    </div>
  );
}
