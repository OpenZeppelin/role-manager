/**
 * Dashboard Page
 * Feature: 007-dashboard-real-data
 * Updated by: 015-ownership-transfer (Phase 6.5)
 * Updated by: 016-two-step-admin-assignment (Phase 6 - T043)
 *
 * Displays an overview of the selected contract's access control configuration.
 * Shows contract info, role statistics, pending transfers, and provides refresh/export actions.
 *
 * Integrates with useDashboardData hook to display:
 * - Real role count from useContractRoles
 * - Unique authorized accounts count (deduplicated)
 * - Loading/error states with retry functionality
 * - Support for Ownable-only contracts
 *
 * Phase 6.5 additions:
 * - Pending transfers table from usePendingTransfers
 * - AcceptOwnershipDialog integration
 *
 * Feature 016 additions:
 * - AcceptAdminTransferDialog integration for admin role transfers
 */

import { Download, Loader2, RefreshCw, Shield, Users } from 'lucide-react';
import { toast } from 'sonner';
import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { Button } from '@openzeppelin/ui-components';
import { useDerivedAccountStatus } from '@openzeppelin/ui-react';

import { AcceptAdminTransferDialog } from '../components/Admin/AcceptAdminTransferDialog';
import { ContractInfoCard } from '../components/Dashboard/ContractInfoCard';
import { DashboardEmptyState } from '../components/Dashboard/DashboardEmptyState';
import { DashboardStatsCard } from '../components/Dashboard/DashboardStatsCard';
import { NetworkHealthBanner } from '../components/Dashboard/NetworkHealthBanner';
import { PendingChangesCard } from '../components/Dashboard/PendingChangesCard';
import { AcceptOwnershipDialog } from '../components/Ownership/AcceptOwnershipDialog';
import { PageHeader } from '../components/Shared/PageHeader';
import { useAliasStorage } from '../core/storage/aliasStorage';
import {
  useContractDisplayName,
  useDashboardData,
  useNetworkServiceHealthCheck,
  usePendingTransfers,
  useSelectedContract,
} from '../hooks';
import type { SnapshotAlias } from '../hooks';
import type { PendingTransfer } from '../types/pending-transfers';

export function Dashboard() {
  const navigate = useNavigate();
  const { selectedContract, selectedNetwork, runtime, isContractRegistered } =
    useSelectedContract();

  // Proactive network service health check (RPC, indexer, explorer)
  const { unhealthyServices } = useNetworkServiceHealthCheck(runtime, selectedNetwork);

  // Resolve contract display name from alias (single source of truth)
  const contractName = useContractDisplayName(selectedContract);

  // Load alias data for embedding in snapshot export (round-trip import/export)
  const { getByAddressAndNetwork } = useAliasStorage();
  const [snapshotAliases, setSnapshotAliases] = useState<SnapshotAlias[]>([]);
  const contractAddress = selectedContract?.address ?? '';
  const networkId = selectedNetwork?.id ?? '';

  useEffect(() => {
    if (!contractAddress) {
      setSnapshotAliases([]);
      return;
    }
    let cancelled = false;
    void getByAddressAndNetwork(contractAddress, networkId).then((record) => {
      if (cancelled) return;
      if (record) {
        setSnapshotAliases([
          { address: record.address, alias: record.alias, networkId: record.networkId },
        ]);
      } else {
        setSnapshotAliases([]);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [contractAddress, networkId, getByAddressAndNetwork]);

  // Get connected wallet address for pending transfers
  const { address: connectedAddress } = useDerivedAccountStatus();

  // Get dashboard data including roles count and unique accounts count
  // Pass isContractRegistered to prevent data fetching before registration is complete
  const {
    rolesCount,
    uniqueAccountsCount,
    hasAccessControl,
    isLoading,
    isRefreshing,
    hasError,
    errorMessage,
    canRetry,
    refetch,
    exportSnapshot,
    isExporting,
  } = useDashboardData(runtime, contractAddress, {
    networkId,
    networkName: selectedNetwork?.name ?? '',
    label: contractName,
    aliases: snapshotAliases,
    isContractRegistered,
  });

  // Phase 6.5: Get pending transfers for the card
  const {
    transfers,
    currentBlock,
    isLoading: isTransfersLoading,
    refetch: refetchTransfers,
  } = usePendingTransfers({
    connectedAddress,
    includeExpired: false,
  });

  // Phase 6.5: Accept ownership dialog state
  const [acceptOwnershipDialogOpen, setAcceptOwnershipDialogOpen] = useState(false);
  // Feature 016: Accept admin transfer dialog state (T043)
  const [acceptAdminDialogOpen, setAcceptAdminDialogOpen] = useState(false);
  const [_selectedTransfer, setSelectedTransfer] = useState<PendingTransfer | null>(null);

  // Determine if we have a contract selected
  const hasContract = selectedContract !== null;

  const explorerUrl =
    runtime && selectedContract ? runtime.explorer.getExplorerUrl(selectedContract.address) : null;

  // Determine if buttons should be disabled
  const actionsDisabled = !hasContract || isLoading || isRefreshing;
  const exportDisabled = actionsDisabled || isExporting;

  // Handle refresh with toast notification on error
  const handleRefresh = useCallback(async () => {
    try {
      await Promise.all([refetch(), refetchTransfers()]);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to refresh data';
      toast.error(message);
    }
  }, [refetch, refetchTransfers]);

  // Phase 6.5: Handle accept button click from PendingTransfersTable
  // Feature 016: Updated to handle admin transfers (T043)
  const handleAcceptTransfer = useCallback((transfer: PendingTransfer) => {
    setSelectedTransfer(transfer);

    if (transfer.type === 'ownership') {
      setAcceptOwnershipDialogOpen(true);
    } else if (transfer.type === 'admin') {
      setAcceptAdminDialogOpen(true);
    }
    // Future: Handle multisig transfer types
  }, []);

  // Phase 6.5: Handle successful acceptance
  // No manual refetch needed — centralized query invalidation in mutations handles data refresh.
  // The pending transfers hook refetches automatically via query invalidation of ownership/admin queries.
  const handleAcceptSuccess = useCallback(() => {
    // Only refetch pending transfers which are aggregated locally (not a query the mutation map knows about)
    void refetchTransfers();
  }, [refetchTransfers]);

  // Combined loading state for stats cards (initial load OR manual refresh)
  const isDataLoading = isLoading || isRefreshing;

  // If no contract is selected, show empty state
  if (!hasContract) {
    return (
      <div className="p-6 space-y-6">
        <PageHeader
          title="Dashboard"
          subtitle="Overview of your contract access control and roles."
        />
        <DashboardEmptyState />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="Dashboard"
        subtitle="Overview of your contract access control and roles."
        actions={
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={actionsDisabled}
              className="bg-white"
            >
              {isRefreshing ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="mr-2 h-4 w-4" />
              )}
              {isRefreshing ? 'Refreshing...' : 'Refresh Data'}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={exportSnapshot}
              disabled={exportDisabled}
              className="bg-white"
            >
              {isExporting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Download className="mr-2 h-4 w-4" />
              )}
              {isExporting ? 'Exporting...' : 'Download Snapshot'}
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column */}
        <div className="lg:col-span-2 space-y-6">
          {selectedNetwork && (
            <NetworkHealthBanner
              networkConfig={selectedNetwork}
              unhealthyServices={unhealthyServices}
            />
          )}

          <ContractInfoCard
            capabilities={selectedContract.capabilities}
            address={selectedContract.address}
            network={selectedNetwork}
            explorerUrl={explorerUrl}
          />

          {/* Phase 6.5: PendingChangesCard with real data */}
          <PendingChangesCard
            transfers={transfers}
            currentBlock={currentBlock}
            isLoading={isTransfersLoading}
            onAccept={handleAcceptTransfer}
          />
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          <DashboardStatsCard
            title="Roles"
            count={rolesCount}
            label="Configured in system"
            icon={<Shield className="h-5 w-5" />}
            onClick={() => navigate('/roles')}
            isLoading={isDataLoading}
            hasError={hasError && !hasAccessControl}
            errorMessage={errorMessage}
            onRetry={canRetry ? refetch : undefined}
            isNotSupported={!hasAccessControl && !isDataLoading && !hasError}
            disabled={!hasAccessControl}
          />

          <DashboardStatsCard
            title="Authorized Accounts"
            count={uniqueAccountsCount}
            label="With active permissions"
            icon={<Users className="h-5 w-5" />}
            onClick={() => navigate('/authorized-accounts')}
            isLoading={isDataLoading}
            hasError={hasError}
            errorMessage={errorMessage}
            onRetry={canRetry ? refetch : undefined}
          />
        </div>
      </div>

      {/* Phase 6.5: Accept Ownership Dialog (T050) */}
      <AcceptOwnershipDialog
        open={acceptOwnershipDialogOpen}
        onOpenChange={setAcceptOwnershipDialogOpen}
        onSuccess={handleAcceptSuccess}
      />

      {/* Feature 016: Accept Admin Transfer Dialog (T043) */}
      <AcceptAdminTransferDialog
        open={acceptAdminDialogOpen}
        onOpenChange={setAcceptAdminDialogOpen}
        onSuccess={handleAcceptSuccess}
      />
    </div>
  );
}
