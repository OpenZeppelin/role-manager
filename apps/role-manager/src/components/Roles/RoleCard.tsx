/**
 * RoleCard Component
 * Feature: 008-roles-page-layout, 009-roles-page-data
 *
 * Displays an individual role card with:
 * - Role icon (Crown for Owner, Shield for all others per FR-007a)
 * - Role name (font-semibold)
 * - Member count and description
 * - "Connected" badge when isConnected={true}
 * - Selection border (border-primary, 2px) when isSelected={true}
 *
 * Updated in spec 009 to accept RoleWithDescription type (T029).
 */

import { Crown } from 'lucide-react';

import { cn } from '@openzeppelin/ui-builder-utils';

import type { RoleWithDescription } from '../../types/roles';

/**
 * RoleCard props interface per contracts/components.ts
 */
export interface RoleCardProps {
  /** Role data with resolved description */
  role: RoleWithDescription;
  /** Whether this card is currently selected */
  isSelected: boolean;
  /** Whether the current user is assigned to this role (for "Connected" badge) */
  isConnected: boolean;
  /** Click handler for selection */
  onClick: () => void;
  /** Additional CSS classes */
  className?: string;
}

/**
 * RoleCard - Individual role card in the roles list
 */
export function RoleCard({ role, isSelected, isConnected, onClick, className }: RoleCardProps) {
  const memberCount = role.members.length;

  return (
    <div
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      }}
      role="button"
      tabIndex={0}
      aria-selected={isSelected}
      className={cn(
        'p-3 rounded-lg border cursor-pointer transition-all',
        isSelected
          ? 'border-blue-500 bg-blue-50'
          : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50',
        className
      )}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {role.isOwnerRole && <Crown className="h-3 w-3 text-blue-600" aria-label="Owner role" />}
          <h3 className="font-medium text-sm">{role.roleName}</h3>
        </div>
        <div className="flex items-center gap-1">
          {isConnected && (
            <span className="text-xs bg-blue-50 text-blue-700 border border-blue-300 rounded-full px-2 py-0.5">
              Connected
            </span>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2 mt-1">
        <span className="text-xs text-muted-foreground">
          {memberCount} {memberCount === 1 ? 'member' : 'members'}
        </span>
      </div>
      {role.description && (
        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{role.description}</p>
      )}
      {!role.description && (
        <p className="text-xs text-muted-foreground/60 mt-1 italic">No description</p>
      )}
    </div>
  );
}
