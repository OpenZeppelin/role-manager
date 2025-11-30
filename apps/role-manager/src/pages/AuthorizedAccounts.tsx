import { Plus, Users } from 'lucide-react';

import { Button } from '@openzeppelin/ui-builder-ui';
import { logger } from '@openzeppelin/ui-builder-utils';

import { EmptyState } from '../components/Shared/EmptyState';
import { PageHeader } from '../components/Shared/PageHeader';

export function AuthorizedAccounts() {
  return (
    <div className="p-6">
      <PageHeader
        title="Authorized Accounts"
        subtitle={
          <span>
            Manage accounts and roles for{' '}
            <span className="font-bold text-foreground">Demo Contract</span> on Ethereum
          </span>
        }
        actions={
          <Button onClick={() => logger.info('AuthorizedAccounts', 'Add Account or Role clicked')}>
            <Plus className="mr-2 h-4 w-4" />
            Add Account or Role
          </Button>
        }
      />
      <EmptyState
        title="No Authorized Accounts"
        description="You haven't added any authorized accounts yet. Add an account to get started."
        icon={Users}
        actionLabel="Add New Account"
        onAction={() => {
          logger.info('AuthorizedAccounts', 'Add New Account clicked');
        }}
      />
    </div>
  );
}
