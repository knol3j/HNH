
import React, { useState } from 'react';
import { Coins, Upload, Check, Copy, ExternalLink, Loader2 } from 'lucide-react';

const TokenCreator: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'CONFIG' | 'DEPLOYING' | 'SUCCESS'>('CONFIG');
  const [tokenData, setTokenData] = useState({
    name: '',
    symbol: '',
    supply: '1000000000',
    decimals: '9',
    description: '',
    logoUrl: ''
  });

  const handleDeploy = () => {
    if (!tokenData.name || !tokenData.symbol) return;
    setLoading(true);
    setStep('DEPLOYING');
    
    // Simulate deployment
    setTimeout(() => {
      setLoading(false);
      setStep('SUCCESS');
    }, 3000);
  };

  if (step === 'SUCCESS') {
    return (
      <div className="max-w-2xl mx-auto text-center pt-12 space-y-6 animate-fade-in">
        <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto border border-green-500/50">
          <Check size={40} className="text-green-500" />
        </div>
        <h2 className="text-3xl font-bold text-white">Token Deployed Successfully!</h2>
        <p className="text-muted">Your token has been minted on the Solana mainnet.</p>
        
        <div className="bg-surface border border-white/10 rounded-xl p-6 text-left space-y-4">
          <div>
            <label className="text-xs text-muted uppercase">Contract Address</label>
            <div className="flex items-center gap-2 mt-1">
              <code className="flex-1 bg-black/40 p-3 rounded-lg font-mono text-primary border border-white/5">
                7xKw...9pL2
              </code>
              <button className="p-3 hover:bg-white/10 rounded-lg transition-colors"><Copy size={18} /></button>
            </div>
          </div>
          <div>
            <label className="text-xs text-muted uppercase">Transaction Signature</label>
            <div className="flex items-center gap-2 mt-1 text-sm text-blue-400 hover:text-blue-300 cursor-pointer">
              <ExternalLink size={14} /> View on Solscan
            </div>
          </div>
        </div>

        <button 
          onClick={() => setStep('CONFIG')}
          className="bg-white/5 hover:bg-white/10 text-white px-8 py-3 rounded-xl transition-all"
        >
          Create Another Token
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="flex items-center gap-4 mb-8">
        <div className="p-3 bg-yellow-500/10 rounded-xl border border-yellow-500/20">
          <Coins className="text-yellow-500" size={32} />
        </div>
        <div>
          <h2 className="text-3xl font-bold text-white">Token Factory</h2>
          <p className="text-muted">Deploy SPL tokens on Solana instantly. No coding required.</p>
        </div>
      </div>

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
                  onChange={e => setTokenData({...tokenData, name: e.target.value})}
                  placeholder="e.g. HashNHedge"
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-primary focus:outline-none transition-colors"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-300">Symbol</label>
                <input 
                  type="text" 
                  value={tokenData.symbol}
                  onChange={e => setTokenData({...tokenData, symbol: e.target.value})}
                  placeholder="e.g. HNH"
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
                  onChange={e => setTokenData({...tokenData, supply: e.target.value})}
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-primary focus:outline-none transition-colors"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-300">Decimals</label>
                <input 
                  type="number" 
                  value={tokenData.decimals}
                  onChange={e => setTokenData({...tokenData, decimals: e.target.value})}
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-primary focus:outline-none transition-colors"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-300">Description</label>
              <textarea 
                value={tokenData.description}
                onChange={e => setTokenData({...tokenData, description: e.target.value})}
                placeholder="Describe your project..."
                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-primary focus:outline-none transition-colors h-24 resize-none"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-300">Logo URL</label>
              <div className="flex gap-2">
                <input 
                  type="text" 
                  value={tokenData.logoUrl}
                  onChange={e => setTokenData({...tokenData, logoUrl: e.target.value})}
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
            disabled={step === 'DEPLOYING'}
            className="w-full bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-black font-bold text-lg py-4 rounded-xl shadow-lg shadow-orange-500/20 transition-all flex items-center justify-center gap-2"
          >
            {step === 'DEPLOYING' ? <Loader2 className="animate-spin" /> : <Rocket className="rotate-45" />}
            {step === 'DEPLOYING' ? 'Minting Token...' : 'Deploy on Solana'}
          </button>
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
                <span className="text-white">Solana</span>
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
                <span className="text-muted">Cost</span>
                <span className="text-green-400 font-bold">0.05 SOL</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Icon component
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
    <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"/>
    <path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"/>
    <path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0"/>
    <path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5"/>
  </svg>
);

export default TokenCreator;
