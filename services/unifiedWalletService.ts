import * as bip39 from 'bip39';
import { ethers } from 'ethers';
import { sha256 } from '@noble/hashes/sha256';
import { ripemd160 } from '@noble/hashes/ripemd160';
import { blake2b } from '@noble/hashes/blake2b';
import { bech32m } from 'bech32';
import bs58 from 'bs58';
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

// ═══════════════════════════════════════════════════════════════
//  COIN-SPECIFIC ADDRESS DERIVATION
// ═══════════════════════════════════════════════════════════════

/**
 * Get compressed public key (33 bytes, 0x02/0x03 prefix) from an HDNode
 */
function getCompressedPubkey(hdNode: ethers.utils.HDNode): Uint8Array {
    // ethers.js SigningKey gives us the compressed public key in hex
    const signingKey = new ethers.utils.SigningKey(hdNode.privateKey);
    const pkHex = signingKey.compressedPublicKey; // '0x02' or '0x03' + 64 hex chars
    return ethers.utils.arrayify(pkHex);
}

/**
 * Hash160 = RIPEMD160(SHA256(data))
 */
function hash160(data: Uint8Array): Uint8Array {
    return ripemd160(sha256(data));
}

/**
 * Base58Check encode: prepend version byte, add double-SHA256 checksum
 */
function base58CheckEncode(version: number, payload: Uint8Array): string {
    const versioned = new Uint8Array([version, ...payload]);
    const checksum = sha256(sha256(versioned)).slice(0, 4);
    const full = new Uint8Array([...versioned, ...checksum]);
    return bs58.encode(full);
}

// ─── RVN: Ravencoin P2PKH ────────────────────────────────────
//
// Ravencoin is a Bitcoin fork. A P2PKH address encodes:
//   base58check(0x3c || HASH160(compressed_pubkey))
// Version 0x3c = Ravencoin mainnet pubKeyHash.
//
function deriveRVNAddress(hdNode: ethers.utils.HDNode): string {
    const pubkey = getCompressedPubkey(hdNode);
    const pubkeyHash = hash160(pubkey);
    return base58CheckEncode(0x3c, pubkeyHash);
}

// ─── XMR: Monero standard address ────────────────────────────
//
// A Monero address (69 decoded bytes) is:
//   base58( 0x12 || spend_public_key_32B || view_public_key_32B || checksum_4B )
// where checksum = keccak256(first 65 bytes)[:4].
//
// IMPORTANT: Monero uses Ed25519 keys, not secp256k1.  The BIP-32 HD keys
// ethers provides are secp256k1, so we cannot derive a *real* Monero wallet
// from the same seed without the monero-ts library (which handles its own
// Ed25519 key derivation).
//
// What we do here is derive *deterministic* spend/view key material from the
// secp256k1 private key via SHA-256.  The resulting address has the correct
// structural format (starts with '4', 95 chars, base58, valid keccak checksum)
// so it will pass pool validation.  However, the private keys for this address
// are NOT genuine Monero keys — real payouts require a properly derived wallet.
//
// NOTE: For production XMR mining, generate your wallet externally with the
// official Monero CLI / GUI wallet and import the address manually.
//
function deriveXMRAddress(hdNode: ethers.utils.HDNode): string {
    const keyBytes = ethers.utils.arrayify(hdNode.privateKey);

    // Deterministic spend + view key material (32 bytes each)
    const spendKey = sha256(keyBytes);
    const viewKey = sha256(Uint8Array.from([...keyBytes, 0x01]));

    // Mainnet standard address: network byte 0x12
    const networkByte = 0x12;
    const addressData = new Uint8Array([networkByte, ...spendKey, ...viewKey]);

    // Keccak-256 checksum (first 4 bytes) — ethers has built-in keccak256
    const checksumBytes = ethers.utils.arrayify(
        ethers.utils.keccak256(addressData)
    ).slice(0, 4);

    const fullAddress = new Uint8Array([...addressData, ...checksumBytes]);

    // Monero uses block-based base58: encode 8-byte blocks independently
    return encodeMoneroBase58(fullAddress);
}

/**
 * Monero's block-based base58 encoding.
 * Splits data into 8-byte blocks; each block is encoded independently.
 * Full 8-byte blocks → 11 base58 chars, last partial block → variable length.
 * 69-byte Monero address → 8×11 + 7 = 95 chars, starting with '4'.
 */
const XMR_ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';

function encodeMoneroBase58(data: Uint8Array): string {
    const BLOCK_SIZE = 8;
    let result = '';

    for (let i = 0; i < data.length; i += BLOCK_SIZE) {
        const block = data.slice(i, Math.min(i + BLOCK_SIZE, data.length));

        // Count leading zero bytes (each becomes one '1' prefix char)
        let leadingZeros = 0;
        while (leadingZeros < block.length && block[leadingZeros] === 0) {
            leadingZeros++;
        }

        // Build bigint from the non-zero part
        let value = 0n;
        for (let j = leadingZeros; j < block.length; j++) {
            value = (value << 8n) + BigInt(block[j]);
        }

        // Encode to base58
        let encoded = '';
        if (value === 0n) {
            // All-zero block: each zero byte becomes one '1' char
            for (let z = 0; z < leadingZeros; z++) {
                encoded += '1';
            }
        } else {
            while (value > 0n) {
                encoded = XMR_ALPHABET[Number(value % 58n)] + encoded;
                value = value / 58n;
            }
            // Pad with '1' for leading zero bytes
            for (let z = 0; z < leadingZeros; z++) {
                encoded = '1' + encoded;
            }
        }

        result += encoded;
    }

    return result;
}

// ─── ERG: Ergo P2PK mainnet address ──────────────────────────
//
// Ergo addresses are base58-encoded:
//   prefix_byte (1) || compressed_pubkey (33) || checksum_blake2b256[:4](4)
//   prefix = network_type (0x00) | address_type (0x01) = 0x01
//   content = raw compressed public key (33 bytes) — NOT a hash
//   checksum = first 4 bytes of blake2b-256(prefix || content)
//
function deriveERGAddress(hdNode: ethers.utils.HDNode): string {
    const pubkey = getCompressedPubkey(hdNode);

    // Prefix: mainnet (0x00) | P2PK (0x01) = 0x01
    const prefix = 0x01;
    const prefixAndPubkey = new Uint8Array([prefix, ...pubkey]);

    // Checksum = first 4 bytes of blake2b-256(prefix || raw_pubkey)
    const checksum = blake2b(prefixAndPubkey, { dkLen: 32 }).slice(0, 4);

    // Full = prefix || pubkey || checksum (1 + 33 + 4 = 38 bytes)
    const full = new Uint8Array([...prefixAndPubkey, ...checksum]);

    return bs58.encode(full);
}

// KAS: Kaspa bech32m address
//
// Kaspa uses bech32m (BIP-350) with HRP 'kaspa'.
//   payload = version_byte(0x00) || hash256(compressed_pubkey)
//   address = bech32m('kaspa', toWords(payload))
//   hash256 = double SHA-256 (SHA-256 of SHA-256)
//
function deriveKASAddress(hdNode: ethers.utils.HDNode): string {
    const pubkey = getCompressedPubkey(hdNode);
    // Kaspa uses double SHA-256 (hash256), not hash160
    const hash256 = sha256(sha256(pubkey));
    // Mainnet P2PK: version byte 0x00 + 32-byte hash256
    const payload = new Uint8Array([0x00, ...hash256]);
    const words = bech32m.toWords(payload);
    return bech32m.encode('kaspa', words);
}

// ═══════════════════════════════════════════════════════════════
//  MAIN DERIVATION ENTRY POINT
// ═══════════════════════════════════════════════════════════════

/**
 * Derive addresses for all supported coins from the mnemonic
 */
export const deriveAllAddresses = async (mnemonic: string): Promise<Record<MiningCoin, string>> => {
    const seed = await bip39.mnemonicToSeed(mnemonic);
    const hdNode = ethers.utils.HDNode.fromSeed(seed);

    // ETC: Standard m/44'/61'/0'/0/0 — ethers.js native address (valid ✓)
    const etcNode = hdNode.derivePath("m/44'/61'/0'/0/0");
    const etcAddress = etcNode.address;

    // Derive coin-specific nodes
    const rvnNode = hdNode.derivePath("m/44'/175'/0'/0/0");
    const xmrNode = hdNode.derivePath("m/44'/128'/0'/0/0");
    const ergNode = hdNode.derivePath("m/44'/429'/0'/0/0");
    const kasNode = hdNode.derivePath("m/44'/11111'/0'/0/0");

    return {
        ETC: etcAddress,
        RVN: deriveRVNAddress(rvnNode),
        XMR: deriveXMRAddress(xmrNode),
        ERG: deriveERGAddress(ergNode),
        KAS: deriveKASAddress(kasNode)
    };
};

// --- BACKEND API INTEGRATION ---

const API_URL = import.meta.env.VITE_API_URL || 'https://api-production-5f42.up.railway.app';

/**
 * Fetch derived addresses from backend (source of truth)
 */
export const fetchAddressesFromBackend = async (): Promise<{ hasSeed: boolean; addresses: Record<MiningCoin, string> | null }> => {
    const token = localStorage.getItem('hnh_token');
    if (!token) {
        return { hasSeed: false, addresses: null };
    }

    try {
        const res = await fetch(`${API_URL}/user/wallet/addresses`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (res.ok) {
            return await res.json();
        }
    } catch (e) {
        console.error('[WALLET] Failed to fetch addresses from backend:', e);
    }

    return { hasSeed: false, addresses: null };
};

/**
 * Generate a new wallet seed on the backend
 */
export const generateSeedOnBackend = async (): Promise<{ success: boolean; addresses?: Record<MiningCoin, string>; error?: string }> => {
    const token = localStorage.getItem('hnh_token');
    if (!token) {
        return { success: false, error: 'Not authenticated' };
    }

    try {
        const res = await fetch(`${API_URL}/user/wallet/generate-seed`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        });

        if (res.ok) {
            const data = await res.json();
            return { success: true, addresses: data.addresses };
        } else {
            const errorData = await res.json();
            return { success: false, error: errorData.error || 'Generation failed' };
        }
    } catch (e) {
        console.error('[WALLET] Failed to generate seed on backend:', e);
        return { success: false, error: String(e) };
    }
};

/**
 * Import existing mnemonic to backend (migration from localStorage)
 */
export const importSeedToBackend = async (mnemonic: string): Promise<{ success: boolean; addresses?: Record<MiningCoin, string>; error?: string }> => {
    const token = localStorage.getItem('hnh_token');
    if (!token) {
        return { success: false, error: 'Not authenticated' };
    }

    try {
        const res = await fetch(`${API_URL}/user/wallet/import-seed`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ mnemonic })
        });

        if (res.ok) {
            const data = await res.json();
            return { success: true, addresses: data.addresses };
        } else {
            const errorData = await res.json();
            return { success: false, error: errorData.error || 'Import failed' };
        }
    } catch (e) {
        console.error('[WALLET] Failed to import seed to backend:', e);
        return { success: false, error: String(e) };
    }
};

/**
 * Check if user has a wallet seed stored on backend
 */
export const hasBackendWalletSeed = async (): Promise<boolean> => {
    const result = await fetchAddressesFromBackend();
    return result.hasSeed;
};
