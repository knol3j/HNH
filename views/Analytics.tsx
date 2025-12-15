import React, { useState, useEffect } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { Activity, TrendingUp, Zap, DollarSign } from 'lucide-react';
import { getCurrentUser } from '../services/authService';

// Mock data generation (since we don't have a real DB yet)
const generateHistory = (points: number, baseValue: number, variance: number) => {
    return Array.from({ length: points }).map((_, i) => ({
        time: `${i}:00`,
        value: Math.max(0, baseValue + (Math.random() - 0.5) * variance),
    }));
};

const Analytics: React.FC = () => {
    const [currentUser] = useState(getCurrentUser());
    const [hashrateData] = useState(generateHistory(24, 2500, 500));
    const [earningsData] = useState(generateHistory(7, 4.5, 1.2));
    const [efficiencyData] = useState(generateHistory(24, 0.45, 0.05));

    if (!currentUser) return null;

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                        <Activity className="text-primary" /> Performance Analytics
                    </h1>
                    <p className="text-muted text-sm">Real-time insights into your mining fleet.</p>
                </div>
                <div className="flex gap-2">
                    <button className="px-3 py-1 bg-white/10 rounded-lg text-xs font-bold text-white hover:bg-white/20">24H</button>
                    <button className="px-3 py-1 bg-transparent rounded-lg text-xs font-bold text-muted hover:text-white">7D</button>
                    <button className="px-3 py-1 bg-transparent rounded-lg text-xs font-bold text-muted hover:text-white">30D</button>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-surface border border-white/10 rounded-xl p-4">
                    <p className="text-xs text-muted uppercase font-bold mb-1">Avg Hashrate (24h)</p>
                    <div className="flex items-center gap-2">
                        <span className="text-2xl font-bold text-white">2.45 kH/s</span>
                        <span className="text-xs text-green-400 flex items-center">
                            <TrendingUp size={12} className="mr-0.5" /> +5.2%
                        </span>
                    </div>
                </div>
                <div className="bg-surface border border-white/10 rounded-xl p-4">
                    <p className="text-xs text-muted uppercase font-bold mb-1">Est. Daily Revenue</p>
                    <div className="flex items-center gap-2">
                        <span className="text-2xl font-bold text-green-400">$4.12</span>
                        <span className="text-xs text-green-600 flex items-center">
                            <TrendingUp size={12} className="mr-0.5" /> +1.8%
                        </span>
                    </div>
                </div>
                <div className="bg-surface border border-white/10 rounded-xl p-4">
                    <p className="text-xs text-muted uppercase font-bold mb-1">Power Efficiency</p>
                    <div className="flex items-center gap-2">
                        <span className="text-2xl font-bold text-blue-400">0.42 W/kH</span>
                        <span className="text-xs text-red-400 flex items-center">
                            <TrendingUp size={12} className="mr-0.5 rotate-180" /> -2.1%
                        </span>
                    </div>
                </div>
                <div className="bg-surface border border-white/10 rounded-xl p-4">
                    <p className="text-xs text-muted uppercase font-bold mb-1">Uptime</p>
                    <div className="flex items-center gap-2">
                        <span className="text-2xl font-bold text-white">99.8%</span>
                        <span className="text-xs text-muted">Last 30d</span>
                    </div>
                </div>
            </div>

            {/* Main Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Hashrate Chart */}
                <div className="bg-surface border border-white/10 rounded-xl p-6">
                    <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                        <Zap size={18} className="text-yellow-400" /> Hashrate History
                    </h3>
                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={hashrateData}>
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
                                />
                                <Area type="monotone" dataKey="value" stroke="#ebb305" fillOpacity={1} fill="url(#colorHash)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Earnings Chart */}
                <div className="bg-surface border border-white/10 rounded-xl p-6">
                    <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                        <DollarSign size={18} className="text-green-400" /> Daily Earnings
                    </h3>
                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={earningsData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                                <XAxis dataKey="time" stroke="#666" tick={{ fontSize: 12 }} />
                                <YAxis stroke="#666" tick={{ fontSize: 12 }} />
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#18181b', border: '1px solid #333', borderRadius: '8px' }}
                                    itemStyle={{ color: '#fff' }}
                                    cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                                />
                                <Bar dataKey="value" fill="#4ade80" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Analytics;
