
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
const PORT = process.env.PORT || 8080;
const NODE_ENV = process.env.NODE_ENV || 'development';

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
            console.warn(logMessage, { ip: req.ip, userAgent: req.get('user-agent') });
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
app.post('/api/public/forum', (req, res) => {
    const { title, content, category, author } = req.body;
    const newPost = {
        id: Date.now().toString(),
        title, content, category,
        author: author || 'Anonymous',
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
        res.json({ status: 'ok', database: 'connected', service: 'HNH-API', version: '1.0.1' });
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

        const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, JWT_SECRET);
        console.log(`[REGISTER] Successfully registered user: ${username}`);
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
            console.log(`[LOGIN] User not found: ${username}`);
            return res.status(400).json({ error: 'User not found' });
        }

        const valid = await bcrypt.compare(password, user.passwordHash);
        if (!valid) {
            console.log(`[LOGIN] Invalid password for user: ${username}`);
            return res.status(400).json({ error: 'Invalid password' });
        }

        const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, JWT_SECRET);
        console.log(`[LOGIN] Successfully logged in user: ${username} (Role: ${user.role})`);
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
            include: { workers: true }
        });

        // Calculate recent stats (mocking pool stats aggregation for now)
        const recentShares = await prisma.share.count({
            where: { userId: req.user.id }
        });

        res.json({
            ...user,
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

// Get User Wallets
app.get('/user/wallets', authenticateToken, async (req, res) => {
    try {
        const wallets = await prisma.userWallet.findMany({
            where: { userId: req.user.id }
        });
        res.json(wallets);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Save/Update User Wallet
app.post('/user/wallets', authenticateToken, async (req, res) => {
    const { coin, address, label } = req.body;

    if (!coin || !address) {
        return res.status(400).json({ error: "Coin and Address are required" });
    }

    try {
        const wallet = await prisma.userWallet.upsert({
            where: {
                userId_coin_address: {
                    userId: req.user.id,
                    coin,
                    address
                }
            },
            update: { label, createdAt: new Date() }, // Update timestamp to bring to top
            create: {
                userId: req.user.id,
                coin,
                address,
                label
            }
        });
        res.json(workerResponse(wallet)); // Typo mock
    } catch (e) {
        res.status(500).json({ error: e.message });
    }

    function workerResponse(w) { return w; }
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

// Test database connection on startup
prisma.$connect()
    .then(() => {
        console.log('✅ Database connected successfully');
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
