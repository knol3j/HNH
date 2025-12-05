
import React, { useState } from 'react';
import { Palette, Download, Layout, Globe, CheckCircle } from 'lucide-react';

const WhiteLabel: React.FC = () => {
  const [config, setConfig] = useState({
    brandName: 'MyMiner',
    primaryColor: '#10b981',
    secondaryColor: '#3b82f6',
    logoUrl: '',
    domain: 'myminer.io'
  });

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div className="flex items-center gap-4 mb-8">
        <div className="p-3 bg-blue-500/10 rounded-xl border border-blue-500/20">
          <Palette className="text-blue-500" size={32} />
        </div>
        <div>
          <h2 className="text-3xl font-bold text-white">White Label Generator</h2>
          <p className="text-muted">Create a custom-branded instance of the HashNHedge platform for your clients.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Config Form */}
        <div className="bg-surface border border-white/10 rounded-2xl p-6 space-y-6">
          <h3 className="text-xl font-bold text-white mb-6">Brand Configuration</h3>
          
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-300 mb-1 block">Brand Name</label>
              <input 
                type="text" 
                value={config.brandName}
                onChange={e => setConfig({...config, brandName: e.target.value})}
                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-300 mb-1 block">Primary Color</label>
                <div className="flex gap-2">
                  <input 
                    type="color" 
                    value={config.primaryColor}
                    onChange={e => setConfig({...config, primaryColor: e.target.value})}
                    className="h-10 w-10 rounded border-0 cursor-pointer"
                  />
                  <input 
                    type="text" 
                    value={config.primaryColor}
                    onChange={e => setConfig({...config, primaryColor: e.target.value})}
                    className="flex-1 bg-black/40 border border-white/10 rounded-xl px-4 py-2 text-white font-mono text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-300 mb-1 block">Accent Color</label>
                <div className="flex gap-2">
                  <input 
                    type="color" 
                    value={config.secondaryColor}
                    onChange={e => setConfig({...config, secondaryColor: e.target.value})}
                    className="h-10 w-10 rounded border-0 cursor-pointer"
                  />
                  <input 
                    type="text" 
                    value={config.secondaryColor}
                    onChange={e => setConfig({...config, secondaryColor: e.target.value})}
                    className="flex-1 bg-black/40 border border-white/10 rounded-xl px-4 py-2 text-white font-mono text-sm"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-300 mb-1 block">Custom Domain</label>
              <div className="relative">
                <Globe className="absolute left-3 top-3 text-gray-500" size={18} />
                <input 
                  type="text" 
                  value={config.domain}
                  onChange={e => setConfig({...config, domain: e.target.value})}
                  className="w-full bg-black/40 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-white focus:border-blue-500 focus:outline-none"
                />
              </div>
            </div>
          </div>

          <div className="pt-6 border-t border-white/10">
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 mb-6">
              <h4 className="font-bold text-blue-400 mb-1">Enterprise License Required</h4>
              <p className="text-xs text-blue-300/80">White label generation requires an active Enterprise license. The generated package includes compiled binaries and frontend assets.</p>
            </div>
            
            <button className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2">
              <Download size={18} /> Generate Package
            </button>
          </div>
        </div>

        {/* Live Preview */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-muted uppercase tracking-wider">Live Preview</h3>
          <div className="bg-black rounded-3xl border-8 border-gray-800 overflow-hidden shadow-2xl relative aspect-[9/16] max-h-[600px] mx-auto w-[300px]">
            {/* Fake Mobile App UI */}
            <div className="absolute top-0 w-full h-full bg-[#09090b] flex flex-col">
              {/* Header */}
              <div className="p-4 border-b border-white/5 flex items-center gap-2" style={{ backgroundColor: `${config.primaryColor}10` }}>
                <div className="w-8 h-8 rounded bg-gradient-to-br from-white/20 to-transparent"></div>
                <span className="font-bold text-white">{config.brandName}</span>
              </div>
              
              {/* Content */}
              <div className="p-4 space-y-4">
                <div className="rounded-xl p-4 text-white" style={{ backgroundColor: config.primaryColor }}>
                  <p className="text-xs opacity-80">Total Balance</p>
                  <p className="text-2xl font-bold">$12,450.00</p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-white/5 rounded-xl p-3 h-24"></div>
                  <div className="bg-white/5 rounded-xl p-3 h-24"></div>
                </div>

                <div className="bg-white/5 rounded-xl p-4 space-y-3">
                  <div className="h-2 w-full bg-white/10 rounded"></div>
                  <div className="h-2 w-2/3 bg-white/10 rounded"></div>
                </div>
              </div>

              {/* Tab Bar */}
              <div className="mt-auto border-t border-white/5 p-4 flex justify-around">
                <Layout size={24} style={{ color: config.secondaryColor }} />
                <div className="w-6 h-6 rounded-full bg-white/10"></div>
                <div className="w-6 h-6 rounded-full bg-white/10"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WhiteLabel;
