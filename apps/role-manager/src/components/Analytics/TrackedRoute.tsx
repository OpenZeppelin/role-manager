import type { ReactNode } from 'react';
import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

import { useRoleManagerAnalytics } from '../../hooks/useRoleManagerAnalytics';

interface TrackedRouteProps {
  /** Human-readable name of the page for analytics (required) */
  name: string;
  /** The page component to render */
  children: ReactNode;
}

/**
 * Wrapper component that tracks page views for routes.
 *
 * Use this to wrap route elements to ensure all pages are tracked.
 * The `name` prop is required, providing compile-time enforcement
 * that every route has an analytics name.
 *
 * @example
 * ```tsx
 * <Routes>
 *   <Route path="/" element={<TrackedRoute name="Dashboard"><Dashboard /></TrackedRoute>} />
 *   <Route path="/roles" element={<TrackedRoute name="Roles"><Roles /></TrackedRoute>} />
 * </Routes>
 * ```
 */
export function TrackedRoute({ name, children }: TrackedRouteProps) {
  const location = useLocation();
  const { trackPageView } = useRoleManagerAnalytics();

  useEffect(() => {
    trackPageView(name, location.pathname);
  }, [name, location.pathname, trackPageView]);

  return <>{children}</>;
}
