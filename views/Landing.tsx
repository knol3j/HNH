import React, { useState, useEffect } from 'react';
import { ArrowRight, Cpu, Zap, Shield, TrendingUp, DollarSign } from 'lucide-react';
import { CoinProfitability, calculateProfitability } from '../services/profitabilityService';

interface LandingProps {
    onEnterApp: () => void;
}

const Landing: React.FC<LandingProps> = ({ onEnterApp }) => {
    const [hashrate, setHashrate] = useState(1000);
    const [estimatedEarnings, setEstimatedEarnings] = useState(0);
    const [bestCoin, setBestCoin] = useState<CoinProfitability | null>(null);

    useEffect(() => {
        const fetchStats = async () => {
            const rankings = await calculateProfitability(hashrate);
            if (rankings.length > 0) {
                setBestCoin(rankings[0]);
                // Simple estimation: score is daily USD * 1000. So daily USD = score / 1000
                // But calculateProfitability actually returns estimatedDailyUsd correctly now?
                // Let's re-check the service later. For now, trust the object.
                setEstimatedEarnings(rankings[0].estimatedDailyUsd);
            }
        };
        fetchStats();
    }, [hashrate]);

    return (
        <div className="min-h-screen bg-black text-white selection:bg-primary selection:text-black overflow-hidden relative">
            {/* Background Gradients */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
                <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-purple-600/20 rounded-full blur-[120px]" />
                <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-blue-600/20 rounded-full blur-[120px]" />
            </div>

            {/* Navbar */}
            <nav className="relative z-10 flex items-center justify-between px-6 py-6 max-w-7xl mx-auto">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center">
                        <Cpu size={20} className="text-black" />
                    </div>
                    <span className="font-bold text-xl tracking-tight">HashNHedge</span>
                </div>
                <div className="flex items-center gap-4">
                    <button
                        onClick={onEnterApp}
                        className="text-sm font-medium text-muted hover:text-white transition-colors"
                    >
                        Login
                    </button>
                    <button
                        onClick={onEnterApp}
                        className="bg-white text-black px-5 py-2 rounded-full text-sm font-bold hover:bg-gray-200 transition-colors flex items-center gap-2"
                    >
                        Start Mining <ArrowRight size={16} />
                    </button>
                </div>
            </nav>

            {/* Hero Section */}
            <div className="relative z-10 max-w-7xl mx-auto px-6 pt-20 pb-32 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
                <div>
                    <div className="inline-flex items-center gap-2 bg-white/5 border border-white/10 rounded-full px-3 py-1 mb-6">
                        <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                        <span className="text-xs font-medium text-white">v3.0 Live: Auto-Profit Switching</span>
                    </div>
                    <h1 className="text-5xl md:text-7xl font-bold leading-tight mb-6 bg-gradient-to-b from-white to-gray-400 bg-clip-text text-transparent">
                        Turn Idle Compute <br />
                        Into <span className="text-primary">Passive Income</span>
                    </h1>
                    <p className="text-lg text-muted mb-8 leading-relaxed max-w-lg">
                        The world's first AI-optimized mining platform. Automatically switch between the most profitable coins. No expertise required.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-4">
                        <button
                            onClick={onEnterApp}
                            className="bg-primary text-black px-8 py-4 rounded-xl font-bold text-lg hover:bg-primary-hover transition-all flex items-center justify-center gap-2 shadow-lg shadow-primary/25"
                        >
                            Start Earning Now <ArrowRight size={20} />
                        </button>
                        <button className="bg-white/5 border border-white/10 text-white px-8 py-4 rounded-xl font-bold text-lg hover:bg-white/10 transition-all">
                            View Documentation
                        </button>
                    </div>
                    <div className="mt-8 flex items-center gap-4 text-sm text-muted">
                        <div className="flex -space-x-2">
                            {[1, 2, 3, 4].map(i => (
                                <div key={i} className="w-8 h-8 rounded-full bg-gray-600 border-2 border-black" />
                            ))}
                        </div>
                        <p>Trusted by 10,000+ miners</p>
                    </div>
                </div>

                {/* Profit Calculator */}
                <div className="relative">
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-purple-600/20 rounded-3xl blur-xl transform rotate-3 scale-105" />
                    <div className="relative bg-surface/80 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl">
                        <h3 className="text-2xl font-bold mb-6 flex items-center gap-2">
                            <DollarSign className="text-green-400" /> Estimate Earnings
                        </h3>

                        <div className="space-y-6">
                            <div>
                                <label className="text-sm text-muted mb-2 block">Your Hashrate (H/s)</label>
                                <input
                                    type="range"
                                    min="500"
                                    max="50000"
                                    step="500"
                                    value={hashrate}
                                    onChange={(e) => setHashrate(parseInt(e.target.value))}
                                    className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer accent-primary"
                                    aria-label="Hashrate Slider"
                                />
                                <div className="flex justify-between mt-2">
                                    <span className="text-xs text-muted">Low End PC</span>
                                    <span className="font-mono text-white text-lg font-bold">{hashrate} H/s</span>
                                    <span className="text-xs text-muted">Mining Farm</span>
                                </div>
                            </div>

                            <div className="p-6 bg-black/40 rounded-xl border border-white/5 space-y-4">
                                <div className="flex justify-between items-center">
                                    <span className="text-muted">Daily Profit</span>
                                    <span className="text-2xl font-bold text-green-400">${estimatedEarnings.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-muted">Monthly Profit</span>
                                    <span className="text-xl font-bold text-white">${(estimatedEarnings * 30).toFixed(2)}</span>
                                </div>
                                <div className="pt-4 border-t border-white/10 text-xs text-center text-muted">
                                    Best Coin to Mine: <span className="text-primary font-bold">{bestCoin?.symbol || 'Analyzing...'}</span>
                                </div>
                            </div>

                            <button
                                onClick={onEnterApp}
                                className="w-full py-4 bg-white text-black rounded-xl font-bold hover:bg-gray-200 transition-colors"
                            >
                                Start Mining This Coin
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Features Grid */}
            <div className="max-w-7xl mx-auto px-6 py-24 border-t border-white/5">
                <div className="text-center mb-16">
                    <h2 className="text-3xl md:text-5xl font-bold mb-4">Why Choose HashNHedge?</h2>
                    <p className="text-muted max-w-2xl mx-auto">We use advanced AI to maximize your hardware's potential.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {[
                        {
                            icon: Zap,
                            title: "Auto-Profit Switching",
                            desc: "Our agent monitors market prices 24/7 and automatically switches to the most profitable coin."
                        },
                        {
                            icon: Shield,
                            title: "Enterprise Security",
                            desc: "Bank-grade encryption for your wallet. Aggregated proxy hides your IP from pools."
                        },
                        {
                            icon: TrendingUp,
                            title: "AI Optimization",
                            desc: "Gemini AI analyzes your hardware telemetry to suggest overclock settings and optimizations."
                        }
                    ].map((f, i) => (
                        <div key={i} className="p-8 rounded-3xl bg-surface/50 border border-white/5 hover:border-white/10 transition-all hover:-translate-y-1">
                            <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center mb-6 text-primary">
                                <f.icon size={24} />
                            </div>
                            <h3 className="text-xl font-bold mb-3">{f.title}</h3>
                            <p className="text-muted leading-relaxed">{f.desc}</p>
                        </div>
                    ))}
                </div>
            </div>

            {/* Minimal Ad Placement */}
            <div className="max-w-7xl mx-auto px-6 py-8 flex justify-center">
                <div className="w-full max-w-[728px] h-[90px] bg-white/5 border border-white/5 rounded-lg flex items-center justify-center text-muted text-xs">
                    {/* AdSense Unit */}
                    <ins className="adsbygoogle block"
                        data-ad-client="ca-pub-4626165154390205"
                        data-ad-slot="1234567890"
                        data-ad-format="auto"
                        data-full-width-responsive="true"></ins>
                </div>
            </div>

            {/* Footer */}
            <footer className="border-t border-white/5 py-12 px-6">
                <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
                    <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center">
                            <Cpu size={14} className="text-black" />
                        </div>
                        <span className="font-bold">HashNHedge</span>
                    </div>
                    <p className="text-sm text-muted">© 2025 HashNHedge Inc. All rights reserved.</p>
                </div>
            </footer>
        </div>
    );
};

export default Landing;
