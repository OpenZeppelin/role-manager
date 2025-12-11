/**
 * RoleCheckboxList Component
 * Feature: 014-role-grant-revoke
 *
 * Displays a list of role checkboxes for the Manage Roles dialog.
 * Supports disabled state during transactions and visual indication of pending changes.
 */

import { ShieldOff } from 'lucide-react';

import { Checkbox, EmptyState, Label } from '@openzeppelin/ui-builder-ui';
import { cn } from '@openzeppelin/ui-builder-utils';

import type { RoleCheckboxItem } from '@/types/role-dialogs';

/**
 * Props for RoleCheckboxList component
 */
export interface RoleCheckboxListProps {
  /** Role items to display */
  items: RoleCheckboxItem[];
  /** Toggle handler */
  onToggle: (roleId: string) => void;
  /** Whether interaction is disabled (during transaction) */
  disabled?: boolean;
  /** Additional CSS classes */
  className?: string;
}

/**
 * List of role checkboxes with toggle functionality.
 * Highlights the pending change with a visual indicator.
 *
 * @example
 * ```tsx
 * <RoleCheckboxList
 *   items={roleItems}
 *   onToggle={toggleRole}
 *   disabled={isPending}
 * />
 * ```
 */
export function RoleCheckboxList({
  items,
  onToggle,
  disabled = false,
  className,
}: RoleCheckboxListProps): React.ReactElement {
  if (items.length === 0) {
    return (
      <EmptyState
        icon={<ShieldOff className="h-6 w-6 text-muted-foreground" />}
        title="No Roles Available"
        description="This contract has no roles defined."
        size="small"
      />
    );
  }

  return (
    <div className={cn('space-y-2', className)} role="group" aria-label="Role assignments">
      {items.map((item) => (
        <div
          key={item.roleId}
          className={cn(
            'flex items-center gap-3 rounded-lg border p-3 transition-colors',
            item.isPendingChange
              ? 'border-primary bg-primary/5 dark:bg-primary/10'
              : 'border-border bg-background hover:bg-muted/50',
            disabled && 'cursor-not-allowed opacity-60'
          )}
        >
          <Checkbox
            id={`role-${item.roleId}`}
            checked={item.isChecked}
            onCheckedChange={() => onToggle(item.roleId)}
            disabled={disabled}
            aria-describedby={`role-desc-${item.roleId}`}
          />
          <div className="flex-1">
            <Label
              htmlFor={`role-${item.roleId}`}
              className={cn(
                'text-sm font-medium',
                disabled && 'cursor-not-allowed',
                item.isPendingChange && 'text-primary'
              )}
            >
              {item.roleName}
            </Label>
            {item.isPendingChange && (
              <p
                id={`role-desc-${item.roleId}`}
                className="text-xs text-muted-foreground"
                aria-live="polite"
              >
                {item.isChecked ? 'Will be granted' : 'Will be revoked'}
              </p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
