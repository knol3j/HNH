
import React, { useState, useEffect } from 'react';
import { RefreshCw } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const Dex: React.FC = () => {
   // Real Data States
   const [solPrice, setSolPrice] = useState<number | null>(null);
   const [rndrPrice, setRndrPrice] = useState<number | null>(null);
   const [chartData, setChartData] = useState<any[]>([]);
   const [isLoading, setIsLoading] = useState(true);

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

      return () => {
         clearInterval(interval);
      };
   }, []);

   return (
      <div className="max-w-6xl mx-auto space-y-6">

         {/* DEX Header */}
         <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
            <div className="flex items-center gap-4">
               {/* Header content unchanged */}
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
                              <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                              <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                           </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                        <XAxis dataKey="time" stroke="#525252" tick={{ fontSize: 10 }} minTickGap={30} />
                        <YAxis domain={['auto', 'auto']} orientation="right" tick={{ fill: '#525252', fontSize: 12 }} axisLine={false} tickLine={false} />
                        <Tooltip
                           contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', color: '#fff' }}
                           itemStyle={{ color: '#8b5cf6' }}
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

            {/* Swap Interface (Live Widget) */}
            <div className="bg-surface border border-white/10 rounded-2xl overflow-hidden min-h-[460px] relative flex flex-col">
               <div className="p-4 border-b border-white/10 flex justify-between items-center bg-black/20">
                  <h3 className="font-bold text-white flex items-center gap-2">
                     <RefreshCw size={16} className="text-primary" /> Multi-Chain Swap
                  </h3>
                  <span className="text-xs text-green-400 flex items-center gap-1">
                     <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" /> Live
                  </span>
               </div>

               <iframe
                  id="iframe-widget"
                  src="https://changenow.io/embeds/exchange-widget/v2/widget.html?FAQ=true&amount=0.1&amountFiat=1500&backgroundColor=000000&darkMode=true&from=sol&horizontal=false&isFiat=false&lang=en-US&link_id=89234823&locales=true&logo=false&primaryColor=8b5cf6&to=rndr&toTheMoon=true"
                  className="w-full flex-1 border-none"
                  style={{ height: '360px', minHeight: '100%' }} // Ensure it takes up space
                  title="ChangeNow Crypto Exchange"
               ></iframe>

               <div className="p-3 bg-black/40 text-center border-t border-white/5">
                  <p className="text-[10px] text-muted">
                     Real-time swaps provided by ChangeNow. Non-custodial.
                  </p>
               </div>
            </div>
         </div>
      </div>
   );
};

export default Dex;
