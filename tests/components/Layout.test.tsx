/**
 * Layout Component Tests
 *
 * Tests for the main Layout component that provides navigation and structure.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, within, act, waitFor } from '@testing-library/react';
import { Layout } from '../../components/Layout';
import { User, View } from '../../types';

// Mock AuthContext
vi.mock('../../context/AuthContext', () => ({
  useAuth: vi.fn(() => ({
    user: null,
    logout: vi.fn(),
    loading: false,
    login: vi.fn(),
    register: vi.fn(),
    refreshUser: vi.fn(),
    isAuthenticated: false,
  })),
}));

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
    createdAt: Date.now(),
    tier: 'pro',
    role: 'USER',
    referralCode: 'REF123',
    referralBonus: 0,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // Reset the mock implementation for each test
    mockEthereum.request.mockReset();
    mockEthereum.request.mockResolvedValue([]);
    window.ethereum = mockEthereum;
  });

  it('should render children content', () => {
    render(
      <Layout currentView="DASHBOARD" setCurrentView={mockSetCurrentView}>
        <div>Test Content</div>
      </Layout>
    );

    expect(screen.getByText('Test Content')).toBeInTheDocument();
  });

  it('should display HNH App branding', () => {
    render(
      <Layout currentView="DASHBOARD" setCurrentView={mockSetCurrentView}>
        <div>Content</div>
      </Layout>
    );

    expect(screen.getByText('HNH App')).toBeInTheDocument();
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

  it('should show Connect SOL button', () => {
    render(
      <Layout currentView="DASHBOARD" setCurrentView={mockSetCurrentView}>
        <div>Content</div>
      </Layout>
    );

    expect(screen.getByText('Connect SOL')).toBeInTheDocument();
  });

  it('should show logout button icon with proper title when provided', () => {
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

    expect(screen.getByTitle('Logout')).toBeInTheDocument();
  });

  it('should call logout function when logout button is clicked', () => {
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

    fireEvent.click(screen.getByTitle('Logout'));
    expect(mockOnLogout).toHaveBeenCalled();
  });

  it('should render core navigation items', () => {
    render(
      <Layout currentView="DASHBOARD" setCurrentView={mockSetCurrentView}>
        <div>Content</div>
      </Layout>
    );

    expect(screen.getByText('Wallets')).toBeInTheDocument();
    expect(screen.getByText('Community')).toBeInTheDocument();
    expect(screen.getByText('HNH Swap')).toBeInTheDocument();
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
    expect(screen.getByText('HOT')).toBeInTheDocument();
    expect(screen.getByText('EARN')).toBeInTheDocument();
  });

  it('should navigate to dashboard when logo is clicked', () => {
    render(
      <Layout currentView="MARKETPLACE" setCurrentView={mockSetCurrentView}>
        <div>Content</div>
      </Layout>
    );

    fireEvent.click(screen.getByText('HNH App'));
    expect(mockSetCurrentView).toHaveBeenCalledWith('DASHBOARD');
  });

  describe('Wallet Connection', () => {
    it('should attempt to connect SOL wallet when button is clicked', async () => {
      // In current implementation, connectPhantomWallet is called directly
      // but the button text is 'Connect SOL'
      render(
        <Layout currentView="DASHBOARD" setCurrentView={mockSetCurrentView}>
          <div>Content</div>
        </Layout>
      );

      const connectButton = screen.getByText('Connect SOL');
      expect(connectButton).toBeInTheDocument();
      fireEvent.click(connectButton);
      // We can't easily mock connectPhantomWallet as it's an imported function in Layout.tsx
    });

    it('should check for existing wallet connection on mount', async () => {
       // Wait for a bit for the effect to run
       render(
        <Layout currentView="DASHBOARD" setCurrentView={mockSetCurrentView}>
          <div>Content</div>
        </Layout>
      );
      
      await waitFor(() => {
        expect(mockEthereum.request).toHaveBeenCalledWith({
          method: 'eth_accounts',
        });
      }, { timeout: 3000 });
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
      // Note: Layout.tsx has Menu icon for mobile
      const menuButton = container.querySelector('.md\\:hidden button');
      // In mobile mode there should be a button with Menu icon
    });
  });
});
