/**
 * Mining Wallet Service
 *
 * Manages mining wallet addresses for all supported coins.
 * This is critical for the miner agent to function correctly.
 * Wallets are stored locally and validated for correctness.
 */

import { MiningWallet, MiningCoin, WalletFormData, PoolConfig } from '../types';

import { apiClient } from './apiClient';

// Storage key for mining wallets
const STORAGE_KEY = 'hnh_mining_wallets';

// Pool configurations for each supported coin
export const POOL_CONFIGS: Record<MiningCoin, PoolConfig> = {
    XMR: {
        coin: 'XMR',
        name: 'Monero',
        defaultPool: 'pool.supportxmr.com:3333',
        exampleAddress: '43UiKcQiU7m3S7f9vPVsTjJ1u6K5qZ5qZ5qZ5qZ5qZ5qZ5qZ5qZ5qZ5qZ5qZ5q',
        website: 'https://supportxmr.com'
    },
    RVN: {
        coin: 'RVN',
        name: 'Ravencoin',
        defaultPool: 'stratum.rvn.minermore.com:4555',
        exampleAddress: 'RM7VD6Xt5Um6hEx9ueVwjX9F4kU9KueZVh',
        website: 'https://ravencoin.org'
    },
    ETC: {
        coin: 'ETC',
        name: 'Ethereum Classic',
        defaultPool: 'etc.ethermine.org:14444',
        exampleAddress: '0x742d35Cc6634C0532925a3b844Bc9e7595f8fEb3',
        website: 'https://ethereumclassic.org'
    },
    ERG: {
        coin: 'ERG',
        name: 'Ergo',
        defaultPool: 'ergo.eu.nicehash.com:3380',
        exampleAddress: '9iuZ4HfXHpR6u7YXWt6mY4u6W5e5r5r5r5r5r5r5r5r5r5r5r5r5r5r5r5r',
        website: 'https://ergoplatform.org'
    },
    KAS: {
        coin: 'KAS',
        name: 'Kaspa',
        defaultPool: 'kas.2miners.com:2222',
        exampleAddress: 'kaspa:qzw0h6w9x0y5z5v6w8h6g7f8e9d0c1b2a3s4d5f6g7h8j9k0l1z2x3c4v5b6n7m8',
        website: 'https://kaspa.org'
    }
};

// Address validation patterns for each coin
// Updated for real address derivation (2025-06-18)
const ADDRESS_PATTERNS: Record<MiningCoin, RegExp> = {
    // Monero standard mainnet: starts with '4', 95 base58 chars
    XMR: /^4[1-9A-HJ-NP-Za-km-z]{94}$/,
    // Ravencoin P2PKH: starts with 'R', base58check, 34 chars
    RVN: /^R[1-9A-HJ-NP-Za-km-z]{33}$/,
    // Ethereum Classic: 0x + 40 hex chars
    ETC: /^0x[a-fA-F0-9]{40}$/,
    // Ergo P2PK mainnet: starts with '9', base58, 51 chars
    ERG: /^9[1-9A-HJ-NP-Za-km-z]{50}$/,
    // Kaspa bech32m: kaspa1 (standard) or kaspa: (visual), bech32 charset, ~62 chars
    KAS: /^kaspa[1:][a-z02-9ac-hj-np-z]{52,59}$/
};

/**
 * Get all saved mining wallets
 */
export const getMiningWallets = (): MiningWallet[] => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];
    try {
        return JSON.parse(stored);
    } catch {
        return [];
    }
};

/**
 * Get a single wallet by ID
 */
export const getWalletById = (id: string): MiningWallet | undefined => {
    const wallets = getMiningWallets();
    return wallets.find(w => w.id === id);
};

/**
 * Get wallet for a specific coin
 */
export const getWalletByCoin = (coin: MiningCoin): MiningWallet | undefined => {
    const wallets = getMiningWallets();
    return wallets.find(w => w.coin === coin);
};

/**
 * Save a new wallet or update existing one
 */
export const saveWallet = async (data: WalletFormData): Promise<{ success: boolean; wallet?: MiningWallet; error?: string }> => {
    // Validate address
    const pattern = ADDRESS_PATTERNS[data.coin];
    if (!pattern.test(data.address)) {
        return { success: false, error: `Invalid ${data.coin} address format` };
    }

    // Validate worker name
    if (data.workerName.length < 3 || data.workerName.length > 32) {
        return { success: false, error: 'Worker name must be 3-32 characters' };
    }

    const wallets = getMiningWallets();
    const now = Date.now();

    // Check if wallet for this coin already exists
    const existingIndex = wallets.findIndex(w => w.coin === data.coin);

    const wallet: MiningWallet = {
        id: existingIndex >= 0 ? wallets[existingIndex].id : `wallet_${now}_${Math.random().toString(36).substr(2, 9)}`,
        coin: data.coin,
        address: data.address.trim(),
        pool: data.pool.trim(),
        workerName: data.workerName.trim(),
        createdAt: existingIndex >= 0 ? wallets[existingIndex].createdAt : now,
        updatedAt: now,
        isValid: true,
        lastValidated: now
    };

    if (existingIndex >= 0) {
        wallets[existingIndex] = wallet;
    } else {
        wallets.push(wallet);
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(wallets));

    // --- SYNC TO BACKEND ---
    const token = localStorage.getItem('hnh_token');

    if (token) {
        try {
            await apiClient.post('/user/wallets', {
                coin: wallet.coin,
                address: wallet.address,
                label: wallet.workerName, // Use workerName as label
                poolUrl: wallet.pool,
                isDefault: true
            });
        } catch (e) {
            console.warn('[BACKEND] Failed to sync wallet to database', e);
            // We continue as it's saved locally
        }
    }

    // Dispatch event for real-time updates
    window.dispatchEvent(new Event('wallets-updated'));

    return { success: true, wallet };
};

/**
 * Sync wallets from backend
 */
export const syncWithBackend = async (): Promise<void> => {
    try {
        const backendWallets = await apiClient.get<any[]>('/user/wallets');
        
        if (Array.isArray(backendWallets)) {
            const localWallets = getMiningWallets();
            const now = Date.now();

            backendWallets.forEach(bw => {
                const existingIndex = localWallets.findIndex(lw => lw.coin === bw.coin);
                const wallet: MiningWallet = {
                    id: existingIndex >= 0 ? localWallets[existingIndex].id : `wallet_sync_${bw.id}`,
                    coin: bw.coin as MiningCoin,
                    address: bw.address,
                    pool: bw.poolUrl || getPoolSuggestion(bw.coin as MiningCoin),
                    workerName: bw.label || 'HNH_Worker',
                    createdAt: now,
                    updatedAt: now,
                    isValid: true,
                    lastValidated: now
                };

                if (existingIndex >= 0) {
                    localWallets[existingIndex] = wallet;
                } else {
                    localWallets.push(wallet);
                }
            });

            localStorage.setItem(STORAGE_KEY, JSON.stringify(localWallets));
            window.dispatchEvent(new Event('wallets-updated'));
        }
    } catch (e) {
        console.error('[BACKEND] Failed to sync from database', e);
    }
};

/**
 * Delete a wallet by ID
 */
export const deleteWallet = (id: string): boolean => {
    const wallets = getMiningWallets();
    const filtered = wallets.filter(w => w.id !== id);

    if (filtered.length === wallets.length) {
        return false; // Wallet not found
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
    window.dispatchEvent(new Event('wallets-updated'));
    return true;
};

/**
 * Validate a wallet address
 */
export const validateAddress = (coin: MiningCoin, address: string): boolean => {
    const pattern = ADDRESS_PATTERNS[coin];
    return pattern.test(address.trim());
};

/**
 * Get pool suggestion based on region or use default
 */
export const getPoolSuggestion = (coin: MiningCoin, region: 'US' | 'EU' | 'ASIA' = 'US'): string => {
    const config = POOL_CONFIGS[coin];

    // Region-based pool selection
    switch (coin) {
        case 'XMR':
            return region === 'US' ? 'pool.supportxmr.com:3333' :
                region === 'EU' ? 'mine.xmrpool.net:3333' :
                    'asia.supportxmr.com:3333';
        case 'RVN':
            return region === 'US' ? 'stratum.rvn.minermore.com:4555' :
                region === 'EU' ? 'rvn.2miners.com:6060' :
                    'rvn.coinfoundry.org:3571';
        case 'ETC':
            return region === 'US' ? 'etc.ethermine.org:14444' :
                region === 'EU' ? 'etc.miningpoolhub.com:20555' :
                    'asia.ethermine.org:14444';
        case 'ERG':
            return 'ergo.eu.nicehash.com:3380';
        case 'KAS':
            return region === 'US' ? 'kas.2miners.com:2222' :
                region === 'EU' ? 'kas.eu.2miners.com:2222' :
                    'kas.ss.poolbinance.com:2233';
        default:
            return config.defaultPool;
    }
};

/**
 * Get wallet statistics
 */
export const getWalletStats = () => {
    const wallets = getMiningWallets();
    const totalWallets = wallets.length;
    const coinsWithWallets = new Set(wallets.map(w => w.coin)).size;
    const validWallets = wallets.filter(w => w.isValid).length;

    return {
        totalWallets,
        coinsWithWallets,
        validWallets,
        missingCoins: ['XMR', 'RVN', 'ETC', 'ERG', 'KAS'].filter(c => !wallets.find(w => w.coin === c))
    };
};

/**
 * Check if user has all required wallets
 */
export const hasAllWallets = (): boolean => {
    const wallets = getMiningWallets();
    const coins = ['XMR', 'RVN', 'ETC', 'ERG', 'KAS'] as const;
    return coins.every(coin => wallets.some(w => w.coin === coin));
};

/**
 * Check if user has at least one wallet configured
 */
export const hasAnyWallet = (): boolean => {
    return getMiningWallets().length > 0;
};

/**
 * Get the primary wallet for mining (first valid one)
 */
export const getPrimaryWallet = (): MiningWallet | undefined => {
    const wallets = getMiningWallets();
    return wallets.find(w => w.isValid);
};

/**
 * Export wallets for agent configuration
 */
export const exportWalletsForAgent = (): Record<MiningCoin, { address: string; pool: string; worker: string } | null> => {
    const wallets = getMiningWallets();
    const result: Record<MiningCoin, { address: string; pool: string; worker: string } | null> = {
        XMR: null,
        RVN: null,
        ETC: null,
        ERG: null,
        KAS: null
    };

    wallets.forEach(w => {
        if (w.isValid) {
            result[w.coin] = {
                address: w.address,
                pool: w.pool,
                worker: w.workerName
            };
        }
    });

    return result;
};

/**
 * Bulk apply derived addresses to all coins
 */
export const applyDerivedAddresses = async (addresses: Record<MiningCoin, string>): Promise<{ success: boolean; error?: string }> => {
    try {
        const results = await Promise.all(
            (Object.entries(addresses) as [MiningCoin, string][]).map(([coin, address]) =>
                saveWallet({
                    coin,
                    address,
                    pool: getPoolSuggestion(coin),
                    workerName: 'HNH_Worker'
                })
            )
        );

        const failed = results.filter(r => !r.success);
        if (failed.length > 0) {
            return { success: false, error: `Failed to save ${failed.length} wallets` };
        }

        return { success: true };
    } catch (e) {
        console.error("Failed to apply derived addresses", e);
        return { success: false, error: String(e) };
    }
};

/**
 * Subscribe to wallet changes
 */
export const onWalletsChanged = (callback: () => void) => {
    window.addEventListener('wallets-updated', callback);
    return () => window.removeEventListener('wallets-updated', callback);
};
