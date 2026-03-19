import React, { useEffect, useState } from 'react';
import { View, User } from '../types';
import { 
  LayoutDashboard, Rocket, Server, Menu, X, Globe, Wallet, Zap, Shield, 
  Coins, Palette, ArrowLeftRight, LogOut, User as UserIcon, Users, 
  Crown, Activity, Layers, MessageSquare 
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getWalletState, connectPhantomWallet, disconnectWallet } from '../services/walletService';

interface LayoutProps {
  currentView: View;
  setCurrentView: (view: View) => void;
  children: React.ReactNode;
  user?: User;
  onLogout?: () => void;
}

export const Layout: React.FC<LayoutProps> = ({ 
  currentView, 
  setCurrentView, 
  children,
  user: propsUser,
  onLogout: propsLogout
}) => {
  const { user: authUser, logout: authLogout } = useAuth();
  const user = propsUser || authUser;
  const logout = propsLogout || authLogout;
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);
  
  // SOL Wallet State
  const [solWallet, setSolWallet] = useState(getWalletState());
  
  // ETH Wallet State (MetaMask)
  const [ethAddress, setEthAddress] = useState<string | null>(null);
  const [ethBalance, setEthBalance] = useState<string>('0.00');

  // Monitor SOL Wallet changes
  useEffect(() => {
    const handleWalletUpdate = () => {
      setSolWallet(getWalletState());
    };
    window.addEventListener('wallet-updated', handleWalletUpdate);
    return () => window.removeEventListener('wallet-updated', handleWalletUpdate);
  }, []);

  // Monitor ETH Wallet (MetaMask)
  useEffect(() => {
    if (window.ethereum) {
      window.ethereum.request({ method: 'eth_accounts' })
        .then((accounts: string[]) => {
          if (accounts.length > 0) {
            setEthAddress(accounts[0]);
            fetchEthBalance(accounts[0]);
          }
        });

      window.ethereum.on('accountsChanged', (accounts: any) => {
        if (accounts.length > 0) {
          setEthAddress(accounts[0]);
          fetchEthBalance(accounts[0]);
        } else {
          setEthAddress(null);
          setEthBalance('0.00');
        }
      });
    }
  }, []);

  const fetchEthBalance = async (address: string) => {
    if (!window.ethereum) return;
    try {
      const hexBalance = await window.ethereum.request({
        method: 'eth_getBalance',
        params: [address, 'latest'],
      });
      const balance = parseInt(hexBalance as string, 16) / 1e18;
      setEthBalance(balance.toFixed(4));
    } catch (e) {
      console.error(e);
    }
  };

  const handleConnectSol = async () => {
    await connectPhantomWallet();
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
      <span className="font-medium tracking-wide text-sm">{label}</span>
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
      <aside className="hidden md:flex flex-col w-64 border-r border-white/5 bg-surface/50 backdrop-blur-xl fixed h-full z-20">
        <div className="p-6 border-b border-white/5">
          <div className="flex items-center space-x-2 cursor-pointer" onClick={() => setCurrentView('DASHBOARD')}>
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-emerald-800 flex items-center justify-center shadow-lg shadow-primary/20">
              <Globe className="text-white" size={18} />
            </div>
            <div>
              <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400 leading-none">
                HNH App
              </h1>
              {user && <span className="text-[10px] text-primary font-mono block mt-1">@{user.username}</span>}
            </div>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1 overflow-y-auto custom-scrollbar">
          <div className="px-4 py-2 text-[10px] font-bold text-muted uppercase tracking-widest opacity-50">Platform</div>
          <NavItem view="DASHBOARD" icon={LayoutDashboard} label="Network Overview" />
          <NavItem view="MARKETPLACE" icon={Server} label="Compute Market" />
          <NavItem view="WALLETS" icon={Wallet} label="Wallets" />
          <NavItem view="DEPLOY" icon={Rocket} label="Deploy Job" />
          <NavItem view="DEX" icon={ArrowLeftRight} label="HNH Swap" badge="HOT" />
          <NavItem view="FORUM" icon={MessageSquare} label="Community" />

          <div className="mt-4 px-4 py-2 text-[10px] font-bold text-muted uppercase tracking-widest opacity-50">Supply Side</div>
          <NavItem view="PROVIDER" icon={Zap} label="Host Node" badge="EARN" />
          <NavItem view="WORKERS" icon={Server} label="Worker Manager" />
          <NavItem view="ANALYTICS" icon={Activity} label="Analytics" />
          <NavItem view="OVERCLOCK" icon={Layers} label="AI Tuner" />
          <NavItem view="REFERRALS" icon={Users} label="Referrals" />
          <NavItem view="UPGRADE" icon={Crown} label="Upgrade" />
        </nav>

        <div className="p-4 border-t border-white/5 space-y-3">
          {/* Solana Wallet Button */}
          <button
            onClick={handleConnectSol}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-lg transition-all text-xs font-medium border ${
              solWallet.connectedWallet 
              ? 'bg-purple-500/10 border-purple-500/30 text-purple-400' 
              : 'bg-white/5 border-white/10 text-white hover:bg-white/10'
            }`}
          >
            <div className="flex items-center gap-2">
              <Wallet size={14} />
              <span>{solWallet.connectedWallet ? `${solWallet.connectedWallet.substring(0, 4)}...${solWallet.connectedWallet.substring(40)}` : 'Connect SOL'}</span>
            </div>
            {solWallet.connectedWallet && <span className="text-[10px] font-bold opacity-80">{solWallet.solBalance.toFixed(2)}</span>}
          </button>

          {/* User Profile / Logout */}
          <div className="flex items-center justify-between px-2 pt-1 border-t border-white/5 mt-2">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center">
                <UserIcon size={12} className="text-primary" />
              </div>
              <span className="text-xs text-muted truncate max-w-[80px]">{user?.username}</span>
            </div>
            <button onClick={logout} className="text-muted hover:text-red-400 transition-colors" title="Logout">
              <LogOut size={14} />
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile Template - simplified for now */}
      <main className="flex-1 md:pl-64 min-h-screen">
        <div className="max-w-7xl mx-auto p-4 md:p-8 animate-fade-in pb-20">
          {children}
        </div>
      </main>
    </div>
  );
};
