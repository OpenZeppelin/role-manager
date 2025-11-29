import { LayoutDashboard } from 'lucide-react';
import React from 'react';

import { logger } from '@openzeppelin/ui-builder-utils';

import { EmptyState } from '../components/Shared/EmptyState';

export function Dashboard() {
  return (
    <div className="p-6">
      <h1 className="mb-6 text-2xl font-bold">Dashboard</h1>
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
