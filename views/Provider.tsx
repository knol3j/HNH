import React, { useState, useEffect } from 'react';
import { Activity, Cpu, Zap, Server, Coins, Terminal, Play, Square, Settings } from 'lucide-react';
import { DynamicDiv } from '../components/DynamicDiv';
import './Provider.css';

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
    const [config, setConfig] = useState<MinerConfig>({
        coin: 'XMR',
        wallet: '',
        mode: 'cpu',
        poolUrl: '',
        algorithm: 'rx/0'
    });
    const [meta, setMeta] = useState<any>(null); // Available coins, pools, history
    const [isConfigOpen, setIsConfigOpen] = useState(false);
    const [customAgentUrl, setCustomAgentUrl] = useState(localStorage.getItem('hnh_agent_url') || 'http://localhost:4343');

    // Fetch Meta for Config
    useEffect(() => {
        if (isConfigOpen) {
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
                    console.error("Failed to fetch meta", e);
                }
            };
            fetchMeta();
        }
    }, [isConfigOpen, customAgentUrl]);

    // Earnings State
    const [balance, setBalance] = useState({ unpaid: 0, usd: 0, currency: 'XMR' });

    // Poll Agent Telemetry
    useEffect(() => {
        const fetchTelemetry = async () => {
            try {
                const agentUrl = localStorage.getItem('hnh_agent_url') || 'http://localhost:4343';
                const res = await fetch(`${agentUrl}/telemetry`);
                if (res.ok) {
                    const data = await res.json();
                    setTelemetry(data);
                    setMinerStatus(data.status === 'mining' ? 'ONLINE' : 'OFFLINE');

                    if (data.logs) {
                        setLogs(data.logs.slice(-20)); // Keep last 20 lines
                    }

                    // Update config ref if needed
                    if (data.config) {
                        setConfig(prev => ({ ...prev, ...data.config }));
                    }
                } else {
                    setMinerStatus('OFFLINE');
                }
            } catch (e) {
                setMinerStatus('OFFLINE');
            }
        };

        const interval = setInterval(fetchTelemetry, 2000);
        fetchTelemetry();
        return () => clearInterval(interval);
    }, []);

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

        if (telemetry) fetchBalance();
        const interval = setInterval(fetchBalance, 30000); // 30s poll for balance
        return () => clearInterval(interval);
    }, [telemetry?.wallet, telemetry?.coin]);

    // Actions
    const handleStartStop = async () => {
        const agentUrl = localStorage.getItem('hnh_agent_url') || 'http://localhost:4343';
        const endpoint = minerStatus === 'ONLINE' ? '/stop' : '/start';

        try {
            setMinerStatus('STARTING');
            await fetch(`${agentUrl}${endpoint}`, { method: 'POST' });
        } catch (e) {
            console.error("Failed to toggle miner", e);
            setMinerStatus('OFFLINE');
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
                    <p className="text-xs text-yellow-500 mt-2 font-mono">
                        {balance.unpaid.toFixed(6)} {balance.currency}
                    </p>
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
                <div className="bg-surface border border-white/10 rounded-2xl p-6 flex items-center justify-center">
                    <button
                        onClick={handleStartStop}
                        className={`w-full h-full rounded-xl flex flex-col items-center justify-center gap-2 transition-all ${minerStatus === 'ONLINE'
                            ? 'bg-red-500/20 hover:bg-red-500/30 text-red-500 border border-red-500/50'
                            : 'bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-500 border border-emerald-500/50'
                            }`}
                    >
                        {minerStatus === 'ONLINE' ? <Square size={32} /> : <Play size={32} />}
                        <span className="font-bold uppercase tracking-wider">
                            {minerStatus === 'ONLINE' ? 'Stop Miner' : 'Start Mining'}
                        </span>
                    </button>
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
                                                                val === 'KAS' ? 'heavyhash' : ''
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
                                    const agentUrl = localStorage.getItem('hnh_agent_url') || 'http://localhost:4343';
                                    try {
                                        // Update Local Config First
                                        if (customAgentUrl !== agentUrl) {
                                            localStorage.setItem('hnh_agent_url', customAgentUrl);
                                        }

                                        // Send Config to Agent
                                        await fetch(`${customAgentUrl}/config`, {
                                            method: 'POST',
                                            headers: { 'Content-Type': 'application/json' },
                                            body: JSON.stringify(config)
                                        });

                                        setIsConfigOpen(false);
                                        // Trigger a reload or just let telemetry pick it up?
                                        // Let's reload to be safe and clean state
                                        // window.location.reload(); 
                                        // Actually better to just close and let telemetry update status to 'STARTING'
                                    } catch (e) {
                                        alert("Failed to save config: " + e);
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
            )}
        </div>
    );
};

export default Provider;
