import React, { useState, useEffect } from 'react';
import { Activity, ShieldCheck, Database, Server, RefreshCcw, AlertCircle, CheckCircle2 } from 'lucide-react';

interface HealthStatus {
    status: string;
    version: string;
    database: string;
    service: string;
}

interface AgentHealth {
    status: string;
    miner_status: string;
    platform_version: string;
}

const Diagnostics: React.FC = () => {
    const [backendHealth, setBackendHealth] = useState<HealthStatus | null>(null);
    const [agentHealth, setAgentHealth] = useState<AgentHealth | null>(null);
    const [minerTests, setMinerTests] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const checkHealth = async () => {
        setLoading(true);
        setError(null);
        try {
            // Check Backend
            const bRes = await fetch('https://api.hashnhedge.com/health');
            if (bRes.ok) {
                setBackendHealth(await bRes.json());
            }

            // Check Local Agent
            const aUrl = localStorage.getItem('hnh_agent_url') || 'http://localhost:4343';
            const aRes = await fetch(`${aUrl}/health`);
            if (aRes.ok) {
                setAgentHealth(await aRes.json());
            }

            // Test Miners
            const tRes = await fetch(`${aUrl}/test-miners`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('hnh_agent_secret') || 'HNH_LOCAL_AGENT_SECRET'}` }
            });
            if (tRes.ok) {
                setMinerTests(await tRes.json());
            }

        } catch (e: any) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        checkHealth();
    }, []);

    return (
        <div className="p-6 space-y-6">
            <header className="flex justify-between items-center">
                <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                    <Activity className="text-primary" /> System Diagnostics
                </h1>
                <button
                    onClick={checkHealth}
                    className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 rounded-lg transition-colors text-sm"
                    disabled={loading}
                >
                    <RefreshCcw size={16} className={loading ? 'animate-spin' : ''} />
                    Refresh
                </button>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Backend Status */}
                <div className="bg-surface border border-white/10 rounded-2xl p-6">
                    <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                        <Database size={20} className="text-blue-500" /> Cloud Backend
                    </h2>
                    {backendHealth ? (
                        <div className="space-y-3">
                            <div className="flex justify-between border-b border-white/5 pb-2">
                                <span className="text-muted">Status</span>
                                <span className="text-emerald-500 font-bold flex items-center gap-1">
                                    <CheckCircle2 size={16} /> {backendHealth.status.toUpperCase()}
                                </span>
                            </div>
                            <div className="flex justify-between border-b border-white/5 pb-2">
                                <span className="text-muted">Version</span>
                                <span className="text-white">{backendHealth.version}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-muted">Database</span>
                                <span className={backendHealth.database === 'connected' ? 'text-emerald-500' : 'text-red-500'}>
                                    {backendHealth.database}
                                </span>
                            </div>
                        </div>
                    ) : (
                        <div className="text-muted italic">No data available</div>
                    )}
                </div>

                {/* Agent Status */}
                <div className="bg-surface border border-white/10 rounded-2xl p-6">
                    <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                        <Server size={20} className="text-primary" /> Local Mining Agent
                    </h2>
                    {agentHealth ? (
                        <div className="space-y-3">
                            <div className="flex justify-between border-b border-white/5 pb-2">
                                <span className="text-muted">Connection</span>
                                <span className="text-emerald-500 font-bold flex items-center gap-1">
                                    <CheckCircle2 size={16} /> ONLINE
                                </span>
                            </div>
                            <div className="flex justify-between border-b border-white/5 pb-2">
                                <span className="text-muted">Agent Version</span>
                                <span className="text-white">{agentHealth.platform_version}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-muted">Miner Status</span>
                                <span className="text-white font-mono">{agentHealth.miner_status}</span>
                            </div>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-6 text-center">
                            <AlertCircle size={32} className="text-yellow-500 mb-2" />
                            <p className="text-sm text-muted">Mining Agent Offline or Unreachable</p>
                            <p className="text-xs text-muted/50 mt-1">Ensure the agent program is running locally on port 4343.</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Miner Binaries Test */}
            <div className="bg-surface border border-white/10 rounded-2xl p-6">
                <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                    <ShieldCheck size={20} className="text-emerald-500" /> Miner Binary Integrity
                </h2>
                {minerTests?.miners ? (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead>
                                <tr className="text-muted uppercase text-xs border-b border-white/10">
                                    <th className="pb-3 px-2">Coin</th>
                                    <th className="pb-3 px-2">Binary</th>
                                    <th className="pb-3 px-2">Status</th>
                                    <th className="pb-3 px-2">Path</th>
                                </tr>
                            </thead>
                            <tbody>
                                {Object.entries(minerTests.miners).map(([coin, data]: [string, any]) => (
                                    <tr key={coin} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                                        <td className="py-3 px-2 font-bold text-white">{coin}</td>
                                        <td className="py-3 px-2 text-muted font-mono">{data.binary}</td>
                                        <td className="py-3 px-2">
                                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${data.exists ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'}`}>
                                                {data.status}
                                            </span>
                                        </td>
                                        <td className="py-3 px-2 text-xs text-muted truncate max-w-xs" title={data.path}>
                                            {data.path}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="text-muted italic py-4">Waiting for agent diagnostic results...</div>
                )}
            </div>

            {error && (
                <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl flex items-center gap-3 text-red-500 text-sm">
                    <AlertCircle size={20} />
                    <span>Error: {error}</span>
                </div>
            )}
        </div>
    );
};

export default Diagnostics;
