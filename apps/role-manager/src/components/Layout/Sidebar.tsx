import { ArrowRightLeft, Key, LayoutDashboard, Users } from 'lucide-react';
import { toast } from 'sonner';
import React, { useCallback, useEffect, useState } from 'react';
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
import { useAllNetworks } from '../../hooks/useAllNetworks';
import { useRecentContracts } from '../../hooks/useRecentContracts';
import type { ContractRecord } from '../../types/contracts';
import { AddContractDialog } from '../Contracts';
import { ContractSelector } from './ContractSelector';

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

  // Add Contract Dialog state (Feature: 004-add-contract-record)
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);

  // Networks from all enabled ecosystems (loaded lazily, cached after first load)
  const { networks, isLoading: isLoadingNetworks } = useAllNetworks();

  // Selected network state - initialized to first network once loaded
  const [selectedNetwork, setSelectedNetwork] = useState<NetworkConfig | null>(null);

  // Auto-select first network once networks are loaded
  useEffect(() => {
    if (!selectedNetwork && networks.length > 0) {
      setSelectedNetwork(networks[0]);
    }
  }, [networks, selectedNetwork]);

  // Contracts data - filtered by selected network
  const { data: contracts, deleteContract } = useRecentContracts(selectedNetwork?.id);

  const [selectedContract, setSelectedContract] = useState<ContractRecord | null>(null);

  // Select first contract if none selected or current selection is invalid
  useEffect(() => {
    // Check if contracts is defined before accessing .length
    if (contracts && contracts.length > 0) {
      // If nothing selected, select first
      if (!selectedContract) {
        setSelectedContract(contracts[0]);
      }
      // If current selection is not in the list (e.g. changed network or deleted), select first
      else if (!contracts.find((c) => c.id === selectedContract.id)) {
        setSelectedContract(contracts[0]);
      }
    } else {
      setSelectedContract(null);
    }
  }, [contracts, selectedContract]);

  // Handle contract added - auto-select the new contract (FR-008a)
  const handleContractAdded = useCallback((contractId: string) => {
    logger.info('Sidebar', `Contract added with ID: ${contractId}`);
    // Note: Selection logic is handled by the effect above implicitly for now,
    // or by the user manually selecting.
    // Ideally we would set a flag to "select next update with this ID".
  }, []);

  const handleRemoveContract = async (contract: ContractRecord) => {
    try {
      await deleteContract(contract.id);
      toast.success('Contract deleted');
      // If the selected contract was deleted, we set selection to null
      // The effect will then pick the first available contract
      if (selectedContract?.id === contract.id) {
        setSelectedContract(null);
      }
    } catch (error) {
      toast.error('Failed to delete contract. Please try again.');
      logger.error('Sidebar', 'Delete contract failed', error);
    }
  };

  const headerContent = (
    <div className="mb-6">
      <img src="/OZ-Logo-BlackBG.svg" alt="OpenZeppelin Logo" className="h-6 w-auto" />
    </div>
  );

  const sidebarSelectors = (
    <div className="mb-8 flex flex-col gap-2">
      <ContractSelector
        contracts={contracts || []}
        selectedContract={selectedContract}
        onSelectContract={setSelectedContract}
        onAddContract={() => {
          logger.info('Sidebar', 'Add new contract clicked - opening dialog');
          setIsAddDialogOpen(true);
        }}
        onRemoveContract={handleRemoveContract}
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
        placeholder={isLoadingNetworks ? 'Loading networks...' : 'Select Network'}
      />
    </div>
  );

  const handleNavigation = (path: string) => {
    navigate(path);
    onMobileOpenChange?.(false);
  };

  return (
    <>
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

      {/* Add Contract Dialog (Feature: 004-add-contract-record) */}
      <AddContractDialog
        open={isAddDialogOpen}
        onOpenChange={setIsAddDialogOpen}
        onContractAdded={handleContractAdded}
      />
    </>
  );
}
