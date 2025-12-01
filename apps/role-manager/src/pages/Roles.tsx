import { Key } from 'lucide-react';

import { PageEmptyState } from '../components/Shared/PageEmptyState';
import { PageHeader } from '../components/Shared/PageHeader';

export function Roles() {
  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="Roles"
        subtitle={
          <span>
            View and manage roles for{' '}
            <span className="font-bold text-foreground">Demo Contract</span> on Ethereum
          </span>
        }
      />
      <PageEmptyState title="Roles" description="No roles available." icon={Key} />
    </div>
  );
}
