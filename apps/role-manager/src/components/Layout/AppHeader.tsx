import React from 'react';

import { Header as UIBuilderHeader } from '@openzeppelin/ui-components';

import { WalletHeaderSection } from './WalletHeaderSection';

export interface AppHeaderProps {
  onOpenSidebar: () => void;
}

/**
 * Application Header component
 * Wraps the UI Builder Header with app-specific configuration
 *
 * Feature: 013-wallet-connect-header
 * - Added WalletHeaderSection to display wallet connection UI
 * - Wallet UI only appears when a network is selected
 */
export function AppHeader({ onOpenSidebar }: AppHeaderProps): React.ReactElement {
  return (
    <UIBuilderHeader
      title="Role Manager"
      onOpenSidebar={onOpenSidebar}
      rightContent={<WalletHeaderSection />}
    />
  );
}
