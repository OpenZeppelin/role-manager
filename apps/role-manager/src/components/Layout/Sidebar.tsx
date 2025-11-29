import { ArrowRightLeft, Key, LayoutDashboard, Users } from 'lucide-react';
import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import { SidebarButton, SidebarLayout, SidebarSection } from '@openzeppelin/ui-builder-ui';
import { logger } from '@openzeppelin/ui-builder-utils';

import { Account, AccountSelector } from './AccountSelector';

export interface SidebarProps {
  /** Controls visibility in mobile slide-over */
  mobileOpen?: boolean;
  /** Close handler for mobile slide-over */
  onMobileOpenChange?: (open: boolean) => void;
}

/**
 * Sidebar component
 * Provides navigation with logo and menu items
 * Uses UI Builder SidebarLayout component with responsive behavior
 */
export function Sidebar({ mobileOpen, onMobileOpenChange }: SidebarProps): React.ReactElement {
  const location = useLocation();
  const navigate = useNavigate();

  // Mock accounts state
  const [accounts, setAccounts] = useState<Account[]>([
    {
      address: '0xA1B2C3D4E5F6A1B2C3D4E5F6A1B2C3D4E5F6EF12',
      name: 'Demo Contract',
      color: '#06b6d4', // cyan-500
    },
    {
      address: '0x0000000000000000000000000000000000000000',
      name: 'asdasdasda',
      color: '#ef4444', // red-500
    },
  ]);

  const [selectedAccount, setSelectedAccount] = useState<Account | null>(accounts[0]);

  const headerContent = (
    <div className="mb-6 px-2">
      <img src="/OZ-Logo-BlackBG.svg" alt="OpenZeppelin Logo" className="h-6 w-auto" />
    </div>
  );

  const accountSelector = (
    <div className="mb-8">
      <AccountSelector
        accounts={accounts}
        selectedAccount={selectedAccount}
        onSelectAccount={setSelectedAccount}
        onAddAccount={() => {
          logger.info('Sidebar', 'Add new account clicked');
        }}
        onRemoveAccount={(account) => {
          setAccounts((prev) => prev.filter((a) => a.address !== account.address));
          if (selectedAccount?.address === account.address) {
            setSelectedAccount(null);
          }
        }}
      />
    </div>
  );

  const handleNavigation = (path: string) => {
    navigate(path);
    onMobileOpenChange?.(false);
  };

  return (
    <SidebarLayout
      header={headerContent}
      subHeader={accountSelector}
      mobileOpen={mobileOpen}
      onMobileOpenChange={onMobileOpenChange}
      mobileAriaLabel="Navigation menu"
    >
      <SidebarSection>
        <SidebarButton
          icon={<LayoutDashboard className="size-4" />}
          isSelected={location.pathname === '/'}
          onClick={() => handleNavigation('/')}
        >
          Dashboard
        </SidebarButton>
        <SidebarButton
          icon={<Users className="size-4" />}
          isSelected={location.pathname === '/authorized-accounts'}
          onClick={() => handleNavigation('/authorized-accounts')}
        >
          Authorized Accounts
        </SidebarButton>
        <SidebarButton
          icon={<Key className="size-4" />}
          isSelected={location.pathname === '/roles'}
          onClick={() => handleNavigation('/roles')}
        >
          Roles
        </SidebarButton>
        <SidebarButton
          icon={<ArrowRightLeft className="size-4" />}
          isSelected={location.pathname === '/role-changes'}
          onClick={() => handleNavigation('/role-changes')}
        >
          Role Changes
        </SidebarButton>
      </SidebarSection>
    </SidebarLayout>
  );
}
