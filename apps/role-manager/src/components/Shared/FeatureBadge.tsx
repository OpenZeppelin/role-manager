/**
 * FeatureBadge Component
 *
 * Reusable badge component for displaying access control features
 * with consistent styling across the application.
 */
import { cn } from '@openzeppelin/ui-utils';

export type FeatureBadgeVariant = 'blue' | 'purple' | 'green' | 'amber' | 'slate' | 'cyan' | 'teal';

interface FeatureBadgeProps {
  children: React.ReactNode;
  variant: FeatureBadgeVariant;
  className?: string;
}

const variantClasses: Record<FeatureBadgeVariant, string> = {
  blue: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  purple: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
  green: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  amber: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
  slate: 'bg-slate-100 text-slate-800 dark:bg-slate-900/30 dark:text-slate-300',
  cyan: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-300',
  teal: 'bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-300',
};

/**
 * Feature badge component for consistent styling of capability indicators.
 *
 * @example
 * ```tsx
 * <FeatureBadge variant="purple">AccessControl</FeatureBadge>
 * <FeatureBadge variant="blue">Ownable</FeatureBadge>
 * ```
 */
export function FeatureBadge({
  children,
  variant,
  className,
}: FeatureBadgeProps): React.ReactElement {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
        variantClasses[variant],
        className
      )}
    >
      {children}
    </span>
  );
}
