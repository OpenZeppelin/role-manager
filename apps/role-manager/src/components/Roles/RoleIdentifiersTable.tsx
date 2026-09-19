/**
 * RoleIdentifiersTable - Read-only reference table of role identifiers
 * Feature: 008-roles-page-layout, 009-roles-page-data
 *
 * Displays all available role identifiers with names and descriptions.
 * No interactive elements—purely informational per FR-023.
 *
 * Updated in spec 009 (T045):
 * - Accepts real RoleIdentifier[] from useRolesPageData
 * - T046: Handles hash identifiers with proper truncation display
 */

import { useId } from 'react';

import { DataTable, type DataTableColumn } from '@openzeppelin/ui-components';
import { cn, truncateMiddle } from '@openzeppelin/ui-utils';

import type { RoleIdentifier } from '../../types/roles';
import { isHash } from '../../utils/hash';

/**
 * Format identifier for display, truncating long hashes.
 * Uses truncateMiddle from shared utils for consistent formatting.
 * Full hash shown on hover via title attribute.
 */
function formatIdentifier(identifier: string): { display: string; isTruncated: boolean } {
  if (!isHash(identifier)) {
    return { display: identifier, isTruncated: false };
  }
  // Truncate long hashes for display using shared utility
  if (identifier.length > 16) {
    const startChars = identifier.startsWith('0x') ? 10 : 8;
    return {
      display: truncateMiddle(identifier, startChars, 6),
      isTruncated: true,
    };
  }
  return { display: identifier, isTruncated: false };
}

/**
 * Props for the RoleIdentifiersTable component
 */
export interface RoleIdentifiersTableProps {
  /** Array of role identifiers to display */
  identifiers: RoleIdentifier[];
  /** Additional CSS classes */
  className?: string;
}

const columns = [
  {
    id: 'identifier',
    header: 'Role Identifier',
    headerClassName: 'px-4 py-3 font-semibold text-foreground',
    cellClassName: 'px-4 py-3',
    cell: (role) => {
      const formatted = formatIdentifier(role.identifier);
      return (
        <code
          className="rounded bg-muted px-2 py-1 font-mono text-xs"
          title={formatted.isTruncated ? role.identifier : undefined}
        >
          {formatted.display}
        </code>
      );
    },
  },
  {
    id: 'name',
    header: 'Name',
    headerClassName: 'px-4 py-3 font-semibold text-foreground',
    cellClassName: 'px-4 py-3 font-medium',
    cell: (role) => role.name,
  },
  {
    id: 'description',
    header: 'Description',
    headerClassName: 'px-4 py-3 font-semibold text-foreground',
    cellClassName: 'px-4 py-3 text-muted-foreground',
    cell: (role) =>
      role.description || <span className="text-muted-foreground/60 italic">No description</span>,
  },
] satisfies readonly DataTableColumn<RoleIdentifier>[];

/**
 * Read-only reference table displaying all available role identifiers.
 * Data is sourced from useRolesPageData hook's roleIdentifiers array.
 *
 * @example
 * const { roleIdentifiers } = useRolesPageData();
 * <RoleIdentifiersTable identifiers={roleIdentifiers} />
 */
export function RoleIdentifiersTable({ identifiers, className }: RoleIdentifiersTableProps) {
  const headingId = useId();

  return (
    <div className={cn('space-y-4', className)}>
      {/* Section Header */}
      <div className="space-y-1">
        <h2 id={headingId} className="text-xl font-semibold">
          Available Role Identifiers
        </h2>
        <p className="text-sm text-muted-foreground">
          Reference table of all role identifiers available in this contract
        </p>
      </div>

      <DataTable
        aria-labelledby={headingId}
        className="rounded-lg"
        columns={columns}
        rows={identifiers}
        getRowKey={(role) => role.identifier}
        getRowClassName={() => 'hover:bg-muted/30'}
      />
    </div>
  );
}
