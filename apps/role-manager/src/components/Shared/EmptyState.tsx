import { LucideIcon } from 'lucide-react';

import { Button } from '@openzeppelin/ui-components';
import { cn } from '@openzeppelin/ui-utils';

export interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: LucideIcon;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export function EmptyState({
  title,
  description,
  icon: Icon,
  actionLabel,
  onAction,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn('flex w-full flex-col items-center justify-center text-center p-6', className)}
    >
      {Icon && (
        <div className="rounded-full bg-slate-100 p-3 mb-4">
          <Icon className="h-6 w-6 text-slate-400" />
        </div>
      )}
      <h3 className="text-sm font-semibold text-slate-900 mb-1">{title}</h3>
      {description && <p className="text-sm text-slate-500 max-w-xs">{description}</p>}
      {actionLabel && onAction && (
        <div className="mt-4">
          <Button onClick={onAction} variant="outline" size="sm">
            {actionLabel}
          </Button>
        </div>
      )}
    </div>
  );
}
