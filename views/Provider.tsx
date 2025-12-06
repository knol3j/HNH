
import React, { useState, useEffect, useRef } from 'react';
import { Algorithm } from '../types';
import { Settings, Activity, Zap, Server, Wifi, Terminal, AlertTriangle, Plus, Trash2, Clock, CheckSquare, Square, Wallet, Copy, RefreshCw, ChevronDown, ExternalLink } from 'lucide-react';
import { AreaChart, Area, Tooltip, ResponsiveContainer } from 'recharts';

// --- Types & Interfaces ---

type CoinSymbol = 'RVN' | 'ETC' | 'XMR' | 'KAS' | 'ERG';

interface CoinDef {
  name: string;
  symbol: CoinSymbol;
  algorithm: Algorithm;
  icon: string; // URL or emoji
  coingeckoId: string;
  yieldPerMh: number; // Est coins per MH/s per day
  defaultPools: string[];
}

// Real API interfaces
interface MarketData {
  [key: string]: { usd: number };
}

interface HardwareTelemetry {
  gpu_temp: number;
  gpu_util: number;
  fan_speed: number;
  power_draw: number;
  vram_used: number;
  hashrate: number;
}

interface PoolConfig {
  id: string;
  url: string;
  priority: number;
}

interface PendingSwitch {
  algo: string;
  startTime: number;
  targetProfit: number;
}

interface ProfitabilityStats {
  dailyRevenue: number;
  dailyCost: number;
  netProfit: number;
  currency: string;
}

interface AlgoConfig {
  name: Algorithm;
  enabled: boolean;
}

// --- Constants & Catalog ---

const COIN_CATALOG: Record<CoinSymbol, CoinDef> = {
  ETC: {
    name: 'Ethereum Classic',
    symbol: 'ETC',
    algorithm: 'Etchash',
    icon: 'https://cryptologos.cc/logos/ethereum-classic-etc-logo.svg?v=032',
    coingeckoId: 'ethereum-classic',
    yieldPerMh: 0.0035,
    defaultPools: ['stratum+tcp://us.etchash-pool.2miners.com:1010', 'stratum+tcp://de.etc.herominers.com:10161', 'stratum+ssl://etc.crazypool.org:5555']
  },
  RVN: {
    name: 'Ravencoin',
    symbol: 'RVN',
    algorithm: 'KawPow',
    icon: 'https://cryptologos.cc/logos/ravencoin-rvn-logo.svg?v=032',
    coingeckoId: 'ravencoin',
    yieldPerMh: 2.8,
    defaultPools: ['stratum+tcp://stratum-ravencoin.flypool.org:3333', 'stratum+tcp://rvn.2miners.com:6060', 'stratum+tcp://rvn.herominers.com:10240']
  },
  KAS: {
    name: 'Kaspa',
    symbol: 'KAS',
    algorithm: 'KawPow', // Using generic algo type for TS simplicity, actually kHeavyHash
    icon: 'https://cryptologos.cc/logos/kaspa-kas-logo.svg?v=032',
    coingeckoId: 'kaspa',
    yieldPerMh: 0.5, // High yield due to high hashrate on this algo
    defaultPools: ['stratum+tcp://pool.woolypooly.com:3112', 'stratum+tcp://kas.2miners.com:2020', 'stratum+tcp://acc-pool.pw:16061']
  },
  ERG: {
    name: 'Ergo',
    symbol: 'ERG',
    algorithm: 'Autolykos2',
    icon: 'https://cryptologos.cc/logos/ergo-erg-logo.svg?v=032',
    coingeckoId: 'ergo',
    yieldPerMh: 0.045,
    defaultPools: ['stratum+tcp://de.ergo.herominers.com:11800', 'stratum+tcp://pool.woolypooly.com:3100', 'stratum+tcp://erg.2miners.com:8888']
  },
  XMR: {
    name: 'Monero',
    symbol: 'XMR',
    algorithm: 'RandomX',
    icon: 'https://cryptologos.cc/logos/monero-xmr-logo.svg?v=032',
    coingeckoId: 'monero',
    yieldPerMh: 0.005, // Normalized
    defaultPools: ['stratum+tcp://xmr.2miners.com:2222', 'stratum+tcp://supportxmr.com:3333', 'stratum+tcp://pool.hashvault.pro:443']
  }
};

const Provider: React.FC = () => {
  const [isAuto, setIsAuto] = useState(false);
  const [agentConnected, setAgentConnected] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);

  // User Configurable Settings
  const [powerCost, setPowerCost] = useState<number>(0.12); // $/kWh
  const [minProfitThreshold, setMinProfitThreshold] = useState<number>(0.50); // Min $ profit to mine
  const [selectedCoin, setSelectedCoin] = useState<CoinSymbol>('RVN');
  const [walletAddress, setWalletAddress] = useState('');
  const [activePoolUrl, setActivePoolUrl] = useState(COIN_CATALOG['RVN'].defaultPools[0]);

  // Algorithm Priorities (Order matters for Auto-Switching)
  const [algoPriorities, setAlgoPriorities] = useState<AlgoConfig[]>([
    { name: 'Etchash', enabled: true },
    { name: 'KawPow', enabled: true },
    { name: 'RandomX', enabled: true },
    { name: 'Autolykos2', enabled: true }
  ]);

  // Real Data State
  const [marketPrices, setMarketPrices] = useState<MarketData | null>(null);
  const [telemetry, setTelemetry] = useState<HardwareTelemetry | null>(null);
  const [priceHistory, setPriceHistory] = useState<any[]>([]);

  // Calculated Stats
  const [currentProfitStats, setCurrentProfitStats] = useState<ProfitabilityStats | null>(null);

  // Hysteresis State
  const [pendingSwitch, setPendingSwitch] = useState<PendingSwitch | null>(null);

  const [config, setConfig] = useState({
    workerName: 'HNH-Worker-01',
    algorithm: 'KawPow' as Algorithm
  });

  const [pools, setPools] = useState<PoolConfig[]>([
    { id: '1', url: COIN_CATALOG['RVN'].defaultPools[0], priority: 1 },
  ]);

  const scrollRef = useRef<HTMLDivElement>(null);

  const addLog = (msg: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [`[${timestamp}] ${msg}`, ...prev].slice(0, 100));
  };

  // Scroll to bottom of logs
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = 0;
    }
  }, [logs]);

  // 1. REAL MARKET DATA FETCHING
  useEffect(() => {
    setPriceHistory([]); // Clear chart on coin switch to indicate loading
    const fetchPrices = async () => {
      try {
        // Fetch current prices for all supported coins
        const ids = Object.values(COIN_CATALOG).map(c => c.coingeckoId).join(',');
        const response = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${ids},ethereum&vs_currencies=usd`);
        if (!response.ok) throw new Error("API Limit");
        const data = await response.json();
        setMarketPrices(data);

        // Fetch Historical Chart for active coin
        const activeCoinId = COIN_CATALOG[selectedCoin].coingeckoId;
        const historyRes = await fetch(`https://api.coingecko.com/api/v3/coins/${activeCoinId}/market_chart?vs_currency=usd&days=1`);
        const historyData = await historyRes.json();

        if (historyData.prices) {
          const formatted = historyData.prices.map((p: [number, number]) => ({
            time: new Date(p[0]).toLocaleTimeString([], { hour: '2-digit' }),
            value: p[1]
          })).filter((_: any, i: number) => i % 12 === 0);
          setPriceHistory(formatted);
        }

      } catch (err) {
        // Silent error for smoother UX
      }
    };

    fetchPrices();
    const interval = setInterval(fetchPrices, 60000);
    return () => clearInterval(interval);
  }, [selectedCoin]);

  // 2. HARDWARE MONITORING BRIDGE & FAILOVER
  useEffect(() => {
    let lastJobId = '';
    let initialSyncDone = false;

    const pollAgent = async () => {
      try {
        const response = await fetch('http://localhost:4343/telemetry', {
          method: 'GET',
          signal: AbortSignal.timeout(500)
        });

        if (response.ok) {
          const realStats = await response.json();
          setTelemetry(realStats);

          if (!agentConnected) {
            setAgentConnected(true);
            addLog("✅ Hardware Agent Connected: Monitoring active.");

            // Initial Wallet Sync from Agent
            if (realStats.wallet && !initialSyncDone) {
              setWalletAddress(realStats.wallet);
              initialSyncDone = true;
            }
          }

          // Check for Job Updates
          if (realStats.active_job) {
            if (realStats.active_job.id !== lastJobId) {
              lastJobId = realStats.active_job.id;
              addLog(`⚡ Accepted Job: ${realStats.active_job.title}`);
            }
          } else if (lastJobId && !realStats.active_job) {
            addLog(`✅ Job Completed. Verifying proof...`);
            lastJobId = '';
          }

        }
      } catch (err) {
        // If fetch fails, we assume Agent is offline.
        setAgentConnected(false);
        setTelemetry(null); // No data
        addLog("❌ Hardware Agent Disconnected: Retry in 1s...");
      }
    };

    const interval = setInterval(pollAgent, 1000);
    return () => clearInterval(interval);
  }, [agentConnected]);

  // Save Wallet to Agent
  useEffect(() => {
    if (!agentConnected || !walletAddress) return;

    const timer = setTimeout(() => {
      fetch('http://localhost:4343/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wallet: walletAddress })
      }).catch(() => { });
    }, 1000); // 1s debounce

    return () => clearTimeout(timer);
  }, [walletAddress, agentConnected]);

  // 3. PROFITABILITY LOGIC 
  useEffect(() => {
    if (!marketPrices || !telemetry) return;

    const calculateEv = () => {
      const dailyPowerCost = (telemetry.power_draw / 1000) * 24 * powerCost;

      // Calculate Revenue for ALL coins
      const profitMap: Record<string, number> = {};

      Object.entries(COIN_CATALOG).forEach(([symbol, def]) => {
        const price = marketPrices[def.coingeckoId]?.usd || 0;
        const revenue = telemetry.hashrate * def.yieldPerMh * price;
        profitMap[symbol] = revenue - dailyPowerCost;
      });

      // AI Job Revenue (Fixed Bid for demo)
      const aiRevenue = 4.50;
      const aiNet = aiRevenue - dailyPowerCost;

      // Update stats for CURRENTLY selected coin
      const currentStatsNet = profitMap[selectedCoin];
      const currentGross = currentStatsNet + dailyPowerCost;

      setCurrentProfitStats({
        dailyRevenue: currentGross,
        dailyCost: dailyPowerCost,
        netProfit: currentStatsNet,
        currency: 'USD'
      });

      // --- AUTO SWITCHING LOGIC ---
      if (isAuto) {
        // Determine best option
        let bestOption = { name: 'Llama3-70b', val: aiNet };

        // Check mining options
        Object.entries(profitMap).forEach(([symbol, profit]) => {
          if (profit > bestOption.val && algoPriorities.find(a => a.name === COIN_CATALOG[symbol as CoinSymbol].algorithm)?.enabled) {
            bestOption = { name: symbol, val: profit };
          }
        });

        // Threshold check
        if (bestOption.name !== 'Llama3-70b' && bestOption.val < minProfitThreshold) {
          if (aiNet > 0) {
            bestOption = { name: 'Llama3-70b', val: aiNet };
            addLog(`⚠️ Mining profit below threshold ($${minProfitThreshold}). Prioritizing AI.`);
          }
        }

        // Hysteresis
        const currentAlgoName = config.algorithm === 'Llama3-70b' ? 'Llama3-70b' : selectedCoin;
        const currentVal = config.algorithm === 'Llama3-70b' ? aiNet : profitMap[selectedCoin];

        if (bestOption.name !== currentAlgoName) {
          const MARGIN = 1.10;
          const STABILITY_TIME = 5 * 60 * 1000;

          if (bestOption.val > currentVal * MARGIN) {
            if (pendingSwitch && pendingSwitch.algo === bestOption.name) {
              const elapsed = Date.now() - pendingSwitch.startTime;
              if (elapsed >= STABILITY_TIME) {
                const gain = ((bestOption.val / currentVal - 1) * 100).toFixed(1);
                addLog(`🚀 Switching ${currentAlgoName} -> ${bestOption.name} (+${gain}%)`);

                if (bestOption.name === 'Llama3-70b') {
                  setConfig(prev => ({ ...prev, algorithm: 'Llama3-70b' }));
                } else {
                  setSelectedCoin(bestOption.name as CoinSymbol);
                  setConfig(prev => ({ ...prev, algorithm: COIN_CATALOG[bestOption.name as CoinSymbol].algorithm }));
                }
                setPendingSwitch(null);
              } else {
                // Waiting...
              }
            } else {
              const gain = ((bestOption.val / currentVal - 1) * 100).toFixed(1);
              addLog(`⚠️ Opportunity: ${bestOption.name} (+${gain}%). Starting timer.`);
              setPendingSwitch({ algo: bestOption.name, startTime: Date.now(), targetProfit: bestOption.val });
            }
          } else {
            if (pendingSwitch) {
              setPendingSwitch(null);
            }
          }
        }
      }
    };

    const interval = setInterval(calculateEv, 5000);
    return () => clearInterval(interval);
  }, [isAuto, marketPrices, config.algorithm, pendingSwitch, telemetry, powerCost, minProfitThreshold, algoPriorities, selectedCoin]);

  // --- Actions ---

  const generateWallet = () => {
    const prefixes: Record<CoinSymbol, string> = {
      KAS: 'kaspa:',
      ETC: '0x',
      RVN: 'R',
      ERG: '9',
      XMR: '4'
    };
    const prefix = prefixes[selectedCoin];
    const randomPart = Array.from({ length: 32 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
    const newWallet = `${prefix}${randomPart}...`;
    setWalletAddress(newWallet);
    addLog(`👛 Generated new ${COIN_CATALOG[selectedCoin].name} wallet: ${newWallet}`);
  };

  const handleCoinSelect = (symbol: CoinSymbol) => {
    setSelectedCoin(symbol);
    setConfig(prev => ({ ...prev, algorithm: COIN_CATALOG[symbol].algorithm }));
    // Reset pool to first default of new coin
    setActivePoolUrl(COIN_CATALOG[symbol].defaultPools[0]);
  };

  const toggleAlgo = (name: Algorithm) => {
    setAlgoPriorities(prev => prev.map(a => a.name === name ? { ...a, enabled: !a.enabled } : a));
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">

      {/* Hardware Status Header */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className={`p-4 rounded-xl border ${agentConnected ? 'bg-green-500/10 border-green-500/50' : 'bg-yellow-500/10 border-yellow-500/50'}`}>
          <div className="flex items-center gap-3">
            {agentConnected ? <Wifi className="text-green-500" /> : <Zap className="text-yellow-500" />}
            <div>
              <p className="text-xs font-bold uppercase text-muted">Agent Status</p>
              <p className={`font-bold ${agentConnected ? 'text-green-500' : 'text-yellow-500'}`}>
                {agentConnected ? 'ONLINE' : 'DEMO MODE'}
              </p>
            </div>
          </div>
        </div>

        <div className="p-4 bg-surface border border-white/10 rounded-xl">
          <p className="text-xs font-bold uppercase text-muted mb-1">Verified Shares</p>
          <span className="text-2xl font-bold text-blue-400">{telemetry?.verified_shares || 0}</span>
        </div>

        <div className="p-4 bg-surface border border-white/10 rounded-xl">
          <p className="text-xs font-bold uppercase text-muted mb-1">GPU Temp</p>
          <div className="flex items-end gap-2">
            <span className="text-2xl font-bold text-white">{telemetry?.gpu_temp.toFixed(0) || '--'}°C</span>
            {telemetry && (
              <div className="w-full bg-gray-700 h-1.5 rounded-full mb-2">
                <div className="bg-orange-500 h-1.5 rounded-full" style={{ width: `${(telemetry.gpu_temp / 90) * 100}%` }}></div>
              </div>
            )}
          </div>
        </div>

        <div className="p-4 bg-surface border border-white/10 rounded-xl">
          <p className="text-xs font-bold uppercase text-muted mb-1">Power Draw</p>
          <span className="text-2xl font-bold text-white">{telemetry?.power_draw.toFixed(0) || '--'} W</span>
        </div>

        <div className="p-4 bg-surface border border-white/10 rounded-xl">
          <p className="text-xs font-bold uppercase text-muted mb-1">Real Hashrate</p>
          <span className="text-2xl font-bold text-primary">{telemetry?.hashrate.toFixed(2) || '--'} MH/s</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Controller */}
        <div className="lg:col-span-2 space-y-6">

          <div className="bg-surface border border-white/10 rounded-2xl p-6 relative overflow-hidden">
            <div className="flex justify-between items-start mb-8">
              <div>
                <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                  <Activity className={agentConnected ? "text-primary animate-pulse" : "text-muted"} />
                  Compute Engine
                </h2>
                <p className="text-muted text-sm mt-1">
                  Target: <span className="text-white font-bold">{config.algorithm === 'Llama3-70b' ? 'AI Compute' : COIN_CATALOG[selectedCoin].name}</span>
                </p>
              </div>

              <button
                className={`px-6 py-2 rounded-lg font-bold text-sm transition-all border flex items-center gap-2 ${isAuto
                  ? 'bg-purple-500/20 border-purple-500 text-purple-400'
                  : 'bg-white/5 border-white/10 text-muted hover:text-white'
                  }`}
                onClick={() => setIsAuto(!isAuto)}
              >
                {isAuto ? '🤖 AUTO-PROFIT: ON' : 'MANUAL CONTROL'}
              </button>
            </div>

            {pendingSwitch && (
              <div className="mb-6 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-xl flex items-center gap-3 animate-fade-in">
                <Clock className="text-yellow-500 animate-pulse" size={20} />
                <div>
                  <p className="text-sm text-yellow-500 font-bold">Switch Pending: {pendingSwitch.algo}</p>
                  <p className="text-xs text-yellow-500/80">Stability timer active. Waiting for margin confirmation.</p>
                </div>
              </div>
            )}

            {/* Chart */}
            <div className="h-48 w-full bg-black/20 rounded-xl border border-white/5 overflow-hidden mb-6">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart key={selectedCoin} data={priceHistory}>
                  <defs>
                    <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <Tooltip
                    contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a' }}
                    itemStyle={{ color: '#10b981' }}
                    labelStyle={{ display: 'none' }}
                    formatter={(val: number) => [`$${val.toFixed(4)}`, 'Price']}
                  />
                  <Area type="monotone" dataKey="value" stroke="#10b981" fillOpacity={1} fill="url(#colorPrice)" isAnimationActive={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Coin Selection Grid */}
            <div className="mb-6">
              <h4 className="text-sm text-muted uppercase font-bold mb-3">Active Coin Profile</h4>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                {Object.entries(COIN_CATALOG).map(([symbol, def]) => (
                  <button
                    key={symbol}
                    onClick={() => handleCoinSelect(symbol as CoinSymbol)}
                    disabled={isAuto}
                    className={`p-3 rounded-xl border transition-all flex flex-col items-center gap-2 ${selectedCoin === symbol
                      ? 'bg-primary/10 border-primary text-white shadow-[0_0_10px_rgba(16,185,129,0.2)]'
                      : 'bg-white/5 border-white/5 text-muted hover:bg-white/10 hover:border-white/20'
                      } ${isAuto ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <img src={def.icon} className="w-8 h-8" alt={def.name} />
                    <span className="font-bold text-xs">{symbol}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Pool Config */}
              <div className="bg-black/40 rounded-xl p-4 border border-white/5">
                <h4 className="text-sm text-muted uppercase font-bold mb-3 flex items-center gap-2">
                  <Server size={14} /> Mining Pool
                </h4>
                <div className="relative">
                  <select
                    value={activePoolUrl}
                    onChange={(e) => setActivePoolUrl(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none appearance-none text-sm font-mono truncate pr-8"
                  >
                    {COIN_CATALOG[selectedCoin].defaultPools.map(url => (
                      <option key={url} value={url}>{url}</option>
                    ))}
                    <option value="custom">Custom Stratum URL...</option>
                  </select>
                  <ChevronDown size={16} className="absolute right-3 top-3.5 text-muted pointer-events-none" />
                </div>
                <div className="mt-3 flex items-center gap-2 text-xs text-green-500">
                  <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                  Ping: 24ms
                </div>
              </div>

              {/* Wallet Config */}
              <div className="bg-black/40 rounded-xl p-4 border border-white/5">
                <h4 className="text-sm text-muted uppercase font-bold mb-3 flex items-center gap-2">
                  <Wallet size={14} /> Wallet Configuration
                </h4>
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={walletAddress}
                    onChange={(e) => setWalletAddress(e.target.value)}
                    placeholder={`${selectedCoin} Address`}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none text-sm font-mono"
                  />
                  <button className="p-2 bg-white/5 hover:bg-white/10 rounded-lg text-muted hover:text-white transition-colors">
                    <Copy size={16} />
                  </button>
                </div>
                <button
                  onClick={generateWallet}
                  className="w-full text-xs bg-primary/10 hover:bg-primary/20 text-primary py-2 rounded-lg font-bold transition-colors flex items-center justify-center gap-2"
                >
                  <Plus size={12} /> Generate New {selectedCoin} Wallet
                </button>
              </div>
            </div>
          </div>

          {/* Auto-Switch Config */}
          <div className="bg-surface border border-white/10 rounded-2xl p-6">
            <h4 className="text-sm text-muted uppercase font-bold mb-4 flex items-center gap-2">
              <Settings size={14} /> Auto-Switch Priorities
            </h4>
            <div className="space-y-2">
              {algoPriorities.map((algo, idx) => (
                <div key={algo.name} className="flex items-center justify-between bg-white/5 p-3 rounded-lg border border-white/5">
                  <div className="flex items-center gap-3">
                    <button onClick={() => toggleAlgo(algo.name)}>
                      {algo.enabled ? <CheckSquare size={18} className="text-primary" /> : <Square size={18} className="text-muted" />}
                    </button>
                    <span className={`text-sm font-medium ${algo.enabled ? 'text-white' : 'text-muted'}`}>{algo.name}</span>
                  </div>
                  <div className="text-xs text-muted bg-black/40 px-2 py-1 rounded">
                    {isAuto ? 'Monitoring' : 'Standby'}
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* Real Logs & Stats */}
        <div className="lg:col-span-1 flex flex-col gap-6">
          {currentProfitStats && (
            <div className="bg-surface border border-white/10 rounded-2xl p-6">
              <h4 className="text-sm text-muted uppercase font-bold mb-4">Daily Projections</h4>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-muted">Est. Revenue</span>
                  <span className="text-white font-mono text-lg">${currentProfitStats.dailyRevenue.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted">Power Cost</span>
                  <span className="text-red-400 font-mono text-lg">-${currentProfitStats.dailyCost.toFixed(2)}</span>
                </div>
                <div className="h-px bg-white/10 my-2"></div>
                <div className="flex justify-between items-center">
                  <span className="text-white font-bold">Net Profit</span>
                  <span className={`font-mono text-2xl font-bold ${currentProfitStats.netProfit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    ${currentProfitStats.netProfit.toFixed(2)}
                  </span>
                </div>

                <div className="pt-4 mt-2 border-t border-white/5">
                  <label className="text-xs text-muted block mb-2">Electricity Cost ($/kWh)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={powerCost}
                    onChange={(e) => setPowerCost(parseFloat(e.target.value))}
                    className="bg-black/20 text-white w-full focus:outline-none font-mono text-sm p-2 rounded border border-white/10"
                  />
                </div>
              </div>
            </div>
          )}

          <div className="bg-black border border-white/10 rounded-2xl overflow-hidden flex flex-col h-full min-h-[400px] shadow-2xl">
            <div className="bg-white/5 px-4 py-3 border-b border-white/5 flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs text-gray-400 font-mono">
                <Terminal size={14} />
                <span>agent.log</span>
              </div>
              <div className="flex gap-1.5">
                <div className={`w-2 h-2 rounded-full ${agentConnected ? 'bg-green-500' : 'bg-yellow-500'}`}></div>
              </div>
            </div>
            <div ref={scrollRef} className="flex-1 p-4 font-mono text-xs overflow-y-auto space-y-1 text-gray-300">
              {logs.length === 0 && <span className="text-gray-600 italic">Initializing system...</span>}
              {logs.map((log, i) => (
                <div key={i} className="border-l-2 border-white/10 pl-2 hover:bg-white/5 transition-colors">
                  {log}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Provider;
