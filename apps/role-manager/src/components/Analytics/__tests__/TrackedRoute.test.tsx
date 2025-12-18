/**
 * Tests for TrackedRoute component
 *
 * Verifies that:
 * - Page views are tracked when routes are rendered
 * - Page views are tracked when location changes
 * - Children are rendered correctly
 */
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes, useNavigate } from 'react-router-dom';

import { TrackedRoute } from '../TrackedRoute';

// Mock the useRoleManagerAnalytics hook
const mockTrackPageView = vi.fn();

vi.mock('../../../hooks/useRoleManagerAnalytics', () => ({
  useRoleManagerAnalytics: () => ({
    trackPageView: mockTrackPageView,
  }),
}));

// Helper component to trigger navigation
function NavigationTrigger({ to }: { to: string }) {
  const navigate = useNavigate();
  return (
    <button onClick={() => navigate(to)} data-testid="navigate">
      Navigate to {to}
    </button>
  );
}

describe('TrackedRoute', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render children correctly', () => {
      render(
        <MemoryRouter initialEntries={['/']}>
          <TrackedRoute name="Test Page">
            <div data-testid="child-content">Child Content</div>
          </TrackedRoute>
        </MemoryRouter>
      );

      expect(screen.getByTestId('child-content')).toBeInTheDocument();
      expect(screen.getByText('Child Content')).toBeInTheDocument();
    });

    it('should render multiple children', () => {
      render(
        <MemoryRouter initialEntries={['/']}>
          <TrackedRoute name="Test Page">
            <div data-testid="child-1">First</div>
            <div data-testid="child-2">Second</div>
          </TrackedRoute>
        </MemoryRouter>
      );

      expect(screen.getByTestId('child-1')).toBeInTheDocument();
      expect(screen.getByTestId('child-2')).toBeInTheDocument();
    });
  });

  describe('page view tracking', () => {
    it('should track page view on initial render', () => {
      render(
        <MemoryRouter initialEntries={['/dashboard']}>
          <TrackedRoute name="Dashboard">
            <div>Dashboard Content</div>
          </TrackedRoute>
        </MemoryRouter>
      );

      expect(mockTrackPageView).toHaveBeenCalledTimes(1);
      expect(mockTrackPageView).toHaveBeenCalledWith('Dashboard', '/dashboard');
    });

    it('should track page view with correct path', () => {
      render(
        <MemoryRouter initialEntries={['/authorized-accounts']}>
          <TrackedRoute name="Authorized Accounts">
            <div>Accounts Content</div>
          </TrackedRoute>
        </MemoryRouter>
      );

      expect(mockTrackPageView).toHaveBeenCalledWith('Authorized Accounts', '/authorized-accounts');
    });

    it('should track page view when location changes', async () => {
      render(
        <MemoryRouter initialEntries={['/']}>
          <Routes>
            <Route
              path="/"
              element={
                <TrackedRoute name="Dashboard">
                  <div>Dashboard</div>
                  <NavigationTrigger to="/roles" />
                </TrackedRoute>
              }
            />
            <Route
              path="/roles"
              element={
                <TrackedRoute name="Roles">
                  <div>Roles</div>
                </TrackedRoute>
              }
            />
          </Routes>
        </MemoryRouter>
      );

      // Initial page view tracked
      expect(mockTrackPageView).toHaveBeenCalledWith('Dashboard', '/');

      // Simulate navigation by clicking the button
      screen.getByTestId('navigate').click();

      // Wait for the new route to render and track
      await vi.waitFor(() => {
        expect(mockTrackPageView).toHaveBeenCalledWith('Roles', '/roles');
      });
    });

    it('should not re-track when other props change', () => {
      const { rerender: rerenderComponent } = render(
        <MemoryRouter initialEntries={['/test']}>
          <TrackedRoute name="Test Page">
            <div>Content 1</div>
          </TrackedRoute>
        </MemoryRouter>
      );

      expect(mockTrackPageView).toHaveBeenCalledTimes(1);

      // Rerender with different children but same name and location
      rerenderComponent(
        <MemoryRouter initialEntries={['/test']}>
          <TrackedRoute name="Test Page">
            <div>Content 2</div>
          </TrackedRoute>
        </MemoryRouter>
      );

      // Should still only be called once since name and pathname haven't changed
      expect(mockTrackPageView).toHaveBeenCalledTimes(1);
    });

    it('should re-track when name changes', () => {
      const { rerender } = render(
        <MemoryRouter initialEntries={['/test']}>
          <TrackedRoute name="Page A">
            <div>Content</div>
          </TrackedRoute>
        </MemoryRouter>
      );

      expect(mockTrackPageView).toHaveBeenCalledWith('Page A', '/test');

      rerender(
        <MemoryRouter initialEntries={['/test']}>
          <TrackedRoute name="Page B">
            <div>Content</div>
          </TrackedRoute>
        </MemoryRouter>
      );

      expect(mockTrackPageView).toHaveBeenCalledWith('Page B', '/test');
      expect(mockTrackPageView).toHaveBeenCalledTimes(2);
    });
  });
});
