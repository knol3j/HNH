import React from 'react';
import { Server, Download, Play, AlertCircle, ExternalLink } from 'lucide-react';

interface AgentPromptModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const AgentPromptModal: React.FC<AgentPromptModalProps> = ({ isOpen, onClose }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
            <div className="bg-surface border border-white/10 rounded-2xl w-full max-w-lg p-8 shadow-2xl animate-in fade-in zoom-in duration-300">
                <header className="flex justify-between items-start mb-6">
                    <div className="p-3 bg-primary/10 rounded-xl">
                        <Server className="text-primary" size={32} />
                    </div>
                </header>

                <div className="space-y-4 text-center">
                    <h2 className="text-2xl font-bold text-white">Local Agent Not Detected</h2>
                    <p className="text-muted text-sm px-4">
                        To start mining or providing compute power, install and run the HashNHedge Mining Agent on this machine.
                    </p>
                </div>

                <div className="mt-8 space-y-4">
                    <button
                        onClick={onClose}
                        className="w-full bg-white/5 border border-white/5 rounded-xl p-4 flex items-center gap-4 group hover:bg-white/10 transition-colors cursor-pointer"
                    >
                        <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-500">
                            <Play size={20} />
                        </div>
                        <div className="flex-1 text-left">
                            <h3 className="text-white font-bold text-sm">Already installed?</h3>
                            <p className="text-xs text-muted">Run <code>start_miner.bat</code> or <code>node server.js</code>, then click here to refresh.</p>
                        </div>
                    </button>

                    <a
                        href="https://github.com/knol3j/HNH/releases/latest"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full bg-white/5 border border-white/5 rounded-xl p-4 flex items-center gap-4 group hover:bg-white/10 transition-colors cursor-pointer no-underline"
                    >
                        <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-500">
                            <Download size={20} />
                        </div>
                        <div className="flex-1 text-left">
                            <h3 className="text-white font-bold text-sm">First-time setup</h3>
                            <p className="text-xs text-muted">Download the agent release, run <code>setup_miner_windows.ps1</code>, then launch <code>start_miner.bat</code>.</p>
                        </div>
                    </a>
                </div>

                <div className="mt-8 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-xl flex items-start gap-3 text-left">
                    <AlertCircle className="text-yellow-500 shrink-0" size={18} />
                    <p className="text-[11px] text-yellow-500/80 leading-relaxed">
                        The agent serves as a secure bridge between your hardware and our network. It must be running locally to detect your hardware.
                    </p>
                </div>

                <footer className="mt-8 flex gap-3">
                    <button
                        onClick={onClose}
                        className="flex-1 py-3 px-4 bg-white/5 hover:bg-white/10 rounded-xl text-white font-medium transition-colors"
                    >
                        Maybe Later
                    </button>
                    <a
                        href="https://docs.hashnhedge.com"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 py-3 px-4 bg-primary hover:bg-primary-hover text-black font-bold rounded-xl shadow-lg shadow-primary/20 transition-all flex items-center justify-center gap-2 no-underline"
                    >
                        Guide <ExternalLink size={16} />
                    </a>
                </footer>
            </div>
        </div>
    );
};

export default AgentPromptModal;
