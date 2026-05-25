import React, { lazy, Suspense } from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { Layout } from './components/Layout';
import Auth from './views/Auth';
import Landing from './views/Landing';
import WalletSetupModal from './components/WalletSetupModal';
import AgentPromptModal from './components/AgentPromptModal';
import { useNetworkStats } from './hooks/useNetworkStats';
import { useAgentStatus } from './hooks/useAgentStatus';

const Dashboard = lazy(() => import('./views/Dashboard'));
const Marketplace = lazy(() => import('./views/Portfolio'));
const DeployJob = lazy(() => import('./views/HedgeLab'));
const Farm = lazy(() => import('./views/Farm'));
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
const Payouts = lazy(() => import('./views/Payouts'));

const LoadingFallback = () => (
  <div className="flex items-center justify-center h-screen text-gray-400">Loading...</div>
);

const AppContent: React.FC = () => {
  const { user, loading, isAuthenticated, logout, loginWithSocial } = useAuth();
  const [currentView, setCurrentView] = React.useState<any>('LANDING');
  const { stats, aiAnalysis } = useNetworkStats();
  const { isAgentOffline, isWalletSetupRequired } = useAgentStatus(user);
  const [showAgentPrompt, setShowAgentPrompt] = React.useState(false);
  const [dismissWalletSetup, setDismissWalletSetup] = React.useState(false);

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

  React.useEffect(() => {
    const processSocialCallback = async () => {
      const pathname = window.location.pathname;
      const searchParams = new URLSearchParams(window.location.search);
      const hashParams = new URLSearchParams(window.location.hash.startsWith('#') ? window.location.hash.slice(1) : window.location.hash);
      const resetToRoot = () => window.history.replaceState({}, document.title, "/");

      let socialType: 'github' | 'facebook' | 'apple' | null = null;
      let authToken: string | null = null;
      let authError: string | null = null;

      if (pathname.includes('/auth/github/callback')) {
        socialType = 'github';
        authToken = searchParams.get('code');
        authError = searchParams.get('error');
      } else if (pathname.includes('/auth/facebook/callback')) {
        socialType = 'facebook';
        authToken = hashParams.get('access_token') || searchParams.get('access_token');
        authError = hashParams.get('error_description') || hashParams.get('error') || searchParams.get('error');
      } else if (pathname.includes('/auth/apple/callback')) {
        socialType = 'apple';
        authToken = hashParams.get('id_token') || searchParams.get('id_token');
        authError = hashParams.get('error') || searchParams.get('error');
      } else {
        return;
      }

      if (authError) {
        console.error(`${socialType} callback error:`, authError);
        resetToRoot();
        setCurrentView('AUTH');
        return;
      }

      if (!authToken) {
        console.error(`${socialType} callback missing token/code`);
        resetToRoot();
        setCurrentView('AUTH');
        return;
      }

      try {
        await loginWithSocial(socialType, authToken);
        resetToRoot();
        setCurrentView('DASHBOARD');
      } catch (e) {
        console.error(`${socialType} callback failed:`, e);
        resetToRoot();
        setCurrentView('AUTH');
      }
    };

    processSocialCallback();
  }, [loginWithSocial]);

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
         {currentView === 'FARM' && <Farm />}
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
         {currentView === 'FARM' && <Farm />}
         {currentView === 'PAYOUTS' && <Payouts />}
      </Suspense>

      <WalletSetupModal
        isOpen={isWalletSetupRequired && !dismissWalletSetup}
        onClose={() => setDismissWalletSetup(true)}
        onComplete={() => setDismissWalletSetup(true)}
      />
      <AgentPromptModal
        isOpen={showAgentPrompt}
        onClose={() => setShowAgentPrompt(false)}
      />
    </Layout>
  );
};

const AppProviders: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
  const isGoogleConfigured = !!googleClientId && googleClientId !== 'your_google_client_id';

  if (!isGoogleConfigured) return <>{children}</>;

  return <GoogleOAuthProvider clientId={googleClientId}>{children}</GoogleOAuthProvider>;
};

const App: React.FC = () => (
  <AppProviders>
    <AuthProvider>
      <SocketProvider>
        <AppContent />
      </SocketProvider>
      <Toaster position="bottom-right" toastOptions={{ duration: 4000, style: { background: '#333', color: '#fff' }}} />
    </AuthProvider>
  </AppProviders>
);

export default App;
