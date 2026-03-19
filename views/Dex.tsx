import React, { useState, useEffect } from 'react';
import { 
  RefreshCw, ArrowDown, Settings, Zap, Wallet, 
  ArrowRight, History, Send, ExternalLink, AlertCircle,
  ArrowLeftRight, Activity
} from 'lucide-react';
import { getWalletState, connectPhantomWallet, withdrawSOL, getTransactionHistory, TransactionRecord } from '../services/walletService';
import { useAuth } from '../context/AuthContext';

const Dex: React.FC = () => {
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState<'swap' | 'withdraw' | 'history'>('swap');
    const [wallet, setWallet] = useState(getWalletState());
    const [history, setHistory] = useState<TransactionRecord[]>([]);
    const [isLoadingHistory, setIsLoadingHistory] = useState(false);

    // Withdraw Form State
    const [withdrawAddress, setWithdrawAddress] = useState('');
    const [withdrawAmount, setWithdrawAmount] = useState('');
    const [isWithdrawing, setIsWithdrawing] = useState(false);
    const [withdrawStatus, setWithdrawStatus] = useState<{ success?: boolean; message?: string } | null>(null);

    // Monitor wallet updates
    useEffect(() => {
        const handleUpdate = () => setWallet(getWalletState());
        window.addEventListener('wallet-updated', handleUpdate);
        return () => window.removeEventListener('wallet-updated', handleUpdate);
    }, []);

    // Load history when tab changes
    useEffect(() => {
        if (activeTab === 'history') {
            loadHistory();
        }
    }, [activeTab]);

    const loadHistory = async () => {
        setIsLoadingHistory(true);
        const data = await getTransactionHistory();
        setHistory(data);
        setIsLoadingHistory(false);
    };

    const handleWithdraw = async (e: React.FormEvent) => {
        e.preventDefault();
        setWithdrawStatus(null);
        setIsWithdrawing(true);

        const amountNum = parseFloat(withdrawAmount);
        const result = await withdrawSOL(withdrawAddress, amountNum);
        
        setWithdrawStatus(result);
        if (result.success) {
            setWithdrawAmount('');
            setWithdrawAddress('');
        }
        setIsWithdrawing(false);
    };

    return (
        <div className="max-w-7xl mx-auto space-y-6">
            {/* DEX Header / Wallet Status */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-surface/30 backdrop-blur-md border border-white/5 p-6 rounded-3xl">
                <div className="space-y-1">
                    <h2 className="text-3xl font-bold text-white tracking-tight">HNH Swap</h2>
                    <p className="text-muted text-sm">Decentralized Compute Exchange & Asset Management</p>
                </div>

                <div className="flex flex-wrap gap-3">
                    <div className="bg-black/40 border border-white/10 px-4 py-2 rounded-2xl flex flex-col min-w-[120px]">
                        <span className="text-[10px] text-muted font-bold uppercase tracking-wider">SOL Balance</span>
                        <span className="text-lg font-mono font-bold text-white">{wallet.solBalance.toFixed(4)} <span className="text-xs text-muted font-normal">SOL</span></span>
                    </div>
                    <div className="bg-black/40 border border-white/10 px-4 py-2 rounded-2xl flex flex-col min-w-[120px]">
                        <span className="text-[10px] text-accent font-bold uppercase tracking-wider">RNDR Credits</span>
                        <span className="text-lg font-mono font-bold text-accent">{wallet.rndrBalance.toFixed(2)} <span className="text-xs text-muted font-normal">RNDR</span></span>
                    </div>
                    {!wallet.connectedWallet && (
                        <button 
                            onClick={connectPhantomWallet}
                            className="bg-primary text-black font-bold px-6 py-2 rounded-2xl hover:bg-primary/90 transition-all flex items-center gap-2"
                        >
                            <Wallet size={18} /> Connect Phantom
                        </button>
                    )}
                </div>
            </div>

            {/* Main Tabs */}
            <div className="flex p-1 bg-surface/50 border border-white/5 rounded-2xl w-fit">
                <button 
                    onClick={() => setActiveTab('swap')}
                    className={`px-6 py-2 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${activeTab === 'swap' ? 'bg-white/10 text-white shadow-lg' : 'text-muted hover:text-white'}`}
                >
                    <ArrowLeftRight size={16} /> Swap
                </button>
                <button 
                    onClick={() => setActiveTab('withdraw')}
                    className={`px-6 py-2 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${activeTab === 'withdraw' ? 'bg-white/10 text-white shadow-lg' : 'text-muted hover:text-white'}`}
                >
                    <Send size={16} /> Withdraw
                </button>
                <button 
                    onClick={() => setActiveTab('history')}
                    className={`px-6 py-2 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${activeTab === 'history' ? 'bg-white/10 text-white shadow-lg' : 'text-muted hover:text-white'}`}
                >
                    <History size={16} /> History
                </button>
            </div>

            {/* Tab Content */}
            <div className="min-h-[600px]">
                {activeTab === 'swap' && (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
                        {/* Chart Area */}
                        <div className="lg:col-span-2 bg-black border border-white/5 rounded-3xl overflow-hidden min-h-[500px] flex flex-col shadow-2xl relative group">
                            <div className="absolute top-4 left-4 z-10 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10 flex items-center gap-2">
                                <Activity size={14} className="text-primary" />
                                <span className="text-xs font-bold text-white uppercase tracking-widest">Live Chart / SOL-USDT</span>
                            </div>
                            <div id="tradingview_widget" className="w-full h-full flex-1" />
                            <ScriptInjector />
                        </div>

                        {/* Jupiter Area */}
                        <div className="bg-surface/40 border border-white/10 rounded-3xl p-4 overflow-hidden shadow-2xl relative min-h-[600px]">
                            <div id="jupiter-terminal" className="w-full h-full" />
                            <JupiterScript />
                        </div>
                    </div>
                )}

                {activeTab === 'withdraw' && (
                    <div className="max-w-2xl mx-auto bg-surface/40 border border-white/10 rounded-3xl p-8 shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="mb-8">
                            <h3 className="text-2xl font-bold text-white">Withdraw Assets</h3>
                            <p className="text-muted text-sm mt-1">Send your SOL or Compute Credits to an external Solana wallet.</p>
                        </div>

                        <form onSubmit={handleWithdraw} className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-muted uppercase tracking-widest ml-1">Destination Address</label>
                                <input 
                                    type="text"
                                    value={withdrawAddress}
                                    onChange={(e) => setWithdrawAddress(e.target.value)}
                                    placeholder="Enter Solana address (Base58)"
                                    className="w-full bg-black/40 border border-white/10 rounded-2xl px-4 py-4 text-white font-mono text-sm focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all outline-none"
                                    required
                                />
                            </div>

                            <div className="space-y-2">
                                <div className="flex justify-between items-end ml-1">
                                    <label className="text-xs font-bold text-muted uppercase tracking-widest">Amount to Withdraw</label>
                                    <button 
                                        type="button"
                                        onClick={() => setWithdrawAmount(wallet.solBalance.toString())}
                                        className="text-[10px] text-primary hover:text-primary/70 font-bold uppercase"
                                    >
                                        Use Max: {wallet.solBalance.toFixed(4)} SOL
                                    </button>
                                </div>
                                <div className="relative">
                                    <input 
                                        type="number"
                                        step="0.000000001"
                                        value={withdrawAmount}
                                        onChange={(e) => setWithdrawAmount(e.target.value)}
                                        placeholder="0.00"
                                        className="w-full bg-black/40 border border-white/10 rounded-2xl px-4 py-4 text-white font-mono text-xl focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all outline-none"
                                        required
                                    />
                                    <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2 bg-white/5 px-3 py-1.5 rounded-xl border border-white/10">
                                        <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                                            <Zap size={10} className="text-black fill-black" />
                                        </div>
                                        <span className="text-sm font-bold text-white">SOL</span>
                                    </div>
                                </div>
                            </div>

                            {withdrawStatus && (
                                <div className={`p-4 rounded-2xl border flex items-start gap-3 ${withdrawStatus.success ? 'bg-primary/10 border-primary/30 text-primary' : 'bg-red-500/10 border-red-500/30 text-red-400'}`}>
                                    {withdrawStatus.success ? <Zap size={18} /> : <AlertCircle size={18} />}
                                    <p className="text-sm font-medium">{withdrawStatus.message}</p>
                                </div>
                            )}

                            <button 
                                type="submit"
                                disabled={isWithdrawing || !wallet.connectedWallet}
                                className={`w-full py-5 rounded-2xl font-bold text-lg shadow-xl shadow-primary/10 transition-all flex items-center justify-center gap-3 ${
                                    isWithdrawing || !wallet.connectedWallet ? 'bg-white/5 text-muted cursor-not-allowed' : 'bg-primary text-black hover:scale-[1.01] active:scale-[0.99]'
                                }`}
                            >
                                {isWithdrawing ? (
                                    <>
                                        <RefreshCw size={20} className="animate-spin" /> Signing Transaction...
                                    </>
                                ) : (
                                    <>
                                        <Wallet size={20} />
                                        {!wallet.connectedWallet ? 'Connect Wallet First' : 'Confirm Withdrawal'}
                                    </>
                                )}
                            </button>
                        </form>

                        <div className="mt-8 p-4 bg-white/5 border border-white/5 rounded-2xl">
                            <div className="flex items-center gap-2 mb-2">
                                <AlertCircle size={14} className="text-muted" />
                                <span className="text-xs font-bold text-muted uppercase tracking-wider">Withdrawal Info</span>
                            </div>
                            <ul className="text-[11px] text-muted space-y-1.5 list-disc ml-4">
                                <li>Minimum withdrawal: 0.01 SOL</li>
                                <li>Transaction fee (Network): ~0.000005 SOL</li>
                                <li>Withdrawals are processed instantly on the Solana blockchain.</li>
                            </ul>
                        </div>
                    </div>
                )}

                {activeTab === 'history' && (
                    <div className="bg-surface/40 border border-white/10 rounded-3xl overflow-hidden shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="p-6 border-b border-white/5 flex justify-between items-center">
                            <h3 className="text-xl font-bold text-white">Transaction Logs</h3>
                            <button onClick={loadHistory} className="text-muted hover:text-white transition-colors">
                                <RefreshCw size={16} className={isLoadingHistory ? 'animate-spin' : ''} />
                            </button>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-black/20 text-[10px] uppercase tracking-widest text-muted font-bold">
                                        <th className="px-6 py-4">Status</th>
                                        <th className="px-6 py-4">Type</th>
                                        <th className="px-6 py-4">Asset</th>
                                        <th className="px-6 py-4">Amount</th>
                                        <th className="px-6 py-4">Target / Tx</th>
                                        <th className="px-6 py-4 text-right">Date</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    {history.length === 0 ? (
                                        <tr>
                                            <td colSpan={6} className="px-6 py-20 text-center">
                                                <div className="flex flex-col items-center opacity-30">
                                                    <History size={48} className="mb-4" />
                                                    <p className="text-sm font-medium">No transactions found in this era.</p>
                                                </div>
                                            </td>
                                        </tr>
                                    ) : (
                                        history.map((tx) => (
                                            <tr key={tx.id} className="hover:bg-white/5 transition-colors group">
                                                <td className="px-6 py-4">
                                                    <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${
                                                        tx.status === 'COMPLETED' ? 'bg-primary/20 text-primary' : 
                                                        tx.status === 'PENDING' ? 'bg-yellow-500/20 text-yellow-500' : 'bg-red-500/20 text-red-500'
                                                    }`}>
                                                        {tx.status}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 font-bold text-white text-sm">{tx.type}</td>
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-2">
                                                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${tx.token === 'SOL' ? 'bg-primary text-black' : 'bg-accent text-white'}`}>
                                                            {tx.token.charAt(0)}
                                                        </div>
                                                        <span className="text-sm text-white font-medium">{tx.token}</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 font-mono font-bold text-white">{tx.amount.toFixed(4)}</td>
                                                <td className="px-6 py-4">
                                                    {tx.txHash ? (
                                                        <a 
                                                            href={`https://solscan.io/tx/${tx.txHash}`} 
                                                            target="_blank" 
                                                            rel="noopener noreferrer"
                                                            className="flex items-center gap-1.5 text-xs text-muted hover:text-primary transition-colors group-hover:underline"
                                                        >
                                                            {tx.txHash.substring(0, 8)}... <ExternalLink size={10} />
                                                        </a>
                                                    ) : (
                                                        <span className="text-xs text-muted italic">Internal</span>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4 text-right text-xs text-muted font-mono">
                                                    {new Date(tx.timestamp).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

// TradingView Widget Injection
const ScriptInjector = () => {
    useEffect(() => {
        if (document.getElementById('tv-script')) return;
        const script = document.createElement('script');
        script.id = 'tv-script';
        script.src = "https://s3.tradingview.com/tv.js";
        script.async = true;
        script.onload = () => {
            // @ts-ignore
            if (window.TradingView) {
                // @ts-ignore
                new window.TradingView.widget({
                    "width": "100%",
                    "height": "100%",
                    "symbol": "BINANCE:SOLUSDT",
                    "interval": "D",
                    "timezone": "Etc/UTC",
                    "theme": "dark",
                    "style": "1",
                    "locale": "en",
                    "toolbar_bg": "#f1f3f6",
                    "enable_publishing": false,
                    "allow_symbol_change": true,
                    "container_id": "tradingview_widget"
                });
            }
        };
        document.head.appendChild(script);
    }, []);
    return null;
};

// Jupiter Terminal Injection
const JupiterScript = () => {
    useEffect(() => {
        if (document.getElementById('jup-script')) return;
        const script = document.createElement('script');
        script.id = 'jup-script';
        script.src = "https://terminal.jup.ag/main-v2.js";
        script.async = true;
        script.onload = () => {
            // @ts-ignore
            if (window.Jupiter) {
                // @ts-ignore
                window.Jupiter.init({
                    displayMode: "integrated",
                    integratedTargetId: "jupiter-terminal",
                    endpoint: "https://api.mainnet-beta.solana.com",
                    strictTokenList: false,
                    defaultExplorer: "SolanaFM",
                    formProps: {
                        fixedOutputMint: true,
                        initialAmount: "1000000000",
                        initialInputMint: "So11111111111111111111111111111111111111112",
                        initialOutputMint: "rndrizKT3MK1iimdxRdWabcF7Zg7AR5T4nud4EkHBof",
                    },
                });
            }
        };
        document.head.appendChild(script);
    }, []);
    return null;
};

export default Dex;
