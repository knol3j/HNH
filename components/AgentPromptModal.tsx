import React from 'react';
import { Server, Download, Play, AlertCircle, X, ExternalLink } from 'lucide-react';

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
                        To start mining or providing compute power, you need to run the **HashNHedge Mining Agent** on your machine.
                    </p>
                </div>

                <div className="mt-8 space-y-4">
                    <div className="bg-white/5 border border-white/5 rounded-xl p-4 flex items-center gap-4 group hover:bg-white/10 transition-colors">
                        <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-500">
                            <Play size={20} />
                        </div>
                        <div className="flex-1 text-left">
                            <h3 className="text-white font-bold text-sm">Already have it?</h3>
                            <p className="text-xs text-muted">Run the <code>start_agent.bat</code> file on your machine.</p>
                        </div>
                    </div>

                    <div className="bg-white/5 border border-white/5 rounded-xl p-4 flex items-center gap-4 group hover:bg-white/10 transition-colors">
                        <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-500">
                            <Download size={20} />
                        </div>
                        <div className="flex-1 text-left">
                            <h3 className="text-white font-bold text-sm">New to HashNHedge?</h3>
                            <p className="text-xs text-muted">Download the installer and follow the setup guide.</p>
                        </div>
                    </div>
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
                    <button
                        className="flex-1 py-3 px-4 bg-primary hover:bg-primary-hover text-black font-bold rounded-xl shadow-lg shadow-primary/20 transition-all flex items-center justify-center gap-2"
                    >
                        Guide <ExternalLink size={16} />
                    </button>
                </footer>
            </div>
        </div >
    );
};

export default AgentPromptModal;
