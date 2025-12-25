import React, { useState, useEffect } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { Activity, TrendingUp, Zap, DollarSign, Loader2, WifiOff } from 'lucide-react';
import { fetchCurrentUser } from '../services/authService';

interface TelemetryPoint {
    time: string;
    value: number;
}

interface AgentStats {
    hashrate: number;
    power: number;
    temp: number;
    uptime: number;
}

const Analytics: React.FC = () => {
    const [isLoading, setIsLoading] = useState(true);
    const [isAgentOnline, setIsAgentOnline] = useState(false);
    const [hashrateHistory, setHashrateHistory] = useState<TelemetryPoint[]>([]);
    const [stats, setStats] = useState<AgentStats>({ hashrate: 0, power: 0, temp: 0, uptime: 0 });
    const [dailyEarnings, setDailyEarnings] = useState(0);

    useEffect(() => {
        const agentUrl = localStorage.getItem('hnh_agent_url') || 'http://localhost:4343';
        let historyBuffer: TelemetryPoint[] = [];

        const fetchTelemetry = async () => {
            try {
                const res = await fetch(`${agentUrl}/telemetry`);
                if (!res.ok) throw new Error('Agent offline');

                const data = await res.json();
                setIsAgentOnline(true);
                setIsLoading(false);

                setStats({
                    hashrate: data.hashrate || 0,
                    power: data.power_draw || 0,
                    temp: data.gpu_temp || 0,
                    uptime: data.uptime || 0
                });

                // Add to history buffer
                const now = new Date();
                historyBuffer.push({
                    time: `${now.getHours()}:${now.getMinutes().toString().padStart(2, '0')}`,
                    value: data.hashrate || 0
                });

                // Keep last 24 points
                if (historyBuffer.length > 24) {
                    historyBuffer = historyBuffer.slice(-24);
                }
                setHashrateHistory([...historyBuffer]);

                // Calculate estimated daily earnings based on hashrate
                // This is a rough estimate - real earnings depend on many factors
                if (data.hashrate > 0) {
                    const estimatedDaily = (data.hashrate / 1000) * 0.5; // ~$0.50 per kH/s per day estimate
                    setDailyEarnings(estimatedDaily);
                }

            } catch (e) {
                setIsAgentOnline(false);
                setIsLoading(false);
            }
        };

        fetchTelemetry();
        const interval = setInterval(fetchTelemetry, 5000);
        return () => clearInterval(interval);
    }, []);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-96">
                <div className="text-center">
                    <Loader2 className="animate-spin mx-auto mb-4 text-primary" size={48} />
                    <p className="text-muted">Connecting to mining agent...</p>
                </div>
            </div>
        );
    }

    if (!isAgentOnline) {
        return (
            <div className="flex items-center justify-center h-96">
                <div className="text-center">
                    <WifiOff className="mx-auto mb-4 text-muted" size={48} />
                    <h2 className="text-xl font-bold text-white mb-2">Agent Offline</h2>
                    <p className="text-muted mb-4">Start the HashNHedge agent to view analytics.</p>
                    <p className="text-xs text-muted">Default URL: http://localhost:4343</p>
                </div>
            </div>
        );
    }

    const efficiency = stats.power > 0 ? (stats.power / stats.hashrate * 1000).toFixed(2) : '0';

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                        <Activity className="text-primary" /> Performance Analytics
                    </h1>
                    <p className="text-muted text-sm">Real-time data from your mining agent.</p>
                </div>
                <div className="flex items-center gap-2 text-xs">
                    <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                    <span className="text-green-400">Agent Connected</span>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-surface border border-white/10 rounded-xl p-4">
                    <p className="text-xs text-muted uppercase font-bold mb-1">Current Hashrate</p>
                    <div className="flex items-center gap-2">
                        <span className="text-2xl font-bold text-white">
                            {stats.hashrate > 1000 ? `${(stats.hashrate / 1000).toFixed(2)} kH/s` : `${stats.hashrate.toFixed(0)} H/s`}
                        </span>
                    </div>
                </div>
                <div className="bg-surface border border-white/10 rounded-xl p-4">
                    <p className="text-xs text-muted uppercase font-bold mb-1">Est. Daily Revenue</p>
                    <div className="flex items-center gap-2">
                        <span className="text-2xl font-bold text-green-400">${dailyEarnings.toFixed(2)}</span>
                    </div>
                </div>
                <div className="bg-surface border border-white/10 rounded-xl p-4">
                    <p className="text-xs text-muted uppercase font-bold mb-1">Power Draw</p>
                    <div className="flex items-center gap-2">
                        <span className="text-2xl font-bold text-blue-400">{stats.power.toFixed(0)} W</span>
                        <span className="text-xs text-muted">{efficiency} W/kH</span>
                    </div>
                </div>
                <div className="bg-surface border border-white/10 rounded-xl p-4">
                    <p className="text-xs text-muted uppercase font-bold mb-1">GPU Temperature</p>
                    <div className="flex items-center gap-2">
                        <span className={`text-2xl font-bold ${stats.temp > 80 ? 'text-red-400' : stats.temp > 70 ? 'text-yellow-400' : 'text-green-400'}`}>
                            {stats.temp}°C
                        </span>
                    </div>
                </div>
            </div>

            {/* Main Charts */}
            <div className="grid grid-cols-1 gap-6">
                {/* Hashrate Chart */}
                <div className="bg-surface border border-white/10 rounded-xl p-6">
                    <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                        <Zap size={18} className="text-yellow-400" /> Hashrate History
                    </h3>
                    {hashrateHistory.length > 1 ? (
                        <div className="h-[300px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={hashrateHistory}>
                                    <defs>
                                        <linearGradient id="colorHash" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#ebb305" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="#ebb305" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                                    <XAxis dataKey="time" stroke="#666" tick={{ fontSize: 12 }} />
                                    <YAxis stroke="#666" tick={{ fontSize: 12 }} />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: '#18181b', border: '1px solid #333', borderRadius: '8px' }}
                                        itemStyle={{ color: '#fff' }}
                                        formatter={(value: number) => [`${value.toFixed(0)} H/s`, 'Hashrate']}
                                    />
                                    <Area type="monotone" dataKey="value" stroke="#ebb305" fillOpacity={1} fill="url(#colorHash)" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    ) : (
                        <div className="h-[300px] flex items-center justify-center text-muted">
                            <p>Collecting data... Chart will appear shortly.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Analytics;
