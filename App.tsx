
import React, { useState, useEffect } from 'react';
import { Layout } from './components/Layout';
import { View, NetworkStats } from './types';
import { MOCK_STATS } from './services/mockData';
import { getNetworkStatusAnalysis } from './services/geminiService';
import Dashboard from './views/Dashboard';
import Marketplace from './views/Portfolio';
import DeployJob from './views/HedgeLab';
import Provider from './views/Provider'; 
import Security from './views/Security';
import TokenCreator from './views/TokenCreator';
import WhiteLabel from './views/WhiteLabel';
import Dex from './views/Dex';

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<View>('DASHBOARD');
  const [stats, setStats] = useState<NetworkStats>(MOCK_STATS);
  const [aiAnalysis, setAiAnalysis] = useState<string>("");

  // Initial AI Load for Network Status
  useEffect(() => {
    const fetchInsight = async () => {
      const analysis = await getNetworkStatusAnalysis(stats);
      setAiAnalysis(analysis);
    };
    fetchInsight();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Layout currentView={currentView} setCurrentView={setCurrentView}>
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
