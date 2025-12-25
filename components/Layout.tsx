
import React, { useEffect, useState } from 'react';
import { View } from '../types';
import { LayoutDashboard, Cpu, Rocket, Server, Menu, X, Globe, Wallet, Zap, Shield, Coins, Palette, ArrowLeftRight, LogOut, User as UserIcon, Users, Crown, Activity, Layers, MessageSquare } from 'lucide-react';
import { User } from '../types';

interface LayoutProps {
  currentView: View;
  setCurrentView: (view: View) => void;
  children: React.ReactNode;
  user?: User;
  onLogout?: () => void;
}

export const Layout: React.FC<LayoutProps> = ({ currentView, setCurrentView, children, user, onLogout }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [balance, setBalance] = useState<string>('0.00');
  const [isConnecting, setIsConnecting] = useState(false);

  // Check for existing connection on load
  useEffect(() => {
    if (window.ethereum) {
      window.ethereum.request({ method: 'eth_accounts' })
        .then((accounts: string[]) => {
          if (accounts.length > 0) {
            setWalletAddress(accounts[0]);
            fetchBalance(accounts[0]);
          }
        });

      window.ethereum.on('accountsChanged', (accounts: any) => {
        if (accounts.length > 0) {
          setWalletAddress(accounts[0]);
          fetchBalance(accounts[0]);
        } else {
          setWalletAddress(null);
          setBalance('0.00');
        }
      });
    }
  }, []);

  const fetchBalance = async (address: string) => {
    if (!window.ethereum) return;
    try {
      const hexBalance = await window.ethereum.request({
        method: 'eth_getBalance',
        params: [address, 'latest'],
      });
      const ethBalance = parseInt(hexBalance, 16) / 1e18;
      setBalance(ethBalance.toFixed(4));
    } catch (e) {
      console.error(e);
    }
  };

  const connectWallet = async () => {
    if (!window.ethereum) {
      alert("Please install MetaMask or another Web3 wallet.");
      return;
    }
    setIsConnecting(true);
    try {
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      if (accounts.length > 0) {
        setWalletAddress(accounts[0]);
        await fetchBalance(accounts[0]);
      }
    } catch (error) {
      console.error("Connection failed", error);
    } finally {
      setIsConnecting(false);
    }
  };

  const NavItem = ({ view, icon: Icon, label, badge }: { view: View; icon: React.ElementType; label: string, badge?: string }) => (
    <button
      onClick={() => {
        setCurrentView(view);
        setIsMobileMenuOpen(false);
      }}
      className={`relative flex items-center space-x-3 w-full px-4 py-3 rounded-xl transition-all duration-200 ${currentView === view
        ? 'bg-primary/10 text-primary border border-primary/20 shadow-[0_0_15px_rgba(16,185,129,0.2)]'
        : 'text-muted hover:bg-surface hover:text-white'
        }`}
    >
      <Icon size={20} />
      <span className="font-medium tracking-wide">{label}</span>
      {badge && (
        <span className="absolute right-3 bg-accent/20 text-accent text-[10px] font-bold px-2 py-0.5 rounded-full">
          {badge}
        </span>
      )}
    </button>
  );

  return (
    <div className="flex min-h-screen bg-background text-text selection:bg-primary/30 font-sans">
      {/* Sidebar Desktop */}
      <aside className="hidden md:flex flex-col w-64 border-r border-white/5 bg-surface/50 backdrop-blur-xl fixed h-full z-20 overflow-y-auto">
        <div className="p-6 border-b border-white/5">
          <div className="flex items-center space-x-2 cursor-pointer" onClick={() => setCurrentView('DASHBOARD')}>
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-emerald-800 flex items-center justify-center shadow-lg shadow-primary/20">
              <Globe className="text-white" size={18} />
            </div>
            <div>
              <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400 leading-none">
                HashNHedge
              </h1>
              {user && <span className="text-[10px] text-primary font-mono block">@{user.username}</span>}
            </div>
          </div>
          <p className="text-xs text-muted mt-2 ml-10">Decentralized Compute</p>
        </div>

        <nav className="flex-1 p-4 space-y-2">
          <div className="px-4 py-2 text-xs font-bold text-muted uppercase tracking-widest">Platform</div>
          <NavItem view="DASHBOARD" icon={LayoutDashboard} label="Network Overview" />
          <NavItem view="MARKETPLACE" icon={Server} label="Compute Market" />
          <NavItem view="DEPLOY" icon={Rocket} label="Deploy Job" />
          <NavItem view="FORUM" icon={MessageSquare} label="Community" badge="NEW" />
          <NavItem view="DEX" icon={ArrowLeftRight} label="HNH Swap" badge="DeFi" />

          <div className="mt-6 px-4 py-2 text-xs font-bold text-muted uppercase tracking-widest">Tools</div>
          <NavItem view="SECURITY" icon={Shield} label="Security Center" />
          <NavItem view="TOKEN_CREATOR" icon={Coins} label="Token Factory" />
          <NavItem view="WHITE_LABEL" icon={Palette} label="White Label" />

          <div className="mt-6 px-4 py-2 text-xs font-bold text-muted uppercase tracking-widest">Supply Side</div>
          <NavItem view="PROVIDER" icon={Zap} label="Host Node" badge="EARN" />
          <NavItem view="WORKERS" icon={Server} label="Worker Manager" />
          <NavItem view="ANALYTICS" icon={Activity} label="Analytics" />
          <NavItem view="OVERCLOCK" icon={Layers} label="AI Tuner" badge="NEW" />
          <NavItem view="REFERRALS" icon={Users} label="Referrals" badge="$$$" />
          <NavItem view="UPGRADE" icon={Crown} label="Upgrade" badge="PRO" />
        </nav>

        <div className="p-4 border-t border-white/5">
          <button
            onClick={connectWallet}
            disabled={isConnecting}
            className={`w-full flex items-center justify-center space-x-2 border py-2 rounded-lg transition-all text-sm font-medium ${walletAddress
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
              : 'bg-white/5 hover:bg-white/10 border-white/10 text-white'
              }`}
          >
            <Wallet size={16} />
            <span>
              {isConnecting
                ? 'Connecting...'
                : walletAddress
                  ? `${walletAddress.substring(0, 6)}...${walletAddress.substring(38)}`
                  : 'Connect Wallet'
              }
            </span>
          </button>

          {walletAddress && (
            <div className="mt-4 flex items-center justify-between text-xs text-muted px-1">
              <div className="flex flex-col">
                <span>Balance</span>
                <span className="text-white font-mono font-bold">{balance} ETH</span>
              </div>
              <div className="flex items-center space-x-1.5 bg-green-500/20 px-2 py-1 rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                <span className="text-green-500">Connected</span>
              </div>
            </div>
          )}

          {onLogout && (
            <button onClick={onLogout} className="w-full mt-2 flex items-center justify-center gap-2 py-2 text-xs text-red-400 hover:text-red-300 transition-colors">
              <LogOut size={14} /> Logout
            </button>
          )}
        </div>
      </aside>

      {/* Mobile Header */}
      <div className="md:hidden fixed top-0 w-full bg-surface/90 backdrop-blur-md z-30 border-b border-white/5 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Globe className="text-primary" size={24} />
          <span className="font-bold text-lg">HNH Compute</span>
        </div>
        <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
          {isMobileMenuOpen ? <X /> : <Menu />}
        </button>
      </div>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 bg-background/95 z-20 pt-20 px-6 space-y-4 md:hidden overflow-y-auto pb-10">
          <NavItem view="DASHBOARD" icon={LayoutDashboard} label="Overview" />
          <NavItem view="MARKETPLACE" icon={Server} label="Marketplace" />
          <NavItem view="DEPLOY" icon={Rocket} label="Deploy Job" />
          <NavItem view="FORUM" icon={MessageSquare} label="Community" />
          <NavItem view="DEX" icon={ArrowLeftRight} label="HNH Swap" />
          <NavItem view="SECURITY" icon={Shield} label="Security" />
          <NavItem view="TOKEN_CREATOR" icon={Coins} label="Token Creator" />
          <NavItem view="WHITE_LABEL" icon={Palette} label="White Label" />
          <NavItem view="PROVIDER" icon={Zap} label="Host Node" />
          <button
            onClick={connectWallet}
            className="w-full mt-4 flex items-center justify-center space-x-2 border border-white/10 bg-white/5 py-3 rounded-xl text-white font-medium"
          >
            <Wallet size={16} />
            <span>{walletAddress ? 'Connected' : 'Connect Wallet'}</span>
          </button>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 md:pl-64 pt-16 md:pt-0 min-h-screen">
        <div className="max-w-7xl mx-auto p-4 md:p-8 animate-fade-in pb-20">
          {children}
        </div>
      </main>
    </div>
  );
};
