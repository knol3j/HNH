import React, { useState, useEffect } from 'react';
import { NetworkStats } from '../types';
import {
  Activity,
  Calculator,
  Cpu,
  HardDrive,
  RefreshCw,
  Server,
  TrendingUp,
  Zap,
  Terminal,
  ArrowRight,
  Coins,
  Flame,
  Trophy,
  Star
} from 'lucide-react';
import { calculateProfitability } from '../services/profitabilityService';
import { getUserStats, getLevelProgress, formatMiningTime, UserStats } from '../services/statsService';
import { getUserAchievements, Achievement } from '../services/achievementService';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts';
import './Dashboard.css';
import { DynamicDiv } from '../components/DynamicDiv';

interface DashboardProps {
  stats: NetworkStats;
  aiAnalysis: string;
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-surface border border-white/10 p-3 rounded-lg shadow-xl backdrop-blur-md">
        <p className="text-muted text-xs mb-1">{label}</p>

        {payload.map((p: any) => (
          <DynamicDiv
            key={p.name}
            className="font-bold text-sm tooltip-item"
            cssVars={{ '--tooltip-color': p.color }}
          >
            {p.name}: ${p.value.toFixed(2)}
          </DynamicDiv>
        ))}
      </div>
    );
  }
  return null;
};

const Dashboard: React.FC<DashboardProps> = ({ stats, aiAnalysis }) => {
  const [calcGpu, setCalcGpu] = useState('RTX 4090');
  const [sectorData, setSectorData] = useState<any[]>([]);
  const [isLoadingChart, setIsLoadingChart] = useState(true);
  const [realJobs, setRealJobs] = useState<any[]>([]);

  // Gamification state
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [recentAchievements, setRecentAchievements] = useState<Achievement[]>([]);

  // Fetch user stats and achievements
  useEffect(() => {
    const fetchGamificationData = async () => {
      try {
        const statsData = await getUserStats();
        if (statsData) {
          setUserStats(statsData.stats);
        }

        const achievementsData = await getUserAchievements();
        if (achievementsData) {
          // Get the 3 most recent unlocked achievements
          const recent = achievementsData.unlocked
            .sort((a, b) => new Date(b.unlockedAt || 0).getTime() - new Date(a.unlockedAt || 0).getTime())
            .slice(0, 3);
          setRecentAchievements(recent);
        }
      } catch (e) {
        console.error('Failed to fetch gamification data:', e);
      }
    };

    fetchGamificationData();
    // Refresh every 60 seconds
    const interval = setInterval(fetchGamificationData, 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const fetchJobs = async () => {
      try {
        const agentUrl = localStorage.getItem('hnh_agent_url') || import.meta.env.VITE_AGENT_URL || '';
        const res = await fetch(`${agentUrl}/jobs`);
        if (res.ok) {
          setRealJobs(await res.json());
        }
      } catch (e) {
        setRealJobs([]);
      }
    };

    fetchJobs();
    const interval = setInterval(fetchJobs, 2000);
    return () => clearInterval(interval);
  }, []);

  // Fetch Real Compute Sector Data (Akash, Render, Bittensor)
  useEffect(() => {
    const fetchSectorData = async () => {
      try {
        const response = await fetch('https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=akash-network,render-token,bittensor&sparkline=true');
        const data = await response.json();

        // Process sparkline data (last 7 days, hourly-ish)
        // We will normalize the length to the shortest one to overlay them
        if (data && data.length > 0) {
          const rndr = data.find((c: any) => c.id === 'render-token');
          const akt = data.find((c: any) => c.id === 'akash-network');
          const tao = data.find((c: any) => c.id === 'bittensor');

          const points = rndr.sparkline_in_7d.price.length;
          const chart = [];

          // Create 24 points representing the last 7 days (sampled)
          const step = Math.floor(points / 24);

          for (let i = 0; i < 24; i++) {
            const idx = i * step;
            chart.push({
              time: `Day ${Math.floor(i / 3.5)}`, // Rough day approximation
              RNDR: rndr.sparkline_in_7d.price[idx] || 0,
              AKT: akt ? akt.sparkline_in_7d.price[idx] : 0,
              TAO: tao ? tao.sparkline_in_7d.price[idx] : 0
            });
          }
          setSectorData(chart);
        }
      } catch (error) {
        console.error("Error fetching sector data", error);
      } finally {
        setIsLoadingChart(false);
      }
    };

    fetchSectorData();
  }, []);

  // Live Mining Balance (New Feature)
  const [miningBalance, setMiningBalance] = useState<{ unpaid: number, currency: string, usdValue: number }>({ unpaid: 0, currency: '', usdValue: 0 });

  useEffect(() => {
    const fetchBalance = async () => {
      try {
        const agentUrl = 'http://localhost:4343'; // Default local agent
        const res = await fetch(`${agentUrl}/telemetry`);
        if (!res.ok) return;
        const telemetry = await res.json();

        if (telemetry.wallet && telemetry.coin) {
          const coin = telemetry.coin.toLowerCase();
          // Only support 2miners coins for this demo
          if (['xmr', 'rvn', 'eth', 'etc'].includes(coin)) {
            try {
              const poolRes = await fetch(`https://${coin}.2miners.com/api/accounts/${telemetry.wallet}`);
              const poolData = await poolRes.json();

              // 2miners returns stats.balance (unpaid) in base units, need to divide (usually 1e9 for XMR/RVN/ETH is 1e18, simplified here assuming API returns formatted or we need to normalize)
              // ACTUALLY 2miners API returns 'stats.balance' in wei/pico. 
              // RVN: 1e8, XMR: 1e12, ETH: 1e18. 
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

              setMiningBalance({
                unpaid,
                currency: telemetry.coin,
                usdValue: unpaid * price
              });
            } catch (poolErr) {
              console.error("Pool fetch error", poolErr);
            }
          }
        }
      } catch (e) {
        // Agent offline
      }
    };

    fetchBalance();
    const interval = setInterval(fetchBalance, 10000); // 10s poll
    return () => clearInterval(interval);
  }, []);

  // Profitability Logic
  const [profitEstimates, setProfitEstimates] = useState<{ mining: number, ai: number }>({ mining: 0, ai: 0 });

  useEffect(() => {
    const updateEstimates = async () => {
      // Fetch base profitability (USD/day for 1 GH/s or similar baseline)
      // ProfitabilityService returns "estimatedDailyUsd" for baseline hashrate (1000 H/s ?)
      const profs = await calculateProfitability(1000); // 1000 H/s baseline

      // Map GPU to approximate Hashrates
      // RTX 4090: KawPow ~50 MH/s, Autolykos ~250 MH/s, Etchash ~130 MH/s. RandomX (CPU) irrelevant.
      // Let's use RVN (KawPow) as reference for GPU mining profitability on consumer cards.
      const rvn = profs.find(p => p.symbol === 'RVN');
      const etc = profs.find(p => p.symbol === 'ETC');

      // Base Unit in Service is 1000 H/s? Service says:
      // dailyCoins = (hashrateHs * 86400 * reward) / ...
      // So passed hashrate is in H/s.

      // 4090 Hashrates (approx)
      // RVN: 50 MH/s = 50,000,000 H/s
      // ETC: 130 MH/s = 130,000,000 H/s

      // Profit calc:
      let miningRevenue = 0;
      if (rvn) {
        // Re-calc for 50MH/s
        // Service calc was for 1000 H/s. So multiply result by 50,000.
        miningRevenue = (rvn.estimatedDailyUsd * 50000);
      }

      // AI Revenue is usually higher but market dependent. 
      // Real logic: Vast.ai/Runpod 4090 prices ~ $0.40 - $0.50 / hr = $9.6 - $12 / day.
      // Mining revenue for 4090 on RVN is ~ $2.50 / day (very rough).
      // To be safe and "real data" driven, let's just stick to fixed AI market rates (hard to API fetch without auth)
      // and dynamic mining rates.

      // Adjust for selected GPU
      let mult = 1;
      if (calcGpu === 'RTX 3090') mult = 0.8;
      if (calcGpu === 'NVIDIA A100') mult = 3; // Mining A100 is bad idea, but AI is high
      if (calcGpu === 'NVIDIA H100') mult = 6;

      // Daily -> Hourly
      const miningHourly = (miningRevenue * mult) / 24;

      // AI Hourly (Static Market Averages 2024)
      let aiHourly = 0.45; // 4090
      if (calcGpu === 'RTX 3090') aiHourly = 0.25;
      if (calcGpu === 'NVIDIA A100') aiHourly = 1.20;
      if (calcGpu === 'NVIDIA H100') aiHourly = 2.50;

      setProfitEstimates({
        mining: miningHourly,
        ai: aiHourly
      });
    };

    updateEstimates();
  }, [calcGpu]); // Recalc when GPU changes

  const estimates = profitEstimates;
  const aiPremium = ((estimates.ai - estimates.mining) / estimates.mining * 100).toFixed(0);
  const isAiProfitable = estimates.ai > estimates.mining;

  return (
    <div className="space-y-6">
      <header className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-white mb-2">Network Status</h2>
          <p className="text-muted">Global decentralized compute metrics.</p>
        </div>
        <div className="flex gap-4">
          <div className="px-4 py-2 bg-white/5 rounded-lg border border-white/10 text-xs text-muted">
            <span className="block mb-1">Network Status</span>
            <span className="text-emerald-500 font-mono flex items-center gap-2"><span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span> ONLINE</span>
          </div>
        </div>
      </header>

      {/* Top Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Active Nodes */}
        <div className="bg-surface border border-white/5 rounded-2xl p-6 relative overflow-hidden group hover:border-primary/30 transition-colors">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <Server size={48} />
          </div>
          <p className="text-muted text-sm font-medium uppercase tracking-wider">Active Nodes</p>
          <h3 className="text-2xl font-bold text-white mt-1">{stats.activeNodes.toLocaleString()}</h3>
          <div className="flex items-center mt-2 text-sm text-primary">
            <Activity size={16} className="mr-1" />
            <span>Global Count</span>
          </div>
        </div>

        {/* Compute Power */}
        <div className="bg-surface border border-white/5 rounded-2xl p-6 relative overflow-hidden group hover:border-accent/30 transition-colors">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <Cpu size={48} />
          </div>
          <p className="text-muted text-sm font-medium uppercase tracking-wider">Total Compute</p>
          <h3 className="text-2xl font-bold text-white mt-1">{(stats.totalTflops / 1000).toFixed(1)} PFLOPS</h3>
          <p className="text-xs text-muted mt-2">
            Network Capacity
          </p>
        </div>

        {/* Utilization */}
        <div className="bg-surface border border-white/5 rounded-2xl p-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <Zap size={48} />
          </div>
          <p className="text-muted text-sm font-medium uppercase tracking-wider">Network Load</p>
          <div className="flex items-center justify-between mt-1">
            <h3 className={`text-2xl font-bold ${stats.networkUtilization > 80 ? 'text-warning' : 'text-white'}`}>
              {stats.networkUtilization}%
            </h3>
            <span className="text-primary font-mono bg-primary/10 px-2 py-1 rounded text-sm">
              {stats.jobsRunning} Active Jobs
            </span>
          </div>
        </div>

        {/* AI Insight Mini */}
        <div className="bg-gradient-to-br from-indigo-900/40 to-surface border border-indigo-500/20 rounded-2xl p-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-20">
            <HardDrive size={48} className="text-indigo-400" />
          </div>
          <p className="text-indigo-300 text-sm font-medium uppercase tracking-wider flex items-center gap-2">
            AI Orchestrator
          </p>
          <p className="text-sm text-gray-300 mt-2 line-clamp-3 leading-relaxed">
            {aiAnalysis || "Analyzing network liquidity..."}
          </p>
        </div>

        {/* Live Payout (New) */}
        <div className="bg-surface border border-white/5 rounded-2xl p-6 relative overflow-hidden group hover:border-emerald-500/30 transition-colors">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <Coins size={48} className="text-emerald-500" />
          </div>
          <p className="text-muted text-sm font-medium uppercase tracking-wider">Live Payout</p>
          <h3 className="text-2xl font-bold text-white mt-1">${miningBalance.usdValue.toFixed(4)}</h3>
          <p className="text-xs text-emerald-400 mt-2 font-mono">
            {miningBalance.unpaid.toFixed(6)} {miningBalance.currency || 'PENDING'}
          </p>
        </div>
      </div>

      {/* Gamification Section */}
      {userStats && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Player Stats Card */}
          <div className="bg-gradient-to-br from-purple-900/30 to-surface border border-purple-500/20 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-purple-500/20 rounded-xl flex items-center justify-center">
                  <Star className="text-purple-400" size={24} />
                </div>
                <div>
                  <p className="text-purple-300 text-xs uppercase tracking-wider">Level {userStats.level}</p>
                  <h3 className="text-xl font-bold text-white">{userStats.rank}</h3>
                </div>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-purple-400">{userStats.xp}</p>
                <p className="text-xs text-muted">XP</p>
              </div>
            </div>

            {/* XP Progress Bar */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs text-muted">
                <span>Progress to Level {userStats.level + 1}</span>
                <span>{getLevelProgress(userStats.xp, userStats.level).toFixed(0)}%</span>
              </div>
              <div className="h-2 bg-black/40 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-500"
                  style={{ width: `${getLevelProgress(userStats.xp, userStats.level)}%` }}
                />
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-white/10 grid grid-cols-2 gap-4">
              <div>
                <p className="text-muted text-xs">Total Shares</p>
                <p className="text-white font-bold">{userStats.totalShares.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-muted text-xs">Mining Time</p>
                <p className="text-white font-bold">{formatMiningTime(userStats.totalMiningTime)}</p>
              </div>
            </div>
          </div>

          {/* Streak Card */}
          <div className="bg-gradient-to-br from-orange-900/30 to-surface border border-orange-500/20 rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-orange-500/20 rounded-xl flex items-center justify-center">
                <Flame className="text-orange-400" size={24} />
              </div>
              <div>
                <p className="text-orange-300 text-xs uppercase tracking-wider">Mining Streak</p>
                <h3 className="text-3xl font-bold text-white">{userStats.currentStreak} <span className="text-lg text-muted">days</span></h3>
              </div>
            </div>

            <div className="bg-black/20 rounded-xl p-4">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-muted text-xs">Best Streak</p>
                  <p className="text-white font-bold text-xl">{userStats.longestStreak} days</p>
                </div>
                <div className="text-right">
                  <p className="text-muted text-xs">Last Mined</p>
                  <p className="text-white text-sm">
                    {userStats.lastMiningDate
                      ? new Date(userStats.lastMiningDate).toLocaleDateString()
                      : 'Never'}
                  </p>
                </div>
              </div>
            </div>

            {userStats.currentStreak >= 7 && (
              <div className="mt-4 bg-orange-500/10 border border-orange-500/20 rounded-lg p-3 text-center">
                <span className="text-orange-400 text-sm font-bold">Weekly Warrior Active!</span>
              </div>
            )}
          </div>

          {/* Recent Achievements */}
          <div className="bg-gradient-to-br from-yellow-900/30 to-surface border border-yellow-500/20 rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-yellow-500/20 rounded-xl flex items-center justify-center">
                <Trophy className="text-yellow-400" size={24} />
              </div>
              <div>
                <p className="text-yellow-300 text-xs uppercase tracking-wider">Recent Achievements</p>
                <h3 className="text-lg font-bold text-white">{recentAchievements.length} Unlocked</h3>
              </div>
            </div>

            <div className="space-y-3">
              {recentAchievements.length === 0 ? (
                <div className="text-center py-4 text-muted text-sm">
                  No achievements yet. Start mining to earn!
                </div>
              ) : (
                recentAchievements.map((achievement) => (
                  <div key={achievement.id} className="flex items-center gap-3 bg-black/20 rounded-lg p-3">
                    <span className="text-2xl">{achievement.icon || '🏆'}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-bold text-sm truncate">{achievement.name}</p>
                      <p className="text-muted text-xs truncate">{achievement.description}</p>
                    </div>
                    <span className="text-yellow-400 text-xs font-bold">+{achievement.xpReward} XP</span>
                  </div>
                ))
              )}
            </div>

            {recentAchievements.length > 0 && (
              <button className="w-full mt-4 py-2 border border-yellow-500/30 rounded-lg text-sm text-yellow-400 hover:bg-yellow-500/10 transition-colors">
                View All Achievements
              </button>
            )}
          </div>
        </div>
      )}

      {/* Main Chart Section */}
      <div className="bg-surface border border-white/5 rounded-2xl p-6">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <Activity size={18} /> Compute Sector Index (7D)
          </h3>
          <div className="flex gap-4 text-xs">
            <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-purple-500"></div> RNDR</div>
            <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-red-500"></div> AKT</div>
            <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-white"></div> TAO</div>
          </div>
        </div>

        <div className="h-[300px] w-full">
          {isLoadingChart ? (
            <div className="h-full w-full flex items-center justify-center text-muted">
              <RefreshCw className="animate-spin mr-2" /> Loading Real Market Data...
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={sectorData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorRndr" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#a855f7" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#a855f7" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorAkt" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.1} />
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis dataKey="time" stroke="rgba(255,255,255,0.3)" tick={{ fontSize: 10 }} minTickGap={30} />
                <YAxis stroke="rgba(255,255,255,0.3)" tick={{ fontSize: 10 }} />
                <Tooltip content={<CustomTooltip />} />
                <Area
                  type="monotone"
                  dataKey="RNDR"
                  stroke="#a855f7"
                  fillOpacity={1}
                  fill="url(#colorRndr)"
                  strokeWidth={2}
                />
                <Area
                  type="monotone"
                  dataKey="AKT"
                  stroke="#ef4444"
                  fillOpacity={1}
                  fill="url(#colorAkt)"
                  strokeWidth={2}
                />
                <Area
                  type="monotone"
                  dataKey="TAO"
                  stroke="#ffffff"
                  fillOpacity={0}
                  strokeWidth={1}
                  strokeDasharray="4 4"
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profitability Calculator (Value Add) */}
        <div className="lg:col-span-2 bg-surface border border-white/5 rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="bg-primary/20 p-2 rounded-lg">
              <Calculator className="text-primary" size={20} />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">Profitability Calculator</h3>
              <p className="text-xs text-muted">Estimate earnings: Crypto Mining vs. AI Compute</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
            <div className="space-y-4">
              <label className="text-sm text-muted uppercase font-bold">Hardware Model</label>
              <select
                value={calcGpu}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setCalcGpu(e.target.value)}
                aria-label="Select Hardware Model"
                title="Select GPU hardware model for profitability estimation"
                className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-3 text-white focus:border-primary focus:outline-none"
              >
                <option value="NVIDIA H100">NVIDIA H100 (Enterprise)</option>
                <option value="NVIDIA A100">NVIDIA A100 (Enterprise)</option>
                <option value="RTX 4090">NVIDIA RTX 4090 (Consumer)</option>
                <option value="RTX 3090">NVIDIA RTX 3090 (Consumer)</option>
              </select>

              <div className="bg-white/5 rounded-xl p-4 border border-white/5">
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-muted">Avg. Mining Revenue</span>
                  <span className="text-white">${estimates.mining.toFixed(2)}/hr</span>
                </div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-muted">Avg. Compute Revenue</span>
                  <span className="text-primary font-bold">${estimates.ai.toFixed(2)}/hr</span>
                </div>
                <div className="mt-3 pt-3 border-t border-white/10">
                  <div className="flex items-center gap-2">
                    <TrendingUp size={16} className={isAiProfitable ? 'text-green-500' : 'text-red-500'} />
                    <span className={`text-sm font-bold ${isAiProfitable ? 'text-green-500' : 'text-red-500'}`}>
                      {isAiProfitable ? `AI is ${aiPremium}% more profitable` : 'Mining is currently more profitable'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Visual Bar Chart */}
            <div className="relative h-48 flex items-end justify-around pb-6 border-b border-white/10">
              <div className="w-16 flex flex-col justify-end group">
                <DynamicDiv
                  className="rounded-t-lg transition-all duration-500 group-hover:bg-gray-500 min-h-[10px] mining-bar"
                  cssVars={{ '--mining-height': `${(estimates.mining / 3) * 100}%` }}
                ></DynamicDiv>
                <span className="text-xs text-center mt-2 text-muted">Mining</span>
              </div>
              <div className="w-16 flex flex-col justify-end group">
                <DynamicDiv
                  className="rounded-t-lg transition-all duration-500 relative group-hover:bg-primary-hover shadow-[0_0_15px_rgba(16,185,129,0.4)] min-h-[10px] compute-bar"
                  cssVars={{ '--compute-height': `${(estimates.ai / 3) * 100}%` }}
                >
                  {isAiProfitable && (
                    <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-accent text-white text-[10px] font-bold px-2 py-1 rounded">
                      {estimates.ai.toFixed(2)}x
                    </div>
                  )}
                </DynamicDiv>
                <span className="text-xs text-center mt-2 text-primary font-bold">Compute</span>
              </div>
            </div>
          </div>
        </div>

        {/* Active Jobs Monitor */}
        <div className="bg-surface border border-white/5 rounded-2xl p-6 flex flex-col">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Terminal size={18} /> My Workloads
          </h3>

          <div className="flex-1 space-y-4 overflow-y-auto pr-2 max-h-[300px]">
            {realJobs.length === 0 ? (
              <div className="text-center py-10">
                <p className="text-muted text-sm">No active jobs found on local node.</p>
              </div>
            ) : (
              realJobs.map(job => (
                <div key={job.id} className="bg-black/40 rounded-lg p-3 border border-white/5">
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-bold text-white text-sm">{job.title}</h4>
                    <span className="text-[10px] bg-primary/20 text-primary px-2 py-1 rounded font-bold">{job.status}</span>
                  </div>
                  <div className="w-full bg-gray-700 h-1 rounded-full overflow-hidden">
                    <DynamicDiv className="h-1 transition-all duration-500 job-progress-bar" cssVars={{ '--job-width': `${job.progress}%` }}></DynamicDiv>
                  </div>
                </div>
              ))
            )}
          </div>

          <button className="w-full mt-4 py-2 border border-dashed border-white/20 rounded-lg text-sm text-muted hover:text-white hover:border-white/40 transition-colors flex items-center justify-center gap-2">
            Deploy New Container <ArrowRight size={14} />
          </button>
        </div>
      </div>
    </div >
  );
};

export default Dashboard;
