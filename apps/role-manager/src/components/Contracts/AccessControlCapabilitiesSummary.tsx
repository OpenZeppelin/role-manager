/**
 * AccessControlCapabilitiesSummary Component
 *
 * Displays detected access control capabilities as badges with optional notes.
 * Reusable in success and unsupported states.
 */

import type { AccessControlCapabilities } from '@openzeppelin/ui-types';

import { FeatureBadge } from '../Shared/FeatureBadge';

interface AccessControlCapabilitiesSummaryProps {
  /**
   * The detected capabilities to display
   */
  capabilities: AccessControlCapabilities;

  /**
   * Whether to show the section header
   * @default true
   */
  showHeader?: boolean;

  /**
   * Custom header text
   * @default 'Access Control Features'
   */
  headerText?: string;

  /**
   * Whether to show notes
   * @default true
   */
  showNotes?: boolean;
}

/**
 * Displays access control capabilities with feature badges and notes
 */
export function AccessControlCapabilitiesSummary({
  capabilities,
  showHeader = true,
  headerText = 'Access Control Features',
  showNotes = true,
}: AccessControlCapabilitiesSummaryProps): React.ReactElement {
  const hasAnyFeature =
    capabilities.hasOwnable ||
    capabilities.hasAccessControl ||
    capabilities.hasEnumerableRoles ||
    capabilities.supportsHistory;

  return (
    <div className="rounded-lg border bg-muted/50 p-4">
      {showHeader && (
        <div className="mb-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {headerText}
        </div>
      )}

      {/* Feature badges */}
      {hasAnyFeature && (
        <div className="mb-3 flex flex-wrap gap-2">
          {capabilities.hasOwnable && <FeatureBadge variant="blue">Ownable</FeatureBadge>}
          {capabilities.hasTwoStepOwnable && (
            <FeatureBadge variant="cyan">Two-Step Ownership</FeatureBadge>
          )}
          {capabilities.hasAccessControl && (
            <FeatureBadge variant="purple">AccessControl</FeatureBadge>
          )}
          {capabilities.hasTwoStepAdmin && (
            <FeatureBadge variant="teal">Two-Step Admin</FeatureBadge>
          )}
          {capabilities.hasEnumerableRoles && (
            <FeatureBadge variant="green">Enumerable Roles</FeatureBadge>
          )}
          {capabilities.supportsHistory && <FeatureBadge variant="amber">History</FeatureBadge>}
        </div>
      )}

      {/* No features detected */}
      {!hasAnyFeature && (
        <p className="mb-3 text-sm text-muted-foreground">No access control features detected</p>
      )}

      {/* Notes */}
      {showNotes && capabilities.notes && capabilities.notes.length > 0 && (
        <ul className="space-y-1 text-xs text-muted-foreground">
          {capabilities.notes.map((note, index) => (
            <li key={index} className="flex items-start gap-2">
              <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-muted-foreground/50" />
              <span>{note}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
