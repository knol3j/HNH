import React, { useState, useEffect, lazy, Suspense } from 'react';
import { Layout } from './components/Layout';
import { View, NetworkStats, User } from './types';
import { getNetworkStatusAnalysis } from './services/geminiService';
import Auth from './views/Auth';
import Landing from './views/Landing';
import WalletSetupModal from './components/WalletSetupModal';
import AgentPromptModal from './components/AgentPromptModal';
import { getCurrentUser, logoutUser, fetchCurrentUser, setCachedUser, hasAuthToken } from './services/authService';
import { syncWithBackend as syncWallets } from './services/miningWalletService';

const Dashboard = lazy(() => import('./views/Dashboard'));
const Marketplace = lazy(() => import('./views/Portfolio'));
const DeployJob = lazy(() => import('./views/HedgeLab'));
const Provider = lazy(() => import('./views/Provider'));
const Security = lazy(() => import('./views/Security'));
const TokenCreator = lazy(() => import('./views/TokenCreator'));
const WhiteLabel = lazy(() => import('./views/WhiteLabel'));
const Dex = lazy(() => import('./views/Dex'));
const Referrals = lazy(() => import('./views/Referrals'));
const Upgrade = lazy(() => import('./views/Upgrade'));
const Analytics = lazy(() => import('./views/Analytics'));
const Workers = lazy(() => import('./views/Workers'));
const Overclock = lazy(() => import('./views/Overclock'));
const Docs = lazy(() => import('./views/Docs'));
const Forum = lazy(() => import('./views/Forum'));
const Diagnostics = lazy(() => import('./views/Diagnostics'));

const API_BASE = import.meta.env.VITE_API_URL || 'https://api.hashnhedge.com';

const LoadingFallback = () => (
  <div className="flex items-center justify-center h-screen text-gray-400">Loading...</div>
);

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentView, setCurrentView] = useState<View>('LANDING');
  const [sessionResolved, setSessionResolved] = useState(false);
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

  useEffect(() => {
    let cancelled = false;

    const checkWallets = async () => {
      const token = localStorage.getItem('hnh_token');
      if (!token) return;
      await syncWallets();
      try {
        const res = await fetch(`${API_BASE}/user/wallets`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const wallets = await res.json();
          if (wallets.length === 0) {
            setIsWalletSetupOpen(true);
          }
        }
      } catch (e) {
        // Wallet check is non-critical during bootstrap.
      }
    };

    const checkAgent = async () => {
      const agentUrl = localStorage.getItem('hnh_agent_url');
      if (!agentUrl) return;
      try {
        const res = await fetch(`${agentUrl}/health`, { signal: AbortSignal.timeout(3000) });
        if (!res.ok) setIsAgentPromptOpen(true);
      } catch (e) {
        setIsAgentPromptOpen(true);
      }
    };

    const loadSession = async () => {
      if (!hasAuthToken()) {
        if (!cancelled) setSessionResolved(true);
        return;
      }

      const cachedUser = getCurrentUser();
      if (!cancelled && cachedUser) {
        setCurrentUser(cachedUser);
        if (currentView === 'LANDING') setCurrentView('DASHBOARD');
      }

      const user = await fetchCurrentUser();
      if (cancelled) return;

      const resolvedUser = user || cachedUser;
      setCurrentUser(resolvedUser);
      if (user) {
        setCachedUser(user);
      }
      if (resolvedUser && currentView === 'LANDING') {
        setCurrentView('DASHBOARD');
      }
      if (resolvedUser) {
        await checkWallets();
        await checkAgent();
      }
      setSessionResolved(true);
    };

    loadSession();

    return () => {
      cancelled = true;
    };
  }, []);

  const handleLogout = () => {
    logoutUser();
    setCurrentUser(null);
    setCurrentView('LANDING');
  };

  useEffect(() => {
    const timeoutId = setTimeout(async () => {
      const analysis = await getNetworkStatusAnalysis(stats);
      setAiAnalysis(analysis);
    }, 1000);
    return () => clearTimeout(timeoutId);
  }, [stats.activeNodes, stats.jobsRunning, stats.totalTflops]);

  if (!sessionResolved) {
    return <LoadingFallback />;
  }

  if (!currentUser) {
    if (currentView === 'LANDING') {
      return <Landing onEnterApp={() => setCurrentView('AUTH')} onViewDocs={() => setCurrentView('DOCS')} />;
    }
    if (currentView === 'DOCS') {
      return (
        <Suspense fallback={<LoadingFallback />}>
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
      <Suspense fallback={<LoadingFallback />}>
        {currentView === 'DASHBOARD' && <Dashboard stats={stats} aiAnalysis={aiAnalysis} />}
        {currentView === 'MARKETPLACE' && <Marketplace />}
        {currentView === 'DEPLOY' && <DeployJob />}
        {currentView === 'DEX' && <Dex />}
        {currentView === 'PROVIDER' && <Provider />}
        {currentView === 'SECURITY' && <Security />}
        {currentView === 'TOKEN_CREATOR' && <TokenCreator />}
        {currentView === 'WHITE_LABEL' && <WhiteLabel />}
        {currentView === 'REFERRALS' && <Referrals />}
        {currentView === 'UPGRADE' && <Upgrade />}
        {currentView === 'ANALYTICS' && <Analytics />}
        {currentView === 'WORKERS' && <Workers />}
        {currentView === 'OVERCLOCK' && <Overclock />}
        {currentView === 'DOCS' && <Docs onBack={() => setCurrentView('DASHBOARD')} />}
        {currentView === 'FORUM' && <Forum />}
        {currentView === 'DIAGNOSTICS' && <Diagnostics />}
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
