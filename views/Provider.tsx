import React, { useState, useEffect } from 'react';
import { Activity, Cpu, Zap, Server, Coins, Terminal, Play, Square, Settings } from 'lucide-react';
import { io } from 'socket.io-client';
import { DynamicDiv } from '../components/DynamicDiv';
import './Provider.css';
import { explainFetchError, isMixedContentError } from '../services/networkStatusHelper';
import { getMiningWallets } from '../services/miningWalletService';

interface MinerConfig {
    coin: string;
    wallet: string;
    mode: 'cpu' | 'gpu';
    poolUrl: string;
    algorithm: string;
}

const Provider: React.FC = () => {
    // State
    const [minerStatus, setMinerStatus] = useState<'ONLINE' | 'OFFLINE' | 'STARTING'>('OFFLINE');
    const [telemetry, setTelemetry] = useState<any>(null);
    const [logs, setLogs] = useState<string[]>([]);
    const savedWallets = getMiningWallets();
    const defaultWallet = savedWallets.find(w => w.coin === 'XMR')?.address || '';

    const [config, setConfig] = useState<MinerConfig>({
        coin: 'XMR',
        wallet: defaultWallet,
        mode: 'cpu',
        poolUrl: '',
        algorithm: 'rx/0'
    });

    // Default Metadata (Fallback if Agent is offline)
    const DEFAULT_META = {
        coins: ['XMR', 'ZEPH', 'RVN', 'ETC', 'KAS'],
        pools: {
            'XMR': 'stratum+tcp://pool.supportxmr.com:5555',
            'ZEPH': 'stratum+tcp://de.zephyr.herominers.com:1123',
            'RVN': 'stratum+tcp://rvn.2miners.com:6060',
            'ETC': 'stratum+tcp://etc.herominers.com:10161',
            'KAS': 'stratum+tcp://pool.woolypooly.com:3112'
        },
        walletHistory: {}
    };

    const [meta, setMeta] = useState<any>(DEFAULT_META); // Available coins, pools, history
    const [isConfigOpen, setIsConfigOpen] = useState(false);
    const [customAgentUrl, setCustomAgentUrl] = useState(localStorage.getItem('hnh_agent_url') || 'http://localhost:4343');
    const [isConnected, setIsConnected] = useState(false);

    // Fetch Meta for Config
    useEffect(() => {
        const fetchMeta = async () => {
            try {
                const res = await fetch(`${customAgentUrl}/meta`);
                if (res.ok) {
                    const data = await res.json();
                    setMeta(data);
                    // Sync config with current agent state if not already modified? 
                    // Actually better to let user see current state
                    setConfig(prev => ({
                        ...prev,
                        ...data.config,
                        mode: data.config.mode || 'cpu',
                        wallet: data.config.wallet || prev.wallet
                    }));
                }
            } catch (e) {
                console.error("Failed to fetch meta, using default", e);
                // Keep default meta
            }
        };

        if (isConfigOpen) {
            fetchMeta();
        }
    }, [isConfigOpen, customAgentUrl]);

    // Earnings State
    const [balance, setBalance] = useState({ unpaid: 0, usd: 0, currency: 'XMR' });

    // Socket Telemetry
    useEffect(() => {
        const socket = io(customAgentUrl, {
            transports: ['websocket', 'polling'],
            reconnectionAttempts: 5,
        });

        socket.on('connect', () => {
            console.log('Socket connected');
            setIsConnected(true);
        });

        socket.on('disconnect', () => {
            console.log('Socket disconnected');
            setIsConnected(false);
            setMinerStatus('OFFLINE');
        });

        socket.on('telemetry', (data: any) => {
            setTelemetry(data);
            setMinerStatus(data.status === 'MINING' || data.status === 'ONLINE' ? 'ONLINE' : (data.status === 'STARTING' ? 'STARTING' : 'OFFLINE'));

            if (data.logs) {
                // Ensure unique keys or just pass string array
                setLogs(data.logs.slice(0, 50));
            }

            if (data.config) {
                // Optional: Update local config ref if server side changes logic
                // But avoid jitter while user editing. 
                // Only if NOT parsing editing mode? 
                // For now, let's trust status updates.
            }
        });

        return () => {
            socket.disconnect();
        };
    }, [customAgentUrl]);

    // Fetch Mining Balance (Reuse logic from Dashboard)
    useEffect(() => {
        const fetchBalance = async () => {
            if (!telemetry || !telemetry.wallet || !telemetry.coin) return;

            try {
                const coin = telemetry.coin.toLowerCase();
                // 2miners API support
                if (['xmr', 'rvn', 'eth', 'etc'].includes(coin)) {
                    const poolRes = await fetch(`https://${coin}.2miners.com/api/accounts/${telemetry.wallet}`);
                    const poolData = await poolRes.json();

                    let divisor = 1e9;
                    if (coin === 'xmr') divisor = 1e12;
                    if (coin === 'rvn') divisor = 1e8;
                    if (coin === 'eth' || coin === 'etc') divisor = 1e18;

                    const unpaid = (poolData.stats?.balance || 0) / divisor;

                    // Get Price
                    const priceRes = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${coin === 'rvn' ? 'ravencoin' : coin === 'xmr' ? 'monero' : coin}&vs_currencies=usd`);
                    const priceData = await priceRes.json();
                    const priceId = coin === 'rvn' ? 'ravencoin' : coin === 'xmr' ? 'monero' : coin;
                    const price = priceData[priceId]?.usd || 0;

                    setBalance({
                        unpaid,
                        usd: unpaid * price,
                        currency: coin.toUpperCase()
                    });
                }
            } catch (e) {
                // Ignore pool errors
            }
        };

        const interval = setInterval(fetchBalance, 60000); // Poll balance every minute (no socket for this external API yet)
        if (telemetry) fetchBalance();
        return () => clearInterval(interval);
    }, [telemetry?.wallet, telemetry?.coin]);

    // Actions
    const AGENT_SECRET = 'HNH_LOCAL_AGENT_SECRET';

    const handleStartStop = async () => {
        const endpoint = minerStatus === 'ONLINE' ? '/stop-miner' : '/start-miner';

        try {
            setMinerStatus('STARTING');
            await fetch(`${customAgentUrl}${endpoint}`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${AGENT_SECRET}`
                }
            });
        } catch (e: any) {
            console.error("Failed to toggle miner", e);
            const explanation = explainFetchError(e, customAgentUrl);
            alert("Failed to toggle miner: " + explanation);
            setMinerStatus('OFFLINE');
        }
    };

    const handleQuickSwitch = async (coin: string) => {
        try {
            setMinerStatus('STARTING'); // Visual feedback
            const walletForCoin = getMiningWallets().find(w => w.coin === coin)?.address || '';
            const res = await fetch(`${customAgentUrl}/switch-coin`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${AGENT_SECRET}`
                },
                body: JSON.stringify({ coin })
            });
            if (res.ok) {
                setConfig(prev => ({ ...prev, coin, wallet: walletForCoin || prev.wallet })); // Optimistic update
            }
        } catch (e) {
            console.error("Failed to switch coin", e);
        }
    };

    return (
        <div className="provider-container space-y-6">
            <header className="flex justify-between items-end">
                <div>
                    <h1 className="text-3xl font-bold text-white mb-2">Host Node</h1>
                    <p className="text-muted">Manage your local compute resources and earnings.</p>
                </div>
                <div className="flex gap-4">
                    <button
                        onClick={() => setIsConfigOpen(true)}
                        className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-muted hover:text-white transition-colors border border-white/5"
                        title="Miner Settings"
                    >
                        <Settings size={20} />
                    </button>
                    <div className={`px-4 py-2 rounded-lg border ${minerStatus === 'ONLINE' ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-red-500/10 border-red-500/30'} flex items-center gap-2`}>
                        <div className={`w-2 h-2 rounded-full ${minerStatus === 'ONLINE' ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`}></div>
                        <span className={`font-mono font-bold ${minerStatus === 'ONLINE' ? 'text-emerald-500' : 'text-red-500'}`}>
                            {minerStatus}
                        </span>
                    </div>
                </div>
            </header>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Hashrate */}
                <div className="bg-surface border border-white/10 rounded-2xl p-6 relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-10">
                        <Activity size={48} />
                    </div>
                    <p className="text-muted text-sm uppercase font-bold">Current Hashrate</p>
                    <h3 className="text-2xl font-bold text-white mt-1">
                        {telemetry?.hashrate ? `${telemetry.hashrate} H/s` : '0 H/s'}
                    </h3>
                    <p className="text-xs text-primary mt-2 flex items-center gap-1">
                        <Cpu size={12} /> {telemetry?.coin || 'XMR'} Algorithm
                    </p>
                </div>

                {/* Earnings */}
                <div className="bg-surface border border-white/10 rounded-2xl p-6 relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-10">
                        <Coins size={48} className="text-yellow-500" />
                    </div>
                    <p className="text-muted text-sm uppercase font-bold">Unpaid Earnings</p>
                    <h3 className="text-2xl font-bold text-white mt-1">
                        ${balance.usd.toFixed(2)}
                    </h3>
                    <div className="flex items-center gap-2 mt-2">
                        <p className="text-xs text-yellow-500 font-mono">
                            {balance.unpaid.toFixed(6)} {balance.currency}
                        </p>
                    </div>
                    <div className="mt-3 pt-3 border-t border-white/10">
                        {config.wallet ? (
                            <div className="flex flex-col gap-1 text-xs">
                                <span className="text-muted">Payout Address:</span>
                                <div className="flex items-center gap-1">
                                    <span className="text-white font-mono truncate" title={config.wallet}>
                                        {config.wallet.length > 16 ? `${config.wallet.substring(0, 8)}...${config.wallet.substring(config.wallet.length - 8)}` : config.wallet}
                                    </span>
                                    {getMiningWallets().some(w => w.address === config.wallet) && (
                                        <span className="flex items-center gap-1 bg-emerald-500/20 text-emerald-400 text-[10px] font-bold px-1.5 py-0.5 rounded-sm" title="Linked to your HNH Wallets">
                                            ✓ LINKED
                                        </span>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <div className="flex items-center gap-2 text-xs text-red-400">
                                <span>⚠️ No wallet linked</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Hardware */}
                <div className="bg-surface border border-white/10 rounded-2xl p-6 relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-10">
                        <Server size={48} />
                    </div>
                    <p className="text-muted text-sm uppercase font-bold">Hardware</p>
                    <h3 className="text-xl font-bold text-white mt-1 truncate">
                        {telemetry?.cpu || 'Unknown CPU'}
                    </h3>
                    <p className="text-xs text-muted mt-2">
                        System Online
                    </p>
                </div>

                {/* Controls */}
                <div className="bg-surface border border-white/10 rounded-2xl p-4 flex flex-col gap-3">
                    <button
                        onClick={handleStartStop}
                        className={`w-full flex-1 py-4 rounded-xl flex items-center justify-center gap-2 transition-all ${minerStatus === 'ONLINE'
                            ? 'bg-red-500/20 hover:bg-red-500/30 text-red-500 border border-red-500/50'
                            : 'bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-500 border border-emerald-500/50'
                            }`}
                    >
                        {minerStatus === 'ONLINE' ? <Square size={24} /> : <Play size={24} />}
                        <span className="font-bold uppercase tracking-wider">
                            {minerStatus === 'ONLINE' ? 'Stop' : 'Start'}
                        </span>
                    </button>

                    <div className="flex items-center gap-2 bg-black/40 rounded-lg p-1 border border-white/5">
                        <span className="text-xs text-muted px-2 font-bold uppercase">Quick Switch:</span>
                        <select
                            aria-label="Quick Switch Coin"
                            value={config.coin}
                            onChange={(e) => handleQuickSwitch(e.target.value)}
                            className="flex-1 bg-transparent text-white text-sm font-mono focus:outline-none cursor-pointer"
                        >
                            {meta?.coins?.map((c: string) => (
                                <option key={c} value={c} className="bg-black text-white">{c}</option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            {/* Agent Setup Downloads */}
            <div className="bg-surface border border-white/10 rounded-2xl p-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h3 className="text-lg font-bold text-white flex items-center gap-2">
                            <Server size={20} className="text-primary" />
                            Setup Local Mining Agent
                        </h3>
                        <p className="text-muted text-sm mt-1">
                            Download and run the setup script to install the local mining agent on your computer.
                        </p>
                    </div>
                    <div className="flex gap-3 flex-wrap">
                        <a
                            href="/scripts/setup_miner_windows.ps1"
                            download="setup_miner_windows.ps1"
                            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold transition-colors"
                        >
                            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M0 3.449L9.75 2.1v9.45H0m10.949-9.6L24 0v11.4H10.949M0 12.6h9.75v9.45L0 20.699M10.949 12.6H24V24l-13.051-1.949" />
                            </svg>
                            Windows (PowerShell)
                        </a>
                        <a
                            href="/scripts/setup_miner.sh"
                            download="setup_miner.sh"
                            className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-bold transition-colors"
                        >
                            <Terminal size={20} />
                            Linux / Mac (Bash)
                        </a>
                    </div>
                </div>
                <div className="mt-4 p-3 bg-black/40 rounded-lg border border-white/5 text-sm text-muted space-y-2">
                    <p className="font-mono">
                        <strong className="text-white">Windows:</strong> Open PowerShell as Administrator and run:
                    </p>
                    <code className="block bg-white/10 px-3 py-2 rounded font-mono text-xs text-gray-300 select-all">
                        powershell -ExecutionPolicy Bypass -File .\setup_miner_windows.ps1
                    </code>
                    <p className="text-xs text-yellow-500/80 mt-1">
                        ⚠️ If you get an "UnauthorizedAccess" error, this command bypasses the script execution policy for this run only.
                    </p>
                    <p className="font-mono mt-2">
                        <strong className="text-white">Linux/Mac:</strong> <code className="bg-white/10 px-1 rounded">chmod +x setup_miner.sh && ./setup_miner.sh</code>
                    </p>
                </div>
            </div>

            {/* Console / Logs */}
            <div className="bg-black/80 border border-white/10 rounded-2xl p-6 font-mono text-sm relative overflow-hidden">
                <div className="flex items-center gap-2 text-muted mb-4 border-b border-white/10 pb-2">
                    <Terminal size={16} />
                    <span>Agent Logs</span>
                </div>

                <div className="h-[300px] overflow-y-auto space-y-1 scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-transparent pr-2">
                    {logs.length === 0 ? (
                        <p className="text-muted/50 italic">Waiting for logs...</p>
                    ) : (
                        logs.map((log, i) => (
                            <div key={i} className="break-words">
                                <span className="text-blue-500 mr-2">[{new Date().toLocaleTimeString()}]</span>
                                <span className="text-gray-300">{log}</span>
                            </div>
                        ))
                    )}
                </div>
            </div>
            {/* Complex Config Modal */}
            {isConfigOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                    <div className="bg-surface border border-white/10 rounded-2xl w-full max-w-lg p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-bold text-white flex items-center gap-2">
                                <Settings size={20} className="text-primary" /> Miner Configuration
                            </h2>
                            <button onClick={() => setIsConfigOpen(false)} className="text-muted hover:text-white">✕</button>
                        </div>

                        <div className="space-y-6">
                            {/* Mode Selection */}
                            <div className="p-1 bg-black/40 rounded-lg flex border border-white/5">
                                <button
                                    onClick={() => setConfig(prev => ({ ...prev, mode: 'cpu' }))}
                                    className={`flex-1 py-2 rounded-md text-sm font-bold transition-all flex items-center justify-center gap-2 ${config.mode === 'cpu' ? 'bg-white/10 text-white shadow-sm' : 'text-muted hover:text-white'}`}
                                >
                                    <Cpu size={16} /> CPU (RandomX)
                                </button>
                                <button
                                    onClick={() => setConfig(prev => ({ ...prev, mode: 'gpu' }))}
                                    className={`flex-1 py-2 rounded-md text-sm font-bold transition-all flex items-center justify-center gap-2 ${config.mode === 'gpu' ? 'bg-white/10 text-white shadow-sm' : 'text-muted hover:text-white'}`}
                                >
                                    <Zap size={16} /> GPU (KawPow/Etch)
                                </button>
                            </div>

                            {/* Coin Selection */}
                            <div>
                                <label className="text-xs text-muted uppercase font-bold block mb-2">Target Coin</label>
                                <div className="flex gap-2">
                                    <select
                                        aria-label="Target Coin"
                                        title="Target Coin"
                                        value={meta?.coins?.includes(config.coin) ? config.coin : 'CUSTOM'}
                                        onChange={(e) => {
                                            const val = e.target.value;
                                            if (val === 'CUSTOM') {
                                                setConfig(prev => ({ ...prev, coin: 'CUSTOM' }));
                                            } else {
                                                setConfig(prev => ({
                                                    ...prev,
                                                    coin: val,
                                                    poolUrl: meta.pools[val] || '',
                                                    algorithm: val === 'XMR' || val === 'ZEPH' ? 'rx/0' :
                                                        val === 'RVN' ? 'kawpow' :
                                                            val === 'ETC' ? 'etchash' :
                                                                val === 'KAS' ? 'heavyhash' : '',
                                                    // Auto-fill wallet if saved
                                                    wallet: (meta?.config?.wallets && meta.config.wallets[val])
                                                        ? meta.config.wallets[val]
                                                        : (getMiningWallets().find(w => w.coin === val)?.address || prev.wallet)
                                                }));
                                            }
                                        }}
                                        className="flex-1 bg-black/40 border border-white/10 rounded-lg px-4 py-3 text-white text-sm focus:border-primary/50 outline-none"
                                    >
                                        {meta?.coins?.map((coin: string) => (
                                            <option key={coin} value={coin}>{coin}</option>
                                        ))}
                                        <option value="CUSTOM">+ Custom Coin</option>
                                    </select>
                                    {config.coin === 'CUSTOM' && (
                                        <input
                                            type="text"
                                            placeholder="SYMBOL"
                                            className="w-24 bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-white text-sm"
                                            onChange={(e) => setConfig(prev => ({ ...prev, coin: e.target.value.toUpperCase() }))}
                                        />
                                    )}
                                </div>
                            </div>

                            {/* Pool Selection */}
                            <div>
                                <label className="text-xs text-muted uppercase font-bold block mb-2">Mining Pool</label>
                                <div className="space-y-2">
                                    <select
                                        aria-label="Mining Pool"
                                        title="Mining Pool"
                                        value={Object.values(meta?.pools || {}).includes(config.poolUrl) ? config.poolUrl : 'CUSTOM'}
                                        onChange={(e) => {
                                            const val = e.target.value;
                                            if (val !== 'CUSTOM') {
                                                setConfig(prev => ({ ...prev, poolUrl: val }));
                                            } else {
                                                // Keep existing custom URL or clear if switching to custom
                                                if (Object.values(meta?.pools || {}).includes(config.poolUrl)) {
                                                    setConfig(prev => ({ ...prev, poolUrl: '' }));
                                                }
                                            }
                                        }}
                                        className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-3 text-white text-sm focus:border-primary/50 outline-none"
                                    >
                                        {meta?.pools && config.coin && meta.pools[config.coin] && (
                                            <option value={meta.pools[config.coin]}>Default {config.coin} Pool</option>
                                        )}
                                        {Object.entries(meta?.pools || {}).map(([key, url]) => (
                                            <option key={key} value={url as string}>{key} Official Pool</option>
                                        ))}
                                        <option value="CUSTOM">Custom Pool URL...</option>
                                    </select>

                                    {(!Object.values(meta?.pools || {}).includes(config.poolUrl)) && (
                                        <input
                                            type="text"
                                            value={config.poolUrl}
                                            onChange={(e) => setConfig(prev => ({ ...prev, poolUrl: e.target.value }))}
                                            placeholder="stratum+tcp://pool.example.com:3333"
                                            className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-2 text-white text-sm font-mono"
                                        />
                                    )}
                                </div>
                            </div>

                            {/* Wallet Selection */}
                            <div>
                                <label className="text-xs text-muted uppercase font-bold block mb-2">Wallet Address</label>
                                <div className="space-y-2">
                                    <input
                                        type="text"
                                        value={config.wallet}
                                        onChange={(e) => setConfig(prev => ({ ...prev, wallet: e.target.value }))}
                                        className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-3 text-white text-sm font-mono focus:border-primary/50 outline-none"
                                        placeholder="Enter wallet address..."
                                    />
                                    {/* Wallet History Chips */}
                                    {meta?.walletHistory && meta.walletHistory[config.coin]?.length > 0 && (
                                        <div className="flex flex-wrap gap-2">
                                            {meta.walletHistory[config.coin].slice(0, 3).map((w: string) => (
                                                <button
                                                    key={w}
                                                    onClick={() => setConfig(prev => ({ ...prev, wallet: w }))}
                                                    className="text-[10px] bg-white/5 hover:bg-white/10 px-2 py-1 rounded-md text-muted hover:text-white transition-colors truncate max-w-[150px]"
                                                    title={w}
                                                >
                                                    {w.substring(0, 6)}...{w.substring(w.length - 4)}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Advanced Toggle */}
                            <details className="text-xs text-muted">
                                <summary className="cursor-pointer hover:text-white transition-colors list-none flex items-center gap-1">
                                    <span>Advanced Settings</span>
                                </summary>
                                <div className="mt-4 space-y-4 pl-2 border-l border-white/10">
                                    <div>
                                        <label className="text-xs text-muted uppercase font-bold block mb-2">Algorithm</label>
                                        <input
                                            type="text"
                                            value={config.algorithm || 'rx/0'}
                                            onChange={(e) => setConfig(prev => ({ ...prev, algorithm: e.target.value }))}
                                            className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-2 text-white text-sm font-mono"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs text-muted uppercase font-bold block mb-2">Agent API URL</label>
                                        <input
                                            type="text"
                                            value={customAgentUrl}
                                            onChange={(e) => setCustomAgentUrl(e.target.value)}
                                            className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-2 text-white text-sm"
                                        />
                                    </div>
                                </div>
                            </details>

                        </div>

                        <div className="flex gap-3 mt-8">
                            <button
                                onClick={async () => {
                                    // Always save locally first
                                    localStorage.setItem('hnh_miner_config', JSON.stringify(config));
                                    if (customAgentUrl !== localStorage.getItem('hnh_agent_url')) {
                                        localStorage.setItem('hnh_agent_url', customAgentUrl);
                                    }

                                    // Also save to backend for cloud persistence
                                    const token = localStorage.getItem('hnh_token');
                                    if (token) {
                                        try {
                                            await fetch('https://api.hashnhedge.com/user/miner-config', {
                                                method: 'POST',
                                                headers: {
                                                    'Content-Type': 'application/json',
                                                    'Authorization': `Bearer ${token}`
                                                },
                                                body: JSON.stringify(config)
                                            });
                                        } catch (backendErr) {
                                            console.warn('Could not sync to backend', backendErr);
                                        }
                                    }

                                    // Now try to send to local agent (may fail due to Mixed Content)
                                    try {
                                        const res = await fetch(`${customAgentUrl}/config`, {
                                            method: 'POST',
                                            headers: {
                                                'Content-Type': 'application/json',
                                                'Authorization': `Bearer ${AGENT_SECRET}`
                                            },
                                            body: JSON.stringify(config)
                                        });

                                        if (!res.ok) {
                                            throw new Error(`Agent responded with ${res.status}`);
                                        }

                                        setIsConfigOpen(false);
                                    } catch (e: any) {
                                        // Config is saved locally, but agent sync failed
                                        const isHttps = window.location.protocol === 'https:';
                                        const isLocalAgent = customAgentUrl.includes('localhost') || customAgentUrl.includes('127.0.0.1');

                                        if (isHttps && isLocalAgent && !customAgentUrl.startsWith('https://')) {
                                            alert(
                                                "Your configuration has been saved to your account!\n\n" +
                                                "However, connecting to your local mining agent failed because your browser blocks HTTP requests from HTTPS pages (Mixed Content).\n\n" +
                                                "To fix this:\n" +
                                                "1. Open your local HNH Agent app\n" +
                                                "2. Or run the frontend locally (npm run dev)\n" +
                                                "3. Or enable 'Insecure Content' for this site in your browser settings"
                                            );
                                        } else {
                                            alert(
                                                "Your configuration has been saved, but the agent could not be reached.\n\n" +
                                                "Make sure your mining agent is running at: " + customAgentUrl
                                            );
                                        }
                                        setIsConfigOpen(false);
                                    }
                                }}
                                className="flex-1 bg-primary text-black py-3 rounded-lg font-bold hover:bg-primary-hover shadow-lg shadow-primary/20"
                            >
                                Save & Restart
                            </button>
                            <button
                                onClick={() => setIsConfigOpen(false)}
                                className="px-6 bg-white/5 text-white py-3 rounded-lg hover:bg-white/10"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )
            }

        </div >
    );
};

export default Provider;
