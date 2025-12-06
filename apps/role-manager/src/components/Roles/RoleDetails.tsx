/**
 * RoleDetails Component
 * Feature: 008-roles-page-layout
 *
 * Right panel showing selected role details:
 * - Role name with icon (Crown for Owner, Shield for others)
 * - Role description
 * - "Assigned Accounts (N)" header with "+ Assign" button (non-owner only)
 * - List of AccountRow components
 * - Empty state: "No accounts assigned to this role" (centered, py-8, text-muted)
 */

import { Crown, Plus } from 'lucide-react';

import {
  Button,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@openzeppelin/ui-builder-ui';
import { cn } from '@openzeppelin/ui-builder-utils';

import type { Role, RoleAccount } from '../../types/roles';
import { AccountRow } from './AccountRow';

export interface RoleDetailsProps {
  role: Role;
  accounts: RoleAccount[];
  isConnected?: boolean;
  onAssign?: () => void;
  onRevoke?: (address: string) => void;
  onTransferOwnership?: () => void;
  className?: string;
}

export function RoleDetails({
  role,
  accounts,
  isConnected,
  onAssign,
  onRevoke,
  onTransferOwnership,
  className,
}: RoleDetailsProps) {
  const hasAccounts = accounts.length > 0;

  return (
    <div className={cn(className)}>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              {role.isOwnerRole && <Crown className="h-4 w-4 text-blue-600" />}
              <CardTitle>{role.name}</CardTitle>
              {isConnected && (
                <span className="text-xs bg-blue-50 text-blue-700 border border-blue-300 rounded-full px-2 py-0.5">
                  Connected
                </span>
              )}
            </div>
            <div className="mt-1">
              <CardDescription>{role.description}</CardDescription>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Assigned Accounts */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium">Assigned Accounts ({accounts.length})</h3>
            {!role.isOwnerRole && (
              <Button size="sm" onClick={onAssign}>
                <Plus className="h-4 w-4 mr-1" />
                Assign
              </Button>
            )}
          </div>
          <div className="border rounded-lg divide-y max-h-[300px] overflow-y-auto">
            {hasAccounts ? (
              accounts.map((account) => (
                <AccountRow
                  key={account.address}
                  account={account}
                  isOwnerRole={role.isOwnerRole}
                  onAction={() =>
                    role.isOwnerRole ? onTransferOwnership?.() : onRevoke?.(account.address)
                  }
                />
              ))
            ) : (
              <div className="p-6 text-center text-sm text-muted-foreground">
                No accounts assigned to this role
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </div>
  );
}
