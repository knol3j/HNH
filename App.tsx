import React, { useState, useEffect, lazy, Suspense } from 'react';
import { Layout } from './components/Layout';
import { View, NetworkStats } from './types';
import { getNetworkStatusAnalysis } from './services/geminiService';
import Auth from './views/Auth';
import Landing from './views/Landing';
import WalletSetupModal from './components/WalletSetupModal';
import AgentPromptModal from './components/AgentPromptModal';
import { User } from './types';
import { getCurrentUser, logoutUser, fetchCurrentUser, setCachedUser } from './services/authService';
import { syncWithBackend as syncWallets } from './services/miningWalletService';

// Lazy-load all heavy views to reduce initial bundle size
const Dashboard    = lazy(() => import('./views/Dashboard'));
const Marketplace  = lazy(() => import('./views/Portfolio'));
const DeployJob    = lazy(() => import('./views/HedgeLab'));
const Provider     = lazy(() => import('./views/Provider'));
const Security     = lazy(() => import('./views/Security'));
const TokenCreator = lazy(() => import('./views/TokenCreator'));
const WhiteLabel   = lazy(() => import('./views/WhiteLabel'));
const Dex          = lazy(() => import('./views/Dex'));
const Referrals    = lazy(() => import('./views/Referrals'));
const Upgrade      = lazy(() => import('./views/Upgrade'));
const Analytics    = lazy(() => import('./views/Analytics'));
const Workers      = lazy(() => import('./views/Workers'));
const Overclock    = lazy(() => import('./views/Overclock'));
const Docs         = lazy(() => import('./views/Docs'));
const Forum        = lazy(() => import('./views/Forum'));
const Diagnostics  = lazy(() => import('./views/Diagnostics'));

// Use env var for API base URL — never hardcode
const API_BASE = import.meta.env.VITE_API_URL || 'https://api.hashnhedge.com';

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentView, setCurrentView] = useState<View>('LANDING');
  const [stats, setStats] = useState<NetworkStats>({
    activeNodes: 0,
    totalTflops: 0,
    jobsRunning: 0,
    networkUtilization: 0,
    avgPricePerFLOP: 0
  });
  const [aiAnalysis, setAiAnalysis] = useState<string>('');
  const [isWalletSetupOpen, setIsWalletSetupOpen] = useState(false);
  const [isAgentPromptOpen, setIsAgentPromptOpen] = useState(false);

  // Fetch Real Stats from Agent
  useEffect(() => {
    const fetchStats = async () => {
      try {
        const agentUrl = localStorage.getItem('hnh_agent_url') || import.meta.env.VITE_AGENT_URL || '';
        if (!agentUrl) return;
        const res = await fetch(`${agentUrl}/stats`);
        if (res.ok) {
          const data = await res.json();
          setStats(data);
        }
      } catch (e) {
        setStats(prev => ({ ...prev, activeNodes: 0 }));
      }
    };

    fetchStats();
    const interval = setInterval(fetchStats, 5000);
    return () => clearInterval(interval);
  }, []);

  // Check Session on mount
  useEffect(() => {
    const user = getCurrentUser();
    if (user) {
      setCurrentUser(user);
      if (currentView === 'LANDING') setCurrentView('DASHBOARD');

      fetchCurrentUser().then((freshUser) => {
        if (freshUser) {
          setCurrentUser(freshUser);
          setCachedUser(freshUser);
        }
      });

      const checkWallets = async () => {
        const token = localStorage.getItem('hnh_token');
        if (!token) return;
        await syncWallets();
        try {
          // Use API_BASE env var — no hardcoded URLs
          const res = await fetch(`${API_BASE}/user/wallets`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          if (res.ok) {
            const wallets = await res.json();
            if (wallets.length === 0) {
              setIsWalletSetupOpen(true);
            }
          }
        } catch (e) { /* wallet check failed silently */ }
      };

      // Only prompt about agent if user has previously configured one
      // Don't auto-prompt on first login (no hnh_agent_url set yet)
      const checkAgent = async () => {
        const agentUrl = localStorage.getItem('hnh_agent_url');
        if (!agentUrl) return; // Never configured — don't prompt
        try {
          const res = await fetch(`${agentUrl}/health`, { signal: AbortSignal.timeout(3000) });
          if (!res.ok) setIsAgentPromptOpen(true);
        } catch (e) {
          setIsAgentPromptOpen(true);
        }
      };

      checkWallets();
      checkAgent();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser?.id]);

  const handleLogout = () => {
    logoutUser();
    setCurrentUser(null);
    setCurrentView('LANDING');
  };

  // AI Network Status — debounced 1s
  useEffect(() => {
    const timeoutId = setTimeout(async () => {
      const analysis = await getNetworkStatusAnalysis(stats);
      setAiAnalysis(analysis);
    }, 1000);
    return () => clearTimeout(timeoutId);
  }, [stats.activeNodes, stats.jobsRunning, stats.totalTflops]);

  // Unauthenticated routes
  if (!currentUser) {
    if (currentView === 'LANDING') {
      return <Landing onEnterApp={() => setCurrentView('AUTH')} onViewDocs={() => setCurrentView('DOCS')} />;
    }
    if (currentView === 'DOCS') {
      return (
        <Suspense fallback={<div className="flex items-center justify-center h-screen">Loading...</div>}>
          <Docs onBack={() => setCurrentView('LANDING')} />
        </Suspense>
      );
    }
    return (
      <Auth onLogin={(user) => {
        setCurrentUser(user);
        setCachedUser(user);
        setCurrentView('DASHBOARD');
        syncWallets();
      }} />
    );
  }

  return (
    <Layout currentView={currentView} setCurrentView={setCurrentView} onLogout={handleLogout} user={currentUser}>
      <Suspense fallback={<div className="flex items-center justify-center h-full text-gray-400">Loading...</div>}>
        {currentView === 'DASHBOARD'     && <Dashboard stats={stats} aiAnalysis={aiAnalysis} />}
        {currentView === 'MARKETPLACE'   && <Marketplace />}
        {currentView === 'DEPLOY'        && <DeployJob />}
        {currentView === 'DEX'           && <Dex />}
        {currentView === 'PROVIDER'      && <Provider />}
        {currentView === 'SECURITY'      && <Security />}
        {currentView === 'TOKEN_CREATOR' && <TokenCreator />}
        {currentView === 'WHITE_LABEL'   && <WhiteLabel />}
        {currentView === 'REFERRALS'     && <Referrals />}
        {currentView === 'UPGRADE'       && <Upgrade />}
        {currentView === 'ANALYTICS'     && <Analytics />}
        {currentView === 'WORKERS'       && <Workers />}
        {currentView === 'OVERCLOCK'     && <Overclock />}
        {currentView === 'DOCS'          && <Docs onBack={() => setCurrentView('DASHBOARD')} />}
        {currentView === 'FORUM'         && <Forum />}
        {currentView === 'DIAGNOSTICS'   && <Diagnostics />}
      </Suspense>

      <WalletSetupModal
        isOpen={isWalletSetupOpen}
        onClose={() => setIsWalletSetupOpen(false)}
        onComplete={() => setIsWalletSetupOpen(false)}
      />
      <AgentPromptModal
        isOpen={isAgentPromptOpen}
        onClose={() => setIsAgentPromptOpen(false)}
      />
    </Layout>
  );
};

export default App;
