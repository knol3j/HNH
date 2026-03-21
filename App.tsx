import React, { lazy, Suspense } from 'react';
import { Layout } from './components/Layout';
import { AuthProvider, useAuth } from './context/AuthContext';
import Auth from './views/Auth';
import Landing from './views/Landing';
import WalletSetupModal from './components/WalletSetupModal';
import AgentPromptModal from './components/AgentPromptModal';
import { useNetworkStats } from './hooks/useNetworkStats';
import { useAgentStatus } from './hooks/useAgentStatus';

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
const Wallets = lazy(() => import('./views/Wallets'));

const LoadingFallback = () => (
  <div className="flex items-center justify-center h-screen text-gray-400">Loading...</div>
);

const AppContent: React.FC = () => {
  const { user, loading, isAuthenticated, logout } = useAuth();
  const [currentView, setCurrentView] = React.useState<any>('LANDING');
  const { stats, aiAnalysis } = useNetworkStats();
  const { isAgentOffline, isWalletSetupRequired } = useAgentStatus(user);
  const [showAgentPrompt, setShowAgentPrompt] = React.useState(false);

  React.useEffect(() => {
    if (isAgentOffline) {
      setShowAgentPrompt(true);
    }
  }, [isAgentOffline]);

  React.useEffect(() => {
    if (isAuthenticated && currentView === 'LANDING') {
      setCurrentView('DASHBOARD');
    }
  }, [isAuthenticated, currentView]);

  if (loading) return <LoadingFallback />;

  if (!user) {
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
    return <Auth onLogin={() => setCurrentView('DASHBOARD')} />;
  }

  return (
    <Layout currentView={currentView} setCurrentView={setCurrentView}>
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
        {currentView === 'WALLETS' && <Wallets setCurrentView={setCurrentView} />}
      </Suspense>

      <WalletSetupModal
        isOpen={isWalletSetupRequired}
        onClose={() => {}} // Mandatory setup if missing? 
        onComplete={() => {}}
      />
      <AgentPromptModal
        isOpen={showAgentPrompt}
        onClose={() => setShowAgentPrompt(false)}
      />
    </Layout>
  );
};

const App: React.FC = () => (
  <AuthProvider>
    <AppContent />
  </AuthProvider>
);

export default App;
