/**
 * EditRoleDialog Component
 * Feature: 009-roles-page-data (Phase 6)
 *
 * Dialog for editing role settings:
 * - Custom description editing with 256 character limit
 * - Custom alias for unidentified (hash-only) roles with 64 character limit
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
const MAX_ALIAS_LENGTH = 64;

// =============================================================================
// Types
// =============================================================================

/**
 * Form data structure for role editing
 */
interface EditRoleFormData {
  description: string;
  alias: string;
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
  /** Save handler for alias changes (only called when alias field is visible) */
  onSaveAlias?: (roleId: string, alias: string) => Promise<void>;
}

// =============================================================================
// Component
// =============================================================================

/**
 * EditRoleDialog - Dialog for editing role settings
 *
 * Supports editing the role description and, for unidentified (hash-only) roles,
 * a custom alias that gives the role a human-readable name.
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
 *   onSaveAlias={async (roleId, alias) => {
 *     await updateRoleAlias(roleId, alias);
 *   }}
 * />
 * ```
 */
export function EditRoleDialog({
  open,
  onOpenChange,
  role,
  onSaveDescription,
  onSaveAlias,
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
      alias: '',
    },
  });

  // Show alias field when the role's underlying identifier is a hash
  // (either currently showing as hash, or was a hash before the user set an alias)
  const showAliasField = !!role && (role.isHashDisplay || !!role.alias);

  // =============================================================================
  // Effects
  // =============================================================================

  // Reset form when dialog opens with a new role
  useEffect(() => {
    if (open && role) {
      reset({
        description: role.description ?? '',
        alias: role.alias ?? '',
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
      const trimmedAlias = data.alias.trim();

      setIsSaving(true);
      setSaveError(null);

      try {
        await onSaveDescription(role.roleId, trimmedDescription);

        if (showAliasField && onSaveAlias) {
          await onSaveAlias(role.roleId, trimmedAlias);
        }

        onOpenChange(false);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to save changes';
        setSaveError(errorMessage);
      } finally {
        setIsSaving(false);
      }
    },
    [role, onSaveDescription, onSaveAlias, onOpenChange, showAliasField]
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
          {showAliasField && (
            <TextField
              id="role-alias"
              name="alias"
              label="Role Name"
              placeholder="Give this role a human-readable name"
              helperText="A custom name for this role. Leave empty to show the hash."
              control={control}
              validation={{
                maxLength: MAX_ALIAS_LENGTH,
              }}
              readOnly={isSaving}
            />
          )}

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
