
import React, { useState, useEffect } from 'react';
import { ArrowDown, Settings, Info, TrendingUp, Wallet, ArrowRightLeft, RefreshCw, ExternalLink } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const Dex: React.FC = () => {
  const [fromAmount, setFromAmount] = useState('1');
  const [toAmount, setToAmount] = useState('');
  const [slippage, setSlippage] = useState(0.5);
  
  // Real Data States
  const [solPrice, setSolPrice] = useState<number | null>(null);
  const [rndrPrice, setRndrPrice] = useState<number | null>(null);
  const [chartData, setChartData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  // Fetch Real Data
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        // 1. Fetch Current Prices
        const priceResponse = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=solana,render-token&vs_currencies=usd&include_24hr_vol=true');
        const priceData = await priceResponse.json();
        
        if (priceData.solana && priceData['render-token']) {
            setSolPrice(priceData.solana.usd);
            setRndrPrice(priceData['render-token'].usd);
            setLastUpdated(new Date());
        }

        // 2. Fetch Historical Chart (SOL/USD for demonstration)
        const chartResponse = await fetch('https://api.coingecko.com/api/v3/coins/solana/market_chart?vs_currency=usd&days=1');
        const chartJson = await chartResponse.json();
        
        if (chartJson.prices) {
            const formattedData = chartJson.prices.map((item: [number, number]) => ({
                time: new Date(item[0]).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                price: item[1]
            })).filter((_: any, i: number) => i % 12 === 0); // Downsample for cleaner chart
            setChartData(formattedData);
        }

      } catch (error) {
        console.error("Failed to fetch real DEX data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 60000); // Refresh every minute
    return () => clearInterval(interval);
  }, []);

  // Calculate Exchange Rate
  const exchangeRate = (solPrice && rndrPrice) ? (solPrice / rndrPrice) : 0;

  useEffect(() => {
      const val = parseFloat(fromAmount);
      if(!isNaN(val) && exchangeRate > 0) {
          setToAmount((val * exchangeRate).toFixed(4));
      }
  }, [exchangeRate, fromAmount]);

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      
      {/* DEX Header */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
        <div className="flex items-center gap-4">
           <div className="bg-accent/10 p-3 rounded-xl border border-accent/20">
             <ArrowRightLeft className="text-accent" size={32} />
           </div>
           <div>
             <h2 className="text-3xl font-bold text-white">Compute Swap</h2>
             <p className="text-muted text-sm">Swap Native Assets for Compute Credits (RNDR)</p>
           </div>
        </div>
        
        <div className="flex gap-4">
           <div className="bg-surface border border-white/10 px-4 py-2 rounded-lg flex items-center gap-2">
              <div>
                <p className="text-xs text-muted uppercase">SOL Price</p>
                <p className="text-lg font-bold text-white">${solPrice?.toFixed(2) || '---'}</p>
              </div>
           </div>
           <div className="bg-surface border border-white/10 px-4 py-2 rounded-lg">
              <div>
                <p className="text-xs text-muted uppercase">RNDR Price</p>
                <p className="text-lg font-bold text-accent">${rndrPrice?.toFixed(2) || '---'}</p>
              </div>
           </div>
           <div className="bg-surface border border-white/10 px-4 py-2 rounded-lg flex items-center justify-center">
               {isLoading ? <RefreshCw className="animate-spin text-muted" size={20} /> : <div className="w-2 h-2 bg-green-500 rounded-full"></div>}
           </div>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Chart Section */}
        <div className="lg:col-span-2 bg-surface border border-white/10 rounded-2xl p-6 flex flex-col">
           <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-2">
                 <img src="https://cryptologos.cc/logos/solana-sol-logo.svg?v=032" className="w-8 h-8" alt="SOL" />
                 <span className="text-xl font-bold text-white">SOL / USD</span>
              </div>
              <div className="flex gap-2">
                 <button className="px-3 py-1 rounded-lg text-xs font-bold bg-white/10 text-white">24H</button>
                 <button className="px-3 py-1 rounded-lg text-xs font-bold text-muted hover:text-white">7D</button>
              </div>
           </div>
           
           <div className="flex-1 min-h-[350px] w-full">
             <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                    <defs>
                        <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                        </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                    <XAxis dataKey="time" stroke="#525252" tick={{fontSize: 10}} minTickGap={30} />
                    <YAxis domain={['auto', 'auto']} orientation="right" tick={{fill: '#525252', fontSize: 12}} axisLine={false} tickLine={false} />
                    <Tooltip 
                        contentStyle={{backgroundColor: '#18181b', borderColor: '#27272a', color: '#fff'}}
                        itemStyle={{color: '#8b5cf6'}}
                        formatter={(value: number) => [`$${value.toFixed(2)}`, 'Price']}
                    />
                    <Area type="monotone" dataKey="price" stroke="#8b5cf6" strokeWidth={2} fillOpacity={1} fill="url(#colorPrice)" />
                </AreaChart>
             </ResponsiveContainer>
           </div>
           <div className="text-xs text-muted text-right mt-2">
               Data provided by CoinGecko
           </div>
        </div>

        {/* Swap Interface */}
        <div className="bg-surface border border-white/10 rounded-2xl p-6 h-fit relative">
           <div className="flex justify-between items-center mb-6">
              <h3 className="font-bold text-white">Swap</h3>
              <button className="text-muted hover:text-white transition-colors"><Settings size={20} /></button>
           </div>

           <div className="space-y-1">
              {/* From Token */}
              <div className="bg-black/40 rounded-xl p-4 border border-white/5 hover:border-white/10 transition-colors">
                 <div className="flex justify-between text-xs text-muted mb-2">
                    <span>Pay</span>
                    <span>Balance: 14.5 SOL</span>
                 </div>
                 <div className="flex items-center justify-between">
                    <input 
                       type="number" 
                       value={fromAmount}
                       onChange={(e) => setFromAmount(e.target.value)}
                       className="bg-transparent text-2xl font-bold text-white focus:outline-none w-full"
                       placeholder="0.0"
                    />
                    <button className="flex items-center gap-2 bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-full transition-colors text-white font-bold shrink-0">
                       <img src="https://cryptologos.cc/logos/solana-sol-logo.svg?v=032" className="w-5 h-5" alt="SOL" />
                       SOL
                    </button>
                 </div>
                 <div className="text-xs text-muted mt-2">
                    ≈ ${(parseFloat(fromAmount || '0') * (solPrice || 0)).toFixed(2)} USD
                 </div>
              </div>

              {/* Swap Direction Arrow */}
              <div className="flex justify-center -my-3 relative z-10">
                 <button className="bg-surface border border-white/10 p-2 rounded-xl hover:scale-110 transition-transform">
                    <ArrowDown className="text-primary" size={18} />
                 </button>
              </div>

              {/* To Token */}
              <div className="bg-black/40 rounded-xl p-4 border border-white/5 hover:border-white/10 transition-colors">
                 <div className="flex justify-between text-xs text-muted mb-2">
                    <span>Receive</span>
                    <span>Balance: 0.00 RNDR</span>
                 </div>
                 <div className="flex items-center justify-between">
                    <input 
                       type="text" 
                       readOnly
                       value={isLoading ? '...' : toAmount}
                       className="bg-transparent text-2xl font-bold text-primary focus:outline-none w-full"
                       placeholder="0.0"
                    />
                    <button className="flex items-center gap-2 bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-full transition-colors text-white font-bold shrink-0">
                       <img src="https://cryptologos.cc/logos/render-token-rndr-logo.svg?v=032" className="w-5 h-5" alt="RNDR" />
                       RNDR
                    </button>
                 </div>
                 <div className="text-xs text-muted mt-2">
                    Best Price via Jupiter
                 </div>
              </div>
           </div>

           {/* Details Accordion */}
           <div className="mt-4 space-y-2 text-xs text-muted">
              <div className="flex justify-between">
                 <span>Rate</span>
                 <span className="text-white">1 SOL ≈ {exchangeRate.toFixed(2)} RNDR</span>
              </div>
              <div className="flex justify-between">
                 <span className="flex items-center gap-1">Network Cost <Info size={10}/></span>
                 <span className="text-white">~$0.00025</span>
              </div>
              <div className="flex justify-between">
                 <span>Price Impact</span>
                 <span className="text-green-500">&lt; 0.05%</span>
              </div>
              <div className="flex justify-between">
                 <span>Route</span>
                 <span className="text-white">SOL &gt; RAY &gt; RNDR</span>
              </div>
           </div>

           <button className="w-full mt-6 bg-primary hover:bg-primary-hover text-black font-bold py-4 rounded-xl text-lg transition-all shadow-lg shadow-primary/20 flex items-center justify-center gap-2">
              Swap Assets <ExternalLink size={16} />
           </button>
           
           <p className="text-[10px] text-muted text-center mt-4">
               Powered by Solana On-Chain Liquidity
           </p>
        </div>
      </div>
    </div>
  );
};

export default Dex;
