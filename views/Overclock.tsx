import React, { useState } from 'react';
import { useTelemetry } from '../services/useTelemetry';
import { Cpu, Zap, Shield, TrendingUp, CheckCircle, AlertTriangle } from 'lucide-react';

interface OverclockProfile {
    id: string;
    name: string;
    description: string;
    hashrateBoost: string;
    powerDraw: string;
    risk: 'Low' | 'Medium' | 'High';
    color: string;
}

const PROFILES: OverclockProfile[] = [
    {
        id: 'safe',
        name: 'Efficiency Mode',
        description: 'Maximum hashrate per watt. Lowest heat & power cost.',
        hashrateBoost: '+5%',
        powerDraw: '-15%',
        risk: 'Low',
        color: 'green'
    },
    {
        id: 'balanced',
        name: 'AI Balanced',
        description: 'Best profit based on current electricity cost ($0.12/kWh).',
        hashrateBoost: '+12%',
        powerDraw: '+5%',
        risk: 'Medium',
        color: 'blue'
    },
    {
        id: 'max',
        name: 'Max Performance',
        description: 'Push hardware to safe limits for maximum raw hashrate.',
        hashrateBoost: '+25%',
        powerDraw: '+30%',
        risk: 'High',
        color: 'orange'
    }
];

const Overclock: React.FC = () => {
    const { telemetry, isConnected } = useTelemetry();
    const [analyzing, setAnalyzing] = useState(false);
    const [activeProfile, setActiveProfile] = useState<string>('safe');
    const [applied, setApplied] = useState(false);

    const handleApply = (id: string) => {
        setAnalyzing(true);
        // Simulate AI analysis and application
        setTimeout(() => {
            setAnalyzing(false);
            setActiveProfile(id);
            setApplied(true);
            setTimeout(() => setApplied(false), 3000);
        }, 2000);
    };

    return (
        <div className="space-y-6 max-w-5xl mx-auto">
            <div className="flex items-center gap-3 mb-2">
                <Cpu className="text-primary" size={28} />
                <div>
                    <h1 className="text-2xl font-bold text-white">AI Hardware Tuner</h1>
                    <p className="text-muted text-sm">One-click optimization for your specific hardware.</p>
                </div>
            </div>

            <div className="bg-surface border border-white/10 rounded-2xl p-6">
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h2 className="text-lg font-bold text-white">Detected Hardware</h2>
                        <div className="flex items-center gap-2 mt-1">
                            {isConnected && telemetry ? (
                                <>
                                    <span className="px-2 py-1 bg-green-500/10 border border-green-500/20 rounded text-xs font-mono text-green-400 flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                                        Active GPU ({telemetry.hashrate.toFixed(1)} MH/s)
                                    </span>
                                    <span className="px-2 py-1 bg-white/10 rounded text-xs font-mono text-white">
                                        Temp: {telemetry.gpu_temp}°C | Power: {telemetry.power_draw}W
                                    </span>
                                </>
                            ) : (
                                <span className="px-2 py-1 bg-red-500/10 border border-red-500/20 rounded text-xs font-mono text-red-400 flex items-center gap-2">
                                    <AlertTriangle size={12} />
                                    No Agent Detected - Waiting for telemetry...
                                </span>
                            )}
                        </div>
                    </div>
                    <div className="text-right">
                        <span className="text-xs text-muted">Current Driver</span>
                        <p className="font-mono text-white">{isConnected ? 'v536.23 (Active)' : '--'}</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {PROFILES.map((profile) => (
                        <div
                            key={profile.id}
                            className={`relative border rounded-xl p-5 transition-all cursor-pointer hover:border-white/30 ${activeProfile === profile.id
                                ? `bg-${profile.color}-500/10 border-${profile.color}-500 ring-1 ring-${profile.color}-500`
                                : 'bg-black/20 border-white/10'
                                }`}
                            onClick={() => handleApply(profile.id)}
                        >
                            {activeProfile === profile.id && (
                                <div className={`absolute top-3 right-3 text-${profile.color}-500`}>
                                    <CheckCircle size={20} />
                                </div>
                            )}

                            <h3 className={`font-bold text-lg text-${profile.color}-400 mb-2`}>{profile.name}</h3>
                            <p className="text-sm text-muted mb-4 h-10">{profile.description}</p>

                            <div className="space-y-2 mb-6">
                                <div className="flex justify-between text-sm">
                                    <span className="text-muted">Hashrate</span>
                                    <span className="text-white font-bold">{profile.hashrateBoost}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-muted">Power</span>
                                    <span className="text-white font-bold">{profile.powerDraw}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-muted">Risk Level</span>
                                    <span className={`font-bold ${profile.risk === 'Low' ? 'text-green-400' :
                                        profile.risk === 'Medium' ? 'text-blue-400' : 'text-orange-400'
                                        }`}>{profile.risk}</span>
                                </div>
                            </div>

                            <button
                                className={`w-full py-2 rounded-lg font-bold text-sm transition-all ${activeProfile === profile.id
                                    ? 'bg-white/10 text-muted cursor-default'
                                    : 'bg-white text-black hover:bg-gray-200'
                                    }`}
                            >
                                {activeProfile === profile.id ? 'Active' : 'Apply Profile'}
                            </button>
                        </div>
                    ))}
                </div>
            </div>

            {/* AI Analysis Overlay */}
            {analyzing && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center">
                    <div className="bg-surface border border-white/10 rounded-2xl p-8 max-w-sm text-center">
                        <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-6 relative">
                            <Zap size={32} className="text-primary animate-pulse" />
                            <div className="absolute inset-0 border-2 border-primary/50 rounded-full animate-ping" />
                        </div>
                        <h3 className="text-xl font-bold text-white mb-2">Analyzing Silicon Quality...</h3>
                        <p className="text-muted text-sm mb-6">Gemini is finding the optimal voltage curve for your specific chip.</p>
                        <div className="w-full bg-white/10 h-1 rounded-full overflow-hidden">
                            <div className="h-full bg-primary animate-[progress_2s_ease-in-out_infinite]" style={{ width: '60%' }} />
                        </div>
                    </div>
                </div>
            )}

            {/* Success Toast */}
            {applied && (
                <div className="fixed bottom-8 right-8 bg-green-500 text-black px-6 py-4 rounded-xl font-bold shadow-2xl flex items-center gap-3 animate-slide-up">
                    <CheckCircle size={24} />
                    <div>
                        <p>Optimization Applied!</p>
                        <span className="text-xs opacity-80">Hashrate increased by 12.4%</span>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Overclock;
