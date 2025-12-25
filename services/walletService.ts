/**
 * Wallet Service
 *
 * Manages user wallet state. Balances are stored locally until
 * blockchain integration is complete. Real deposits and swaps
 * require wallet connection (Phantom, MetaMask, etc).
 */

import { API_URL } from './authService';

export interface WalletState {
    solBalance: number;
    rndrBalance: number;
    connectedWallet?: string;
}

const STORAGE_KEY = 'hnh_wallet_state';

// Users start with 0 balance - must connect wallet and deposit
const DEFAULT_STATE: WalletState = {
    solBalance: 0,
    rndrBalance: 0,
    connectedWallet: undefined
};

export const getWalletState = (): WalletState => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return DEFAULT_STATE;
    try {
        return JSON.parse(stored);
    } catch {
        return DEFAULT_STATE;
    }
};

export const updateWalletState = (newState: WalletState) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newState));
    window.dispatchEvent(new Event('wallet-updated'));
};

/**
 * Connect a Solana wallet (Phantom)
 */
export const connectWallet = async (): Promise<string | null> => {
    try {
        const { solana } = window as any;
        if (!solana?.isPhantom) {
            alert('Please install Phantom wallet');
            return null;
        }
        const response = await solana.connect();
        const address = response.publicKey.toString();

        // Update local state with connected wallet
        const state = getWalletState();
        state.connectedWallet = address;
        updateWalletState(state);

        return address;
    } catch (e) {
        console.error('Wallet connection failed:', e);
        return null;
    }
};

/**
 * Disconnect wallet
 */
export const disconnectWallet = () => {
    const state = getWalletState();
    state.connectedWallet = undefined;
    state.solBalance = 0;
    state.rndrBalance = 0;
    updateWalletState(state);
};

/**
 * Fetch real wallet balances from Solana RPC
 */
export const fetchWalletBalances = async (): Promise<WalletState> => {
    const state = getWalletState();
    if (!state.connectedWallet) {
        return state;
    }

    try {
        // Fetch SOL balance from Solana RPC
        const response = await fetch('https://api.mainnet-beta.solana.com', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                jsonrpc: '2.0',
                id: 1,
                method: 'getBalance',
                params: [state.connectedWallet]
            })
        });
        const data = await response.json();
        if (data.result?.value !== undefined) {
            state.solBalance = data.result.value / 1e9; // Convert lamports to SOL
        }

        updateWalletState(state);
        return state;
    } catch (e) {
        console.error('Failed to fetch balances:', e);
        return state;
    }
};

/**
 * Swap tokens using Jupiter aggregator
 * Note: Full implementation requires Jupiter SDK integration
 */
export const swapTokens = async (
    fromToken: 'SOL' | 'RNDR',
    toToken: 'SOL' | 'RNDR',
    amount: number,
    rate: number
): Promise<{ success: boolean; message: string }> => {
    const state = getWalletState();

    if (!state.connectedWallet) {
        return { success: false, message: 'Please connect your wallet first' };
    }

    // Check balance
    if (fromToken === 'SOL' && state.solBalance < amount) {
        return { success: false, message: 'Insufficient SOL balance' };
    }
    if (fromToken === 'RNDR' && state.rndrBalance < amount) {
        return { success: false, message: 'Insufficient RNDR balance' };
    }

    // TODO: Integrate Jupiter SDK for real swaps
    // For now, return a message indicating this feature requires wallet connection
    return {
        success: false,
        message: 'DEX integration coming soon. Connect wallet to trade on Jupiter.'
    };
};
