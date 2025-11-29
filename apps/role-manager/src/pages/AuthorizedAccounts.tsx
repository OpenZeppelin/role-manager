import { Users } from 'lucide-react';
import React from 'react';

import { logger } from '@openzeppelin/ui-builder-utils';

import { EmptyState } from '../components/Shared/EmptyState';

export function AuthorizedAccounts() {
  return (
    <div className="p-6">
      <h1 className="mb-6 text-2xl font-bold">Authorized Accounts</h1>
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
