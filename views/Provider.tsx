import React, { useState, useEffect, useRef } from 'react';
import { Algorithm } from '../types';
import './Provider.css';
import { Settings, Activity, Zap, Server, Wifi, Terminal, AlertTriangle, Plus, Trash2, Clock, CheckSquare, Square, Wallet, Copy, RefreshCw, ChevronDown, ExternalLink, Cpu, Download, Monitor, AlertCircle, PlayCircle } from 'lucide-react';
import { AreaChart, Area, Tooltip, ResponsiveContainer } from 'recharts';
import { DynamicDiv } from '../components/DynamicDiv';

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
  logs?: string[];
  verified_shares?: number;
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
    defaultPools: [
      'stratum+tcp://us.etchash-pool.2miners.com:1010',
      'stratum+tcp://de.etc.herominers.com:10161',
      'stratum+tcp://etc-us-east1.nanopool.org:19999' // Replaced SSL pool with Nanopool TCP
    ]
  },
  RVN: {
    name: 'Ravencoin',
    symbol: 'RVN',
    algorithm: 'KawPow',
    icon: 'https://cryptologos.cc/logos/ravencoin-rvn-logo.svg?v=032',
    coingeckoId: 'ravencoin',
    yieldPerMh: 2.8,
    defaultPools: [
      'stratum+tcp://stratum-ravencoin.flypool.org:3333',
      'stratum+tcp://rvn.2miners.com:6060',
      'stratum+tcp://rvn.herominers.com:10240'
    ]
  },
  KAS: {
    name: 'Kaspa',
    symbol: 'KAS',
    algorithm: 'KawPow',
    icon: 'https://cryptologos.cc/logos/kaspa-kas-logo.svg?v=032',
    coingeckoId: 'kaspa',
    yieldPerMh: 0.5,
    defaultPools: [
      'stratum+tcp://pool.woolypooly.com:3112',
      'stratum+tcp://kas.2miners.com:2020',
      'stratum+tcp://acc-pool.pw:16061'
    ]
  },
  ERG: {
    name: 'Ergo',
    symbol: 'ERG',
    algorithm: 'Autolykos2',
    icon: 'https://cryptologos.cc/logos/ergo-erg-logo.svg?v=032',
    coingeckoId: 'ergo',
    yieldPerMh: 0.045,
    defaultPools: [
      'stratum+tcp://de.ergo.herominers.com:11800',
      'stratum+tcp://pool.woolypooly.com:3100',
      'stratum+tcp://erg.2miners.com:8888'
    ]
  },
  XMR: {
    name: 'Monero',
    symbol: 'XMR',
    algorithm: 'RandomX',
    icon: 'https://cryptologos.cc/logos/monero-xmr-logo.svg?v=032',
    coingeckoId: 'monero',
    yieldPerMh: 0.005,
    defaultPools: [
      'stratum+tcp://xmr.2miners.com:2222',
      'stratum+tcp://xmr.nanopool.org:14444',
      'stratum+tcp://pool.hashvault.pro:80' // Using port 80 for firewall bypass (TCP)
    ]
  }
};

import { getCurrentUser, API_URL } from '../services/authService';


const Provider: React.FC = () => {
  const currentUser = getCurrentUser();
  const userId = currentUser?.id || 'guest';

  const [isAuto, setIsAuto] = useState(false);
  const [agentConnected, setAgentConnected] = useState(false);


  // Agent Config
  const [agentUrl, setAgentUrl] = useState(() => localStorage.getItem(`hnh_agent_url_${userId}`) || import.meta.env.VITE_AGENT_URL || '');
  // Browser Miner State
  const workerRef = useRef<Worker | null>(null);
  const [isBrowserMining, setIsBrowserMining] = useState(false);

  const [clientLogs, setClientLogs] = useState<string[]>([]);
  const [serverLogs, setServerLogs] = useState<string[]>([]);

  // User Configurable Settings
  const [powerCost, setPowerCost] = useState<number>(0.12); // $/kWh
  const [minProfitThreshold, setMinProfitThreshold] = useState<number>(0.50); // Min $ profit to mine
  const [selectedCoin, setSelectedCoin] = useState<CoinSymbol>('XMR');

  // Wallet Persistence
  const [savedWallets, setSavedWallets] = useState<Record<string, string>>(() => {
    const saved = localStorage.getItem(`hnh_wallets_${userId}`);
    return saved ? JSON.parse(saved) : {
      RVN: 'RHUC17zAVjNqXDtkqwLPRvQ2XgoRZsXeeG', // Default valid
      ETC: '', XMR: '', KAS: '', ERG: ''
    };
  });

  const [walletAddress, setWalletAddress] = useState(savedWallets['RVN'] || '');
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
    setClientLogs((prev: string[]) => [`[${timestamp}] ${msg}`, ...prev].slice(0, 50));
  };


  // Combine logs for display
  const displayLogs = [...clientLogs, ...serverLogs].sort((a, b) => {
    // Extract timestamp [HH:MM:SS]
    const timeA = a.match(/\[(.*?)\]/)?.[1] || '';
    const timeB = b.match(/\[(.*?)\]/)?.[1] || '';
    return timeB.localeCompare(timeA); // Newest first
  });

  // Scroll to bottom of logs
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = 0;
    }
  }, [clientLogs, serverLogs]);

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
        const response = await fetch(`${agentUrl}/telemetry`, {
          method: 'GET',
          signal: AbortSignal.timeout(500)
        });


        if (response.ok) {
          const realStats = await response.json();
          setTelemetry(realStats);
          if (realStats.logs) {
            setServerLogs(realStats.logs);
          }

          // ALSO: Report this telemetry to our Backend API (Cloud Sync)
          // This allows the dashboard to see this worker even if it's running on another machine
          const token = localStorage.getItem('hnh_token');
          if (token && realStats.hashrate > 0) {
            fetch(`${API_URL}/miner/telemetry`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
              body: JSON.stringify({
                userId: 'session', // In real app, JWT handles user ID extraction
                workerName: config.workerName || 'HNH-Worker',
                hashrate: realStats.hashrate,
                temp: realStats.gpu_temp,
                power: realStats.power_draw
              })
            }).catch(() => { });
          }

          if (!agentConnected) {
            setAgentConnected(true);
            // Stop Browser Miner if Agent connects
            if (isBrowserMining) {
              stopBrowserMiner();
            }
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
        // setTelemetry(null); // Keep last known or switch to browser stats

        // AUTO-FALLBACK: Start Browser Miner
        if (!isBrowserMining && !agentConnected) {
          startBrowserMiner();
        }

        // Only log disconnect once every 5 seconds to prevent flood
        if (Math.random() > 0.8) {
          addLog("⚠️ Agent Disconnected. Switching to Browser CPU Mining...");
        }
      }
    };

    const interval = setInterval(pollAgent, 1000);
    return () => clearInterval(interval);
  }, [agentConnected]);

  // Save Wallet to Agent
  useEffect(() => {
    if (!agentConnected || !walletAddress) return;

    const timer = setTimeout(() => {
      fetch(`${agentUrl}/config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          wallet: walletAddress,
          poolUrl: activePoolUrl
        })
      }).catch(() => { });
    }, 1000); // 1s debounce

    return () => clearTimeout(timer);
  }, [walletAddress, activePoolUrl, agentConnected]);

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
    handleWalletChange(newWallet);
    addLog(`👛 Generated new ${COIN_CATALOG[selectedCoin].name} wallet: ${newWallet}`);
  };

  const startBrowserMiner = () => {
    if (workerRef.current) return;

    setIsBrowserMining(true);
    addLog("🚀 Starting Browser Miner (Fallback Mode)...");

    const worker = new Worker(new URL('../workers/miner.worker.ts', import.meta.url));
    worker.onmessage = (e) => {
      const { type, data } = e.data;

      if (type === 'log') {
        addLog(data);
      } else if (type === 'stats') {
        // Update Telemetry with Browser Stats
        setTelemetry(prev => ({
          ...prev || {
            gpu_temp: 45, // CPU cooler
            fan_speed: 30,
            power_draw: 65, // CPU watts
            vram_used: 0,
            logs: []
          },
          hashrate: data.hashrate / 1000000, // Convert to MH/s (fake scale for browser)
          verified_shares: data.shares + (prev?.verified_shares || 0),
          gpu_util: 100, // CPU pinned
          logs: prev?.logs || []
        } as HardwareTelemetry));
      }
    };

    worker.postMessage({ command: 'START' });
    workerRef.current = worker;
  };

  const stopBrowserMiner = () => {
    if (workerRef.current) {
      workerRef.current.postMessage({ command: 'STOP' });
      workerRef.current.terminate();
      workerRef.current = null;
    }
    setIsBrowserMining(false);
    addLog("🛑 Browser Miner Stopped.");
  };

  // Cleanup
  useEffect(() => {
    return () => {
      stopBrowserMiner();
    };
  }, []);

  const handleCoinSelect = (symbol: CoinSymbol) => {
    setSelectedCoin(symbol);
    setConfig(prev => ({ ...prev, algorithm: COIN_CATALOG[symbol].algorithm }));
    // Reset pool to first default of new coin
    setActivePoolUrl(COIN_CATALOG[symbol].defaultPools[0]);
    // Restore wallet for this coin
    setWalletAddress(savedWallets[symbol] || '');
  };

  const handleWalletChange = (val: string) => {
    setWalletAddress(val);
    const newMap = { ...savedWallets, [selectedCoin]: val };
    setSavedWallets(newMap);
    localStorage.setItem(`hnh_wallets_${userId}`, JSON.stringify(newMap));
  };

  const toggleAlgo = (name: Algorithm) => {
    setAlgoPriorities(prev => prev.map(a => a.name === name ? { ...a, enabled: !a.enabled } : a));
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">

      {/* Hardware Status Header */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className={`p-4 rounded-xl border ${agentConnected ? 'bg-green-500/10 border-green-500/50' : 'bg-red-500/10 border-red-500/50'}`}>
          <div className="flex items-center gap-3">
            {agentConnected ? <Wifi className="text-green-500" /> : <Cpu className="text-blue-500 animate-pulse" />}
            <div className="flex-1 overflow-hidden">
              <p className="text-xs font-bold uppercase text-muted">Mining Mode</p>
              <div className="flex justify-between items-center">
                <p className={`font-bold ${agentConnected ? 'text-green-500' : 'text-amber-500'}`}>
                  {agentConnected ? 'GPU (NATIVE)' : 'CPU (BROWSER)'}
                </p>
              </div>

              {/* Agent URL Config (Mini) */}
              <div className="mt-1 flex items-center gap-1">
                <span className="text-[10px] text-muted whitespace-nowrap">Host:</span>
                <input
                  type="text"
                  value={agentUrl}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                    setAgentUrl(e.target.value);
                    localStorage.setItem(`hnh_agent_url_${userId}`, e.target.value);
                  }}
                  aria-label="Agent URL"
                  title="Agent URL"
                  placeholder="http://127.0.0.1:4343"
                  className="bg-black/20 border-none text-[10px] text-white w-full rounded px-1 h-5 focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="p-4 bg-surface border border-white/10 rounded-xl">
          <p className="text-xs font-bold uppercase text-muted mb-1">Gross Shares</p>
          <span className="text-2xl font-bold text-blue-400">{(telemetry as any)?.gross_shares || telemetry?.verified_shares || 0}</span>
        </div>

        <div className="p-4 bg-surface border border-white/10 rounded-xl">
          <p className="text-xs font-bold uppercase text-muted mb-1">Net Shares</p>
          <span className="text-2xl font-bold text-green-400">{telemetry?.verified_shares || 0}</span>
          <p className="text-[10px] text-muted">After {(telemetry as any)?.fee_rate || 2}% platform fee</p>
        </div>

        <div className="p-4 bg-surface border border-red-500/20 rounded-xl">
          <p className="text-xs font-bold uppercase text-red-400 mb-1">Platform Fee</p>
          <span className="text-2xl font-bold text-red-400">{((telemetry as any)?.fee_deducted || 0).toFixed(4)}</span>
          <p className="text-[10px] text-muted capitalize">Tier: {(telemetry as any)?.user_tier || 'free'}</p>
        </div>

        <div className="p-4 bg-surface border border-white/10 rounded-xl">
          <p className="text-xs font-bold uppercase text-muted mb-1">GPU Temp</p>
          <div className="flex items-end gap-2">
            <span className="text-2xl font-bold text-white">{telemetry?.gpu_temp.toFixed(0) || '--'}°C</span>

            {telemetry && (
              <div className="w-full bg-gray-700 h-1.5 rounded-full mb-2">
                <DynamicDiv className="h-1.5 rounded-full temp-bar-fill" cssVars={{ '--temp-width': `${(telemetry.gpu_temp / 90) * 100}%` }}></DynamicDiv>
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
          {!agentConnected && <span className="text-[10px] text-amber-500 block">Low Efficiency (PoC)</span>}
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
                    aria-label="Mining Pool"
                    title="Select Mining Pool"
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
                    onChange={(e) => handleWalletChange(e.target.value)}
                    placeholder={`${selectedCoin} Address`}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none text-sm font-mono"
                  />
                  <button
                    className="p-2 bg-white/5 hover:bg-white/10 rounded-lg text-muted hover:text-white transition-colors"
                    aria-label="Copy wallet address"
                    title="Copy wallet address"
                  >
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
              {algoPriorities.map((algo: AlgoConfig, idx: number) => (
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
                    aria-label="Electricity Cost"
                    title="Electricity cost per kWh"
                    placeholder="0.12"
                    className="bg-black/20 text-white w-full focus:outline-none font-mono text-sm p-2 rounded border border-white/10"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Native Miner Setup */}
        </div>
      </div>

      {/* Full Width Native Miner & Logs Section */}
      <div className="grid grid-cols-1 gap-6 animate-fade-in-up">

        {/* Native Miner Setup - Expanded */}
        {!agentConnected && (
          <div className="bg-gradient-to-r from-primary/10 to-blue-600/10 border border-primary/20 rounded-2xl p-8 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8 opacity-10">
              <Monitor size={200} />
            </div>

            <div className="relative z-10">
              <h4 className="text-2xl font-bold text-white mb-4 flex items-center gap-3">
                <Download className="text-primary w-8 h-8" />
                Install Native Miner
              </h4>
              <p className="text-base text-gray-300 mb-8 max-w-2xl">
                Unlock the full potential of your hardware. The browser miner is limited by web safety protocols.
                Deploy the native agent to access raw GPU power, temperature monitoring, and automatic algorithm switching.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Linux / Mac */}
                <div className="bg-black/40 border border-white/10 rounded-xl p-6 hover:border-primary/50 transition-colors group">
                  <div className="flex items-center gap-3 mb-4">
                    <Terminal className="text-white" />
                    <span className="font-bold text-white text-lg">Linux / macOS</span>
                  </div>
                  <code
                    className="block text-sm font-mono text-green-400 bg-black p-4 rounded-lg break-all cursor-pointer hover:bg-white/5 transition-colors border border-white/5"
                    onClick={() => {
                      const origin = window.location.origin;
                      const cmd = `curl -L -o setup_miner.sh ${origin}/scripts/setup_miner.sh && chmod +x setup_miner.sh && ./setup_miner.sh ${origin}`;
                      navigator.clipboard.writeText(cmd);
                      addLog("📋 Copied install command to clipboard");
                    }}
                  >
                    curl -L -o setup_miner.sh {typeof window !== 'undefined' ? window.location.origin : ''}/scripts/setup_miner.sh && chmod +x setup_miner.sh && ./setup_miner.sh {typeof window !== 'undefined' ? window.location.origin : ''}
                  </code>
                  <p className="text-xs text-muted mt-2 text-center">Click command to copy</p>
                </div>

                {/* Windows */}
                <div className="bg-black/40 border border-white/10 rounded-xl p-6 hover:border-primary/50 transition-colors">
                  <div className="flex justify-between items-center mb-4">
                    <div className="flex items-center gap-3">
                      <Monitor className="text-blue-400" />
                      <span className="font-bold text-white text-lg">Windows</span>
                    </div>
                  </div>
                  <a
                    href="/scripts/setup_miner_windows.ps1"
                    download
                    className="flex flex-col items-center justify-center p-4 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 rounded-xl border border-blue-500/30 transition-all group"
                    onClick={() => addLog("⬇️ Downloading Windows Installer...")}
                  >
                    <Download className="mb-2 w-8 h-8 group-hover:scale-110 transition-transform" />
                    <span className="font-bold">Download Native Miner (Electron)</span>
                  </a>
                  <p className="text-xs text-muted mt-3 text-center">
                    Right-click the downloaded file and select "Run with PowerShell"
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Verbose Logs - Expanded */}
        <div className="bg-black border border-white/10 rounded-2xl overflow-hidden shadow-2xl flex flex-col h-[500px]">
          <div className="bg-white/5 px-6 py-4 border-b border-white/5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Terminal size={18} className="text-muted" />
              <span className="font-mono text-sm font-bold text-gray-300">System Logs & Telemetry</span>
              <span className="px-2 py-0.5 bg-white/10 rounded text-[10px] text-muted uppercase tracking-wider">Verbose Mode</span>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setClientLogs([])} className="p-1 hover:bg-white/10 rounded text-muted hover:text-white" title="Clear Logs">
                <Trash2 size={14} />
              </button>
              <div className={`w-3 h-3 rounded-full ${agentConnected ? 'bg-green-500 shadow-[0_0_10px_#22c55e]' : 'bg-amber-500'}`}></div>
            </div>
          </div>
          <div ref={scrollRef} className="flex-1 p-6 font-mono text-sm overflow-y-auto space-y-1.5 text-gray-300 bg-black/50">
            {displayLogs.length === 0 && (
              <div className="h-full flex flex-col items-center justify-center text-muted opacity-50">
                <Activity size={48} className="mb-4" />
                <p>Waiting for system events...</p>
              </div>
            )}
            {displayLogs.map((log, i) => (
              <div key={i} className="border-l-2 border-white/10 pl-3 py-0.5 hover:bg-white/5 transition-colors break-words flex gap-3">
                <span className="text-white/30 text-xs shrink-0 select-none">{i + 1}</span>
                <span>{log}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Provider;
