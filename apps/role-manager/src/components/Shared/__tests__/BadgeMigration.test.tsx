import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { Badge, TooltipProvider } from '@openzeppelin/ui-components';

import { FeatureBadge } from '../FeatureBadge';
import { RoleTypeBadge } from '../RoleTypeBadge';

describe('Badge migration', () => {
  it('renders solid semantic status labels', () => {
    render(<Badge label="Active" variant="solid" tone="success" />);

    expect(screen.getByText('Active')).toHaveClass('bg-success', 'text-success-foreground');
  });

  it('renders the current-account marker with its accessible name', () => {
    render(<Badge label="You" variant="outline" tone="info" aria-label="This is your account" />);

    expect(screen.getByLabelText('This is your account')).toHaveTextContent('You');
  });

  it('keeps RoleTypeBadge label precedence and icon names', () => {
    const { rerender } = render(
      <RoleTypeBadge type="ownership" roleName="Fallback" label="Custom Owner" />
    );

    expect(screen.getByText('Custom Owner')).toBeInTheDocument();
    expect(screen.getByText('Owner role')).toHaveClass('sr-only');

    rerender(<RoleTypeBadge type="admin" roleName="Fallback" />);
    expect(screen.getByText('Admin')).toBeInTheDocument();
    expect(screen.getByText('Contract Admin role')).toHaveClass('sr-only');

    rerender(<RoleTypeBadge roleName="Minter" />);
    expect(screen.getByText('Minter')).toBeInTheDocument();
  });

  it('renders non-interactive role chips as spans', () => {
    render(<RoleTypeBadge roleName="Minter" />);

    expect(screen.getByText('Minter').tagName).toBe('SPAN');
  });

  it('uses a native button for clickable role chips', () => {
    const onClick = vi.fn();
    render(
      <TooltipProvider>
        <RoleTypeBadge roleName="Minter" onClick={onClick} />
      </TooltipProvider>
    );

    const badge = screen.getByRole('button', { name: 'Minter' });
    expect(badge).toHaveAttribute('type', 'button');

    fireEvent.click(badge);
    expect(onClick).toHaveBeenCalledOnce();
  });

  it('keeps keyboard activation browser-native for interactive role chips', () => {
    render(
      <TooltipProvider>
        <RoleTypeBadge roleName="Minter" onClick={vi.fn()} />
      </TooltipProvider>
    );

    const badge = screen.getByRole('button', { name: 'Minter' });
    badge.focus();

    expect(badge).toHaveFocus();
    expect(badge.tagName).toBe('BUTTON');
  });

  it('keeps FeatureBadge palette classes on a non-interactive kit badge', () => {
    render(
      <TooltipProvider>
        <FeatureBadge variant="purple" tooltip="Capability details">
          Access Control
        </FeatureBadge>
      </TooltipProvider>
    );

    const badge = screen.getByText('Access Control');
    expect(badge.tagName).toBe('SPAN');
    expect(badge).toHaveClass('bg-purple-100', 'text-purple-800', 'px-2.5');
  });
});
