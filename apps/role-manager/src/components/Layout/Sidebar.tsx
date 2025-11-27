import { Home } from 'lucide-react';
import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import { SidebarButton, SidebarLayout, SidebarSection } from '@openzeppelin/ui-builder-ui';

export interface SidebarProps {
  /** Controls visibility in mobile slide-over */
  mobileOpen?: boolean;
  /** Close handler for mobile slide-over */
  onMobileOpenChange?: (open: boolean) => void;
}

/**
 * Sidebar component
 * Provides navigation with logo and menu items
 * Uses UI Builder SidebarLayout component with responsive behavior
 */
export function Sidebar({ mobileOpen, onMobileOpenChange }: SidebarProps): React.ReactElement {
  const location = useLocation();
  const navigate = useNavigate();

  const headerContent = (
    <div className="mb-8">
      <img src="/OZ-Logo-BlackBG.svg" alt="OpenZeppelin Logo" className="h-6 w-auto" />
    </div>
  );

  const handleHomeClick = () => {
    navigate('/');
    onMobileOpenChange?.(false);
  };

  return (
    <SidebarLayout
      header={headerContent}
      mobileOpen={mobileOpen}
      onMobileOpenChange={onMobileOpenChange}
      mobileAriaLabel="Navigation menu"
    >
      <SidebarSection>
        <SidebarButton
          icon={<Home className="size-4" />}
          isSelected={location.pathname === '/'}
          onClick={handleHomeClick}
        >
          Home
        </SidebarButton>
      </SidebarSection>

      {/* Additional navigation sections can be added here */}
    </SidebarLayout>
  );
}
