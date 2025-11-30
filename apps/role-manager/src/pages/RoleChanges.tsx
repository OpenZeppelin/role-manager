import { ArrowRightLeft } from 'lucide-react';

import { EmptyState } from '../components/Shared/EmptyState';
import { PageHeader } from '../components/Shared/PageHeader';

export function RoleChanges() {
  return (
    <div className="p-6">
      <PageHeader
        title="Role Changes"
        subtitle={
          <span>
            View and manage role change transactions for{' '}
            <span className="font-bold text-foreground">Demo Contract</span> on Ethereum
          </span>
        }
      />
      <EmptyState
        title="Role Changes"
        description="No role changes available."
        icon={ArrowRightLeft}
      />
    </div>
  );
}
