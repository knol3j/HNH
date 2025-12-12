
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
import { User } from './types';
import { getCurrentUser, logoutUser } from './services/authService';

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentView, setCurrentView] = useState<View>('DASHBOARD');
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
        const agentUrl = localStorage.getItem('hnh_agent_url') || 'http://localhost:4343';
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
    if (user) setCurrentUser(user);
  }, []);

  const handleLogout = () => {
    logoutUser();
    setCurrentUser(null);
  };

  // Initial AI Load for Network Status (Dependent on stats)
  useEffect(() => {
    const fetchInsight = async () => {
      const analysis = await getNetworkStatusAnalysis(stats);
      setAiAnalysis(analysis);
    };
    fetchInsight();
  }, [stats.activeNodes]); // Re-run when node count changes


  if (!currentUser) {
    return <Auth onLogin={setCurrentUser} />;
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
    </Layout>
  );
};

export default App;
