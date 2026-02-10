
import React, { useState, useEffect } from 'react';
import { Layout } from './components/Layout';
import { View, NetworkStats } from './types';
import { getNetworkStatusAnalysis } from './services/geminiService';
import Dashboard from './views/Dashboard';
import Marketplace from './views/Portfolio';
import DeployJob from './views/HedgeLab';
import Provider from './views/Provider';
import Security from './views/Security';
import TokenCreator from './views/TokenCreator';
import WhiteLabel from './views/WhiteLabel';
import Dex from './views/Dex';
import Auth from './views/Auth';
import Referrals from './views/Referrals';
import Upgrade from './views/Upgrade';
import Landing from './views/Landing';
import Analytics from './views/Analytics';
import Workers from './views/Workers';
import Overclock from './views/Overclock';
import Docs from './views/Docs';
import Forum from './views/Forum';
import Diagnostics from './views/Diagnostics';
import WalletSetupModal from './components/WalletSetupModal';
import AgentPromptModal from './components/AgentPromptModal';
import { User } from './types';
import { getCurrentUser, logoutUser } from './services/authService';

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentView, setCurrentView] = useState<View>('LANDING'); // Default to Landing
  const [stats, setStats] = useState<NetworkStats>({
    activeNodes: 0,
    totalTflops: 0,
    jobsRunning: 0,
    networkUtilization: 0,
    avgPricePerFLOP: 0
  });
  const [aiAnalysis, setAiAnalysis] = useState<string>("");

  // Fetch Real Stats from Agent
  useEffect(() => {
    const fetchStats = async () => {
      try {
        const agentUrl = localStorage.getItem('hnh_agent_url') || import.meta.env.VITE_AGENT_URL || '';
        const res = await fetch(`${agentUrl}/stats`);
        if (res.ok) {
          const data = await res.json();
          setStats(data);
        }
      } catch (e) {
        // Agent offline
        setStats(prev => ({ ...prev, activeNodes: 0 }));
      }
    };

    fetchStats();
    const interval = setInterval(fetchStats, 5000);
    return () => clearInterval(interval);
  }, []);

  const [isWalletSetupOpen, setIsWalletSetupOpen] = useState(false);
  const [isAgentPromptOpen, setIsAgentPromptOpen] = useState(false);

  // Check Session
  useEffect(() => {
    const user = getCurrentUser();
    if (user) {
      setCurrentUser(user);
      if (currentView === 'LANDING') setCurrentView('DASHBOARD');

      // Check if user needs wallet setup
      const checkWallets = async () => {
        const token = localStorage.getItem('hnh_token');
        if (!token) return;
        try {
          const res = await fetch('https://api.hashnhedge.com/user/wallets', {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          if (res.ok) {
            const wallets = await res.json();
            if (wallets.length === 0) {
              setIsWalletSetupOpen(true);
            }
          }
        } catch (e) { }
      };

      // Check agent health and prompt if offline
      const checkAgent = async () => {
        try {
          const agentUrl = localStorage.getItem('hnh_agent_url') || 'http://localhost:4343';
          const res = await fetch(`${agentUrl}/health`);
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

  // Initial AI Load for Network Status (Dependent on stats)
  // Debounced to prevent excessive API calls
  useEffect(() => {
    const timeoutId = setTimeout(async () => {
      const analysis = await getNetworkStatusAnalysis(stats);
      setAiAnalysis(analysis);
    }, 1000); // Wait 1 second before fetching to debounce rapid changes

    return () => clearTimeout(timeoutId);
  }, [stats.activeNodes, stats.jobsRunning, stats.totalTflops]); // Re-run when key stats change

  // Show Landing or Docs if not logged in and not explicitly in Auth view
  if (!currentUser) {
    if (currentView === 'LANDING') {
      return <Landing onEnterApp={() => setCurrentView('DASHBOARD')} onViewDocs={() => setCurrentView('DOCS')} />;
    }
    if (currentView === 'DOCS') {
      return <Docs onBack={() => setCurrentView('LANDING')} />;
    }
    return <Auth onLogin={(user) => {
      setCurrentUser(user);
      setCurrentView('DASHBOARD');
    }} />;
  }

  return (
    <Layout currentView={currentView} setCurrentView={setCurrentView} onLogout={handleLogout} user={currentUser}>
      {currentView === 'DASHBOARD' && (
        <Dashboard stats={stats} aiAnalysis={aiAnalysis} />
      )}
      {currentView === 'MARKETPLACE' && (
        <Marketplace />
      )}
      {currentView === 'DEPLOY' && (
        <DeployJob />
      )}
      {currentView === 'DEX' && (
        <Dex />
      )}
      {currentView === 'PROVIDER' && (
        <Provider />
      )}
      {currentView === 'SECURITY' && (
        <Security />
      )}
      {currentView === 'TOKEN_CREATOR' && (
        <TokenCreator />
      )}
      {currentView === 'WHITE_LABEL' && (
        <WhiteLabel />
      )}
      {currentView === 'REFERRALS' && (
        <Referrals />
      )}
      {currentView === 'UPGRADE' && (
        <Upgrade />
      )}
      {currentView === 'ANALYTICS' && (
        <Analytics />
      )}
      {currentView === 'WORKERS' && (
        <Workers />
      )}
      {currentView === 'OVERCLOCK' && (
        <Overclock />
      )}
      {currentView === 'DOCS' && (
        <Docs onBack={() => setCurrentView('DASHBOARD')} />
      )}
      {currentView === 'FORUM' && (
        <Forum />
      )}
      {currentView === 'DIAGNOSTICS' && (
        <Diagnostics />
      )}

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
