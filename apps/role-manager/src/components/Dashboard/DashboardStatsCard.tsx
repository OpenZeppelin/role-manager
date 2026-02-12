/**
 * DashboardStatsCard Component
 * Feature: 007-dashboard-real-data
 *
 * Displays a statistics card on the Dashboard with support for:
 * - Loading states (spinner)
 * - Error states with retry button
 * - Disabled/not supported states
 * - Click navigation
 */

import { AlertCircle, Loader2 } from 'lucide-react';
import { ReactNode } from 'react';

import { Button, Card, CardContent, CardHeader, CardTitle } from '@openzeppelin/ui-components';
import { cn } from '@openzeppelin/ui-utils';

interface DashboardStatsCardProps {
  /** Card title */
  title: string;
  /** Count value to display */
  count: string | number | null;
  /** Label below the count */
  label: string;
  /** Icon to display in the header */
  icon?: ReactNode;
  /** Click handler for navigation */
  onClick?: () => void;
  /** Additional CSS classes */
  className?: string;
  /** Whether data is loading */
  isLoading?: boolean;
  /** Whether there's an error */
  hasError?: boolean;
  /** Error message to display */
  errorMessage?: string | null;
  /** Retry handler for errors */
  onRetry?: () => void;
  /** Whether the feature is not supported */
  isNotSupported?: boolean;
  /** Whether the card is disabled (not clickable) */
  disabled?: boolean;
}

export function DashboardStatsCard({
  title,
  count,
  label,
  icon,
  onClick,
  className,
  isLoading = false,
  hasError = false,
  errorMessage,
  onRetry,
  isNotSupported = false,
  disabled = false,
}: DashboardStatsCardProps) {
  // Determine if card should be clickable
  const isClickable = !disabled && !isNotSupported && !isLoading && !hasError && !!onClick;

  return (
    <Card
      className={cn(
        'group relative flex flex-col justify-between transition-all duration-200 overflow-hidden bg-white shadow-none',
        isClickable && 'hover:scale-[1.02] cursor-pointer',
        (disabled || isNotSupported) && 'opacity-75',
        className
      )}
      onClick={isClickable ? onClick : undefined}
    >
      {/* Open button - only show when clickable */}
      {isClickable && (
        <div className="absolute top-4 right-4 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity duration-200 z-10">
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs bg-white shadow-sm hover:bg-slate-50 px-3"
          >
            Open
          </Button>
        </div>
      )}

      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <CardTitle className="text-sm font-medium text-slate-500">{title}</CardTitle>
          {icon && <div className="text-slate-400">{icon}</div>}
        </div>
      </CardHeader>

      <CardContent>
        {/* Loading State */}
        {isLoading && (
          <div className="flex flex-col items-center justify-center py-4 gap-2">
            <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
            <span className="text-sm text-slate-500">Loading...</span>
          </div>
        )}

        {/* Error State - Vertical layout with larger icon */}
        {hasError && !isLoading && (
          <div className="flex flex-col items-center text-center py-2 gap-3">
            <AlertCircle className="h-10 w-10 text-red-500" />
            <p className="text-sm text-red-600 leading-tight">
              {errorMessage || 'Failed to load data'}
            </p>
            {onRetry && (
              <Button
                variant="outline"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onRetry();
                }}
                className="h-8 text-xs"
              >
                Retry
              </Button>
            )}
          </div>
        )}

        {/* Not Supported State */}
        {isNotSupported && !isLoading && !hasError && (
          <>
            <div className="text-4xl font-bold tracking-tight mb-1 text-slate-300">—</div>
            <p className="text-xs text-slate-400">Not supported</p>
          </>
        )}

        {/* Normal State */}
        {!isLoading && !hasError && !isNotSupported && (
          <>
            <div className="text-4xl font-bold tracking-tight mb-1 text-slate-900">
              {count ?? '-'}
            </div>
            <p className="text-xs text-slate-500">{label}</p>
          </>
        )}
      </CardContent>
    </Card>
  );
}
