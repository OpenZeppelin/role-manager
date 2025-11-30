import { Download, RefreshCw, Shield, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import { Button } from '@openzeppelin/ui-builder-ui';
import { logger } from '@openzeppelin/ui-builder-utils';

import { ContractInfoCard } from '../components/Dashboard/ContractInfoCard';
import { DashboardStatsCard } from '../components/Dashboard/DashboardStatsCard';
import { PendingChangesCard } from '../components/Dashboard/PendingChangesCard';
import { PageHeader } from '../components/Shared/PageHeader';

export function Dashboard() {
  const navigate = useNavigate();

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
            contractName="Demo Contract"
            contractType="Access Manager"
            address="0xA1B2...CDEF12"
            networkName="Ethereum"
            explorerUrl="https://etherscan.io"
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
