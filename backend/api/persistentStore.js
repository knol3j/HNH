import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const STORE_PATH = path.join(__dirname, 'persistentStore.json');

// Encryption settings
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const SALT_LENGTH = 64;
const TAG_LENGTH = 16;

/**
 * Get or generate the Master Encryption Key
 */
const getEncryptionKey = () => {
    let key = process.env.PERSISTENT_STORE_SECRET;
    if (!key) {
        console.warn('[SECURITY] PERSISTENT_STORE_SECRET not found in .env. Using a fallback (NOT SECURE FOR PRODUCTION).');
        // In a real scenario, we would throw an error or use a system-level secret.
        key = 'hnh-dev-secret-key-32-chars-long!!!';
    }
    // Ensure key is 32 bytes for aes-256
    return crypto.scryptSync(key, 'hnh-salt', 32);
};

/**
 * Encrypt data
 */
const encrypt = (text) => {
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, getEncryptionKey(), iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const tag = cipher.getAuthTag();
    return {
        iv: iv.toString('hex'),
        content: encrypted,
        tag: tag.toString('hex')
    };
};

/**
 * Decrypt data
 */
const decrypt = (encData) => {
    const decipher = crypto.createDecipheriv(
        ALGORITHM,
        getEncryptionKey(),
        Buffer.from(encData.iv, 'hex')
    );
    decipher.setAuthTag(Buffer.from(encData.tag, 'hex'));
    let decrypted = decipher.update(encData.content, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
};

/**
 * Save critical data to persistent JSON store
 */
export const backupToStore = (data) => {
    try {
        const encryptedData = encrypt(JSON.stringify(data));
        fs.writeFileSync(STORE_PATH, JSON.stringify(encryptedData, null, 2));
        return true;
    } catch (e) {
        console.error('[PERSISTENCE] Backup failed:', e);
        return false;
    }
};

/**
 * Load critical data from persistent JSON store
 */
export const loadFromStore = () => {
    try {
        if (!fs.existsSync(STORE_PATH)) return null;
        const raw = fs.readFileSync(STORE_PATH, 'utf8');
        const encryptedData = JSON.parse(raw);
        const decrypted = decrypt(encryptedData);
        return JSON.parse(decrypted);
    } catch (e) {
        console.error('[PERSISTENCE] Load failed:', e);
        return null;
    }
};

// Export encryption utilities for wallet seed encryption
export { encrypt, decrypt };

/**
 * Full Sync: Database -> Store
 */
export const syncDbToStore = async (prisma) => {
    try {
        const users = await prisma.user.findMany({
            include: {
                savedWallets: true,
                userStats: true
            }
        });

        const dataToSave = {
            users: users.map(u => ({
                username: u.username,
                passwordHash: u.passwordHash,
                tier: u.tier,
                role: u.role,
                referralCode: u.referralCode,
                referredBy: u.referredBy,
                wallets: u.savedWallets.map(w => ({
                    coin: w.coin,
                    address: w.address,
                    label: w.label,
                    poolUrl: w.poolUrl,
                    isDefault: w.isDefault
                })),
                walletSeed: u.walletSeed, // Encrypted HD wallet seed
                stats: u.userStats ? {
                    totalShares: u.userStats.totalShares,
                    totalMinedUsd: u.userStats.totalMinedUsd,
                    xp: u.userStats.xp,
                    level: u.userStats.level
                } : null
            })),
            timestamp: new Date().toISOString()
        };

        backupToStore(dataToSave);
        console.log(`[PERSISTENCE] Successfully backed up ${users.length} users to secure store.`);
    } catch (e) {
        console.error('[PERSISTENCE] Sync to store failed:', e);
    }
};

/**
 * Full Restore: Store -> Database
 */
export const restoreFromStoreToDb = async (prisma) => {
    const data = loadFromStore();
    if (!data || !data.users) {
        console.log('[PERSISTENCE] No backup found or backup empty.');
        return;
    }

    console.log(`[PERSISTENCE] Found ${data.users.length} users in backup. Restoring to DB...`);

    for (const u of data.users) {
        try {
            // Upsert User
            const user = await prisma.user.upsert({
                where: { username: u.username },
                update: {
                    passwordHash: u.passwordHash,
                    tier: u.tier,
                    role: u.role,
                    referralCode: u.referralCode,
                    referredBy: u.referredBy,
                    walletSeed: u.walletSeed || undefined  // Restore encrypted seed
                },
                create: {
                    username: u.username,
                    passwordHash: u.passwordHash,
                    tier: u.tier,
                    role: u.role,
                    referralCode: u.referralCode,
                    referredBy: u.referredBy,
                    walletSeed: u.walletSeed || undefined  // Restore encrypted seed
                }
            });

            // Restore Wallets
            if (u.wallets && u.wallets.length > 0) {
                for (const w of u.wallets) {
                    await prisma.userWallet.upsert({
                        where: {
                            userId_coin_address: {
                                userId: user.id,
                                coin: w.coin,
                                address: w.address
                            }
                        },
                        update: {
                            label: w.label,
                            poolUrl: w.poolUrl,
                            isDefault: w.isDefault
                        },
                        create: {
                            userId: user.id,
                            coin: w.coin,
                            address: w.address,
                            label: w.label,
                            poolUrl: w.poolUrl,
                            isDefault: w.isDefault
                        }
                    });
                }
            }

            // Restore Stats
            if (u.stats) {
                await prisma.userStats.upsert({
                    where: { userId: user.id },
                    update: {
                        totalShares: u.stats.totalShares,
                        totalMinedUsd: u.stats.totalMinedUsd,
                        xp: u.stats.xp,
                        level: u.stats.level
                    },
                    create: {
                        userId: user.id,
                        totalShares: u.stats.totalShares,
                        totalMinedUsd: u.stats.totalMinedUsd,
                        xp: u.stats.xp,
                        level: u.stats.level
                    }
                });
            }
        } catch (e) {
            console.error(`[PERSISTENCE] Failed to restore user ${u.username}:`, e);
        }
    }
    console.log('[PERSISTENCE] Restore completed.');
};
