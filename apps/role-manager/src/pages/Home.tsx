import React from 'react';

/**
 * Home page component
 * Placeholder for the main dashboard/home view
 */
export function Home(): React.ReactElement {
  return (
    <div className="flex flex-col gap-6 p-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Welcome to Role Manager</h1>
        <p className="mt-2 text-muted-foreground">
          Manage roles and permissions across your OpenZeppelin contracts.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-lg border border-border bg-card p-6">
          <h2 className="text-lg font-semibold text-card-foreground">Roles</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            View and manage roles across your contracts
          </p>
        </div>

        <div className="rounded-lg border border-border bg-card p-6">
          <h2 className="text-lg font-semibold text-card-foreground">Permissions</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Configure access control for your contracts
          </p>
        </div>

        <div className="rounded-lg border border-border bg-card p-6">
          <h2 className="text-lg font-semibold text-card-foreground">Activity</h2>
          <p className="mt-2 text-sm text-muted-foreground">Track role assignments and changes</p>
        </div>
      </div>
    </div>
  );
}
