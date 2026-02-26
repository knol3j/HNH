
import express from 'express';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { encrypt, decrypt } from './persistentStore.js';
import * as bip39 from 'bip39';
import { ethers } from 'ethers';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const HARDWARE_FILE = path.join(__dirname, 'hardware_data.json');
const POSTS_FILE = path.join(__dirname, 'posts.json');

// --- FORUM SEEDING (Ephemeral) ---
let posts = [];
try {
    if (fs.existsSync(POSTS_FILE)) {
        posts = JSON.parse(fs.readFileSync(POSTS_FILE, 'utf8'));
    } else {
        posts = [
            { id: 'seed1', title: 'Official Overclocking Database (Wiki)', author: 'System', category: 'General', content: 'Check the new Hardware tab for optimized settings.', timestamp: 'Just now', likes: 42, replies: 0, isPinned: true },
            { id: 'seed2', title: 'Spec Mining Alert: Karlsen (KLS)', author: 'MinerMike', category: 'Announcements', content: 'New fork of Kaspa. Difficulty is low.', timestamp: '1h ago', likes: 12, replies: 5 }
        ];
        // Don't write to disk on Vercel/Railway usually, but good for local dev
        try { fs.writeFileSync(POSTS_FILE, JSON.stringify(posts, null, 2)); } catch (e) { }
    }
} catch (e) { }


const app = express();
const prisma = new PrismaClient();

// --- PERSISTENCE: Managed by PostgreSQL ---
console.log('[PERSISTENCE] Using persistent PostgreSQL database.');

const PORT = process.env.PORT || 8080;
const NODE_ENV = process.env.NODE_ENV || 'development';

// Trust proxy for Railway/reverse proxy environments
// This is required for express-rate-limit to work correctly with X-Forwarded-For headers
app.set('trust proxy', 1);

if (!process.env.JWT_SECRET) {
    console.error('FATAL: JWT_SECRET environment variable is required');
    process.exit(1);
}
const JWT_SECRET = process.env.JWT_SECRET;

// --- VALIDATION SCHEMAS ---
const registerSchema = z.object({
    username: z.string()
        .min(3, 'Username must be at least 3 characters')
        .max(30, 'Username must be at most 30 characters')
        .regex(/^[a-zA-Z0-9_-]+$/, 'Username can only contain letters, numbers, underscores, and hyphens'),
    password: z.string()
        .min(8, 'Password must be at least 8 characters')
        .max(128, 'Password is too long'),
    referralCode: z.string().optional()
});

const loginSchema = z.object({
    username: z.string().min(1, 'Username is required'),
    password: z.string().min(1, 'Password is required')
});

const tierSchema = z.object({
    tier: z.enum(['free', 'pro', 'enterprise'], {
        errorMap: () => ({ message: 'Tier must be free, pro, or enterprise' })
    })
});

const telemetrySchema = z.object({
    workerName: z.string().min(1, 'Worker name is required').max(100),
    hashrate: z.number().min(0).or(z.string().transform(val => parseFloat(val))),
    temp: z.number().optional(),
    power: z.number().optional()
});

const walletSchema = z.object({
    coin: z.string().min(1).max(10),
    address: z.string().min(20).max(128),
    label: z.string().max(50).optional(),
    poolUrl: z.string().url().optional().or(z.string().regex(/^stratum\+?/)),
    isDefault: z.boolean().optional()
});

const agentSyncSchema = z.object({
    agentId: z.string().min(1).max(64),
    sessions: z.array(z.object({
        startTime: z.string(),
        endTime: z.string().optional(),
        coin: z.string(),
        poolUrl: z.string(),
        totalShares: z.number().min(0),
        acceptedShares: z.number().min(0),
        rejectedShares: z.number().min(0).optional(),
        avgHashrate: z.number().min(0),
        peakHashrate: z.number().min(0).optional()
    })).optional(),
    currentSession: z.object({
        startTime: z.string(),
        coin: z.string(),
        poolUrl: z.string(),
        totalShares: z.number().min(0),
        acceptedShares: z.number().min(0),
        avgHashrate: z.number().min(0)
    }).optional(),
    telemetry: z.object({
        hashrate: z.number(),
        temp: z.number().optional(),
        power: z.number().optional()
    }).optional()
});

// Achievement definitions for seeding
const ACHIEVEMENT_DEFINITIONS = [
    { code: 'first_share', name: 'First Blood', description: 'Submit your first valid share', icon: '🩸', category: 'milestone', threshold: 1, xpReward: 10 },
    { code: 'shares_100', name: 'Century', description: 'Submit 100 shares', icon: '💯', category: 'milestone', threshold: 100, xpReward: 25 },
    { code: 'shares_1k', name: 'Kilo Miner', description: 'Submit 1,000 shares', icon: '⚡', category: 'milestone', threshold: 1000, xpReward: 50 },
    { code: 'shares_10k', name: 'Mega Miner', description: 'Submit 10,000 shares', icon: '🔥', category: 'milestone', threshold: 10000, xpReward: 100 },
    { code: 'shares_100k', name: 'Legend', description: 'Submit 100,000 shares', icon: '👑', category: 'milestone', threshold: 100000, xpReward: 500 },
    { code: 'hashrate_1m', name: 'Mega Hash', description: 'Reach 1 MH/s hashrate', icon: '📈', category: 'mining', threshold: 1000000, xpReward: 30 },
    { code: 'hashrate_100m', name: 'Hundred Hammer', description: 'Reach 100 MH/s hashrate', icon: '🔨', category: 'mining', threshold: 100000000, xpReward: 75 },
    { code: 'streak_3', name: 'Hat Trick', description: 'Mine 3 days in a row', icon: '🎩', category: 'streak', threshold: 3, xpReward: 20 },
    { code: 'streak_7', name: 'Weekly Warrior', description: 'Mine 7 days in a row', icon: '⚔️', category: 'streak', threshold: 7, xpReward: 50 },
    { code: 'streak_30', name: 'Monthly Miner', description: 'Mine 30 days in a row', icon: '📅', category: 'streak', threshold: 30, xpReward: 150 },
    { code: 'streak_100', name: 'Centurion', description: 'Mine 100 days in a row', icon: '🏆', category: 'streak', threshold: 100, xpReward: 500 },
    { code: 'referral_1', name: 'Networker', description: 'Refer your first user', icon: '🤝', category: 'social', threshold: 1, xpReward: 40 },
    { code: 'referral_10', name: 'Influencer', description: 'Refer 10 users', icon: '📣', category: 'social', threshold: 10, xpReward: 200 },
    { code: 'multi_coin_3', name: 'Diversified', description: 'Mine 3 different coins', icon: '🪙', category: 'mining', threshold: 3, xpReward: 35 },
    { code: 'uptime_24h', name: 'All Nighter', description: 'Mine for 24 hours straight', icon: '🌙', category: 'mining', threshold: 1440, xpReward: 60 }
];

// Level thresholds
const LEVEL_THRESHOLDS = [
    { level: 1, xp: 0, rank: 'Newbie' },
    { level: 2, xp: 50, rank: 'Apprentice' },
    { level: 3, xp: 150, rank: 'Miner' },
    { level: 4, xp: 350, rank: 'Veteran' },
    { level: 5, xp: 650, rank: 'Expert' },
    { level: 6, xp: 1000, rank: 'Master' },
    { level: 7, xp: 1500, rank: 'Legend' },
    { level: 8, xp: 2500, rank: 'Mythic' },
    { level: 9, xp: 4000, rank: 'Immortal' },
    { level: 10, xp: 6000, rank: 'Transcendent' }
];

// CORS Configuration
const allowedOrigins = [
    'http://localhost:5173',
    'http://localhost:4173',
    'https://hashnhedge-app.up.railway.app',
    'https://app.hashnhedge.com',
    'https://hashnhedge.com',
    'https://app-production-374e.up.railway.app',
    'https://app-production-564e.up.railway.app',
    'http://localhost:3000',
    'http://localhost:3001'
];

// Security Headers
app.use(helmet({
    contentSecurityPolicy: NODE_ENV === 'production',
    hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true
    }
}));

// HTTPS Redirect (only in production)
if (NODE_ENV === 'production') {
    app.use((req, res, next) => {
        if (req.header('x-forwarded-proto') !== 'https') {
            res.redirect(`https://${req.header('host')}${req.url}`);
        } else {
            next();
        }
    });
}

app.use(cors({
    origin: function (origin, callback) {
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin) return callback(null, true);
        if (allowedOrigins.indexOf(origin) === -1) {
            console.log('Blocked by CORS:', origin);
            return callback(new Error('The CORS policy for this site does not allow access from the specified Origin.'), false);
        }
        return callback(null, true);
    },
    credentials: true
}));
app.use(express.json({ limit: '10mb' })); // Limit payload size

// Rate Limiting
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // 5 requests per window
    message: { error: 'Too many authentication attempts, please try again later' },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
        console.warn(`[RATE_LIMIT] Blocked ${req.ip} on ${req.path}`);
        res.status(429).json({
            error: 'Too many requests',
            retryAfter: Math.ceil(req.rateLimit.resetTime / 1000)
        });
    }
});

const generalLimiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 100, // 100 requests per minute
    message: { error: 'Too many requests, please slow down' },
    standardHeaders: true,
    legacyHeaders: false
});

app.use(generalLimiter); // Apply to all routes

// Request Logging Middleware
app.use((req, res, next) => {
    const start = Date.now();

    // Log response after it's sent
    res.on('finish', () => {
        const duration = Date.now() - start;
        const logLevel = res.statusCode >= 400 ? 'warn' : 'info';
        const logMessage = `[${req.method}] ${req.path} - ${res.statusCode} (${duration}ms)`;

        if (logLevel === 'warn') {
            console.warn('[SECURITY_WARN]', logMessage, { ip: req.ip, userAgent: req.get('user-agent') });
        } else if (NODE_ENV === 'development') {
            console.log(logMessage);
        }
    });

    next();
});

// --- PUBLIC FEATURES (No Auth Required) ---

// 1. Hardware Database
app.get('/api/public/hardware', (req, res) => {
    try {
        if (fs.existsSync(HARDWARE_FILE)) {
            const data = JSON.parse(fs.readFileSync(HARDWARE_FILE, 'utf8'));
            res.json(data);
        } else {
            res.json([]);
        }
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// 2. Miner's Market Proxy
app.get('/api/public/prices', async (req, res) => {
    try {
        const ids = 'monero,zephyr,ravencoin,ethereum-classic,kaspa,ergo,karlsen';
        const r = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd,btc&include_24hr_change=true`);
        const data = await r.json();
        res.json(data);
    } catch (e) { res.status(500).json({ error: "Failed to fetch prices" }); }
});

// 3. Token Audit
app.post('/api/public/audit', async (req, res) => {
    const { tokenAddress } = req.body;

    // SECURITY: Validate Solana address format (base58, 32-44 chars)
    if (!tokenAddress || typeof tokenAddress !== 'string') {
        return res.status(400).json({ error: 'Token address is required' });
    }
    if (tokenAddress.length < 32 || tokenAddress.length > 44) {
        return res.status(400).json({ error: 'Invalid token address length' });
    }
    if (!/^[1-9A-HJ-NP-Za-km-z]+$/.test(tokenAddress)) {
        return res.status(400).json({ error: 'Invalid token address format (must be base58)' });
    }

    try {
        const rpcRes = await fetch('https://api.mainnet-beta.solana.com', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                jsonrpc: '2.0', id: 1, method: 'getAccountInfo', params: [tokenAddress, { encoding: "jsonParsed" }]
            })
        });
        const data = await rpcRes.json();
        if (!data.result || !data.result.value) return res.json({ valid: false, message: "Token not found" });

        const info = data.result.value;
        const parsed = info.data.parsed?.info;
        const checks = {
            isMint: info.data.program === 'spl-token',
            mintAuthority: parsed?.mintAuthority,
            freezeAuthority: parsed?.freezeAuthority,
            decimals: parsed?.decimals,
            supply: parsed?.supply
        };
        res.json({ valid: true, checks });
    } catch (e) { res.status(500).json({ error: "Audit Failed" }); }
});

// 4. Forum (Public Read/Write for now)
app.get('/api/public/forum', (req, res) => { res.json(posts); });

// Forum post validation schema
const forumPostSchema = z.object({
    title: z.string()
        .min(3, 'Title must be at least 3 characters')
        .max(200, 'Title must be at most 200 characters')
        .regex(/^[a-zA-Z0-9\s\-_.,!?()]+$/, 'Title contains invalid characters'),
    content: z.string()
        .min(10, 'Content must be at least 10 characters')
        .max(5000, 'Content must be at most 5000 characters'),
    category: z.string()
        .min(1, 'Category is required')
        .max(50, 'Category must be at most 50 characters'),
    author: z.string()
        .max(50, 'Author name must be at most 50 characters')
        .optional()
});

app.post('/api/public/forum', (req, res) => {
    // Validate input
    try {
        forumPostSchema.parse(req.body);
    } catch (err) {
        if (err instanceof z.ZodError) {
            return res.status(400).json({
                error: 'Validation failed',
                details: err.errors.map(e => ({ field: e.path.join('.'), message: e.message }))
            });
        }
        return res.status(400).json({ error: 'Invalid input' });
    }

    const { title, content, category, author } = req.body;

    // Sanitize by stripping HTML-like content
    // Sanitize by stripping HTML tags and basic XSS prevention
    const sanitize = (str) => {
        if (!str || typeof str !== 'string') return '';
        // Use a simpler, non-backtracking approach for tag stripping
        let result = '';
        let insideTag = false;
        for (let i = 0; i < str.length; i++) {
            if (str[i] === '<') insideTag = true;
            else if (str[i] === '>') insideTag = false;
            else if (!insideTag) result += str[i];
        }
        return result.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').trim();
    };

    const newPost = {
        id: Date.now().toString(),
        title: sanitize(title),
        content: sanitize(content),
        category: sanitize(category),
        author: sanitize(author || 'Anonymous'),
        timestamp: new Date().toLocaleTimeString(),
        likes: 0, replies: 0, isPinned: false
    };
    posts.unshift(newPost);
    if (posts.length > 100) posts.pop();
    // Ephemeral save
    try { fs.writeFileSync(POSTS_FILE, JSON.stringify(posts, null, 2)); } catch (e) { }
    res.json(newPost);
});

// Health check endpoint
app.get(['/', '/health', '/healthck'], async (req, res) => {
    console.log(`[HEALTH] Request received from ${req.ip}`);
    try {
        await prisma.$queryRaw`SELECT 1`;

        // Load version info
        let version = 'unknown';
        try {
            const paths = [
                path.join(__dirname, 'version.json'),
                path.join(__dirname, '../../version.json')
            ];
            let versionData;
            for (const p of paths) {
                if (fs.existsSync(p)) {
                    versionData = JSON.parse(fs.readFileSync(p, 'utf8'));
                    break;
                }
            }
            if (versionData) version = versionData.version;
        } catch (e) {
            console.warn('Failed to load version info', e);
        }

        res.json({
            status: 'ok',
            database: 'connected',
            service: 'HNH-API',
            version: version,
            api_version: '1.0.1'
        });
    } catch (e) {
        res.status(500).json({ status: 'error', database: 'disconnected', error: e.message });
    }
});

// --- AUTH MIDDLEWARE ---
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.sendStatus(401);

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.sendStatus(403);
        req.user = user;
        next();
    });
};

// --- ROUTES ---

// Validation Middleware
const validate = (schema) => (req, res, next) => {
    try {
        schema.parse(req.body);
        next();
    } catch (err) {
        if (err instanceof z.ZodError) {
            return res.status(400).json({
                error: 'Validation failed',
                details: err.errors.map(e => ({ field: e.path.join('.'), message: e.message }))
            });
        }
        next(err);
    }
};

// Register
app.post('/auth/register', authLimiter, validate(registerSchema), async (req, res) => {
    const { username, password, referralCode } = req.body;

    try {
        console.log(`[REGISTER] Attempting to register user: ${username}`);

        const existing = await prisma.user.findUnique({ where: { username } });
        if (existing) {
            console.log(`[REGISTER] Username already taken: ${username}`);
            return res.status(400).json({ error: 'Username taken' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const myReferralCode = `HNH-${username.substring(0, 3).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

        const user = await prisma.user.create({
            data: {
                username,
                passwordHash: hashedPassword,
                referralCode: myReferralCode,
                referredBy: referralCode || null
            }
        });

        const token = jwt.sign(
            { id: user.id, username: user.username, role: user.role },
            JWT_SECRET,
            { algorithm: 'HS256', expiresIn: '24h' }
        );
        console.log(`[REGISTER] Successfully registered user: ${username}`);

        // --- PERSISTENCE: Automatically handled by DB ---

        res.json({ token, user: { id: user.id, username: user.username, tier: user.tier, role: user.role } });
    } catch (e) {
        console.error('[REGISTER] Error:', e.message);
        res.status(500).json({ error: 'Registration failed' });
    }
});

// Login
app.post('/auth/login', authLimiter, validate(loginSchema), async (req, res) => {
    const { username, password } = req.body;

    try {
        console.log(`[LOGIN] Attempting login for user: ${username}`);

        const user = await prisma.user.findUnique({ where: { username } });
        if (!user) {
            console.log(`[LOGIN] Failed login attempt for: ${username}`);
            // Use generic error to prevent user enumeration
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const valid = await bcrypt.compare(password, user.passwordHash);
        if (!valid) {
            console.log(`[LOGIN] Failed login attempt for: ${username}`);
            // Use same generic error to prevent user enumeration
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const token = jwt.sign(
            { id: user.id, username: user.username, role: user.role },
            JWT_SECRET,
            { algorithm: 'HS256', expiresIn: '24h' }
        );
        console.log(`[LOGIN] Successful login: ${username}`);
        res.json({ token, user: { id: user.id, username: user.username, tier: user.tier, role: user.role } });
    } catch (e) {
        console.error('[LOGIN] Error:', e.message);
        res.status(500).json({ error: 'Login failed' });
    }
});

// Profile / Dashboard Data
app.get('/user/profile', authenticateToken, async (req, res) => {
    try {
        const user = await prisma.user.findUnique({
            where: { id: req.user.id },
            include: { workers: true, savedWallets: true }
        });

        // Calculate recent stats (mocking pool stats aggregation for now)
        const recentShares = await prisma.share.count({
            where: { userId: req.user.id }
        });

        // Exclude passwordHash from response
        const { passwordHash, walletSeed, ...safeUser } = user;

        res.json({
            ...safeUser,
            totalShares: recentShares
        });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Get referrals for a user
app.get('/user/referrals', authenticateToken, async (req, res) => {
    try {
        // Get the current user to find their referral code
        const currentUser = await prisma.user.findUnique({
            where: { id: req.user.id },
            select: { referralCode: true }
        });

        if (!currentUser) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Find all users who were referred by this user
        const referrals = await prisma.user.findMany({
            where: { referredBy: currentUser.referralCode },
            select: {
                id: true,
                username: true,
                tier: true,
                createdAt: true
            },
            orderBy: { createdAt: 'desc' }
        });

        res.json(referrals);
    } catch (e) {
        console.error('[REFERRALS] Error:', e);
        res.status(500).json({ error: e.message });
    }
});

// Update user tier
app.patch('/user/tier', authenticateToken, validate(tierSchema), async (req, res) => {
    const { tier } = req.body;

    try {
        const updatedUser = await prisma.user.update({
            where: { id: req.user.id },
            data: { tier },
            select: { id: true, username: true, tier: true }
        });

        res.json(updatedUser);
    } catch (e) {
        console.error('[UPDATE_TIER] Error:', e);
        res.status(500).json({ error: e.message });
    }
});

// --- WALLETS ---

// Get User Wallets (all or by coin)
app.get('/user/wallets', authenticateToken, async (req, res) => {
    try {
        const wallets = await prisma.userWallet.findMany({
            where: { userId: req.user.id },
            orderBy: [{ isDefault: 'desc' }, { updatedAt: 'desc' }]
        });
        res.json(wallets);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Get wallets for specific coin
app.get('/user/wallets/:coin', authenticateToken, async (req, res) => {
    try {
        const wallets = await prisma.userWallet.findMany({
            where: { userId: req.user.id, coin: req.params.coin.toUpperCase() },
            orderBy: [{ isDefault: 'desc' }, { updatedAt: 'desc' }]
        });
        res.json(wallets);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Save/Update User Wallet with pool association
app.post('/user/wallets', authenticateToken, validate(walletSchema), async (req, res) => {
    const { coin, address, label, poolUrl, isDefault } = req.body;

    try {
        // If setting as default, unset other defaults for this coin
        if (isDefault) {
            await prisma.userWallet.updateMany({
                where: { userId: req.user.id, coin: coin.toUpperCase() },
                data: { isDefault: false }
            });
        }

        const wallet = await prisma.userWallet.upsert({
            where: {
                userId_coin_address: {
                    userId: req.user.id,
                    coin: coin.toUpperCase(),
                    address
                }
            },
            update: {
                label,
                poolUrl: poolUrl || undefined,
                isDefault: isDefault || false
            },
            create: {
                userId: req.user.id,
                coin: coin.toUpperCase(),
                address,
                label,
                poolUrl,
                isDefault: isDefault || false
            }
        });

        // --- PERSISTENCE: Automatically handled by DB ---

        res.json(wallet);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Set wallet as default for its coin
app.put('/user/wallets/:id/default', authenticateToken, async (req, res) => {
    try {
        const wallet = await prisma.userWallet.findFirst({
            where: { id: req.params.id, userId: req.user.id }
        });

        if (!wallet) {
            return res.status(404).json({ error: 'Wallet not found' });
        }

        // Unset other defaults for this coin
        await prisma.userWallet.updateMany({
            where: { userId: req.user.id, coin: wallet.coin },
            data: { isDefault: false }
        });

        // Set this one as default
        const updated = await prisma.userWallet.update({
            where: { id: req.params.id },
            data: { isDefault: true }
        });

        res.json(updated);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Delete wallet
app.delete('/user/wallets/:id', authenticateToken, async (req, res) => {
    try {
        const wallet = await prisma.userWallet.findFirst({
            where: { id: req.params.id, userId: req.user.id }
        });

        if (!wallet) {
            return res.status(404).json({ error: 'Wallet not found' });
        }

        await prisma.userWallet.delete({ where: { id: req.params.id } });
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// --- WALLET SEED MANAGEMENT (Per-User HD Wallet) ---

// Helper: Derive addresses from mnemonic (server-side)
const deriveAddressesFromMnemonic = async (mnemonic) => {
    const seed = await bip39.mnemonicToSeed(mnemonic);
    const hdNode = ethers.utils.HDNode.fromSeed(seed);

    // ETC: Standard m/44'/61'/0'/0/0
    const etcNode = hdNode.derivePath("m/44'/61'/0'/0/0");
    const etcAddress = etcNode.address;

    // Helper for deterministic mock addresses
    const formatAsRVN = (privKey) => {
        const hash = ethers.utils.sha256(ethers.utils.hexZeroPad(privKey, 32)).substring(2, 34);
        return 'R' + hash;
    };
    const formatAsXMR = (privKey) => {
        const key = ethers.utils.hexZeroPad(privKey, 32);
        const hash1 = ethers.utils.sha256(key).substring(2);
        // Use hexConcat to safely append a byte
        const hash2 = ethers.utils.sha256(ethers.utils.hexConcat([key, "0x01"])).substring(2);
        return '4' + (hash1 + hash2).substring(0, 94);
    };
    const formatAsERG = (privKey) => {
        const hash = ethers.utils.sha256(ethers.utils.hexZeroPad(privKey, 32)).substring(2, 53);
        return '9' + hash;
    };
    const formatAsKAS = (privKey) => {
        const hash = ethers.utils.sha256(ethers.utils.hexZeroPad(privKey, 32)).substring(2, 60);
        return 'kaspa:q' + hash;
    };

    // Derive keys for each coin
    const rvnKey = hdNode.derivePath("m/44'/175'/0'/0/0").privateKey;
    const xmrKey = hdNode.derivePath("m/44'/128'/0'/0/0").privateKey;
    const ergKey = hdNode.derivePath("m/44'/429'/0'/0/0").privateKey;
    const kasKey = hdNode.derivePath("m/44'/11111'/0'/0/0").privateKey;

    return {
        ETC: etcAddress,
        RVN: formatAsRVN(rvnKey),
        XMR: formatAsXMR(xmrKey),
        ERG: formatAsERG(ergKey),
        KAS: formatAsKAS(kasKey)
    };
};

// Generate wallet seed for user (if none exists)
app.post('/user/wallet/generate-seed', authenticateToken, async (req, res) => {
    try {
        const user = await prisma.user.findUnique({
            where: { id: req.user.id },
            select: { walletSeed: true }
        });

        // If user already has a seed, don't overwrite
        if (user?.walletSeed) {
            // Decrypt and derive addresses
            try {
                const decrypted = decrypt(JSON.parse(user.walletSeed));
                const addresses = await deriveAddressesFromMnemonic(decrypted);
                return res.json({ success: true, addresses, existing: true });
            } catch (e) {
                console.error('[WALLET_SEED] Failed to decrypt existing seed:', e);
                return res.status(500).json({ error: 'Failed to decrypt existing seed' });
            }
        }

        // Generate new mnemonic
        const mnemonic = bip39.generateMnemonic();

        // Encrypt the mnemonic
        const encryptedSeed = JSON.stringify(encrypt(mnemonic));

        // Store encrypted seed
        await prisma.user.update({
            where: { id: req.user.id },
            data: { walletSeed: encryptedSeed }
        });

        // Derive addresses
        const addresses = await deriveAddressesFromMnemonic(mnemonic);

        // Auto-create wallet entries for each coin
        for (const [coin, address] of Object.entries(addresses)) {
            await prisma.userWallet.upsert({
                where: {
                    userId_coin_address: {
                        userId: req.user.id,
                        coin,
                        address
                    }
                },
                update: { isDefault: true },
                create: {
                    userId: req.user.id,
                    coin,
                    address,
                    label: 'Auto-generated',
                    isDefault: true
                }
            });
        }

        // Backup to persistent store
        syncDbToStore(prisma);

        console.log(`[WALLET_SEED] Generated new seed for user ${req.user.username}`);
        res.json({ success: true, addresses, existing: false });
    } catch (e) {
        console.error('[WALLET_SEED] Generate error:', e);
        res.status(500).json({ error: e.message });
    }
});

// Get derived addresses from user's stored seed
app.get('/user/wallet/addresses', authenticateToken, async (req, res) => {
    try {
        const user = await prisma.user.findUnique({
            where: { id: req.user.id },
            select: { walletSeed: true }
        });

        if (!user?.walletSeed) {
            return res.json({ hasSeed: false, addresses: null });
        }

        try {
            const decrypted = decrypt(JSON.parse(user.walletSeed));
            const addresses = await deriveAddressesFromMnemonic(decrypted);
            res.json({ hasSeed: true, addresses });
        } catch (e) {
            console.error('[WALLET_SEED] Failed to decrypt seed:', e);
            res.status(500).json({ error: 'Failed to decrypt wallet seed' });
        }
    } catch (e) {
        console.error('[WALLET_SEED] Get addresses error:', e);
        res.status(500).json({ error: e.message });
    }
});

// Import existing mnemonic (for migration from browser storage)
app.post('/user/wallet/import-seed', authenticateToken, async (req, res) => {
    const { mnemonic } = req.body;

    if (!mnemonic || typeof mnemonic !== 'string') {
        return res.status(400).json({ error: 'Mnemonic is required' });
    }

    // Validate mnemonic
    if (!bip39.validateMnemonic(mnemonic.trim())) {
        return res.status(400).json({ error: 'Invalid mnemonic phrase' });
    }

    try {
        const cleanMnemonic = mnemonic.trim();

        // Encrypt the mnemonic
        const encryptedSeed = JSON.stringify(encrypt(cleanMnemonic));

        // Store encrypted seed (overwrites any existing)
        await prisma.user.update({
            where: { id: req.user.id },
            data: { walletSeed: encryptedSeed }
        });

        // Derive addresses
        const addresses = await deriveAddressesFromMnemonic(cleanMnemonic);

        // Auto-create wallet entries for each coin
        for (const [coin, address] of Object.entries(addresses)) {
            await prisma.userWallet.upsert({
                where: {
                    userId_coin_address: {
                        userId: req.user.id,
                        coin,
                        address
                    }
                },
                update: { isDefault: true },
                create: {
                    userId: req.user.id,
                    coin,
                    address,
                    label: 'Imported',
                    isDefault: true
                }
            });
        }

        // Backup to persistent store
        syncDbToStore(prisma);

        console.log(`[WALLET_SEED] Imported seed for user ${req.user.username}`);
        res.json({ success: true, addresses });
    } catch (e) {
        console.error('[WALLET_SEED] Import error:', e);
        res.status(500).json({ error: e.message });
    }
});

// --- MINER CONFIG ---

// Save/Update Miner Config (stores in user metadata as JSON)
app.post('/user/miner-config', authenticateToken, async (req, res) => {
    try {
        const config = req.body;

        // Validate basic structure
        if (!config || typeof config !== 'object') {
            return res.status(400).json({ error: 'Invalid config format' });
        }

        // Store the config as JSON in the user's metadata field
        const updatedUser = await prisma.user.update({
            where: { id: req.user.id },
            data: { minerConfig: JSON.stringify(config) }
        });

        res.json({ success: true, config });
    } catch (e) {
        console.error('[MINER_CONFIG] Save error:', e);
        res.status(500).json({ error: e.message });
    }
});

// Get Miner Config
app.get('/user/miner-config', authenticateToken, async (req, res) => {
    try {
        const user = await prisma.user.findUnique({
            where: { id: req.user.id },
            select: { minerConfig: true }
        });

        if (user?.minerConfig) {
            res.json(JSON.parse(user.minerConfig));
        } else {
            res.json(null);
        }
    } catch (e) {
        console.error('[MINER_CONFIG] Get error:', e);
        res.status(500).json({ error: e.message });
    }
});

// Telemetry from Agent - requires authentication
app.post('/miner/telemetry', authenticateToken, validate(telemetrySchema), async (req, res) => {
    const { workerName, hashrate, temp, power } = req.body;
    const userId = req.user.id;

    try {
        // Upsert Worker
        let worker = await prisma.worker.findFirst({
            where: { userId, name: workerName }
        });

        const parsedHashrate = parseFloat(hashrate) || 0;

        if (!worker) {
            worker = await prisma.worker.create({
                data: { userId, name: workerName, hashrate: parsedHashrate }
            });
        } else {
            await prisma.worker.update({
                where: { id: worker.id },
                data: { hashrate: parsedHashrate, lastSeen: new Date() }
            });
        }

        res.json({ success: true, workerId: worker.id });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// --- AGENT SYNC (Stats & Sessions) ---

// Helper: Calculate level from XP
function calculateLevel(xp) {
    for (let i = LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
        if (xp >= LEVEL_THRESHOLDS[i].xp) {
            return LEVEL_THRESHOLDS[i];
        }
    }
    return LEVEL_THRESHOLDS[0];
}

// Helper: Check and unlock achievements
async function checkAchievements(userId) {
    const userStats = await prisma.userStats.findUnique({ where: { userId } });
    if (!userStats) return [];

    const allAchievements = await prisma.achievement.findMany();
    const userAchievements = await prisma.userAchievement.findMany({
        where: { userId },
        select: { achievementId: true }
    });
    const unlockedIds = new Set(userAchievements.map(a => a.achievementId));
    const newlyUnlocked = [];

    for (const achievement of allAchievements) {
        if (unlockedIds.has(achievement.id)) continue;

        let unlocked = false;
        switch (achievement.code) {
            case 'first_share':
                unlocked = userStats.totalShares >= 1;
                break;
            case 'shares_100':
                unlocked = userStats.totalShares >= 100;
                break;
            case 'shares_1k':
                unlocked = userStats.totalShares >= 1000;
                break;
            case 'shares_10k':
                unlocked = userStats.totalShares >= 10000;
                break;
            case 'shares_100k':
                unlocked = userStats.totalShares >= 100000;
                break;
            case 'streak_3':
                unlocked = userStats.currentStreak >= 3 || userStats.longestStreak >= 3;
                break;
            case 'streak_7':
                unlocked = userStats.currentStreak >= 7 || userStats.longestStreak >= 7;
                break;
            case 'streak_30':
                unlocked = userStats.currentStreak >= 30 || userStats.longestStreak >= 30;
                break;
            case 'streak_100':
                unlocked = userStats.currentStreak >= 100 || userStats.longestStreak >= 100;
                break;
        }

        if (unlocked) {
            await prisma.userAchievement.create({
                data: { userId, achievementId: achievement.id }
            });

            // Award XP
            const newXp = userStats.xp + achievement.xpReward;
            const levelInfo = calculateLevel(newXp);
            await prisma.userStats.update({
                where: { userId },
                data: { xp: newXp, level: levelInfo.level, rank: levelInfo.rank }
            });

            newlyUnlocked.push(achievement);
        }
    }

    return newlyUnlocked;
}

// Helper: Update streak
async function updateStreak(userId) {
    const userStats = await prisma.userStats.findUnique({ where: { userId } });
    if (!userStats) return;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const lastMining = userStats.lastMiningDate;
    if (lastMining) {
        const lastDate = new Date(lastMining);
        lastDate.setHours(0, 0, 0, 0);

        const diffDays = Math.floor((today.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));

        if (diffDays === 0) {
            // Already counted today
            return;
        } else if (diffDays === 1) {
            // Streak continues
            const newStreak = userStats.currentStreak + 1;
            await prisma.userStats.update({
                where: { userId },
                data: {
                    currentStreak: newStreak,
                    longestStreak: Math.max(userStats.longestStreak, newStreak),
                    lastMiningDate: new Date()
                }
            });
        } else {
            // Streak broken
            await prisma.userStats.update({
                where: { userId },
                data: { currentStreak: 1, lastMiningDate: new Date() }
            });
        }
    } else {
        // First mining day
        await prisma.userStats.update({
            where: { userId },
            data: { currentStreak: 1, lastMiningDate: new Date() }
        });
    }
}

// Agent sync endpoint - receives stats from local agent
app.post('/agent/sync', authenticateToken, validate(agentSyncSchema), async (req, res) => {
    const { agentId, sessions, currentSession, telemetry } = req.body;
    const userId = req.user.id;

    try {
        // Ensure UserStats exists
        let userStats = await prisma.userStats.findUnique({ where: { userId } });
        if (!userStats) {
            userStats = await prisma.userStats.create({ data: { userId } });
        }

        let totalNewShares = 0;
        let totalMiningMinutes = 0;

        // Process completed sessions
        if (sessions && sessions.length > 0) {
            for (const session of sessions) {
                // Check for duplicate (by agentId + startTime)
                const existing = await prisma.miningSession.findFirst({
                    where: {
                        userId,
                        agentId,
                        startTime: new Date(session.startTime)
                    }
                });

                if (!existing) {
                    await prisma.miningSession.create({
                        data: {
                            userId,
                            agentId,
                            coin: session.coin,
                            poolUrl: session.poolUrl,
                            startTime: new Date(session.startTime),
                            endTime: session.endTime ? new Date(session.endTime) : null,
                            totalShares: session.totalShares,
                            acceptedShares: session.acceptedShares,
                            rejectedShares: session.rejectedShares || 0,
                            avgHashrate: session.avgHashrate,
                            peakHashrate: session.peakHashrate || session.avgHashrate,
                            syncedAt: new Date()
                        }
                    });

                    totalNewShares += session.acceptedShares;

                    // Calculate mining duration
                    if (session.endTime) {
                        const duration = (new Date(session.endTime) - new Date(session.startTime)) / 60000;
                        totalMiningMinutes += Math.round(duration);
                    }
                }
            }
        }

        // Update user stats
        if (totalNewShares > 0 || totalMiningMinutes > 0) {
            await prisma.userStats.update({
                where: { userId },
                data: {
                    totalShares: { increment: totalNewShares },
                    totalMiningTime: { increment: totalMiningMinutes }
                }
            });

            // Update streak
            await updateStreak(userId);
        }

        // Check for new achievements
        const newAchievements = await checkAchievements(userId);

        res.json({
            success: true,
            sessionsProcessed: sessions?.length || 0,
            sharesAdded: totalNewShares,
            newAchievements: newAchievements.map(a => ({ code: a.code, name: a.name, xp: a.xpReward })),
            nextSyncIn: 60
        });
    } catch (e) {
        console.error('[AGENT_SYNC] Error:', e);
        res.status(500).json({ error: e.message });
    }
});

// --- USER STATS ---

// Get user's lifetime stats
app.get('/user/stats', authenticateToken, async (req, res) => {
    try {
        let userStats = await prisma.userStats.findUnique({
            where: { userId: req.user.id }
        });

        // Create if doesn't exist
        if (!userStats) {
            userStats = await prisma.userStats.create({
                data: { userId: req.user.id }
            });
        }

        // Get recent daily snapshots
        const recentHistory = await prisma.statsSnapshot.findMany({
            where: { userId: req.user.id, period: 'daily' },
            orderBy: { timestamp: 'desc' },
            take: 30
        });

        // Get active sessions count
        const activeSessions = await prisma.miningSession.count({
            where: { userId: req.user.id, endTime: null }
        });

        res.json({
            stats: userStats,
            history: recentHistory,
            activeSessions
        });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Get stats history for charts
app.get('/user/stats/history', authenticateToken, async (req, res) => {
    try {
        const period = req.query.period || 'daily';
        const days = parseInt(req.query.days) || 30;

        const since = new Date();
        since.setDate(since.getDate() - days);

        const snapshots = await prisma.statsSnapshot.findMany({
            where: {
                userId: req.user.id,
                period,
                timestamp: { gte: since }
            },
            orderBy: { timestamp: 'asc' }
        });

        res.json(snapshots);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Get mining sessions
app.get('/user/sessions', authenticateToken, async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 50;
        const sessions = await prisma.miningSession.findMany({
            where: { userId: req.user.id },
            orderBy: { startTime: 'desc' },
            take: limit
        });
        res.json(sessions);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// --- ACHIEVEMENTS ---

// Get user's achievements
app.get('/user/achievements', authenticateToken, async (req, res) => {
    try {
        const allAchievements = await prisma.achievement.findMany();
        const userAchievements = await prisma.userAchievement.findMany({
            where: { userId: req.user.id },
            include: { achievement: true }
        });

        const unlockedCodes = new Set(userAchievements.map(ua => ua.achievement.code));

        res.json({
            unlocked: userAchievements.map(ua => ({
                ...ua.achievement,
                unlockedAt: ua.unlockedAt
            })),
            available: allAchievements.filter(a => !unlockedCodes.has(a.code)),
            total: allAchievements.length,
            unlockedCount: userAchievements.length
        });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// --- PUBLIC STATS ---

// Get total user count
app.get('/stats/users', async (req, res) => {
    try {
        const count = await prisma.user.count();
        res.json({ count });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// --- LEADERBOARD ---

app.get('/leaderboard', authenticateToken, async (req, res) => {
    try {
        const metric = req.query.metric || 'totalShares';
        const limit = parseInt(req.query.limit) || 100;

        // Validate metric
        const allowedMetrics = ['totalShares', 'totalMinedUsd', 'longestStreak', 'level', 'xp'];
        if (!allowedMetrics.includes(metric)) {
            return res.status(400).json({ error: 'Invalid metric' });
        }

        const leaderboard = await prisma.userStats.findMany({
            where: { [metric]: { gt: 0 } },
            orderBy: { [metric]: 'desc' },
            take: limit,
            include: {
                user: {
                    select: { username: true, tier: true }
                }
            }
        });

        // Find current user's rank
        const userStats = await prisma.userStats.findUnique({
            where: { userId: req.user.id }
        });

        let userRank = null;
        if (userStats) {
            const higherCount = await prisma.userStats.count({
                where: { [metric]: { gt: userStats[metric] } }
            });
            userRank = higherCount + 1;
        }

        res.json({
            leaderboard: leaderboard.map((entry, index) => ({
                rank: index + 1,
                username: entry.user.username,
                tier: entry.user.tier,
                value: entry[metric],
                level: entry.level,
                rankTitle: entry.rank
            })),
            userRank,
            metric
        });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Global Error Handler
app.use((err, req, res, next) => {
    console.error('[ERROR]', {
        path: req.path,
        method: req.method,
        error: err.message,
        stack: NODE_ENV === 'development' ? err.stack : undefined
    });

    res.status(err.status || 500).json({
        error: NODE_ENV === 'production' ? 'Internal server error' : err.message
    });
});

// Seed achievements on startup
async function seedAchievements() {
    try {
        for (const achievement of ACHIEVEMENT_DEFINITIONS) {
            await prisma.achievement.upsert({
                where: { code: achievement.code },
                update: {
                    name: achievement.name,
                    description: achievement.description,
                    icon: achievement.icon,
                    category: achievement.category,
                    threshold: achievement.threshold,
                    xpReward: achievement.xpReward
                },
                create: achievement
            });
        }
        console.log(`✅ Seeded ${ACHIEVEMENT_DEFINITIONS.length} achievements`);
    } catch (e) {
        console.error('⚠️ Failed to seed achievements:', e.message);
    }
}

// Test database connection on startup
prisma.$connect()
    .then(async () => {
        console.log('✅ Database connected successfully');
        await seedAchievements();
        app.listen(PORT, () => {
            console.log(`✅ Backend API running on port ${PORT}`);
            console.log(`   Environment: ${NODE_ENV}`);
            console.log(`   Rate limiting: ${NODE_ENV === 'production' ? 'ENABLED' : 'ENABLED (dev)'}`);
            console.log(`   HTTPS redirect: ${NODE_ENV === 'production' ? 'ENABLED' : 'DISABLED (dev)'}`);
        });
    })
    .catch((e) => {
        console.error('❌ Failed to connect to database:', e.message);
        console.error('Make sure DATABASE_URL is set correctly and the database is running');
        process.exit(1);
    });
