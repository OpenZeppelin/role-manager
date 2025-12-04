/**
 * AccessControlCapabilitiesSummary Component
 *
 * Displays detected access control capabilities as badges with optional notes.
 * Reusable in success and unsupported states.
 */

import type { AccessControlCapabilities } from '@openzeppelin/ui-builder-types';
import { cn } from '@openzeppelin/ui-builder-utils';

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
 * Feature badge component for consistent styling
 */
function FeatureBadge({
  children,
  variant,
}: {
  children: React.ReactNode;
  variant: 'blue' | 'purple' | 'green' | 'amber';
}): React.ReactElement {
  const variantClasses = {
    blue: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
    purple: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
    green: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
    amber: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
        variantClasses[variant]
      )}
    >
      {children}
    </span>
  );
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
          {capabilities.hasAccessControl && (
            <FeatureBadge variant="purple">AccessControl</FeatureBadge>
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
