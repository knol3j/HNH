import React, { useState, useEffect } from 'react';
import { Wallet, Plus, Trash2, Cpu, CheckCircle2, AlertTriangle, ShieldCheck, RefreshCcw, X, Key } from 'lucide-react';
const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://api-production-5f42.up.railway.app';

interface UserWallet {
    id: string;
    coin: string;
    address: string;
    label: string | null;
    isDefault: boolean;
}

interface WalletSetupModalProps {
    isOpen: boolean;
    onClose: () => void;
    onComplete: () => void;
}

const WalletSetupModal: React.FC<WalletSetupModalProps> = ({ isOpen, onClose, onComplete }) => {
    const [wallets, setWallets] = useState<UserWallet[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [generating, setGenerating] = useState(false);

    const COINS = ['XMR', 'RVN', 'ETC', 'ERG', 'KAS'];

    const fetchWallets = async () => {
        try {
            const token = localStorage.getItem('hnh_token');
            const res = await fetch(`${API_BASE_URL}/user/wallets`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                setWallets(await res.json());
            }
        } catch (e) { }
    };

    useEffect(() => {
        if (isOpen) {
            fetchWallets();
        }
    }, [isOpen]);

    const handleSaveWallet = async (coin: string, address: string) => {
        if (!address) return;
        setLoading(true);
        setError(null);
        try {
            const token = localStorage.getItem('hnh_token');
            const res = await fetch(`${API_BASE_URL}/user/wallets`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ coin, address, isDefault: true })
            });

            if (res.ok) {
                setSuccess(`${coin} wallet saved!`);
                fetchWallets();
                setTimeout(() => setSuccess(null), 3000);
            } else {
                const data = await res.json();
                setError(data.error || 'Failed to save wallet');
            }
        } catch (e: any) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    };

    const handleGenerateSeed = async () => {
        setGenerating(true);
        setError(null);
        try {
            const token = localStorage.getItem('hnh_token');
            const res = await fetch(`${API_BASE_URL}/user/wallet/generate-seed`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (res.ok) {
                setSuccess('Seed generated and addresses derived!');
                fetchWallets();
                setTimeout(() => setSuccess(null), 3000);
            } else {
                const data = await res.json();
                setError(data.error || 'Generation failed');
            }
        } catch (e: any) {
            setError(e.message);
        } finally {
            setGenerating(false);
        }
    };

    if (!isOpen) return null;

    const missingCoins = COINS.filter(c => !wallets.some(w => w.coin === c));

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
            <div className="bg-surface border border-white/10 rounded-2xl w-full max-w-2xl p-8 shadow-2xl max-h-[90vh] overflow-y-auto">
                <header className="flex justify-between items-start mb-6">
                    <div>
                        <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                            <Wallet className="text-primary" /> Wallet Configuration
                        </h2>
                        <p className="text-muted text-sm mt-1">Configure your payout addresses to start mining.</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-lg text-muted" title="Close">
                        <X size={20} />
                    </button>
                </header>

                {error && (
                    <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-xl flex items-center gap-3 text-red-500 text-sm">
                        <AlertTriangle size={20} />
                        <span>{error}</span>
                    </div>
                )}

                {success && (
                    <div className="mb-6 p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-center gap-3 text-emerald-500 text-sm">
                        <ShieldCheck size={20} />
                        <span>{success}</span>
                    </div>
                )}

                <div className="space-y-6">
                    {/* Auto-Generate Option */}
                    <div className="bg-primary/5 border border-primary/20 rounded-xl p-6">
                        <div className="flex items-center justify-between gap-4">
                            <div className="flex-1">
                                <h3 className="text-white font-bold flex items-center gap-2">
                                    <Key size={18} className="text-primary" /> Auto-Generated HD Wallet
                                </h3>
                                <p className="text-xs text-muted mt-1">
                                    Automatically generate unique addresses for all coins using a secure seed.
                                </p>
                            </div>
                            <button
                                onClick={handleGenerateSeed}
                                disabled={generating}
                                className="px-5 py-2.5 bg-primary text-black font-bold rounded-lg hover:bg-primary-hover transition-colors flex items-center gap-2 text-sm whitespace-nowrap"
                            >
                                {generating ? <RefreshCcw size={16} className="animate-spin" /> : <Plus size={16} />}
                                Generate All
                            </button>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <h3 className="text-muted text-xs font-bold uppercase tracking-widest px-1">Manual Configuration</h3>
                        {COINS.map(coin => {
                            const wallet = wallets.find(w => w.coin === coin);
                            return (
                                <div key={coin} className="flex flex-col gap-2 p-4 bg-white/5 border border-white/5 rounded-xl">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <div className="w-8 h-8 rounded bg-surface border border-white/10 flex items-center justify-center font-bold text-xs">
                                                {coin}
                                            </div>
                                            <span className="text-white font-bold">{coin} Address</span>
                                        </div>
                                        {wallet && (
                                            <span className="text-emerald-500 text-xs flex items-center gap-1 font-bold">
                                                <CheckCircle2 size={14} /> CONFIGURED
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            defaultValue={wallet?.address || ''}
                                            placeholder={`Paste your ${coin} address...`}
                                            className="flex-1 bg-surface border border-white/10 rounded-lg px-4 py-2 text-sm text-white focus:border-primary outline-none transition-colors font-mono"
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') handleSaveWallet(coin, (e.target as HTMLInputElement).value);
                                            }}
                                            onBlur={(e) => {
                                                if (e.target.value && e.target.value !== wallet?.address) {
                                                    handleSaveWallet(coin, e.target.value);
                                                }
                                            }}
                                        />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                <footer className="mt-8 pt-6 border-t border-white/10 flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-6 py-2.5 text-muted hover:text-white transition-colors text-sm"
                    >
                        Setup Later
                    </button>
                    <button
                        onClick={() => {
                            onComplete();
                            onClose();
                        }}
                        className="px-8 py-2.5 bg-white text-black font-bold rounded-lg hover:bg-gray-200 transition-all shadow-lg"
                    >
                        Finish Setup
                    </button>
                </footer>
            </div>
        </div>
    );
};

export default WalletSetupModal;
