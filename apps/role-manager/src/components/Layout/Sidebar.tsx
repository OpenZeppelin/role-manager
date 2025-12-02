import { NetworkEthereum, NetworkStellar } from '@web3icons/react';
import { ArrowRightLeft, Key, LayoutDashboard, Users } from 'lucide-react';
import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import type { NetworkConfig } from '@openzeppelin/ui-builder-types';
import {
  NetworkIcon,
  NetworkSelector,
  SidebarButton,
  SidebarLayout,
  SidebarSection,
} from '@openzeppelin/ui-builder-ui';
import { logger } from '@openzeppelin/ui-builder-utils';

import { getEcosystemName } from '../../core/ecosystems/registry';
import { Account, AccountSelector } from './AccountSelector';

export interface SidebarProps {
  /** Controls visibility in mobile slide-over */
  mobileOpen?: boolean;
  /** Close handler for mobile slide-over */
  onMobileOpenChange?: (open: boolean) => void;
}

type Network = Pick<NetworkConfig, 'id' | 'name' | 'ecosystem' | 'type' | 'iconComponent'>;

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

  // Mock networks state
  const networks: Network[] = [
    {
      id: 'eth-mainnet',
      name: 'Ethereum',
      ecosystem: 'evm',
      type: 'mainnet',
      iconComponent: NetworkEthereum,
    },
    {
      id: 'eth-sepolia',
      name: 'Sepolia',
      ecosystem: 'evm',
      type: 'testnet',
      iconComponent: NetworkEthereum,
    },
    {
      id: 'stellar-mainnet',
      name: 'Stellar',
      ecosystem: 'stellar',
      type: 'mainnet',
      iconComponent: NetworkStellar,
    },
    {
      id: 'stellar-testnet',
      name: 'Stellar',
      ecosystem: 'stellar',
      type: 'testnet',
      iconComponent: NetworkStellar,
    },
    {
      id: 'midnight-testnet',
      name: 'Midnight',
      ecosystem: 'midnight',
      type: 'testnet',
    },
  ];

  const [selectedNetwork, setSelectedNetwork] = useState<Network | null>(networks[0]);

  const headerContent = (
    <div className="mb-6">
      <img src="/OZ-Logo-BlackBG.svg" alt="OpenZeppelin Logo" className="h-6 w-auto" />
    </div>
  );

  const sidebarSelectors = (
    <div className="mb-8 flex flex-col gap-2">
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
      <NetworkSelector
        networks={networks}
        selectedNetwork={selectedNetwork}
        onSelectNetwork={setSelectedNetwork}
        getNetworkLabel={(n) => n.name}
        getNetworkId={(n) => n.id}
        getNetworkIcon={(n) => <NetworkIcon network={n} />}
        getNetworkType={(n) => n.type}
        groupByEcosystem
        getEcosystem={(n) => getEcosystemName(n.ecosystem)}
        placeholder="Select Network"
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
      subHeader={sidebarSelectors}
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
