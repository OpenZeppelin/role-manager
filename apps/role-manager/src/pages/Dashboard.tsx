import { Download, LayoutDashboard, RefreshCw } from 'lucide-react';

import { Button } from '@openzeppelin/ui-builder-ui';
import { logger } from '@openzeppelin/ui-builder-utils';

import { EmptyState } from '../components/Shared/EmptyState';
import { PageHeader } from '../components/Shared/PageHeader';

export function Dashboard() {
  return (
    <div className="p-6">
      <PageHeader
        title="Dashboard"
        subtitle="Overview of your contract access control and roles."
        actions={
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={() => logger.info('Dashboard', 'Refresh Data clicked')}
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh Data
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => logger.info('Dashboard', 'Download Snapshot clicked')}
            >
              <Download className="mr-2 h-4 w-4" />
              Download Snapshot
            </Button>
          </>
        }
      />
      <EmptyState
        title="Dashboard"
        description="No content available."
        icon={LayoutDashboard}
        actionLabel="Add New Account"
        onAction={() => {
          logger.info('Dashboard', 'Add New Account clicked');
        }}
      />
    </div>
  );
}
