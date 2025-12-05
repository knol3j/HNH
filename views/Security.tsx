
import React, { useState } from 'react';
import { Shield, Terminal, Lock, Wifi, Key, FileCode, Play, Activity } from 'lucide-react';

const Security: React.FC = () => {
  const [mode, setMode] = useState<'WPA2' | 'NTLM' | 'MD5'>('WPA2');
  const [isRunning, setIsRunning] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);

  const toggleJob = () => {
    if (isRunning) {
      setIsRunning(false);
      setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] Job stopped by user.`]);
    } else {
      setIsRunning(true);
      setLogs([`[${new Date().toLocaleTimeString()}] Initializing ${mode} attack vector...`, `[${new Date().toLocaleTimeString()}] Allocating 4x RTX 4090 nodes...`]);
      
      // Simulate logs
      let progress = 0;
      const interval = setInterval(() => {
        progress += 10;
        if (progress > 100) {
          clearInterval(interval);
          return;
        }
        setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] Hashrate: ${(Math.random() * 50 + 20).toFixed(1)} MH/s | Temp: 65°C`]);
      }, 2000);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-red-500/10 rounded-xl border border-red-500/20">
            <Shield className="text-red-500" size={32} />
          </div>
          <div>
            <h2 className="text-3xl font-bold text-white">Security Platform</h2>
            <p className="text-muted">Distributed Hashcat & Pentesting Orchestration</p>
          </div>
        </div>
        <div className={`px-4 py-2 rounded-lg border ${isRunning ? 'bg-green-500/20 border-green-500 text-green-400' : 'bg-surface border-white/10 text-muted'}`}>
          <span className="flex items-center gap-2 font-mono text-sm">
            <div className={`w-2 h-2 rounded-full ${isRunning ? 'bg-green-500 animate-pulse' : 'bg-gray-500'}`}></div>
            {isRunning ? 'NODE ACTIVE' : 'NODE IDLE'}
          </span>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Configuration Panel */}
        <div className="bg-surface border border-white/10 rounded-2xl p-6 space-y-6 h-fit">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <Lock size={18} /> Attack Configuration
          </h3>

          <div className="space-y-4">
            <div>
              <label className="text-xs text-muted uppercase font-bold mb-2 block">Target Algorithm</label>
              <div className="grid grid-cols-3 gap-2">
                <button 
                  onClick={() => setMode('WPA2')}
                  className={`p-3 rounded-xl border text-sm font-medium transition-all flex flex-col items-center gap-2 ${mode === 'WPA2' ? 'bg-red-500/20 border-red-500 text-white' : 'bg-black/20 border-white/10 text-muted hover:border-white/30'}`}
                >
                  <Wifi size={20} /> WPA2
                </button>
                <button 
                  onClick={() => setMode('NTLM')}
                  className={`p-3 rounded-xl border text-sm font-medium transition-all flex flex-col items-center gap-2 ${mode === 'NTLM' ? 'bg-red-500/20 border-red-500 text-white' : 'bg-black/20 border-white/10 text-muted hover:border-white/30'}`}
                >
                  <Key size={20} /> NTLM
                </button>
                <button 
                  onClick={() => setMode('MD5')}
                  className={`p-3 rounded-xl border text-sm font-medium transition-all flex flex-col items-center gap-2 ${mode === 'MD5' ? 'bg-red-500/20 border-red-500 text-white' : 'bg-black/20 border-white/10 text-muted hover:border-white/30'}`}
                >
                  <FileCode size={20} /> MD5
                </button>
              </div>
            </div>

            <div>
              <label className="text-xs text-muted uppercase font-bold mb-2 block">Upload Target (.cap / .hash)</label>
              <div className="border-2 border-dashed border-white/10 rounded-xl p-8 text-center hover:border-red-500/30 transition-colors cursor-pointer bg-black/20">
                <UploadIcon className="mx-auto text-muted mb-2" />
                <p className="text-sm text-gray-400">Drag file or click to browse</p>
              </div>
            </div>

            <div>
              <label className="text-xs text-muted uppercase font-bold mb-2 block">Wordlist Selection</label>
              <select className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-3 text-white focus:border-red-500 focus:outline-none">
                <option>rockyou.txt (Standard)</option>
                <option>OneRuleToRuleThemAll</option>
                <option>Custom Wordlist</option>
              </select>
            </div>

            <button 
              onClick={toggleJob}
              className={`w-full py-4 rounded-xl font-bold text-lg transition-all flex items-center justify-center gap-2 shadow-lg ${
                isRunning 
                ? 'bg-red-500 hover:bg-red-600 text-white shadow-red-500/20' 
                : 'bg-white text-black hover:bg-gray-200'
              }`}
            >
              {isRunning ? 'Stop Operation' : <><Play size={18} fill="currentColor"/> Start Attack Vector</>}
            </button>
          </div>
        </div>

        {/* Terminal Output */}
        <div className="lg:col-span-2 bg-black border border-white/10 rounded-2xl p-0 overflow-hidden flex flex-col h-[600px]">
          <div className="bg-white/5 px-4 py-3 border-b border-white/5 flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <Terminal size={16} />
              <span className="font-mono">hashcat-cli --session=hnh-01</span>
            </div>
            <div className="flex gap-2">
              <div className="w-3 h-3 rounded-full bg-red-500"></div>
              <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
              <div className="w-3 h-3 rounded-full bg-green-500"></div>
            </div>
          </div>
          
          <div className="flex-1 p-6 font-mono text-sm overflow-y-auto space-y-2">
            <div className="text-green-500">Welcome to HashNHedge Security Module v2.1.0</div>
            <div className="text-gray-500">Connected to grid. Active nodes: 12</div>
            <div className="text-gray-500">Waiting for job...</div>
            {logs.map((log, i) => (
              <div key={i} className="text-gray-300 border-l-2 border-red-500/50 pl-3">{log}</div>
            ))}
            {isRunning && <div className="animate-pulse text-red-400">_</div>}
          </div>

          <div className="p-4 bg-white/5 border-t border-white/5 grid grid-cols-3 gap-4">
            <div className="text-center">
              <p className="text-xs text-muted uppercase">Hashrate</p>
              <p className="text-xl font-mono text-white font-bold">{isRunning ? '128.5 MH/s' : '0 H/s'}</p>
            </div>
            <div className="text-center border-l border-white/10">
              <p className="text-xs text-muted uppercase">Temp</p>
              <p className="text-xl font-mono text-white font-bold">{isRunning ? '68°C' : '--'}</p>
            </div>
            <div className="text-center border-l border-white/10">
              <p className="text-xs text-muted uppercase">Recovered</p>
              <p className="text-xl font-mono text-green-400 font-bold">0/1</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const UploadIcon = ({ className }: { className?: string }) => (
  <svg className={className} width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
    <polyline points="17 8 12 3 7 8"/>
    <line x1="12" y1="3" x2="12" y2="15"/>
  </svg>
);

export default Security;
