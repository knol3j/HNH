import React, { useState, useEffect } from 'react';
import { Activity, Cpu, Zap, Server, Coins, Terminal, Play, Square, Settings } from 'lucide-react';
import { DynamicDiv } from '../components/DynamicDiv';
import './Provider.css';

const Provider: React.FC = () => {
    // State
    const [minerStatus, setMinerStatus] = useState<'ONLINE' | 'OFFLINE' | 'STARTING'>('OFFLINE');
    const [telemetry, setTelemetry] = useState<any>(null);
    const [logs, setLogs] = useState<string[]>([]);
    const [config, setConfig] = useState({
        coin: 'XMR',
        wallet: '',
        cpuEnabled: true,
        gpuEnabled: false
    });

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
        </div>
    );
};

export default Provider;
