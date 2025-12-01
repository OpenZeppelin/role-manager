import { ArrowRightLeft } from 'lucide-react';

import { PageEmptyState } from '../components/Shared/PageEmptyState';
import { PageHeader } from '../components/Shared/PageHeader';

export function RoleChanges() {
  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="Role Changes"
        subtitle={
          <span>
            View and manage role change transactions for{' '}
            <span className="font-bold text-foreground">Demo Contract</span> on Ethereum
          </span>
        }
      />
      <PageEmptyState
        title="Role Changes"
        description="No role changes available."
        icon={ArrowRightLeft}
      />
    </div>
  );
}
