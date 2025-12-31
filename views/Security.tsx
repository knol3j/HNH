import React, { useState, useEffect, useRef } from 'react';
import { Shield, Terminal, Lock, Wifi, Key, FileCode, Play, Square, AlertTriangle, WifiOff } from 'lucide-react';

const Security: React.FC = () => {
  const [mode, setMode] = useState<'WPA2' | 'NTLM' | 'MD5' | 'AUDIT'>('WPA2');
  const [auditResult, setAuditResult] = useState<any>(null);
  const [tokenAddr, setTokenAddr] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [isAgentOnline, setIsAgentOnline] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [stats, setStats] = useState({ hashrate: 0, temp: 0, recovered: 0, total: 0 });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const agentUrl = localStorage.getItem('hnh_agent_url') || 'http://localhost:4343';

  useEffect(() => {
    const checkAgent = async () => {
      try {
        const res = await fetch(`${agentUrl}/status`);
        setIsAgentOnline(res.ok);
      } catch {
        setIsAgentOnline(false);
      }
    };

    checkAgent();
    const interval = setInterval(checkAgent, 5000);
    return () => clearInterval(interval);
  }, [agentUrl]);

  useEffect(() => {
    if (!isRunning) return;

    const pollLogs = async () => {
      try {
        const res = await fetch(`${agentUrl}/hashcat/status`);
        if (res.ok) {
          const data = await res.json();
          if (data.logs) {
            setLogs(prev => [...prev, ...data.logs]);
          }
          setStats({
            hashrate: data.hashrate || 0,
            temp: data.temp || 0,
            recovered: data.recovered || 0,
            total: data.total || 1
          });
          if (data.status === 'completed' || data.status === 'failed') {
            setIsRunning(false);
            setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] Job ${data.status}.`]);
          }
        }
      } catch (e) {
        console.error('Failed to poll hashcat status:', e);
      }
    };

    const interval = setInterval(pollLogs, 2000);
    return () => clearInterval(interval);
  }, [isRunning, agentUrl]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      setSelectedFile(e.target.files[0]);
      setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] File loaded: ${e.target.files![0].name}`]);
    }
  };

  const startJob = async () => {
    if (mode === 'AUDIT') {
      if (!tokenAddr) return;
      setLogs([`[${new Date().toLocaleTimeString()}] Auditing Token: ${tokenAddr}...`]);
      setIsRunning(true);
      try {
        const backendUrl = 'https://hashnhedge-app.up.railway.app';
        const res = await fetch(`${backendUrl}/api/public/audit`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tokenAddress: tokenAddr })
        });
        const data = await res.json();
        if (data.valid) {
          const { checks } = data;
          setLogs(prev => [
            ...prev,
            `[SAFE] Is SPL Token Program: ${checks.isMint}`,
            `[INFO] Decimals: ${checks.decimals}`,
            `[INFO] Supply: ${checks.supply}`,
            checks.mintAuthority ? `[WARN] Mint Auth: PRESENT` : `[SAFE] Mint Auth: REVOKED`,
            checks.freezeAuthority ? `[WARN] Freeze Auth: PRESENT` : `[SAFE] Freeze Auth: REVOKED`
          ]);
        } else {
          setLogs(prev => [...prev, `[ERROR] ${data.message || 'Audit Failed'}`]);
        }
      } catch (e) {
        setLogs(prev => [...prev, `[ERROR] Network Error`]);
      }
      setIsRunning(false);
      return;
    }

    if (!selectedFile) {
      setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] Error: No hash file selected.`]);
      return;
    }

    setLogs([`[${new Date().toLocaleTimeString()}] Starting ${mode} attack...`]);
    setIsRunning(true);

    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('mode', mode);

    try {
      const res = await fetch(`${agentUrl}/hashcat/start`, {
        method: 'POST',
        body: formData
      });

      if (!res.ok) {
        throw new Error('Failed to start job');
      }

      setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] Job submitted to agent.`]);
    } catch (e) {
      setIsRunning(false);
      setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] Error: ${e instanceof Error ? e.message : 'Unknown error'}`]);
    }
  };

  const stopJob = async () => {
    try {
      await fetch(`${agentUrl}/hashcat/stop`, { method: 'POST' });
      setIsRunning(false);
      setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] Job stopped by user.`]);
    } catch (e) {
      setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] Error stopping job.`]);
    }
  };

  if (!isAgentOnline) {
    return (
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col items-center justify-center h-96 text-center">
          <WifiOff size={64} className="text-muted mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">Agent Offline</h2>
          <p className="text-muted mb-4">Start the HashNHedge agent to use security features.</p>
          <p className="text-xs text-muted">The agent provides distributed hashcat capabilities.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-red-500/10 rounded-xl border border-red-500/20">
            <Shield className="text-red-500" size={32} />
          </div>
          <div>
            <h2 className="text-3xl font-bold text-white">Security Platform</h2>
            <p className="text-muted">Distributed Hashcat & Password Recovery</p>
          </div>
        </div>
        <div className={`px-4 py-2 rounded-lg border ${isRunning ? 'bg-green-500/20 border-green-500 text-green-400' : 'bg-surface border-white/10 text-muted'}`}>
          <span className="flex items-center gap-2 font-mono text-sm">
            <div className={`w-2 h-2 rounded-full ${isRunning ? 'bg-green-500 animate-pulse' : 'bg-gray-500'}`}></div>
            {isRunning ? 'RUNNING' : 'IDLE'}
          </span>
        </div>
      </header>

      <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4 flex items-center gap-3">
        <AlertTriangle className="text-yellow-500" size={20} />
        <p className="text-yellow-200 text-sm">
          For authorized security testing only. Ensure you have permission to test target systems.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Configuration Panel */}
        <div className="bg-surface border border-white/10 rounded-2xl p-6 space-y-6 h-fit">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <Lock size={18} /> Configuration
          </h3>

          <div className="space-y-4">
            <div>
              <label className="text-xs text-muted uppercase font-bold mb-2 block">Hash Type</label>
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
                <button
                  onClick={() => setMode('AUDIT')}
                  className={`p-3 rounded-xl border text-sm font-medium transition-all flex flex-col items-center gap-2 ${mode === 'AUDIT' ? 'bg-purple-500/20 border-purple-500 text-white' : 'bg-black/20 border-white/10 text-muted hover:border-white/30'}`}
                >
                  <Shield size={20} /> Token
                </button>
              </div>
            </div>

            {mode === 'AUDIT' ? (
              <div>
                <label className="text-xs text-muted uppercase font-bold mb-2 block">Token Address (Solana)</label>
                <input
                  aria-label="Token Address"
                  className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-3 text-white focus:border-purple-500 focus:outline-none font-mono text-sm"
                  placeholder="e.g. Dejz..."
                  value={tokenAddr}
                  onChange={e => setTokenAddr(e.target.value)}
                />
              </div>
            ) : (
              <div>
                <label className="text-xs text-muted uppercase font-bold mb-2 block">Hash File</label>
                <input
                  ref={fileInputRef}
                  type="file"
                  aria-label="Select Hash File"
                  accept=".cap,.hccapx,.hash,.txt"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-white/10 rounded-xl p-8 text-center hover:border-red-500/30 transition-colors cursor-pointer bg-black/20"
                >
                  <UploadIcon className="mx-auto text-muted mb-2" />
                  <p className="text-sm text-gray-400">
                    {selectedFile ? selectedFile.name : 'Click to select .cap / .hash file'}
                  </p>
                </div>
              </div>
            )}

            {mode !== 'AUDIT' && (
              <div>
                <label className="text-xs text-muted uppercase font-bold mb-2 block">Wordlist</label>
                <select aria-label="Select Wordlist" className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-3 text-white focus:border-red-500 focus:outline-none">
                  <option>rockyou.txt</option>
                  <option>darkc0de.txt</option>
                  <option>Custom (agent-side)</option>
                </select>
              </div>
            )}

            <button
              onClick={isRunning ? stopJob : startJob}
              disabled={(!selectedFile && mode !== 'AUDIT' && !isRunning) || (mode === 'AUDIT' && !tokenAddr)}
              className={`w-full py-4 rounded-xl font-bold text-lg transition-all flex items-center justify-center gap-2 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed ${isRunning
                ? 'bg-red-500 hover:bg-red-600 text-white shadow-red-500/20'
                : 'bg-white text-black hover:bg-gray-200'
                }`}
            >
              {isRunning ? <><Square size={18} /> Stop</> : <><Play size={18} fill="currentColor" /> Start</>}
            </button>
          </div>
        </div>

        {/* Terminal Output */}
        <div className="lg:col-span-2 bg-black border border-white/10 rounded-2xl p-0 overflow-hidden flex flex-col h-[600px]">
          <div className="bg-white/5 px-4 py-3 border-b border-white/5 flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <Terminal size={16} />
              <span className="font-mono">hashcat output</span>
            </div>
            <div className="flex gap-2">
              <div className="w-3 h-3 rounded-full bg-red-500"></div>
              <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
              <div className="w-3 h-3 rounded-full bg-green-500"></div>
            </div>
          </div>

          <div className="flex-1 p-6 font-mono text-sm overflow-y-auto space-y-2">
            <div className="text-green-500">HashNHedge Security Module</div>
            <div className="text-gray-500">Agent connected at {agentUrl}</div>
            <div className="text-gray-500">Ready for jobs.</div>
            {logs.map((log, i) => (
              <div key={i} className="text-gray-300 border-l-2 border-red-500/50 pl-3">{log}</div>
            ))}
            {isRunning && <div className="animate-pulse text-red-400">_</div>}
          </div>

          <div className="p-4 bg-white/5 border-t border-white/5 grid grid-cols-3 gap-4">
            <div className="text-center">
              <p className="text-xs text-muted uppercase">Hashrate</p>
              <p className="text-xl font-mono text-white font-bold">
                {stats.hashrate > 1000000
                  ? `${(stats.hashrate / 1000000).toFixed(1)} MH/s`
                  : stats.hashrate > 1000
                    ? `${(stats.hashrate / 1000).toFixed(1)} kH/s`
                    : `${stats.hashrate} H/s`}
              </p>
            </div>
            <div className="text-center border-l border-white/10">
              <p className="text-xs text-muted uppercase">GPU Temp</p>
              <p className={`text-xl font-mono font-bold ${stats.temp > 80 ? 'text-red-400' : 'text-white'}`}>
                {stats.temp > 0 ? `${stats.temp}°C` : '--'}
              </p>
            </div>
            <div className="text-center border-l border-white/10">
              <p className="text-xs text-muted uppercase">Recovered</p>
              <p className="text-xl font-mono text-green-400 font-bold">
                {stats.recovered}/{stats.total}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const UploadIcon = ({ className }: { className?: string }) => (
  <svg className={className} width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="17 8 12 3 7 8" />
    <line x1="12" y1="3" x2="12" y2="15" />
  </svg>
);

export default Security;
