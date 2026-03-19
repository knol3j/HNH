/**
 * Wallet Service
 *
 * Manages Solana wallet connectivity (Phantom), balance fetching,
 * token swaps (via Jupiter Terminal), SOL withdrawals, and
 * transaction history from the backend.
 */

import { apiClient } from './apiClient';

const SOLANA_RPC = 'https://api.mainnet-beta.solana.com';

// RNDR SPL Token mint on Solana
const RNDR_MINT = 'rndrizKT3MK1iimdxRdWabcF7Zg7AR5T4nud4EkHBof';

export interface WalletState {
    solBalance: number;
    rndrBalance: number;
    connectedWallet: string | null;
    isPhantom: boolean;
}

export interface TransactionRecord {
    id: string;
    type: 'SWAP' | 'WITHDRAWAL' | 'MINING_PAYOUT' | 'REFERRAL_BONUS';
    amount: number;
    token: string;
    toAddress?: string;
    txHash?: string;
    status: string;
    timestamp: string;
    metadata?: string;
}

const STORAGE_KEY = 'hnh_wallet_state';

const DEFAULT_STATE: WalletState = {
    solBalance: 0,
    rndrBalance: 0,
    connectedWallet: null,
    isPhantom: false
};

// --- State Management ---

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

// --- Phantom Wallet Connection ---

const getPhantomProvider = (): any | null => {
    if ('phantom' in window) {
        return (window as any).phantom?.solana;
    }
    if ('solana' in window) {
        const solana = (window as any).solana;
        if (solana?.isPhantom) return solana;
    }
    return null;
};

export const connectPhantomWallet = async (): Promise<string | null> => {
    const provider = getPhantomProvider();

    if (!provider) {
        window.open('https://phantom.app/', '_blank');
        return null;
    }

    try {
        const response = await provider.connect();
        const address = response.publicKey.toString();

        const state = getWalletState();
        state.connectedWallet = address;
        state.isPhantom = true;
        updateWalletState(state);

        // Fetch balances after connecting
        await fetchAllBalances(address);

        return address;
    } catch (e) {
        console.error('[WALLET] Phantom connection failed:', e);
        return null;
    }
};

export const disconnectWallet = async () => {
    try {
        const provider = getPhantomProvider();
        if (provider) {
            await provider.disconnect();
        }
    } catch (e) {
        console.warn('[WALLET] Disconnect error:', e);
    }

    updateWalletState(DEFAULT_STATE);
};

// --- Balance Fetching ---

export const fetchAllBalances = async (address?: string): Promise<WalletState> => {
    const state = getWalletState();
    const walletAddress = address || state.connectedWallet;

    if (!walletAddress) return state;

    try {
        // Fetch SOL balance via RPC
        const solData: any = await apiClient.post(SOLANA_RPC, {
            jsonrpc: '2.0',
            id: 1,
            method: 'getBalance',
            params: [walletAddress]
        });
        if (solData.result?.value !== undefined) {
            state.solBalance = solData.result.value / 1e9; // lamports → SOL
        }

        // Fetch SPL token accounts (for RNDR balance)
        const tokenData: any = await apiClient.post(SOLANA_RPC, {
            jsonrpc: '2.0',
            id: 2,
            method: 'getTokenAccountsByOwner',
            params: [
                walletAddress,
                { mint: RNDR_MINT },
                { encoding: 'jsonParsed' }
            ]
        });
        if (tokenData.result?.value?.length > 0) {
            const tokenAccount = tokenData.result.value[0];
            const info = tokenAccount.account.data.parsed.info;
            state.rndrBalance = parseFloat(info.tokenAmount.uiAmountString || '0');
        } else {
            state.rndrBalance = 0;
        }

        state.connectedWallet = walletAddress;
        updateWalletState(state);
        return state;
    } catch (e) {
        console.error('[WALLET] Balance fetch failed:', e);
        return state;
    }
};

// --- Token Swap (Jupiter Terminal Integration) ---

export const swapTokens = async (
    fromToken: string,
    toToken: string,
    amount: number,
    rate: number
): Promise<{ success: boolean; message: string }> => {
    const state = getWalletState();

    if (!state.connectedWallet) {
        return { success: false, message: 'Please connect your Phantom wallet to swap tokens.' };
    }

    if (!state.isPhantom) {
        return { success: false, message: 'Phantom wallet required for Solana swaps.' };
    }

    // Check balances
    if (fromToken === 'SOL' && state.solBalance < amount) {
        return { success: false, message: `Insufficient SOL balance. You have ${state.solBalance.toFixed(4)} SOL.` };
    }
    if (fromToken === 'RNDR' && state.rndrBalance < amount) {
        return { success: false, message: `Insufficient RNDR balance. You have ${state.rndrBalance.toFixed(4)} RNDR.` };
    }

    const jupiterEl = document.getElementById('jupiter-terminal');
    if (jupiterEl) {
        jupiterEl.scrollIntoView({ behavior: 'smooth' });
    }

    // Log swap intent to backend
    try {
        await logTransaction({
            type: 'SWAP',
            amount,
            token: fromToken,
            metadata: JSON.stringify({ fromToken, toToken, rate, estimatedReceive: amount * rate })
        });
    } catch (e) {
        console.warn('[WALLET] Failed to log swap intent:', e);
    }

    // Refresh balances after a short delay
    setTimeout(() => fetchAllBalances(), 5000);

    return {
        success: true,
        message: `Swap initiated via Jupiter. Complete the transaction in the swap widget.`
    };
};

// --- SOL Withdrawal ---

export const withdrawSOL = async (
    toAddress: string,
    amount: number
): Promise<{ success: boolean; message: string; txHash?: string }> => {
    const state = getWalletState();

    if (!state.connectedWallet) {
        return { success: false, message: 'Please connect your wallet first.' };
    }

    if (!state.isPhantom) {
        return { success: false, message: 'Phantom wallet required for withdrawals.' };
    }

    if (amount <= 0) {
        return { success: false, message: 'Amount must be greater than 0.' };
    }

    const FEE_RESERVE = 0.005;
    if (state.solBalance < amount + FEE_RESERVE) {
        return {
            success: false,
            message: `Insufficient balance. You have ${state.solBalance.toFixed(4)} SOL (need ${(amount + FEE_RESERVE).toFixed(4)} including fee).`
        };
    }

    if (!/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(toAddress)) {
        return { success: false, message: 'Invalid Solana address format.' };
    }

    const provider = getPhantomProvider();
    if (!provider) {
        return { success: false, message: 'Phantom wallet not found.' };
    }

    try {
        const lamports = Math.round(amount * 1e9);

        // Get recent blockhash via RPC
        const blockhashData: any = await apiClient.post(SOLANA_RPC, {
            jsonrpc: '2.0',
            id: 1,
            method: 'getLatestBlockhash',
            params: [{ commitment: 'finalized' }]
        });
        const blockhash = blockhashData.result.value.blockhash;

        const SYSTEM_PROGRAM_ID = '11111111111111111111111111111111';

        const transaction = {
            feePayer: state.connectedWallet,
            recentBlockhash: blockhash,
            instructions: [{
                programId: SYSTEM_PROGRAM_ID,
                keys: [
                    { pubkey: state.connectedWallet, isSigner: true, isWritable: true },
                    { pubkey: toAddress, isSigner: false, isWritable: true }
                ],
                data: new Uint8Array([2, 0, 0, 0, ...numberToLEBytes(lamports)]) 
            }]
        };

        const { signature } = await provider.signAndSendTransaction(transaction);

        // Log to backend
        await logTransaction({
            type: 'WITHDRAWAL',
            amount,
            token: 'SOL',
            toAddress,
            txHash: signature,
            status: 'COMPLETED'
        });

        setTimeout(() => fetchAllBalances(), 3000);

        return {
            success: true,
            message: `Successfully sent ${amount} SOL!`,
            txHash: signature
        };
    } catch (e: any) {
        console.error('[WALLET] Withdrawal failed:', e);

        await logTransaction({
            type: 'WITHDRAWAL',
            amount,
            token: 'SOL',
            toAddress,
            status: 'FAILED',
            metadata: JSON.stringify({ error: e.message })
        });

        if (e.code === 4001) {
            return { success: false, message: 'Transaction rejected by user.' };
        }
        return { success: false, message: `Withdrawal failed: ${e.message || 'Unknown error'}` };
    }
};

function numberToLEBytes(n: number): number[] {
    const buf = new ArrayBuffer(8);
    const view = new DataView(buf);
    view.setUint32(0, n & 0xFFFFFFFF, true);
    view.setUint32(4, Math.floor(n / 0x100000000) & 0xFFFFFFFF, true);
    return Array.from(new Uint8Array(buf));
}

// --- Transaction Logging ---

interface LogTransactionParams {
    type: string;
    amount: number;
    token: string;
    toAddress?: string;
    txHash?: string;
    status?: string;
    metadata?: string;
}

const logTransaction = async (params: LogTransactionParams) => {
    try {
        await apiClient.post('/user/transactions', params);
    } catch (e) {
        console.warn('[WALLET] Failed to log transaction:', e);
    }
};

// --- Transaction History ---

export const getTransactionHistory = async (
    type?: 'SWAP' | 'WITHDRAWAL',
    limit: number = 50
): Promise<TransactionRecord[]> => {
    try {
        return await apiClient.get<TransactionRecord[]>('/user/transactions', { type: type || '', limit });
    } catch (e) {
        console.error('[WALLET] Failed to fetch transaction history:', e);
        return [];
    }
};

// --- Legacy Compatibility ---

export const connectWallet = connectPhantomWallet;
export const fetchWalletBalances = fetchAllBalances;
