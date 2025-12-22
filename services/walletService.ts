
export interface WalletState {
    solBalance: number;
    rndrBalance: number;
}

const STORAGE_KEY = 'hnh_wallet_state';

const DEFAULT_STATE: WalletState = {
    solBalance: 14.5,
    rndrBalance: 0.0
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
    // Dispatch event for reactive updates in UI if needed, 
    // though React components will typically re-fetch or use a hook.
    window.dispatchEvent(new Event('wallet-updated'));
};

export const swapTokens = async (
    fromToken: 'SOL' | 'RNDR',
    toToken: 'SOL' | 'RNDR',
    amount: number,
    rate: number
): Promise<{ success: boolean; message: string }> => {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 1500));

    const state = getWalletState();

    if (fromToken === 'SOL') {
        if (state.solBalance < amount) {
            return { success: false, message: 'Insufficient SOL balance' };
        }
        state.solBalance -= amount;
        state.rndrBalance += amount * rate;
    } else {
        if (state.rndrBalance < amount) {
            return { success: false, message: 'Insufficient RNDR balance' };
        }
        state.rndrBalance -= amount;
        state.solBalance += amount * rate;
    }

    updateWalletState(state);
    return { success: true, message: `Successfully swapped ${amount} ${fromToken}` };
};
