import React, { ReactNode, useState } from 'react';

import { Footer } from '@openzeppelin/ui-builder-ui';

import { AppHeader } from './AppHeader';
import { Sidebar } from './Sidebar';

export interface MainLayoutProps {
  /** Main content to render in the layout */
  children: ReactNode;
}

/**
 * MainLayout component
 * Provides the base application structure with:
 * - Responsive sidebar (desktop fixed, mobile slide-over)
 * - Header with mobile menu toggle
 * - Main content area
 */
export function MainLayout({ children }: MainLayoutProps): React.ReactElement {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar with mobile slide-over controlled by mobileOpen state */}
      <Sidebar mobileOpen={mobileOpen} onMobileOpenChange={setMobileOpen} />

      {/* Main content area */}
      <div className="flex flex-1 flex-col">
        {/* Header with mobile menu toggle */}
        <AppHeader onOpenSidebar={() => setMobileOpen(true)} />

        {/* Page content */}
        <main className="flex-1">{children}</main>

        <Footer />
      </div>
    </div>
  );
}
