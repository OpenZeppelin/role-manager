import { ArrowRightLeft } from 'lucide-react';
import React from 'react';

import { EmptyState } from '../components/Shared/EmptyState';

export function RoleChanges() {
  return (
    <div className="p-6">
      <h1 className="mb-6 text-2xl font-bold">Role Changes</h1>
      <EmptyState
        title="Role Changes"
        description="No role changes available."
        icon={ArrowRightLeft}
      />
    </div>
  );
}
