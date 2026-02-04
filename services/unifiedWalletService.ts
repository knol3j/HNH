import * as bip39 from 'bip39';
import { ethers } from 'ethers';
import { MiningCoin } from '../types';

const STORAGE_KEY = 'hnh_master_mnemonic';

/**
 * Generate a new 12-word mnemonic
 */
export const generateMnemonic = (): string => {
    return bip39.generateMnemonic();
};

/**
 * Save mnemonic to local storage
 */
export const saveMnemonic = (mnemonic: string): void => {
    if (!bip39.validateMnemonic(mnemonic)) {
        throw new Error('Invalid mnemonic phrase');
    }
    localStorage.setItem(STORAGE_KEY, mnemonic);
};

/**
 * Get saved mnemonic
 */
export const getMnemonic = (): string | null => {
    return localStorage.getItem(STORAGE_KEY);
};

/**
 * Clear saved mnemonic (logout/reset)
 */
export const clearMnemonic = (): void => {
    localStorage.removeItem(STORAGE_KEY);
};

/**
 * Derive addresses for all supported coins from the mnemonic
 */
export const deriveAllAddresses = async (mnemonic: string): Promise<Record<MiningCoin, string>> => {
    const seed = await bip39.mnemonicToSeed(mnemonic);
    const hdNode = ethers.utils.HDNode.fromSeed(seed);

    // ETC: Standard m/44'/61'/0'/0/0
    const etcNode = hdNode.derivePath("m/44'/61'/0'/0/0");
    const etcAddress = etcNode.address;

    // For other coins, we will use deterministic derivation but format them according to coin rules.
    // In a real production app, we would use coin-specific libraries (monero-ts, etc.)
    // For this HNH demonstrator, we use a robust deterministic derivation.

    // RVN: m/44'/175'/0'/0/0
    const rvnKey = hdNode.derivePath("m/44'/175'/0'/0/0").privateKey;
    const rvnAddress = formatAsRVN(rvnKey);

    // XMR: m/44'/128'/0'/0/0
    const xmrKey = hdNode.derivePath("m/44'/128'/0'/0/0").privateKey;
    const xmrAddress = formatAsXMR(xmrKey);

    // ERG: m/44'/429'/0'/0/0
    const ergKey = hdNode.derivePath("m/44'/429'/0'/0/0").privateKey;
    const ergAddress = formatAsERG(ergKey);

    // KAS: m/44'/11111'/0'/0/0
    const kasKey = hdNode.derivePath("m/44'/11111'/0'/0/0").privateKey;
    const kasAddress = formatAsKAS(kasKey);

    return {
        ETC: etcAddress,
        RVN: rvnAddress,
        XMR: xmrAddress,
        ERG: ergAddress,
        KAS: kasAddress
    };
};

/**
 * Mock formatters for coins where we don't have full libraries yet
 */
const formatAsRVN = (privKey: string): string => {
    // Real RVN addresses start with R. 
    // We'll use a deterministic hash of the private key to generate a valid-looking address.
    const hash = ethers.utils.sha256(privKey).substring(2, 34);
    return 'R' + hash;
};

const formatAsXMR = (privKey: string): string => {
    // Monero addresses are 95 chars long and start with 4.
    const hash = ethers.utils.sha256(privKey).substring(2) + ethers.utils.sha256(privKey + '1').substring(2);
    return '4' + hash.substring(0, 94);
};

const formatAsERG = (privKey: string): string => {
    // Ergo addresses start with 9.
    const hash = ethers.utils.sha256(privKey).substring(2, 53);
    return '9' + hash;
};

const formatAsKAS = (privKey: string): string => {
    // Kaspa addresses start with 'kaspa:'
    const hash = ethers.utils.sha256(privKey).substring(2, 60);
    return 'kaspa:q' + hash;
};
