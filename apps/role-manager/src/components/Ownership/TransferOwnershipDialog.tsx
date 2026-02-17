/**
 * TransferOwnershipDialog Component
 * Feature: 015-ownership-transfer
 * Updated by: 017-evm-access-control (Phase 6 — US5, T036)
 *
 * Dialog for initiating ownership transfers.
 * Accessible from the Roles page via the "Transfer Ownership" button.
 *
 * Implements:
 * - T011: Dialog with address input, expiration input (adapter-driven)
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
 * - Transaction state feedback (pending, success, error, cancelled)
 * - Auto-close after 1.5s success display
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
import { useDebounce } from '../../hooks/useDebounce';
import { useOwnershipTransferDialog } from '../../hooks/useOwnershipTransferDialog';
import type { TransferOwnershipFormData } from '../../hooks/useOwnershipTransferDialog';
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
 * Props for TransferOwnershipDialog component
 */
export interface TransferOwnershipDialogProps {
  /** Whether dialog is open */
  open: boolean;
  /** Callback when open state changes */
  onOpenChange: (open: boolean) => void;
  /** Current owner address (for self-transfer validation) */
  currentOwner: string;
  /** Whether contract supports two-step transfer */
  hasTwoStepOwnable: boolean;
  /**
   * Whether there is an existing pending transfer (T033)
   * When true, shows a warning that the new transfer will replace the existing one
   */
  hasPendingTransfer?: boolean;
  /** Callback when transaction succeeds (for parent to refresh data) */
  onSuccess?: () => void;
}

// =============================================================================
// Component
// =============================================================================

/**
 * TransferOwnershipDialog - Dialog for initiating ownership transfers
 *
 * @example
 * ```tsx
 * <TransferOwnershipDialog
 *   open={transferDialogOpen}
 *   onOpenChange={setTransferDialogOpen}
 *   currentOwner={ownership.owner}
 *   hasTwoStepOwnable={capabilities.hasTwoStepOwnable}
 *   onSuccess={() => refetch()}
 * />
 * ```
 */
export function TransferOwnershipDialog({
  open,
  onOpenChange,
  currentOwner,
  hasTwoStepOwnable,
  hasPendingTransfer = false,
  onSuccess,
}: TransferOwnershipDialogProps) {
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
  } = useOwnershipTransferDialog({
    currentOwner,
    hasTwoStepOwnable,
    onClose: () => onOpenChange(false),
    onSuccess,
  });

  // Get adapter for address validation
  const { adapter, isAdapterLoading } = useSelectedContract();

  // React Hook Form setup
  const form = useForm<TransferOwnershipFormData>({
    defaultValues: {
      newOwnerAddress: '',
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
      form.reset({ newOwnerAddress: '', expirationBlock: '' });
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
    async (data: TransferOwnershipFormData) => {
      await submit(data);
    },
    [submit]
  );

  // Dialog title and description
  const dialogTitle = hasTwoStepOwnable ? 'Initiate Ownership Transfer' : 'Transfer Ownership';
  const dialogDescription = hasTwoStepOwnable
    ? 'Initiate a two-step ownership transfer. The new owner must accept before the expiration.'
    : 'Transfer contract ownership to a new address. This action is immediate and irreversible.';

  // =============================================================================
  // Render Content Based on Step
  // =============================================================================

  const renderContent = () => {
    switch (step) {
      case 'pending':
      case 'confirming':
        return (
          <DialogPendingState
            title="Transferring Ownership..."
            description="Please confirm the transaction in your wallet"
            txStatus={txStatus}
          />
        );

      case 'success':
        return (
          <DialogSuccessState
            title={hasTwoStepOwnable ? 'Transfer Initiated!' : 'Ownership Transferred!'}
            description={
              hasTwoStepOwnable
                ? 'The new owner must accept the transfer before expiration.'
                : 'Ownership has been successfully transferred to the new address.'
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
          <TransferOwnershipFormContent
            key={adapter ? 'with-adapter' : 'no-adapter'}
            form={form}
            adapter={adapter}
            isAdapterLoading={isAdapterLoading}
            isWalletConnected={isWalletConnected}
            requiresExpiration={requiresExpiration}
            currentBlock={currentBlock}
            expirationMetadata={expirationMetadata}
            hasPendingTransfer={hasPendingTransfer}
            onCancel={handleCancel}
            onSubmit={handleSubmit}
          />
        );
    }
  };

  // T039: Prevent Escape key from closing dialog during pending/confirming states
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
// TransferOwnershipFormContent (Internal)
// =============================================================================

interface TransferOwnershipFormContentProps {
  form: ReturnType<typeof useForm<TransferOwnershipFormData>>;
  adapter: ReturnType<typeof useSelectedContract>['adapter'];
  isAdapterLoading: boolean;
  isWalletConnected: boolean;
  requiresExpiration: boolean;
  currentBlock: number | null;
  /** Adapter-driven expiration metadata for labels and mode */
  expirationMetadata: ReturnType<typeof useOwnershipTransferDialog>['expirationMetadata'];
  /** T033: Whether there is an existing pending transfer to replace */
  hasPendingTransfer: boolean;
  onCancel: () => void;
  onSubmit: (data: TransferOwnershipFormData) => Promise<void>;
}

function TransferOwnershipFormContent({
  form,
  adapter,
  isAdapterLoading,
  isWalletConnected,
  requiresExpiration,
  currentBlock,
  expirationMetadata,
  hasPendingTransfer,
  onCancel,
  onSubmit,
}: TransferOwnershipFormContentProps) {
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

  // Calculate blocks until expiration and time estimate
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

  // Validate expiration is greater than current value
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

      {/* T033: Replace Pending Transfer Warning */}
      {hasPendingTransfer && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
          <p className="text-sm text-amber-800">
            <strong>Note:</strong> This will replace the existing pending transfer. The previous
            pending owner will no longer be able to accept.
          </p>
        </div>
      )}

      {/* New Owner Address Field */}
      <div className="space-y-1.5">
        <AddressField
          id="transfer-ownership-address"
          name="newOwnerAddress"
          label="New Owner Address"
          placeholder={
            adapter ? getEcosystemAddressExample(adapter.networkConfig.ecosystem) : '0x...'
          }
          helperText="The address that will become the new owner of this contract."
          control={control}
          adapter={adapter ?? undefined}
          validation={{ required: true }}
        />
      </div>

      {/* Expiration Field — shown only when adapter requires user input (mode: 'required') */}
      {requiresExpiration && (
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="transfer-ownership-expiration">
              {getExpirationLabel(expirationMetadata)}
            </Label>
            {currentBlock !== null && (
              <span className="text-xs text-muted-foreground">
                {getCurrentValueLabel(expirationMetadata)}: {currentBlock.toLocaleString()}
              </span>
            )}
          </div>
          <Input
            id="transfer-ownership-expiration"
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
        <Button type="submit" disabled={!canSubmit} aria-label="Transfer ownership to new address">
          {isAdapterLoading ? 'Loading...' : 'Transfer Ownership'}
        </Button>
      </DialogFooter>
    </form>
  );
}
