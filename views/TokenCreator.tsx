import React, { useState } from 'react';
import { Coins, Upload, AlertTriangle, Wallet, ExternalLink, Loader2 } from 'lucide-react';
import { connectWallet, getWalletState } from '../services/walletService';

const TokenCreator: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [walletAddress, setWalletAddress] = useState(getWalletState().connectedWallet || '');
  const [error, setError] = useState('');
  const [tokenData, setTokenData] = useState({
    name: '',
    symbol: '',
    supply: '1000000000',
    decimals: '9',
    description: '',
    logoUrl: ''
  });

  const handleConnectWallet = async () => {
    setError('');
    const address = await connectWallet();
    if (address) {
      setWalletAddress(address);
    } else {
      setError('Failed to connect wallet. Please install Phantom.');
    }
  };

  const handleDeploy = async () => {
    if (!tokenData.name || !tokenData.symbol) {
      setError('Please fill in token name and symbol');
      return;
    }

    if (!walletAddress) {
      setError('Please connect your wallet first');
      return;
    }

    setLoading(true);
    setError('');

    // Note: Full SPL Token deployment requires @solana/spl-token library
    // This is a placeholder for the actual implementation
    try {
      setError('Token deployment requires SPL Token library integration. Coming soon!');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="flex items-center gap-4 mb-8">
        <div className="p-3 bg-yellow-500/10 rounded-xl border border-yellow-500/20">
          <Coins className="text-yellow-500" size={32} />
        </div>
        <div>
          <h2 className="text-3xl font-bold text-white">Token Factory</h2>
          <p className="text-muted">Deploy SPL tokens on Solana. Requires Phantom wallet.</p>
        </div>
      </div>

      {/* Wallet Connection Banner */}
      {!walletAddress && (
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AlertTriangle className="text-yellow-500" size={20} />
            <span className="text-yellow-200">Connect your Solana wallet to deploy tokens</span>
          </div>
          <button
            onClick={handleConnectWallet}
            className="bg-yellow-500 hover:bg-yellow-600 text-black font-bold px-4 py-2 rounded-lg flex items-center gap-2"
          >
            <Wallet size={16} /> Connect Phantom
          </button>
        </div>
      )}

      {walletAddress && (
        <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4 flex items-center gap-3">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
          <span className="text-green-200">Connected: {walletAddress.slice(0, 4)}...{walletAddress.slice(-4)}</span>
        </div>
      )}

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-red-300">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Form */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-surface border border-white/10 rounded-2xl p-6 space-y-6">
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-300">Token Name</label>
                <input
                  type="text"
                  value={tokenData.name}
                  onChange={e => setTokenData({ ...tokenData, name: e.target.value })}
                  placeholder="e.g. HashNHedge"
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-primary focus:outline-none transition-colors"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-300">Symbol</label>
                <input
                  type="text"
                  value={tokenData.symbol}
                  onChange={e => setTokenData({ ...tokenData, symbol: e.target.value.toUpperCase() })}
                  placeholder="e.g. HNH"
                  maxLength={10}
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-primary focus:outline-none transition-colors"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-300">Total Supply</label>
                <input
                  type="number"
                  value={tokenData.supply}
                  onChange={e => setTokenData({ ...tokenData, supply: e.target.value })}
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-primary focus:outline-none transition-colors"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-300">Decimals</label>
                <input
                  type="number"
                  value={tokenData.decimals}
                  onChange={e => setTokenData({ ...tokenData, decimals: e.target.value })}
                  min="0"
                  max="9"
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-primary focus:outline-none transition-colors"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-300">Description</label>
              <textarea
                value={tokenData.description}
                onChange={e => setTokenData({ ...tokenData, description: e.target.value })}
                placeholder="Describe your project..."
                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-primary focus:outline-none transition-colors h-24 resize-none"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-300">Logo URL (optional)</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={tokenData.logoUrl}
                  onChange={e => setTokenData({ ...tokenData, logoUrl: e.target.value })}
                  placeholder="https://..."
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-primary focus:outline-none transition-colors"
                />
                <button className="bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl px-4 transition-colors">
                  <Upload size={20} />
                </button>
              </div>
            </div>
          </div>

          <button
            onClick={handleDeploy}
            disabled={loading || !walletAddress}
            className="w-full bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-black font-bold text-lg py-4 rounded-xl shadow-lg shadow-orange-500/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? <Loader2 className="animate-spin" /> : <Rocket className="rotate-45" />}
            {loading ? 'Processing...' : 'Deploy on Solana'}
          </button>

          <p className="text-xs text-center text-muted">
            Deployment cost: ~0.05 SOL for rent-exempt account creation
          </p>
        </div>

        {/* Preview */}
        <div className="space-y-6">
          <div className="bg-gradient-to-br from-purple-900/50 to-surface border border-purple-500/20 rounded-2xl p-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/20 rounded-full blur-3xl -mr-16 -mt-16"></div>
            <h3 className="font-bold text-white mb-4">Token Preview</h3>

            <div className="flex items-center gap-4 mb-6">
              <div className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center overflow-hidden border border-white/20">
                {tokenData.logoUrl ? (
                  <img src={tokenData.logoUrl} alt="Logo" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-2xl font-bold text-muted">{tokenData.symbol?.[0] || '?'}</span>
                )}
              </div>
              <div>
                <h4 className="text-xl font-bold text-white">{tokenData.name || 'Token Name'}</h4>
                <p className="text-purple-400 font-mono">{tokenData.symbol || 'SYMBOL'}</p>
              </div>
            </div>

            <div className="space-y-3 text-sm">
              <div className="flex justify-between border-b border-white/5 pb-2">
                <span className="text-muted">Network</span>
                <span className="text-white">Solana Mainnet</span>
              </div>
              <div className="flex justify-between border-b border-white/5 pb-2">
                <span className="text-muted">Supply</span>
                <span className="text-white font-mono">{Number(tokenData.supply).toLocaleString()}</span>
              </div>
              <div className="flex justify-between border-b border-white/5 pb-2">
                <span className="text-muted">Decimals</span>
                <span className="text-white">{tokenData.decimals}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">Standard</span>
                <span className="text-white">SPL Token</span>
              </div>
            </div>
          </div>

          <div className="bg-surface border border-white/10 rounded-xl p-4">
            <h4 className="text-sm font-bold text-white mb-2">After Deployment</h4>
            <ul className="text-xs text-muted space-y-1">
              <li>- Token will appear in your Phantom wallet</li>
              <li>- Add to DEX liquidity pools</li>
              <li>- List on Raydium or Jupiter</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

const Rocket = ({ className }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24" height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z" />
    <path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z" />
    <path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0" />
    <path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5" />
  </svg>
);

export default TokenCreator;
