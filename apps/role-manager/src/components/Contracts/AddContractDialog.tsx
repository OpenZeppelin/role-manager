/**
 * AddContractDialog Component
 * Feature: 004-add-contract-record
 *
 * Modal dialog for adding a new contract record.
 * Wraps AddContractForm with Dialog components from ui-builder-ui.
 */

import { toast } from 'sonner';
import { useCallback, useState } from 'react';

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@openzeppelin/ui-builder-ui';

import { recentContractsStorage } from '@/core/storage/RecentContractsStorage';
import type { AddContractDialogProps, AddContractFormData } from '@/types/contracts';
import { ERROR_MESSAGES } from '@/types/contracts';

import { AddContractForm } from './AddContractForm';

/**
 * Dialog for adding a new contract record.
 *
 * Features:
 * - Centered modal with max-w-md width (UX-003)
 * - Focus trap and Escape to close (NFR-A001, NFR-A002)
 * - Auto-select newly added contract (FR-008a)
 * - Toast notification on save failure (ERR-003)
 *
 * @param open - Whether the dialog is open
 * @param onOpenChange - Callback when dialog open state changes
 * @param onContractAdded - Callback when a contract is successfully added
 */
export function AddContractDialog({
  open,
  onOpenChange,
  onContractAdded,
}: AddContractDialogProps): React.ReactElement {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = useCallback(
    async (data: AddContractFormData) => {
      setIsSubmitting(true);

      try {
        // Save to storage - maps form data to storage format
        const contractId = await recentContractsStorage.addOrUpdate({
          networkId: data.networkId,
          address: data.address,
          label: data.name, // UI "name" maps to storage "label"
        });

        // Close dialog
        onOpenChange(false);

        // Notify parent of successful add (FR-008a)
        onContractAdded?.(contractId);
      } catch (error) {
        // Show error toast (ERR-003)
        toast.error(ERROR_MESSAGES.SAVE_FAILED);
        // eslint-disable-next-line no-console
        console.error('[AddContractDialog] Failed to save contract:', error);
      } finally {
        setIsSubmitting(false);
      }
    },
    [onOpenChange, onContractAdded]
  );

  const handleCancel = useCallback(() => {
    onOpenChange(false);
  }, [onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add Contract</DialogTitle>
        </DialogHeader>
        <AddContractForm
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          isSubmitting={isSubmitting}
        />
      </DialogContent>
    </Dialog>
  );
}
