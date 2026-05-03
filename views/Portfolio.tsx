import React, { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, DollarSign, RefreshCw, ExternalLink, Plus, Server, Clock, CheckCircle } from 'lucide-react';
import { API_BASE_URL } from '../services/apiClient';
import { notifySuccess, notifyError } from '../services/notification';
import { useSocket } from '../context/SocketContext';

interface CoinPrice {
  usd: number;
  btc: number;
  usd_24h_change: number;
}
interface PriceResponse {
  [key: string]: CoinPrice;
}

interface Job {
  id: string;
  title: string;
  description: string;
  coin: string;
  algorithm: string;
  requiredHashrate: number;
  priceUsd: number;
  status: string;
  poster: { username: string; tier: string };
  provider?: { username: string };
  createdAt: string;
}

const MinersMarket: React.FC = () => {
  const [prices, setPrices] = useState<PriceResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [jobs, setJobs] = useState<Job[]>([]);
  const [showJobForm, setShowJobForm] = useState(false);
  const [newJob, setNewJob] = useState({ title: '', description: '', coin: 'XMR', algorithm: '', requiredHashrate: 0, priceUsd: 0 });
  const [jobTab, setJobTab] = useState<'list' | 'my-jobs'>('list');
  const { isConnected } = useSocket();
  const currentUser = JSON.parse(localStorage.getItem('hnh_current_user') || '{}');

  const fetchPrices = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/public/prices`);
      if (res.ok) {
        const data = await res.json();
        setPrices(data);
        setLastUpdated(new Date());
      }
    } catch (e) { console.error("Market Data Offline"); }
    setLoading(false);
  };

  const fetchJobs = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/jobs?status=open`);
      if (res.ok) {
        const data = await res.json();
        setJobs(data);
      }
    } catch (e) { console.error(e); }
  };

  useEffect(() => {
    fetchPrices();
    fetchJobs();
    const interval = setInterval(fetchPrices, 60000);
    return () => clearInterval(interval);
  }, []);

  const handleCreateJob = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_BASE_URL}/jobs`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('hnh_token')}`
        },
        body: JSON.stringify(newJob)
      });
      if (res.ok) {
        notifySuccess('Job posted successfully');
        setShowJobForm(false);
        setNewJob({ title: '', description: '', coin: 'XMR', algorithm: '', requiredHashrate: 0, priceUsd: 0 });
        fetchJobs();
      } else {
        notifyError('Failed to post job');
      }
    } catch (err: any) {
      notifyError(err.message);
    }
  };

  const handleAcceptJob = async (jobId: string) => {
    try {
      const res = await fetch(`${API_BASE_URL}/jobs/${jobId}/accept`, {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('hnh_token')}` }
      });
      if (res.ok) {
        notifySuccess('Job accepted! Start mining.');
        fetchJobs();
      }
    } catch (err) {
      notifyError('Failed to accept job');
    }
  };

  const handleCompleteJob = async (jobId: string) => {
    try {
      const res = await fetch(`${API_BASE_URL}/jobs/${jobId}/complete`, {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('hnh_token')}` }
      });
      if (res.ok) {
        notifySuccess('Job marked complete');
        fetchJobs();
      }
    } catch (err) {
      notifyError('Failed to complete job');
    }
  };

  const COIN_META: { [key: string]: { name: string, symbol: string, icon: string } } = {
    'monero': { name: 'Monero', symbol: 'XMR', icon: 'https://cryptologos.cc/logos/monero-xmr-logo.svg?v=032' },
    'zephyr': { name: 'Zephyr Protocol', symbol: 'ZEPH', icon: 'https://zephyrprotocol.com/logo.svg' },
    'ravencoin': { name: 'Ravencoin', symbol: 'RVN', icon: 'https://cryptologos.cc/logos/ravencoin-rvn-logo.svg?v=032' },
    'ethereum-classic': { name: 'Ethereum Classic', symbol: 'ETC', icon: 'https://cryptologos.cc/logos/ethereum-classic-etc-logo.svg?v=032' },
    'kaspa': { name: 'Kaspa', symbol: 'KAS', icon: 'https://cryptologos.cc/logos/kaspa-kas-logo.svg?v=032' },
    'ergo': { name: 'Ergo', symbol: 'ERG', icon: 'https://cryptologos.cc/logos/ergo-erg-logo.svg?v=032' },
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <header className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold text-white mb-2">Compute Marketplace</h2>
          <p className="text-muted">Buy and sell compute power for mining and rendering.</p>
        </div>
        <div className="flex gap-3">
          <button onClick={() => setJobTab('list')} className={`px-4 py-2 rounded-lg ${jobTab === 'list' ? 'bg-primary text-black' : 'bg-white/5 text-white'}`}>Jobs</button>
          <button onClick={() => setShowJobForm(!showJobForm)} className="bg-primary text-black px-4 py-2 rounded-lg font-bold flex items-center gap-2 hover:bg-primary-hover">
            <Plus size={18} /> Post Job
          </button>
        </div>
      </header>

      {showJobForm && (
        <div className="bg-surface border border-white/10 rounded-2xl p-6">
          <h3 className="text-white font-bold mb-4">Post a Compute Job</h3>
          <form onSubmit={handleCreateJob} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input
                type="text"
                placeholder="Job Title"
                value={newJob.title}
                onChange={e => setNewJob({ ...newJob, title: e.target.value })}
                className="bg-black/40 border border-white/10 rounded-lg px-4 py-2 text-white"
                required
              />
              <select
                value={newJob.coin}
                onChange={e => setNewJob({ ...newJob, coin: e.target.value })}
                className="bg-black/40 border border-white/10 rounded-lg px-4 py-2 text-white"
              >
                {Object.keys(COIN_META).map(c => (
                  <option key={c} value={COIN_META[c].symbol}>{COIN_META[c].name}</option>
                ))}
              </select>
              <input
                type="text"
                placeholder="Algorithm (e.g., randomx, kawpow)"
                value={newJob.algorithm}
                onChange={e => setNewJob({ ...newJob, algorithm: e.target.value })}
                className="bg-black/40 border border-white/10 rounded-lg px-4 py-2 text-white"
              />
              <input
                type="number"
                placeholder="Required Hashrate (H/s)"
                value={newJob.requiredHashrate || ''}
                onChange={e => setNewJob({ ...newJob, requiredHashrate: parseFloat(e.target.value) })}
                className="bg-black/40 border border-white/10 rounded-lg px-4 py-2 text-white"
              />
              <input
                type="number"
                placeholder="Budget (USD)"
                value={newJob.priceUsd || ''}
                onChange={e => setNewJob({ ...newJob, priceUsd: parseFloat(e.target.value) })}
                className="bg-black/40 border border-white/10 rounded-lg px-4 py-2 text-white"
                required
              />
            </div>
            <textarea
              placeholder="Job description, requirements..."
              value={newJob.description}
              onChange={e => setNewJob({ ...newJob, description: e.target.value })}
              className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-2 text-white h-24"
              required
            />
            <div className="flex gap-3">
              <button type="submit" className="bg-primary text-black py-2 px-6 rounded-lg font-bold">Post Job</button>
              <button type="button" onClick={() => setShowJobForm(false)} className="bg-white/5 text-white py-2 px-6 rounded-lg">Cancel</button>
            </div>
          </form>
        </div>
      )}

      <div className="space-y-6">
        <h3 className="text-xl font-bold text-white flex items-center gap-2">
          {jobTab === 'list' ? <Server size={20} /> : <Clock size={20} />}
          {jobTab === 'list' ? 'Open Jobs' : 'My Jobs'}
        </h3>

        {jobs.length === 0 ? (
          <div className="text-center text-muted py-12">No jobs found.</div>
        ) : (
          <div className="space-y-4">
            {jobs.map(job => (
              <div key={job.id} className="bg-surface border border-white/10 rounded-2xl p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h4 className="font-bold text-white text-lg">{job.title}</h4>
                    <p className="text-xs text-muted mt-1">
                      {job.coin} • {job.algorithm || 'Any'} • {job.requiredHashrate ? `${job.requiredHashrate.toLocaleString()} H/s` : 'Any'}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-green-400">${job.priceUsd.toFixed(2)}</div>
                    <div className="text-xs text-muted">budget</div>
                  </div>
                </div>
                <p className="text-sm text-gray-300 mb-4">{job.description}</p>
                <div className="flex items-center justify-between">
                  <div className="text-xs text-muted">
                    Posted by <span className="text-white">{job.poster.username}</span> • {new Date(job.createdAt).toLocaleDateString()}
                  </div>
                  <div className="flex gap-2">
                    {job.status === 'open' && (
                      <button
                        onClick={() => handleAcceptJob(job.id)}
                        className="bg-emerald-500/20 text-emerald-400 px-4 py-2 rounded-lg text-sm font-bold hover:bg-emerald-500/30"
                      >
                        Accept Job
                      </button>
                    )}
                    {['in-progress', 'completed'].includes(job.status) && job.provider?.username === currentUser.username && (
                      <button
                        onClick={() => handleCompleteJob(job.id)}
                        className="bg-primary/20 text-primary px-4 py-2 rounded-lg text-sm font-bold hover:bg-primary/30"
                      >
                        Mark Complete
                      </button>
                    )}
                    <span className={`px-3 py-2 rounded-lg text-xs font-bold ${
                      job.status === 'open' ? 'bg-yellow-500/20 text-yellow-400' :
                      job.status === 'in-progress' ? 'bg-blue-500/20 text-blue-400' :
                      job.status === 'completed' ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'
                    }`}>
                      {job.status}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Market Prices Section */}
      {jobTab === 'list' && (
        <>
          <div className="flex items-center justify-between"><h3 className="text-xl font-bold text-white">Coin Prices</h3><button onClick={fetchPrices} className="p-2 bg-white/5 rounded-lg hover:bg-white/10 text-white"><RefreshCw size={20} className={loading ? 'animate-spin' : ''} /></button></div>
          {!prices && loading && <div className="text-white py-10 text-center">Loading Market Data...</div>}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {prices && Object.entries(prices).map(([id, data]) => {
              const meta = COIN_META[id] || { name: id, symbol: id.toUpperCase(), icon: '' };
              const isPositive = data.usd_24h_change >= 0;
              return (
                <div key={id} className="bg-surface border border-white/10 rounded-2xl p-6 relative overflow-hidden group hover:border-primary/30 transition-all">
                  <div className={`absolute -right-10 -top-10 w-32 h-32 rounded-full blur-3xl opacity-10 ${isPositive ? 'bg-green-500' : 'bg-red-500'}`}></div>
                  <div className="flex items-center justify-between mb-4 relative z-10">
                    <div className="flex items-center gap-3">
                      <img src={meta.icon} className="w-10 h-10 rounded-full bg-white/5 p-1" alt={meta.symbol} onError={(e: any) => e.target.style.display = 'none'} />
                      <div><h3 className="font-bold text-white text-lg">{meta.name}</h3><span className="text-xs text-muted font-mono">{meta.symbol}</span></div>
                    </div>
                    <a href={`https://www.coingecko.com/en/coins/${id}`} target="_blank" rel="noreferrer" className="text-white/20 hover:text-white transition-colors"><ExternalLink size={18} /></a>
                  </div>
                  <div className="space-y-1 relative z-10">
                    <div className="text-3xl font-bold text-white font-mono flex items-center">{data.usd < 1 ? data.usd.toFixed(6) : data.usd.toFixed(2)}</div>
                    <div className={`flex items-center gap-1 text-sm font-medium ${isPositive ? 'text-green-400' : 'text-red-400'}`}>{isPositive ? <TrendingUp size={14} /> : <TrendingDown size={14} />}{data.usd_24h_change.toFixed(2)}% (24h)</div>
                  </div>
                  <div className="mt-4 pt-4 border-t border-white/5 grid grid-cols-2 gap-4"><div><p className="text-[10px] text-muted uppercase">Sats (BTC)</p><p className="font-mono text-sm text-gray-300">{(data.btc * 100000000).toFixed(0)} sats</p></div></div>
                </div>
              );
            })}
          </div>
        </>
      )}

      <div className="text-center text-xs text-muted mt-8">
        Data provided by CoinGecko API. Last updated: {lastUpdated.toLocaleTimeString()}
      </div>
    </div>
  );
};

export default MinersMarket;