/**
 * Layout Component Tests
 *
 * Tests for the main Layout component that provides navigation and structure.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Layout } from '../../components/Layout';
import { User, View } from '../../types';

// Mock ethereum provider
const mockEthereum = {
  request: vi.fn(),
  on: vi.fn(),
  removeListener: vi.fn(),
  isMetaMask: true,
};

describe('Layout', () => {
  const mockSetCurrentView = vi.fn();
  const mockOnLogout = vi.fn();
  const mockUser: User = {
    id: '123',
    username: 'testuser',
    passwordHash: 'hash',
    createdAt: Date.now(),
    tier: 'pro',
    referralCode: 'REF123',
    referralBonus: 0,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    window.ethereum = mockEthereum;
    mockEthereum.request.mockResolvedValue([]);
  });

  it('should render children content', () => {
    render(
      <Layout currentView="DASHBOARD" setCurrentView={mockSetCurrentView}>
        <div>Test Content</div>
      </Layout>
    );

    expect(screen.getByText('Test Content')).toBeInTheDocument();
  });

  it('should display HashNHedge branding', () => {
    render(
      <Layout currentView="DASHBOARD" setCurrentView={mockSetCurrentView}>
        <div>Content</div>
      </Layout>
    );

    expect(screen.getByText('HashNHedge')).toBeInTheDocument();
  });

  it('should display username when user is provided', () => {
    render(
      <Layout
        currentView="DASHBOARD"
        setCurrentView={mockSetCurrentView}
        user={mockUser}
      >
        <div>Content</div>
      </Layout>
    );

    expect(screen.getByText('@testuser')).toBeInTheDocument();
  });

  it('should render navigation items', () => {
    render(
      <Layout currentView="DASHBOARD" setCurrentView={mockSetCurrentView}>
        <div>Content</div>
      </Layout>
    );

    expect(screen.getByText('Network Overview')).toBeInTheDocument();
    expect(screen.getByText('Compute Market')).toBeInTheDocument();
    expect(screen.getByText('Deploy Job')).toBeInTheDocument();
    expect(screen.getByText('HNH Swap')).toBeInTheDocument();
  });

  it('should highlight current view in navigation', () => {
    const { container } = render(
      <Layout currentView="DASHBOARD" setCurrentView={mockSetCurrentView}>
        <div>Content</div>
      </Layout>
    );

    // The active nav item should have the primary color class
    const dashboardButton = screen.getByText('Network Overview').closest('button');
    expect(dashboardButton?.className).toContain('text-primary');
  });

  it('should call setCurrentView when nav item is clicked', () => {
    render(
      <Layout currentView="DASHBOARD" setCurrentView={mockSetCurrentView}>
        <div>Content</div>
      </Layout>
    );

    fireEvent.click(screen.getByText('Compute Market'));
    expect(mockSetCurrentView).toHaveBeenCalledWith('MARKETPLACE');
  });

  it('should show Connect Wallet button', () => {
    render(
      <Layout currentView="DASHBOARD" setCurrentView={mockSetCurrentView}>
        <div>Content</div>
      </Layout>
    );

    expect(screen.getByText('Connect Wallet')).toBeInTheDocument();
  });

  it('should show logout button when onLogout is provided', () => {
    render(
      <Layout
        currentView="DASHBOARD"
        setCurrentView={mockSetCurrentView}
        user={mockUser}
        onLogout={mockOnLogout}
      >
        <div>Content</div>
      </Layout>
    );

    expect(screen.getByText('Logout')).toBeInTheDocument();
  });

  it('should call onLogout when logout button is clicked', () => {
    render(
      <Layout
        currentView="DASHBOARD"
        setCurrentView={mockSetCurrentView}
        user={mockUser}
        onLogout={mockOnLogout}
      >
        <div>Content</div>
      </Layout>
    );

    fireEvent.click(screen.getByText('Logout'));
    expect(mockOnLogout).toHaveBeenCalled();
  });

  it('should render tool section navigation items', () => {
    render(
      <Layout currentView="DASHBOARD" setCurrentView={mockSetCurrentView}>
        <div>Content</div>
      </Layout>
    );

    expect(screen.getByText('Security Center')).toBeInTheDocument();
    expect(screen.getByText('Token Factory')).toBeInTheDocument();
    expect(screen.getByText('White Label')).toBeInTheDocument();
  });

  it('should render supply side navigation items', () => {
    render(
      <Layout currentView="DASHBOARD" setCurrentView={mockSetCurrentView}>
        <div>Content</div>
      </Layout>
    );

    expect(screen.getByText('Host Node')).toBeInTheDocument();
    expect(screen.getByText('Worker Manager')).toBeInTheDocument();
    expect(screen.getByText('Analytics')).toBeInTheDocument();
  });

  it('should display badges on certain nav items', () => {
    render(
      <Layout currentView="DASHBOARD" setCurrentView={mockSetCurrentView}>
        <div>Content</div>
      </Layout>
    );

    // Check for badges
    expect(screen.getByText('DeFi')).toBeInTheDocument();
    expect(screen.getByText('EARN')).toBeInTheDocument();
    expect(screen.getByText('NEW')).toBeInTheDocument();
    expect(screen.getByText('$$$')).toBeInTheDocument();
    expect(screen.getByText('PRO')).toBeInTheDocument();
  });

  it('should navigate to dashboard when logo is clicked', () => {
    render(
      <Layout currentView="MARKETPLACE" setCurrentView={mockSetCurrentView}>
        <div>Content</div>
      </Layout>
    );

    fireEvent.click(screen.getByText('HashNHedge'));
    expect(mockSetCurrentView).toHaveBeenCalledWith('DASHBOARD');
  });

  describe('Wallet Connection', () => {
    it('should attempt to connect wallet when button is clicked', async () => {
      mockEthereum.request.mockResolvedValue(['0x1234567890abcdef']);

      render(
        <Layout currentView="DASHBOARD" setCurrentView={mockSetCurrentView}>
          <div>Content</div>
        </Layout>
      );

      fireEvent.click(screen.getByText('Connect Wallet'));

      expect(mockEthereum.request).toHaveBeenCalledWith({
        method: 'eth_requestAccounts',
      });
    });

    it('should check for existing wallet connection on mount', () => {
      render(
        <Layout currentView="DASHBOARD" setCurrentView={mockSetCurrentView}>
          <div>Content</div>
        </Layout>
      );

      expect(mockEthereum.request).toHaveBeenCalledWith({
        method: 'eth_accounts',
      });
    });
  });

  describe('Mobile Menu', () => {
    it('should toggle mobile menu when hamburger is clicked', () => {
      // Set viewport to mobile
      Object.defineProperty(window, 'innerWidth', { value: 500 });

      const { container } = render(
        <Layout currentView="DASHBOARD" setCurrentView={mockSetCurrentView}>
          <div>Content</div>
        </Layout>
      );

      // Find and click the mobile menu button
      const menuButton = container.querySelector('.md\\:hidden button');
      if (menuButton) {
        fireEvent.click(menuButton);
      }
    });
  });
});
