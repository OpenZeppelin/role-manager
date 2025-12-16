/**
 * AccountActionsMenu Component
 * Feature: 010-authorized-accounts-page
 *
 * Dropdown menu with actions for an account row.
 *
 * Actions:
 * - Edit Roles
 */

import { Edit, MoreHorizontal } from 'lucide-react';

import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@openzeppelin/ui-builder-ui';
import { cn } from '@openzeppelin/ui-builder-utils';

import { ACCOUNT_ACTIONS, type AccountAction } from '../../types/authorized-accounts';

/**
 * Props for AccountActionsMenu component
 */
export interface AccountActionsMenuProps {
  /** Callback when an action is triggered */
  onAction: (action: AccountAction) => void;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Maps action IDs to their corresponding icons
 */
const ACTION_ICONS: Record<AccountAction, React.ReactNode> = {
  'edit-roles': <Edit className="mr-2 h-4 w-4" />,
};

/**
 * AccountActionsMenu - Dropdown menu with account actions
 *
 * Displays a three-dot button that reveals action options when clicked.
 * Actions trigger the onAction callback with the action ID.
 */
export function AccountActionsMenu({ onAction, className }: AccountActionsMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            'h-8 w-8 p-0 hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring',
            className
          )}
          aria-label="Open actions menu"
        >
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        {ACCOUNT_ACTIONS.map((action) => (
          <DropdownMenuItem
            key={action.id}
            onClick={() => onAction(action.id)}
            className="cursor-pointer"
          >
            {ACTION_ICONS[action.id]}
            {action.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
