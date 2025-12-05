/**
 * Dashboard Page
 * Feature: 007-dashboard-real-data
 *
 * Displays an overview of the selected contract's access control configuration.
 * Shows contract info, role statistics, and provides refresh/export actions.
 *
 * Integrates with useDashboardData hook to display:
 * - Real role count from useContractRoles
 * - Unique authorized accounts count (deduplicated)
 * - Loading/error states with retry functionality
 * - Support for Ownable-only contracts
 */

import { Download, Loader2, RefreshCw, Shield, Users } from 'lucide-react';
import { toast } from 'sonner';
import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

import { Button } from '@openzeppelin/ui-builder-ui';

import { ContractInfoCard } from '../components/Dashboard/ContractInfoCard';
import { DashboardEmptyState } from '../components/Dashboard/DashboardEmptyState';
import { DashboardStatsCard } from '../components/Dashboard/DashboardStatsCard';
import { PendingChangesCard } from '../components/Dashboard/PendingChangesCard';
import { PageHeader } from '../components/Shared/PageHeader';
import { useDashboardData, useSelectedContract } from '../hooks';

export function Dashboard() {
  const navigate = useNavigate();
  const { selectedContract, selectedNetwork, adapter, isContractRegistered } =
    useSelectedContract();

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
  } = useDashboardData(adapter, selectedContract?.address ?? '', {
    networkId: selectedNetwork?.id ?? '',
    networkName: selectedNetwork?.name ?? '',
    label: selectedContract?.label,
    isContractRegistered,
  });

  // Determine if we have a contract selected
  const hasContract = selectedContract !== null;

  // Compute derived values for the selected contract
  const explorerUrl =
    adapter && selectedContract ? adapter.getExplorerUrl(selectedContract.address) : null;
  const contractName = selectedContract?.label || selectedContract?.address || 'Unknown Contract';

  // Determine if buttons should be disabled
  const actionsDisabled = !hasContract || isLoading || isRefreshing;
  const exportDisabled = actionsDisabled || isExporting;

  // Handle refresh with toast notification on error
  const handleRefresh = useCallback(async () => {
    try {
      await refetch();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to refresh data';
      toast.error(`Refresh failed: ${message}`);
    }
  }, [refetch]);

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
          <ContractInfoCard
            contractName={contractName}
            capabilities={selectedContract.capabilities}
            address={selectedContract.address}
            network={selectedNetwork}
            explorerUrl={explorerUrl}
          />

          <PendingChangesCard />
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
    </div>
  );
}
