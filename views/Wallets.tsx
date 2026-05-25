import React, { useState, useEffect } from 'react';
import {
    Plus,
    Wallet as WalletIcon,
    Trash2,
    Edit2,
    Save,
    X,
    Check,
    Copy,
    AlertTriangle,
    ChevronRight,
    Shield,
    RefreshCw,
    Key,
    Database,
    Eye,
    EyeOff,
    Layout,
    Zap,
    ExternalLink,
    Send
} from 'lucide-react';
import { MiningWallet, MiningCoin, View } from '../types';
import { getWalletState, connectPhantomWallet } from '../services/walletService';
import {
    getMiningWallets,
    saveWallet,
    deleteWallet,
    validateAddress,
    getPoolSuggestion,
    getWalletStats,
    hasAllWallets,
    onWalletsChanged,
    applyDerivedAddresses,
    syncWithBackend
} from '../services/miningWalletService';
import { POOL_CONFIGS } from '../services/miningWalletService';
import {
    generateMnemonic,
    saveMnemonic,
    getMnemonic,
    deriveAllAddresses,
    clearMnemonic,
    fetchAddressesFromBackend,
    generateSeedOnBackend,
    importSeedToBackend
} from '../services/unifiedWalletService';

const Wallets: React.FC<{ setCurrentView?: (view: View) => void }> = ({ setCurrentView }) => {
    const [solState, setSolState] = useState(getWalletState());
    const [wallets, setWallets] = useState<MiningWallet[]>([]);
    const [isAdding, setIsAdding] = useState(false);
    const [editingWallet, setEditingWallet] = useState<MiningWallet | null>(null);
    const [formData, setFormData] = useState({
        coin: 'XMR' as MiningCoin,
        address: '',
        pool: '',
        workerName: ''
    });
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [copiedAddress, setCopiedAddress] = useState<string | null>(null);

    // Mnemonic related state
    const [mnemonic, setMnemonic] = useState<string | null>(null);
    const [showMnemonic, setShowMnemonic] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const [derivedAddresses, setDerivedAddresses] = useState<Record<MiningCoin, string> | null>(null);

    // Onboarding state
    const [onboardingView, setOnboardingView] = useState<'INITIAL' | 'GENERATE' | 'IMPORT' | 'COMPLETE' | 'NONE'>('INITIAL');

    // Load wallets and mnemonic on mount
    useEffect(() => {
        loadData();

        // Subscribe to mining wallet changes
        const unsubscribe = onWalletsChanged(loadData);

        // Subscribe to SOL wallet changes
        const handleSolUpdate = () => {
            setSolState(getWalletState());
        };
        window.addEventListener('wallet-updated', handleSolUpdate);

        return () => {
            unsubscribe();
            window.removeEventListener('wallet-updated', handleSolUpdate);
        };
    }, []);

    const loadData = async () => {
        setWallets(getMiningWallets());

        // Sync with backend to ensure we have the latest wallets
        await syncWithBackend();
        setWallets(getMiningWallets());

        // First, check backend for wallet seed (source of truth)
        const backendResult = await fetchAddressesFromBackend();

        if (backendResult.hasSeed && backendResult.addresses) {
            // User has seed stored on backend - use those addresses
            setDerivedAddresses(backendResult.addresses);
            setOnboardingView('NONE');
            // Also check for local mnemonic (for display purposes)
            const savedMnemonic = getMnemonic();
            setMnemonic(savedMnemonic);
            return;
        }

        // Fallback: check localStorage for existing mnemonic
        const savedMnemonic = getMnemonic();
        setMnemonic(savedMnemonic);

        if (savedMnemonic) {
            // User has local mnemonic but no backend seed - offer migration
            setOnboardingView('NONE');
            handleDerive(savedMnemonic);
        } else {
            setOnboardingView('INITIAL');
        }
    };

    const handleDerive = async (m: string) => {
        try {
            const addresses = await deriveAllAddresses(m);
            setDerivedAddresses(addresses);
        } catch (e) {
            console.error("Derivation failed", e);
        }
    };

    const handleGenerateMnemonic = async () => {
        setIsGenerating(true);
        setError(null);

        // Generate on backend first (this creates and stores the seed)
        const result = await generateSeedOnBackend();

        if (result.success && result.addresses) {
            setDerivedAddresses(result.addresses);
            // We don't expose the mnemonic from backend - it's sealed
            setMnemonic(null);
            setOnboardingView('COMPLETE');
        } else {
            // Fallback to local generation if backend fails
            const m = generateMnemonic();
            setMnemonic(m);
            setOnboardingView('GENERATE');
        }

        setIsGenerating(false);
    };

    const confirmGeneratedMnemonic = async () => {
        if (mnemonic) {
            setIsGenerating(true);

            // Save locally for backwards compatibility
            saveMnemonic(mnemonic);

            // Import to backend for persistence
            const result = await importSeedToBackend(mnemonic);

            if (result.success && result.addresses) {
                setDerivedAddresses(result.addresses);
                setSuccess('Wallet seed backed up to your account!');
            } else {
                // Still derive locally even if backend import fails
                handleDerive(mnemonic);
                console.warn('Backend import failed, using local seed:', result.error);
            }

            setOnboardingView('COMPLETE');
            setIsGenerating(false);
        }
    };

    const handleOneClickSetup = async () => {
        if (!derivedAddresses) return;

        setIsGenerating(true);
        setSuccess(null);
        setError(null);

        // Apply derived addresses to the local wallet storage AND backend
        const result = await applyDerivedAddresses(derivedAddresses);

        if (result.success) {
            // Also try to push to local agent
            pushToAgent(derivedAddresses);
            setSuccess("One-click node setup complete. RVN/ETC/ERG/KAS configured on local agent. XMR requires manual wallet import for production payouts.");
            setTimeout(() => setSuccess(null), 5000);
            loadData();
        } else {
            setError("Failed to apply addresses: " + result.error);
        }
        setIsGenerating(false);
    };

    const pushToAgent = async (addresses: Record<MiningCoin, string>) => {
        try {
            const agentUrl = localStorage.getItem('hnh_agent_url') || 'http://localhost:4343';
            const secret = localStorage.getItem('agent_secret') || 'HNH_LOCAL_AGENT_SECRET';

            const walletsPayload = Object.fromEntries(
                (Object.entries(addresses) as [MiningCoin, string][])
                    .filter(([coin, address]) => coin !== 'XMR' && !!address?.trim())
                    .map(([coin, address]) => [coin, {
                        address: address.trim(),
                        pool: getPoolSuggestion(coin),
                        worker: 'HNH_Worker'
                    }])
            );

            await fetch(`${agentUrl}/wallet/bulk`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${secret}`
                },
                body: JSON.stringify({
                    wallets: walletsPayload,
                    activeCoin: 'RVN',
                    workerName: 'HNH_Worker'
                })
            });
        } catch (e) {
            console.warn("Could not sync with local agent automatically. Please sync manually.");
        }
    };

    const handleAddWallet = () => {
        setIsAdding(true);
        setEditingWallet(null);
        setFormData({
            coin: 'XMR',
            address: '',
            pool: getPoolSuggestion('XMR'),
            workerName: 'HNH_Worker'
        });
        setError(null);
        setSuccess(null);
    };

    const handleEditWallet = (wallet: MiningWallet) => {
        setIsAdding(false);
        setEditingWallet(wallet);
        setFormData({
            coin: wallet.coin,
            address: wallet.address,
            pool: wallet.pool,
            workerName: wallet.workerName
        });
        setError(null);
        setSuccess(null);
    };

    const handleCancel = () => {
        setIsAdding(false);
        setEditingWallet(null);
        setFormData({
            coin: 'XMR',
            address: '',
            pool: '',
            workerName: ''
        });
        setError(null);
    };

    const handleSave = async () => {
        setError(null);
        setSuccess(null);

        if (!formData.address.trim()) {
            setError('Wallet address is required');
            return;
        }

        if (!validateAddress(formData.coin, formData.address)) {
            setError(`Invalid ${formData.coin} wallet address format`);
            return;
        }

        const result = await saveWallet({ ...formData, source: 'manual' });

        if (result.success) {
            setSuccess(`Wallet for ${formData.coin} saved successfully and synced to account!`);
            loadData();
            handleCancel();
            setTimeout(() => setSuccess(null), 3000);
        } else {
            setError(result.error || 'Failed to save wallet');
        }
    };

    const handleDelete = (wallet: MiningWallet) => {
        if (window.confirm(`Are you sure you want to delete your ${wallet.coin} wallet?`)) {
            deleteWallet(wallet.id);
            loadData();
            setSuccess(`${wallet.coin} wallet deleted`);
            setTimeout(() => setSuccess(null), 2000);
        }
    };

    const handleCopyAddress = (address: string) => {
        navigator.clipboard.writeText(address);
        setCopiedAddress(address);
        setTimeout(() => setCopiedAddress(null), 2000);
    };

    const handleLogoutWallet = () => {
        if (window.confirm("Are you sure? This will remove the mnemonic from local storage. Ensure you have it backed up!")) {
            clearMnemonic();
            loadData();
        }
    };

    const stats = getWalletStats();
    const allConfigured = hasAllWallets();

    // Onboarding Screen
    if (onboardingView !== 'NONE') {
        return (
            <div className="max-w-2xl mx-auto py-12">
                <div className="bg-surface/50 border border-white/10 rounded-2xl p-8 space-y-8 backdrop-blur-xl">
                    <div className="text-center space-y-4">
                        <div className="w-16 h-16 bg-primary/20 rounded-2xl flex items-center justify-center mx-auto mb-6">
                            <Key className="text-primary" size={32} />
                        </div>
                        <h1 className="text-3xl font-bold text-white">Master Wallet App</h1>
                        <p className="text-muted">
                            Generate one master phrase to manage wallets for all main mining coins instantly.
                        </p>
                    </div>

                    {onboardingView === 'INITIAL' && (
                        <div className="grid gap-4">
                            <button
                                onClick={handleGenerateMnemonic}
                                className="w-full bg-primary hover:bg-primary/90 text-white p-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-primary/20"
                            >
                                <Plus size={20} /> Generate New Master Phrase
                            </button>
                            <button
                                onClick={() => setOnboardingView('IMPORT')}
                                className="w-full bg-white/5 hover:bg-white/10 text-white p-4 rounded-xl font-bold border border-white/10 transition-all"
                            >
                                Import Existing Phrase
                            </button>
                        </div>
                    )}

                    {onboardingView === 'GENERATE' && (
                        <div className="space-y-6">
                            <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-start gap-3">
                                <AlertTriangle className="text-amber-400 shrink-0" size={20} />
                                <p className="text-sm text-amber-400">
                                    Write down these 12 words and keep them safe. Anyone with this phrase can access your funds.
                                </p>
                            </div>

                            <div className="grid grid-cols-3 gap-3">
                                {mnemonic?.split(' ').map((word, i) => (
                                    <div key={i} className="bg-black/40 border border-white/10 p-3 rounded-lg text-center">
                                        <span className="text-xs text-muted block mb-1">{i + 1}</span>
                                        <span className="text-white font-mono font-medium">{word}</span>
                                    </div>
                                ))}
                            </div>

                            <button
                                onClick={confirmGeneratedMnemonic}
                                className="w-full bg-emerald-500 hover:bg-emerald-600 text-white p-4 rounded-xl font-bold transition-all"
                            >
                                I have backed it up
                            </button>
                            <button
                                onClick={() => setOnboardingView('INITIAL')}
                                className="w-full text-muted hover:text-white text-sm"
                            >
                                Go Back
                            </button>
                        </div>
                    )}

                    {onboardingView === 'IMPORT' && (
                        <div className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-muted">Enter your 12-word phrase</label>
                                <textarea
                                    className="w-full h-32 bg-black/40 border border-white/10 rounded-xl p-4 text-white font-mono focus:outline-none focus:border-primary/50 transition-all"
                                    placeholder="word1 word2 word3..."
                                    onChange={(e) => setMnemonic(e.target.value)}
                                />
                            </div>
                            <button
                                onClick={confirmGeneratedMnemonic}
                                className="w-full bg-primary hover:bg-primary/90 text-white p-4 rounded-xl font-bold transition-all"
                            >
                                Restore Wallet
                            </button>
                            <button
                                onClick={() => setOnboardingView('INITIAL')}
                                className="w-full text-muted hover:text-white text-sm"
                            >
                                Go Back
                            </button>
                        </div>
                    )}

                    {onboardingView === 'COMPLETE' && (
                        <div className="text-center space-y-6">
                            <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto">
                                <Check className="text-emerald-500" size={32} />
                            </div>
                            <h2 className="text-2xl font-bold text-white">Wallet Generated!</h2>
                            <p className="text-muted">
                                Your addresses for XMR, RVN, ETC, ERG, and KAS have been derived.
                                You can now perform a 1-click node setup.
                            </p>
                            <button
                                onClick={() => setOnboardingView('NONE')}
                                className="w-full bg-primary hover:bg-primary/90 text-white p-4 rounded-xl font-bold transition-all"
                            >
                                Continue to App
                            </button>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Solana Quick Status */}
            <div className="bg-gradient-to-r from-purple-900/40 to-blue-900/40 border border-white/10 rounded-2xl p-6 flex flex-col md:flex-row items-center justify-between gap-6 backdrop-blur-md">
                <div className="flex items-center gap-5">
                    <div className="w-14 h-14 bg-gradient-to-br from-purple-500 to-blue-500 rounded-2xl flex items-center justify-center shadow-lg shadow-purple-500/20">
                        <WalletIcon className="text-white" size={28} />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-white mb-1">Integrated Solana Wallet</h2>
                        <div className="flex items-center gap-3">
                            {solState.connectedWallet ? (
                                <>
                                    <span className="text-emerald-400 text-sm font-mono">{solState.connectedWallet.slice(0, 4)}...{solState.connectedWallet.slice(-4)}</span>
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                                    <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider">Connected</span>
                                </>
                            ) : (
                                <span className="text-muted text-sm italic">Not connected</span>
                            )}
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-4 w-full md:w-auto">
                    {solState.connectedWallet ? (
                        <div className="flex flex-col items-end mr-4">
                            <span className="text-xs text-muted uppercase font-bold tracking-tighter">Current Balance</span>
                            <span className="text-2xl font-mono font-bold text-white">{solState.solBalance.toFixed(4)} SOL</span>
                        </div>
                    ) : null}
                    
                    {solState.connectedWallet ? (
                        <button 
                            onClick={() => setCurrentView?.('DEX')}
                            className="bg-white/10 hover:bg-white/20 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 transition-all border border-white/10"
                        >
                            <Send size={18} /> Withdraw
                        </button>
                    ) : (
                        <button 
                            onClick={connectPhantomWallet}
                            className="bg-primary hover:bg-primary/90 text-white px-8 py-3 rounded-xl font-bold transition-all shadow-lg shadow-primary/20"
                        >
                            Connect Phantom
                        </button>
                    )}
                </div>
            </div>

            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-white mb-2">Wallet App</h1>
                    <p className="text-muted">
                        Manage your mining rewards and node configurations from one master wallet.
                    </p>
                </div>
                <div className="flex gap-2">
                    {!isAdding && !editingWallet && (
                        <button
                            onClick={handleAddWallet}
                            className="flex items-center gap-2 bg-white/5 hover:bg-white/10 text-white px-4 py-2 rounded-lg font-medium transition-all border border-white/10"
                        >
                            <Plus size={18} />
                            Manual Add
                        </button>
                    )}
                    <button
                        onClick={handleLogoutWallet}
                        className="flex items-center gap-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 px-4 py-2 rounded-lg font-medium transition-all border border-red-500/20"
                    >
                        Logout Wallet
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Master Phrase Card */}
                <div className="lg:col-span-1 space-y-6">
                    <div className="bg-gradient-to-br from-indigo-900/30 to-surface border border-indigo-500/20 rounded-2xl p-6">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-indigo-500/20 rounded-xl flex items-center justify-center">
                                    <Shield className="text-indigo-400" size={20} />
                                </div>
                                <h3 className="font-bold text-white">Master Security</h3>
                            </div>
                            <button
                                onClick={() => setShowMnemonic(!showMnemonic)}
                                className="text-muted hover:text-white transition-colors"
                                title={showMnemonic ? "Hide Phrase" : "Show Phrase"}
                            >
                                {showMnemonic ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                        </div>

                        <div className="space-y-3">
                            <p className="text-xs text-indigo-300">GENERATE/RESTORE PHRASE</p>
                            <div className="bg-black/40 border border-white/5 rounded-xl p-4 font-mono text-sm break-all">
                                {showMnemonic ? (
                                    <span className="text-indigo-200">{mnemonic}</span>
                                ) : (
                                    <span className="text-muted/30 italic">•••• •••• •••• •••• •••• •••• •••• •••• •••• •••• •••• ••••</span>
                                )}
                            </div>
                            <p className="text-[10px] text-muted leading-relaxed">
                                Your master phrase is used to derive all mining addresses. Never share this with anyone.
                            </p>
                        </div>
                    </div>

                    <div className="bg-gradient-to-br from-emerald-900/30 to-surface border border-emerald-500/20 rounded-2xl p-6">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 bg-emerald-500/20 rounded-xl flex items-center justify-center">
                                <Database className="text-emerald-400" size={20} />
                            </div>
                            <h3 className="font-bold text-white">Node Setup</h3>
                        </div>

                        <p className="text-sm text-emerald-300 mb-6 leading-relaxed">
                            Instantly configure your local mining agent with addresses for supported coins. Note: XMR auto-derived addresses are stored for reference only and are not pushed for mining payouts.
                        </p>

                        <button
                            onClick={handleOneClickSetup}
                            disabled={isGenerating || !derivedAddresses}
                            className="w-full bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-500/20"
                        >
                            {isGenerating ? <RefreshCw className="animate-spin" size={18} /> : <Zap size={18} />}
                            1-Click Node Setup
                        </button>
                        <p className="text-[10px] text-muted mt-3 text-center">
                            Requires HNH Local Agent (Default: localhost:4343)
                        </p>
                    </div>
                </div>

                {/* Wallets List Section */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Status Banner */}
                    <div className={`p-4 rounded-xl border transition-all ${allConfigured
                        ? 'bg-emerald-500/10 border-emerald-500/30'
                        : 'bg-amber-500/10 border-amber-500/30'
                        }`}>
                        <div className="flex items-start gap-3">
                            {allConfigured ? (
                                <Check className="text-emerald-400 mt-0.5" size={20} />
                            ) : (
                                <AlertTriangle className="text-amber-400 mt-0.5" size={20} />
                            )}
                            <div className="flex-1">
                                <p className={`font-medium ${allConfigured ? 'text-emerald-400' : 'text-amber-400'}`}>
                                    {allConfigured
                                        ? 'All wallets configured! You can start mining.'
                                        : `${stats.missingCoins.length} wallet(s) still needed for full coverage.`
                                    }
                                </p>
                                {!allConfigured && (
                                    <p className="text-sm text-muted mt-1">
                                        Missing: {stats.missingCoins.join(', ')}
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Messages */}
                    {success && (
                        <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-center gap-3 animate-slide-in">
                            <Check className="text-emerald-400" size={20} />
                            <p className="text-emerald-400 text-sm">{success}</p>
                        </div>
                    )}

                    {error && (
                        <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl flex items-center gap-3 animate-slide-in">
                            <X className="text-red-400" size={20} />
                            <p className="text-red-400 text-sm">{error}</p>
                        </div>
                    )}

                    {/* Add/Edit Form */}
                    {(isAdding || editingWallet) && (
                        <div className="bg-surface/50 border border-white/10 rounded-2xl p-6 space-y-6 animate-fade-in">
                            <div className="flex items-center justify-between">
                                <h2 className="text-xl font-bold text-white">
                                    {editingWallet ? 'Edit Wallet' : 'Add New Wallet'}
                                </h2>
                                <button onClick={handleCancel} className="text-muted hover:text-white transition-colors" title="Cancel">
                                    <X size={20} />
                                </button>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-muted">Coin</label>
                                    <select
                                        value={formData.coin}
                                        onChange={(e) => setFormData({ ...formData, coin: e.target.value as MiningCoin, pool: getPoolSuggestion(e.target.value as MiningCoin) })}
                                        disabled={!isAdding}
                                        className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-primary/50 transition-colors"
                                        title="Select Coin"
                                    >
                                        {Object.keys(POOL_CONFIGS).map(coin => (
                                            <option key={coin} value={coin}>{coin} - {POOL_CONFIGS[coin as MiningCoin].name}</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-muted">Worker Name</label>
                                    <input
                                        type="text"
                                        value={formData.workerName}
                                        onChange={(e) => setFormData({ ...formData, workerName: e.target.value })}
                                        placeholder="my-worker-1"
                                        className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder:text-muted/50 focus:outline-none focus:border-primary/50 transition-colors font-mono text-sm"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium text-muted">Wallet Address</label>
                                <input
                                    type="text"
                                    value={formData.address}
                                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                                    placeholder={POOL_CONFIGS[formData.coin].exampleAddress}
                                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder:text-muted/50 focus:outline-none focus:border-primary/50 transition-colors font-mono text-sm"
                                />
                            </div>

                            <button
                                onClick={handleSave}
                                className="w-full flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 text-white px-4 py-3 rounded-xl font-bold transition-all shadow-lg shadow-primary/20"
                            >
                                <Save size={18} />
                                {editingWallet ? 'Update Wallet' : 'Save Wallet'}
                            </button>
                        </div>
                    )}

                    {/* Wallets List */}
                    <div className="grid gap-4">
                        {Object.keys(POOL_CONFIGS).map((coin) => {
                            const coinSym = coin as MiningCoin;
                            const wallet = wallets.find(w => w.coin === coinSym);
                            const derived = derivedAddresses ? derivedAddresses[coinSym] : null;

                            return (
                                <div
                                    key={coin}
                                    className={`bg-surface/50 border rounded-2xl p-5 transition-all hover:border-white/20 ${wallet ? 'border-primary/30' : 'border-white/5 opacity-80'}`}
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-4">
                                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl font-bold bg-gradient-to-br text-white ${
                                                coinSym === 'XMR' ? 'from-orange-500 to-orange-700' :
                                                coinSym === 'RVN' ? 'from-blue-500 to-blue-700' :
                                                coinSym === 'ETC' ? 'from-green-500 to-green-700' :
                                                coinSym === 'ERG' ? 'from-purple-500 to-purple-700' :
                                                'from-pink-500 to-pink-700'
                                            }`}>
                                                {coinSym === 'XMR' ? 'X' : coinSym.substring(0, 1)}
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <h3 className="font-bold text-white text-lg">{POOL_CONFIGS[coinSym].name}</h3>
                                                    <span className="text-xs text-muted font-mono">{coinSym}</span>
                                                    {wallet && (
                                                        <>
                                                            <span className={`flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${wallet.isProductionUsable === false ? 'bg-amber-500/20 text-amber-400' : 'bg-emerald-500/20 text-emerald-400'}`}>
                                                                {wallet.isProductionUsable === false ? <AlertTriangle size={10} /> : <Check size={10} />}
                                                                {wallet.isProductionUsable === false ? 'MANUAL IMPORT REQUIRED' : 'CONFIGURED'}
                                                            </span>
                                                        </>
                                                    )}
                                                </div>
                                                <div className="mt-1 flex items-center gap-2">
                                                    <code className="text-[11px] text-muted font-mono truncate max-w-[200px] md:max-w-md">
                                                        {wallet ? wallet.address : derived ? derived : 'No address set'}
                                                    </code>
                                                    {wallet?.warning && (
                                                        <span className="text-[10px] text-amber-400">{wallet.warning}</span>
                                                    )}
                                                    <button
                                                        onClick={() => handleCopyAddress(wallet ? wallet.address : derived || '')}
                                                        className="text-muted hover:text-white transition-colors"
                                                        title="Copy Address"
                                                    >
                                                        <Copy size={12} />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2">
                                            {wallet ? (
                                                <>
                                                    <button
                                                        onClick={() => handleEditWallet(wallet)}
                                                        className="p-2 text-muted hover:text-white hover:bg-white/5 rounded-lg transition-colors"
                                                        title="Edit Wallet"
                                                    >
                                                        <Edit2 size={18} />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(wallet)}
                                                        className="p-2 text-red-500/50 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                                                        title="Delete Wallet"
                                                    >
                                                        <Trash2 size={18} />
                                                    </button>
                                                </>
                                            ) : (
                                                <button
                                                    onClick={() => {
                                                        if (derived) {
                                                            setFormData({
                                                                coin: coinSym,
                                                                address: derived,
                                                                pool: getPoolSuggestion(coinSym),
                                                                workerName: 'HNH_Worker'
                                                            });
                                                            setIsAdding(true);
                                                        }
                                                    }}
                                                    className="flex items-center gap-2 bg-primary/10 hover:bg-primary/20 text-primary px-3 py-1.5 rounded-lg text-sm font-medium border border-primary/20 transition-all"
                                                >
                                                    <Plus size={14} /> Setup
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    <div className="bg-surface/30 border border-white/5 rounded-2xl p-6">
                        <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                            <Shield size={16} className="text-primary" /> Security Best Practices
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="flex items-start gap-3">
                                <ChevronRight className="text-primary mt-1 shrink-0" size={16} />
                                <p className="text-xs text-muted leading-relaxed">
                                    <strong>Encryption:</strong> Your master phrase is stored in your browser's local storage. Avoid using shared computers.
                                </p>
                            </div>
                            <div className="flex items-start gap-3">
                                <ChevronRight className="text-primary mt-1 shrink-0" size={16} />
                                <p className="text-xs text-muted leading-relaxed">
                                    <strong>Persistence:</strong> If you clear your browser cache, you will need to restore your master phrase. Always keep a physical backup.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Wallets;