
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

  // Check Session
  useEffect(() => {
    const user = getCurrentUser();
    if (user) {
      setCurrentUser(user);
      if (currentView === 'LANDING') setCurrentView('DASHBOARD');
    }
  }, []);

  const handleLogout = () => {
    logoutUser();
    setCurrentUser(null);
    setCurrentView('LANDING');
  };

  // Initial AI Load for Network Status (Dependent on stats)
  useEffect(() => {
    const fetchInsight = async () => {
      const analysis = await getNetworkStatusAnalysis(stats);
      setAiAnalysis(analysis);
    };
    fetchInsight();
  }, [stats.activeNodes]); // Re-run when node count changes

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
    </Layout>
  );
};

export default App;
