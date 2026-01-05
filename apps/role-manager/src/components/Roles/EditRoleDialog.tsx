/**
 * EditRoleDialog Component
 * Feature: 009-roles-page-data (Phase 6)
 *
 * Dialog for editing role settings. Currently supports:
 * - Custom description editing with 256 character limit
 *
 * Designed to be extensible for future role editing features.
 *
 * Per FR-023: Edit role description
 * Per FR-031a: 256 character limit with validation
 */

import { useCallback, useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';

import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  TextField,
} from '@openzeppelin/ui-components';

import type { RoleWithDescription } from '../../types/roles';

// =============================================================================
// Constants
// =============================================================================

const MAX_DESCRIPTION_LENGTH = 256;

// =============================================================================
// Types
// =============================================================================

/**
 * Form data structure for role editing
 */
interface EditRoleFormData {
  description: string;
}

/**
 * Props for EditRoleDialog component
 */
export interface EditRoleDialogProps {
  /** Whether the dialog is open */
  open: boolean;
  /** Callback when dialog open state changes */
  onOpenChange: (open: boolean) => void;
  /** The role being edited */
  role: RoleWithDescription | null;
  /** Save handler for description changes */
  onSaveDescription: (roleId: string, description: string) => Promise<void>;
}

// =============================================================================
// Component
// =============================================================================

/**
 * EditRoleDialog - Dialog for editing role settings
 *
 * Currently supports editing the role description with validation.
 * Can be extended to support additional role settings in the future.
 *
 * @example
 * ```tsx
 * <EditRoleDialog
 *   open={isEditDialogOpen}
 *   onOpenChange={setIsEditDialogOpen}
 *   role={selectedRole}
 *   onSaveDescription={async (roleId, desc) => {
 *     await updateRoleDescription(roleId, desc);
 *   }}
 * />
 * ```
 */
export function EditRoleDialog({
  open,
  onOpenChange,
  role,
  onSaveDescription,
}: EditRoleDialogProps) {
  // =============================================================================
  // State
  // =============================================================================

  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Form state management with react-hook-form
  const { control, handleSubmit, reset, formState } = useForm<EditRoleFormData>({
    mode: 'onChange',
    defaultValues: {
      description: '',
    },
  });

  // =============================================================================
  // Effects
  // =============================================================================

  // Reset form when dialog opens with a new role
  useEffect(() => {
    if (open && role) {
      reset({
        description: role.description ?? '',
      });
      setSaveError(null);
      setIsSaving(false);
    }
  }, [open, role, reset]);

  // =============================================================================
  // Handlers
  // =============================================================================

  const onFormSubmit = useCallback(
    async (data: EditRoleFormData) => {
      if (!role) return;

      const trimmedDescription = data.description.trim();

      setIsSaving(true);
      setSaveError(null);

      try {
        await onSaveDescription(role.roleId, trimmedDescription);
        onOpenChange(false);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to save description';
        setSaveError(errorMessage);
      } finally {
        setIsSaving(false);
      }
    },
    [role, onSaveDescription, onOpenChange]
  );

  const handleCancel = useCallback(() => {
    onOpenChange(false);
  }, [onOpenChange]);

  // =============================================================================
  // Render
  // =============================================================================

  if (!role) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit Role</DialogTitle>
          <DialogDescription>
            Edit settings for the <span className="font-medium">{role.roleName}</span> role.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onFormSubmit)} className="grid gap-4 py-4">
          {/* Description Field */}
          <TextField
            id="role-description"
            name="description"
            label="Description"
            placeholder="Add a description for this role"
            helperText="A custom description to help identify the purpose of this role."
            control={control}
            validation={{
              maxLength: MAX_DESCRIPTION_LENGTH,
            }}
            readOnly={isSaving}
          />

          {/* Save Error */}
          {saveError && (
            <p className="text-sm text-destructive" role="alert">
              {saveError}
            </p>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleCancel} disabled={isSaving}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSaving || !formState.isValid}>
              {isSaving ? 'Saving...' : 'Save'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
