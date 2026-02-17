/**
 * TransferAdminDialog Component
 * Feature: 016-two-step-admin-assignment
 * Updated by: 017-evm-access-control (Phase 6 — US5, T038)
 *
 * Dialog for initiating admin role transfers.
 * Accessible from the Roles page via the "Transfer Admin" button.
 *
 * Implements:
 * - T024: Dialog with address input, expiration input (adapter-driven)
 * - Adapter-driven expiration handling (required / none / contract-managed)
 * - Current block display for expiration validation (only when mode: 'required')
 * - Transaction state rendering using DialogTransactionStates
 * - Close-during-transaction confirmation prompt
 * - Wallet disconnection handling
 *
 * Key behaviors:
 * - Address validation via adapter.isValidAddress()
 * - Self-transfer prevention
 * - Expiration validation (must be greater than current value, only when required)
 * - Accept schedule info for EVM AccessControlDefaultAdminRules (contract-managed)
 * - Transaction state feedback (pending, success, error, cancelled)
 * - Auto-close after 1.5s success display
 *
 * Follows the TransferOwnershipDialog pattern from spec 015.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';

import {
  AddressField,
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
} from '@openzeppelin/ui-components';
import { cn } from '@openzeppelin/ui-utils';

import { getEcosystemAddressExample } from '@/core/ecosystems/registry';

import { useBlockTime } from '../../context/useBlockTime';
import { useAdminTransferDialog } from '../../hooks/useAdminTransferDialog';
import type { TransferAdminFormData } from '../../hooks/useAdminTransferDialog';
import { useDebounce } from '../../hooks/useDebounce';
import { useSelectedContract } from '../../hooks/useSelectedContract';
import { calculateBlockExpiration, formatTimeEstimateDisplay } from '../../utils/block-time';
import {
  getContractManagedDescription,
  getCurrentValueLabel,
  getExpirationLabel,
  getExpirationPlaceholder,
  isContractManagedExpiration,
} from '../../utils/expiration';
import {
  ConfirmCloseDialog,
  DialogCancelledState,
  DialogErrorState,
  DialogPendingState,
  DialogSuccessState,
  WalletDisconnectedAlert,
} from '../Shared';

// =============================================================================
// Types
// =============================================================================

/**
 * Props for TransferAdminDialog component
 */
export interface TransferAdminDialogProps {
  /** Whether dialog is open */
  open: boolean;
  /** Callback when open state changes */
  onOpenChange: (open: boolean) => void;
  /** Current admin address (for self-transfer validation) */
  currentAdmin: string;
  /**
   * Whether there is an existing pending transfer
   * When true, shows a warning that the new transfer will replace the existing one
   */
  hasPendingAdminTransfer?: boolean;
  /** Callback when transaction succeeds (for parent to refresh data) */
  onSuccess?: () => void;
}

// =============================================================================
// Component
// =============================================================================

/**
 * TransferAdminDialog - Dialog for initiating admin role transfers
 *
 * @example
 * ```tsx
 * <TransferAdminDialog
 *   open={transferAdminDialogOpen}
 *   onOpenChange={setTransferAdminDialogOpen}
 *   currentAdmin={adminInfo?.admin ?? ''}
 *   hasPendingAdminTransfer={adminState === 'pending'}
 *   onSuccess={() => refetchAdminInfo()}
 * />
 * ```
 */
export function TransferAdminDialog({
  open,
  onOpenChange,
  currentAdmin,
  hasPendingAdminTransfer = false,
  onSuccess,
}: TransferAdminDialogProps) {
  // Track confirmation dialog state
  const [showConfirmClose, setShowConfirmClose] = useState(false);

  // Dialog state and logic
  const {
    step,
    errorMessage,
    txStatus,
    isWalletConnected,
    requiresExpiration,
    currentBlock,
    isNetworkError,
    expirationMetadata,
    submit,
    retry,
    reset,
  } = useAdminTransferDialog({
    currentAdmin,
    onClose: () => onOpenChange(false),
    onSuccess,
  });

  // Get adapter for address validation
  const { adapter, isAdapterLoading } = useSelectedContract();

  // React Hook Form setup
  const form = useForm<TransferAdminFormData>({
    defaultValues: {
      newAdminAddress: '',
      expirationBlock: '',
    },
    mode: 'onChange',
  });

  // Reset state when dialog opens
  const wasOpenRef = useRef(open);
  useEffect(() => {
    if (open && !wasOpenRef.current) {
      // Dialog just opened - reset to fresh state
      reset();
      form.reset({ newAdminAddress: '', expirationBlock: '' });
    }
    wasOpenRef.current = open;
  }, [open, reset, form]);

  // Handle dialog close with confirmation during transaction
  const handleClose = useCallback(
    (open: boolean) => {
      if (open) return;

      // Show confirmation prompt during pending/confirming states
      if (step === 'pending' || step === 'confirming') {
        setShowConfirmClose(true);
        return;
      }
      reset();
      form.reset();
      onOpenChange(false);
    },
    [step, reset, form, onOpenChange]
  );

  // Confirm close during transaction
  const handleConfirmClose = useCallback(() => {
    setShowConfirmClose(false);
    reset();
    form.reset();
    onOpenChange(false);
  }, [reset, form, onOpenChange]);

  // Cancel confirmation and return to transaction
  const handleCancelConfirmClose = useCallback(() => {
    setShowConfirmClose(false);
  }, []);

  // Handle cancel button
  const handleCancel = useCallback(() => {
    handleClose(false);
  }, [handleClose]);

  // Handle back from cancelled state
  const handleBackFromCancelled = useCallback(() => {
    // Use retry() instead of reset() to preserve form inputs for retry
    retry();
  }, [retry]);

  // Handle form submission
  const handleSubmit = useCallback(
    async (data: TransferAdminFormData) => {
      await submit(data);
    },
    [submit]
  );

  // Dialog title and description — adapt to expiration mode
  const dialogTitle = 'Initiate Admin Transfer';
  const dialogDescription = requiresExpiration
    ? 'Initiate a two-step admin role transfer. The new admin must accept before the expiration.'
    : 'Initiate an admin role transfer. The new admin must accept the transfer to complete it.';

  // =============================================================================
  // Render Content Based on Step
  // =============================================================================

  const renderContent = () => {
    switch (step) {
      case 'pending':
      case 'confirming':
        return (
          <DialogPendingState
            title="Transferring Admin Role..."
            description="Please confirm the transaction in your wallet"
            txStatus={txStatus}
          />
        );

      case 'success':
        return (
          <DialogSuccessState
            title="Admin Transfer Initiated!"
            description={
              requiresExpiration
                ? 'The new admin must accept the transfer before expiration.'
                : 'The new admin must accept the transfer to complete it.'
            }
          />
        );

      case 'error':
        return (
          <DialogErrorState
            title={isNetworkError ? 'Network Error' : 'Transfer Failed'}
            message={
              isNetworkError
                ? 'Unable to connect to the network. Please check your connection and try again.'
                : errorMessage || 'An error occurred while processing the transaction.'
            }
            canRetry={true}
            onRetry={retry}
            onCancel={handleCancel}
          />
        );

      case 'cancelled':
        return (
          <DialogCancelledState
            message="The transaction was cancelled. You can try again or close the dialog."
            onBack={handleBackFromCancelled}
            onClose={() => handleClose(false)}
          />
        );

      case 'form':
      default:
        return (
          <TransferAdminFormContent
            key={adapter ? 'with-adapter' : 'no-adapter'}
            form={form}
            adapter={adapter}
            isAdapterLoading={isAdapterLoading}
            isWalletConnected={isWalletConnected}
            requiresExpiration={requiresExpiration}
            currentBlock={currentBlock}
            expirationMetadata={expirationMetadata}
            hasPendingAdminTransfer={hasPendingAdminTransfer}
            onCancel={handleCancel}
            onSubmit={handleSubmit}
          />
        );
    }
  };

  // Prevent Escape key from closing dialog during pending/confirming states
  const handleEscapeKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (step === 'pending' || step === 'confirming') {
        event.preventDefault();
      }
    },
    [step]
  );

  return (
    <>
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-[480px]" onEscapeKeyDown={handleEscapeKeyDown}>
          <DialogHeader>
            <DialogTitle>{dialogTitle}</DialogTitle>
            <DialogDescription>{dialogDescription}</DialogDescription>
          </DialogHeader>

          {renderContent()}
        </DialogContent>
      </Dialog>

      {/* Confirmation dialog when closing during transaction */}
      <ConfirmCloseDialog
        open={showConfirmClose}
        onCancel={handleCancelConfirmClose}
        onConfirm={handleConfirmClose}
      />
    </>
  );
}

// =============================================================================
// TransferAdminFormContent (Internal)
// =============================================================================

interface TransferAdminFormContentProps {
  form: ReturnType<typeof useForm<TransferAdminFormData>>;
  adapter: ReturnType<typeof useSelectedContract>['adapter'];
  isAdapterLoading: boolean;
  isWalletConnected: boolean;
  /** Whether expiration input is required (adapter says mode: 'required') */
  requiresExpiration: boolean;
  currentBlock: number | null;
  /** Adapter-driven expiration metadata for labels and mode */
  expirationMetadata: ReturnType<typeof useAdminTransferDialog>['expirationMetadata'];
  /** Whether there is an existing pending transfer to replace */
  hasPendingAdminTransfer: boolean;
  onCancel: () => void;
  onSubmit: (data: TransferAdminFormData) => Promise<void>;
}

function TransferAdminFormContent({
  form,
  adapter,
  isAdapterLoading,
  isWalletConnected,
  requiresExpiration,
  currentBlock,
  expirationMetadata,
  hasPendingAdminTransfer,
  onCancel,
  onSubmit,
}: TransferAdminFormContentProps) {
  const {
    control,
    handleSubmit,
    register,
    watch,
    formState: { isValid, isSubmitting },
  } = form;

  const expirationValue = watch('expirationBlock');

  // Debounce the expiration value for time estimation (300ms)
  const debouncedExpiration = useDebounce(expirationValue, 300);

  // Get block time estimation
  const { formatBlocksToTime, isCalibrating } = useBlockTime();

  // Calculate blocks until expiration and time estimate (only when expiration is required)
  const expirationEstimate = useMemo(() => {
    if (!requiresExpiration || !debouncedExpiration || currentBlock === null) {
      return null;
    }
    const expNum = parseInt(debouncedExpiration, 10);
    if (isNaN(expNum)) {
      return null;
    }
    return calculateBlockExpiration(expNum, currentBlock, formatBlocksToTime);
  }, [requiresExpiration, debouncedExpiration, currentBlock, formatBlocksToTime]);

  // Validate expiration is greater than current value (only when required)
  const expirationError = useMemo(() => {
    if (!requiresExpiration || !expirationValue || currentBlock === null) {
      return null;
    }
    const expNum = parseInt(expirationValue, 10);
    if (isNaN(expNum) || expNum <= currentBlock) {
      return `Must be greater than current value (${currentBlock.toLocaleString()})`;
    }
    return null;
  }, [requiresExpiration, expirationValue, currentBlock]);

  // Disable submit if adapter is not loaded, wallet not connected, or form invalid
  const canSubmit =
    isValid &&
    !isSubmitting &&
    !isAdapterLoading &&
    adapter !== null &&
    isWalletConnected &&
    !expirationError;

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-4">
      {/* Wallet Disconnection Alert */}
      {!isWalletConnected && <WalletDisconnectedAlert />}

      {/* Replace Pending Transfer Warning */}
      {hasPendingAdminTransfer && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
          <p className="text-sm text-amber-800">
            <strong>Note:</strong> This will replace the existing pending transfer. The previous
            pending admin will no longer be able to accept.
          </p>
        </div>
      )}

      {/* New Admin Address Field */}
      <div className="space-y-1.5">
        <AddressField
          id="transfer-admin-address"
          name="newAdminAddress"
          label="New Admin Address"
          placeholder={
            adapter ? getEcosystemAddressExample(adapter.networkConfig.ecosystem) : '0x...'
          }
          helperText="The address that will become the new admin of this contract."
          control={control}
          adapter={adapter ?? undefined}
          validation={{ required: true }}
        />
      </div>

      {/* Expiration Field — shown only when adapter requires user input (mode: 'required') */}
      {requiresExpiration && (
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="transfer-admin-expiration">
              {getExpirationLabel(expirationMetadata, 'Expiration Block')}
            </Label>
            {currentBlock !== null && (
              <span className="text-xs text-muted-foreground">
                {getCurrentValueLabel(expirationMetadata)}: {currentBlock.toLocaleString()}
              </span>
            )}
          </div>
          <Input
            id="transfer-admin-expiration"
            type="number"
            placeholder={getExpirationPlaceholder(expirationMetadata)}
            {...register('expirationBlock', { required: requiresExpiration })}
            className={cn(
              expirationError &&
                'border-destructive focus:border-destructive focus:ring-destructive/30'
            )}
            data-slot="input"
          />
          {/* Helper text or time estimate */}
          {expirationEstimate && !expirationError ? (
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <span>{expirationEstimate.blocksRemaining.toLocaleString()} blocks</span>
              {expirationEstimate.timeEstimate ? (
                <span className="text-blue-600 font-medium">
                  ≈ {formatTimeEstimateDisplay(expirationEstimate.timeEstimate)}
                </span>
              ) : isCalibrating ? (
                <span className="text-muted-foreground/60">estimating...</span>
              ) : null}
            </div>
          ) : !expirationError ? (
            <div className="text-sm text-muted-foreground">
              The transfer must be accepted before this {expirationMetadata?.unit ?? 'block'}.
            </div>
          ) : null}
          {expirationError && (
            <div className="text-sm text-destructive" role="alert">
              {expirationError}
            </div>
          )}
        </div>
      )}

      {/* Contract-managed expiration info (mode: 'contract-managed') — read-only display */}
      {isContractManagedExpiration(expirationMetadata) && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-3">
          <p className="text-sm text-blue-800">
            {getContractManagedDescription(expirationMetadata)}
          </p>
        </div>
      )}

      {/* Action Buttons */}
      <DialogFooter className="gap-2 sm:gap-0 pt-2">
        <Button
          type="button"
          variant="ghost"
          onClick={onCancel}
          aria-label="Cancel and close dialog"
        >
          Cancel
        </Button>
        <Button type="submit" disabled={!canSubmit} aria-label="Transfer admin role to new address">
          {isAdapterLoading ? 'Loading...' : 'Transfer Admin'}
        </Button>
      </DialogFooter>
    </form>
  );
}
