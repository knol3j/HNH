import React, { useState, useEffect } from 'react';
import { Cpu, Zap, Activity, Info, Search, Server } from 'lucide-react';
import { API_BASE_URL } from '../services/apiClient';

interface HardwareItem {
  id: string;
  name: string;
  algos: {
    [key: string]: {
      hashrate: string;
      power: string;
      efficiency: string;
      oc: string;
    }
  }
}

const HardwareDatabase: React.FC = () => {
  const [hardware, setHardware] = useState<HardwareItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [algoFilter, setAlgoFilter] = useState('All');
  const [search, setSearch] = useState('');

  useEffect(() => {
    const fetchHardware = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/public/hardware`);
        if (res.ok) {
          const data = await res.json();
          setHardware(data);
        }
      } catch (e) { console.error("Hardware DB offline"); }
      setLoading(false);
    };
    fetchHardware();
  }, []);

  const filtered = hardware.filter(h => {
    const matchesSearch = h.name.toLowerCase().includes(search.toLowerCase());
    const hasAlgo = algoFilter === 'All' || h.algos[algoFilter.toLowerCase()] || (algoFilter === 'RandomX' && (h.algos['rx/0']));
    return matchesSearch && hasAlgo;
  });

  // Extract all unique algos
  const allAlgos = Array.from(new Set(hardware.flatMap(h => Object.keys(h.algos))));

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <header className="space-y-4">
        <h2 className="text-3xl font-bold text-white flex items-center gap-3">
          <Cpu className="text-primary" size={32} /> Hardware Benchmarks
        </h2>
        <p className="text-muted text-lg">
          Real-world optimized overclock settings for maximum efficiency. Sourced from the community.
        </p>
      </header>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" size={16} />
          <input
            className="w-full bg-black/40 border border-white/10 rounded-xl px-4 pl-10 py-3 text-white focus:outline-none focus:border-primary/50"
            placeholder="Search GPU/CPU (e.g. 4090)..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <select
          aria-label="Filter by Algorithm"
          className="bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none"
          value={algoFilter}
          onChange={e => setAlgoFilter(e.target.value)}
        >
          <option value="All">All Algorithms</option>
          <option value="kawpow">KawPow (RVN)</option>
          <option value="autolykos2">Autolykos2 (ERG)</option>
          <option value="rx/0">RandomX (XMR/ZEPH)</option>
          <option value="heavyhash">HeavyHash (KAS)</option>
          <option value="etchash">Etchash (ETC)</option>
        </select>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
        {loading && <div className="text-white">Loading database...</div>}

        {!loading && filtered.map(item => (
          <div key={item.id} className="bg-surface border border-white/10 rounded-2xl p-6 hover:border-primary/30 transition-all overflow-hidden relative">
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-white/5 p-3 rounded-lg">
                {item.id.includes('ryzen') ? <Cpu size={24} className="text-orange-500" /> : <Server size={24} className="text-green-500" />}
              </div>
              <div>
                <h3 className="font-bold text-xl text-white">{item.name}</h3>
                <span className="text-xs text-muted uppercase tracking-wider">{item.id.includes('ryzen') ? 'CPU' : 'GPU'}</span>
              </div>
            </div>

            <div className="space-y-4">
              {Object.entries(item.algos).map(([algo, stats]) => (
                (algoFilter === 'All' || algo === algoFilter || (algoFilter === 'RandomX' && algo === 'rx/0')) && (
                  <div key={algo} className="bg-black/40 rounded-xl p-4 border border-white/5">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-bold text-primary uppercase">{algo === 'rx/0' ? 'RandomX' : algo}</span>
                      <span className="text-xs bg-white/10 px-2 py-1 rounded text-white">{stats.efficiency}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-4 mb-3">
                      <div>
                        <p className="text-xs text-muted">Hashrate</p>
                        <p className="font-mono text-white text-lg">{stats.hashrate}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted">Power</p>
                        <p className="font-mono text-white text-lg flex items-center gap-1"><Zap size={14} className="text-yellow-500" /> {stats.power}</p>
                      </div>
                    </div>
                    <div className="bg-white/5 rounded p-2 text-xs font-mono text-gray-300 flex items-start gap-2">
                      <Activity size={14} className="mt-0.5 text-muted shrink-0" />
                      {stats.oc}
                    </div>
                  </div>
                )
              ))}
            </div>
          </div>
        ))}
      </div>

      {!loading && filtered.length === 0 && (
        <div className="text-center py-20 bg-surface border border-white/10 rounded-2xl">
          <p className="text-muted">No benchmarks found for this query.</p>
        </div>
      )}
    </div>
  );
};

export default HardwareDatabase;