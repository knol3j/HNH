import React, { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, DollarSign, RefreshCw, ExternalLink } from 'lucide-react';
import { API_BASE_URL } from '../services/apiClient';

interface CoinPrice {
  usd: number;
  btc: number;
  usd_24h_change: number;
}
interface PriceResponse {
  [key: string]: CoinPrice;
}

const MinersMarket: React.FC = () => {
  const [prices, setPrices] = useState<PriceResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

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

  useEffect(() => {
    fetchPrices();
    const interval = setInterval(fetchPrices, 60000); // 1 min update
    return () => clearInterval(interval);
  }, []);

  const COIN_META: { [key: string]: { name: string, symbol: string, icon: string } } = {
    'monero': { name: 'Monero', symbol: 'XMR', icon: 'https://cryptologos.cc/logos/monero-xmr-logo.svg?v=032' },
    'zephyr': { name: 'Zephyr Protocol', symbol: 'ZEPH', icon: 'https://zephyrprotocol.com/logo.svg' }, // Fallback if no specific icon
    'ravencoin': { name: 'Ravencoin', symbol: 'RVN', icon: 'https://cryptologos.cc/logos/ravencoin-rvn-logo.svg?v=032' },
    'ethereum-classic': { name: 'Ethereum Classic', symbol: 'ETC', icon: 'https://cryptologos.cc/logos/ethereum-classic-etc-logo.svg?v=032' },
    'kaspa': { name: 'Kaspa', symbol: 'KAS', icon: 'https://cryptologos.cc/logos/kaspa-kas-logo.svg?v=032' },
    'ergo': { name: 'Ergo', symbol: 'ERG', icon: 'https://cryptologos.cc/logos/ergo-erg-logo.svg?v=032' },
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <header className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold text-white mb-2">Miner's Market</h2>
          <p className="text-muted">Live prices for top Proof-of-Work coins from CoinGecko.</p>
        </div>
        <button onClick={fetchPrices} aria-label="Refresh Prices" className="p-2 bg-white/5 rounded-lg hover:bg-white/10 text-white transition-all">
          <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
        </button>
      </header>

      {!prices && loading && <div className="text-white py-10 text-center">Loading Market Data...</div>}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {prices && Object.entries(prices).map(([id, data]) => {
          const meta = COIN_META[id] || { name: id, symbol: id.toUpperCase(), icon: '' };
          const isPositive = data.usd_24h_change >= 0;

          return (
            <div key={id} className="bg-surface border border-white/10 rounded-2xl p-6 relative overflow-hidden group hover:border-primary/30 transition-all">
              {/* Background Glow */}
              <div className={`absolute -right-10 -top-10 w-32 h-32 rounded-full blur-3xl opacity-10 ${isPositive ? 'bg-green-500' : 'bg-red-500'}`}></div>

              <div className="flex items-center justify-between mb-4 relative z-10">
                <div className="flex items-center gap-3">
                  <img src={meta.icon} className="w-10 h-10 rounded-full bg-white/5 p-1" alt={meta.symbol} onError={(e: any) => e.target.style.display = 'none'} />
                  <div>
                    <h3 className="font-bold text-white text-lg">{meta.name}</h3>
                    <span className="text-xs text-muted font-mono">{meta.symbol}</span>
                  </div>
                </div>
                <a
                  href={`https://www.coingecko.com/en/coins/${id}`}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={`View ${meta.name} on CoinGecko`}
                  className="text-white/20 hover:text-white transition-colors"
                >
                  <ExternalLink size={18} />
                </a>
              </div>

              <div className="space-y-1 relative z-10">
                <div className="text-3xl font-bold text-white font-mono flex items-center">
                  ${data.usd < 1 ? data.usd.toFixed(6) : data.usd.toFixed(2)}
                </div>
                <div className={`flex items-center gap-1 text-sm font-medium ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
                  {isPositive ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                  {data.usd_24h_change.toFixed(2)}% (24h)
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-white/5 grid grid-cols-2 gap-4">
                <div>
                  <p className="text-[10px] text-muted uppercase">Sats (BTC)</p>
                  <p className="font-mono text-sm text-gray-300">{(data.btc * 100000000).toFixed(0)} sats</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="text-center text-xs text-muted mt-8">
        Data provided by CoinGecko API. Last updated: {lastUpdated.toLocaleTimeString()}
      </div>
    </div>
  );
};

export default MinersMarket;