import React, { useState, useEffect } from 'react';
import { Server, Grid, List, Search, MoreHorizontal, Power, RefreshCw, Smartphone, Monitor } from 'lucide-react';
import { getCurrentUser } from '../services/authService';

interface Worker {
    id: string;
    name: string;
    type: 'GPU' | 'CPU' | 'ASIC';
    status: 'online' | 'offline' | 'warning';
    hashrate: string;
    temp: number;
    power: number;
    efficiency: string;
    uptime: string;
    lastSeen: string;
}

const MOCK_WORKERS: Worker[] = [
    { id: '1', name: 'Main-Desktop-4090', type: 'GPU', status: 'online', hashrate: '124.5 MH/s', temp: 64, power: 280, efficiency: '0.44 MH/W', uptime: '4d 2h', lastSeen: 'Now' },
    { id: '2', name: 'Garage-Rig-1', type: 'GPU', status: 'online', hashrate: '450.2 MH/s', temp: 71, power: 950, efficiency: '0.47 MH/W', uptime: '12d 5h', lastSeen: 'Now' },
    { id: '3', name: 'Bedroom-PC', type: 'CPU', status: 'warning', hashrate: '12.4 kH/s', temp: 82, power: 105, efficiency: '0.11 kH/W', uptime: '1h 30m', lastSeen: '2m ago' },
    { id: '4', name: 'Old-Laptop', type: 'CPU', status: 'offline', hashrate: '0 H/s', temp: 0, power: 0, efficiency: '-', uptime: '-', lastSeen: '2d ago' },
];

const Workers: React.FC = () => {
    const [currentUser] = useState(getCurrentUser());
    const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
    const [workers] = useState<Worker[]>(MOCK_WORKERS);
    const [searchTerm, setSearchTerm] = useState('');

    // Filter workers based on search term
    const filteredWorkers = workers.filter(worker =>
        worker.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        worker.type.toLowerCase().includes(searchTerm.toLowerCase()) ||
        worker.status.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (!currentUser) return null;

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                        <Server className="text-primary" /> Worker Manager
                    </h1>
                    <p className="text-muted text-sm">{filteredWorkers.filter(w => w.status === 'online').length} Online / {filteredWorkers.length} Shown</p>
                </div>

                <div className="flex items-center gap-3">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" size={16} />
                        <input
                            type="text"
                            placeholder="Search workers..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="bg-black/20 border border-white/10 rounded-lg pl-9 pr-4 py-2 text-sm text-white focus:outline-none focus:border-primary/50 w-64"
                        />
                    </div>
                    <div className="flex bg-white/5 rounded-lg p-1 border border-white/10">
                        <button
                            onClick={() => setViewMode('list')}
                            className={`p-1.5 rounded ${viewMode === 'list' ? 'bg-white/10 text-white' : 'text-muted hover:text-white'}`}
                            aria-label="List View"
                            title="List View"
                        >
                            <List size={16} />
                        </button>
                        <button
                            onClick={() => setViewMode('grid')}
                            className={`p-1.5 rounded ${viewMode === 'grid' ? 'bg-white/10 text-white' : 'text-muted hover:text-white'}`}
                            aria-label="Grid View"
                            title="Grid View"
                        >
                            <Grid size={16} />
                        </button>
                    </div>
                    <button className="bg-primary text-black px-4 py-2 rounded-lg text-sm font-bold hover:bg-primary-hover flex items-center gap-2">
                        <Smartphone size={16} /> Connect Mobile
                    </button>
                </div>
            </div>

            {viewMode === 'list' ? (
                <div className="bg-surface border border-white/10 rounded-2xl overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="bg-black/20 border-b border-white/5 text-left text-muted font-medium">
                                    <th className="px-6 py-4">Status</th>
                                    <th className="px-6 py-4">Name</th>
                                    <th className="px-6 py-4">Hashrate</th>
                                    <th className="px-6 py-4">Temp</th>
                                    <th className="px-6 py-4">Power</th>
                                    <th className="px-6 py-4">Efficiency</th>
                                    <th className="px-6 py-4">Uptime</th>
                                    <th className="px-6 py-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredWorkers.map((worker) => (
                                    <tr key={worker.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className={`flex items-center gap-2 px-2 py-1 rounded-full w-fit ${worker.status === 'online' ? 'bg-green-500/10 text-green-400' :
                                                worker.status === 'warning' ? 'bg-orange-500/10 text-orange-400' :
                                                    'bg-red-500/10 text-red-400'
                                                }`}>
                                                <div className={`w-1.5 h-1.5 rounded-full ${worker.status === 'online' ? 'bg-green-500 animate-pulse' :
                                                    worker.status === 'warning' ? 'bg-orange-500' :
                                                        'bg-red-500'
                                                    }`} />
                                                <span className="text-xs font-bold capitalize">{worker.status}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                {worker.type === 'CPU' ? <Server size={16} className="text-muted" /> : <Monitor size={16} className="text-muted" />}
                                                <span className="font-bold text-white">{worker.name}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-white font-mono">{worker.hashrate}</td>
                                        <td className="px-6 py-4">
                                            <span className={`${worker.temp > 80 ? 'text-red-400' : worker.temp > 70 ? 'text-orange-400' : 'text-green-400'}`}>
                                                {worker.temp}°C
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-muted">{worker.power}W</td>
                                        <td className="px-6 py-4 text-muted">{worker.efficiency}</td>
                                        <td className="px-6 py-4 text-muted">{worker.uptime}</td>
                                        <td className="px-6 py-4 text-right">
                                            <button
                                                className="p-2 hover:bg-white/10 rounded-lg text-muted hover:text-white"
                                                aria-label="Worker options"
                                                title="Options"
                                            >
                                                <MoreHorizontal size={16} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredWorkers.map((worker) => (
                        <div key={worker.id} className="bg-surface border border-white/10 rounded-2xl p-6 hover:border-white/20 transition-all">
                            <div className="flex justify-between items-start mb-6">
                                <div className="flex items-center gap-3">
                                    <div className={`w-2 h-2 rounded-full ${worker.status === 'online' ? 'bg-green-500 animate-pulse' :
                                        worker.status === 'warning' ? 'bg-orange-500' :
                                            'bg-red-500'
                                        }`} />
                                    <h3 className="font-bold text-white text-lg">{worker.name}</h3>
                                </div>
                                <button className="text-muted hover:text-white" aria-label="Worker options" title="Options"><MoreHorizontal size={18} /></button>
                            </div>

                            <div className="grid grid-cols-2 gap-4 mb-6">
                                <div>
                                    <p className="text-xs text-muted mb-1">Hashrate</p>
                                    <p className="text-xl font-bold text-white">{worker.hashrate}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-muted mb-1">Power</p>
                                    <p className="text-xl font-bold text-white">{worker.power}W</p>
                                </div>
                                <div>
                                    <p className="text-xs text-muted mb-1">Temp</p>
                                    <p className={`text-xl font-bold ${worker.temp > 80 ? 'text-red-400' : 'text-green-400'}`}>{worker.temp}°C</p>
                                </div>
                                <div>
                                    <p className="text-xs text-muted mb-1">Efficiency</p>
                                    <p className="text-xl font-bold text-white">{worker.efficiency}</p>
                                </div>
                            </div>

                            <div className="flex gap-2">
                                <button className="flex-1 py-2 bg-white/5 rounded-lg text-sm font-bold text-white hover:bg-white/10 flex items-center justify-center gap-2">
                                    <RefreshCw size={14} /> Restart
                                </button>
                                <button className="flex-1 py-2 bg-red-500/10 border border-red-500/20 rounded-lg text-sm font-bold text-red-400 hover:bg-red-500/20 flex items-center justify-center gap-2">
                                    <Power size={14} /> Stop
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default Workers;
