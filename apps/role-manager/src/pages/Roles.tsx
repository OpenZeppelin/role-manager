import { Key } from 'lucide-react';
import React from 'react';

import { EmptyState } from '../components/Shared/EmptyState';

export function Roles() {
  return (
    <div className="p-6">
      <h1 className="mb-6 text-2xl font-bold">Roles</h1>
      <EmptyState title="Roles" description="No roles available." icon={Key} />
    </div>
  );
}
