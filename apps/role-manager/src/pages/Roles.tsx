import { Key } from 'lucide-react';

import { EmptyState } from '../components/Shared/EmptyState';
import { PageHeader } from '../components/Shared/PageHeader';

export function Roles() {
  return (
    <div className="p-6">
      <PageHeader
        title="Roles"
        subtitle={
          <span>
            View and manage roles for{' '}
            <span className="font-bold text-foreground">Demo Contract</span> on Ethereum
          </span>
        }
      />
      <EmptyState title="Roles" description="No roles available." icon={Key} />
    </div>
  );
}
