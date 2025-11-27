import React from 'react';

import { Header as UIBuilderHeader } from '@openzeppelin/ui-builder-ui';

export interface AppHeaderProps {
  onOpenSidebar: () => void;
}

/**
 * Application Header component
 * Wraps the UI Builder Header with app-specific configuration
 */
export function AppHeader({ onOpenSidebar }: AppHeaderProps): React.ReactElement {
  return (
    <UIBuilderHeader
      title="Role Manager"
      onOpenSidebar={onOpenSidebar}
      rightContent={
        <div className="flex items-center gap-2">
          {/* Wallet connection or other header actions can be added here */}
        </div>
      }
    />
  );
}
