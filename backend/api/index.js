
import express from 'express';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import 'dotenv/config';

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 8080;
if (!process.env.JWT_SECRET) {
    console.error('FATAL: JWT_SECRET environment variable is required');
    process.exit(1);
}
const JWT_SECRET = process.env.JWT_SECRET;

// CORS Configuration
const allowedOrigins = [
    'http://localhost:5173',
    'http://localhost:4173',
    'https://hashnhedge-app.up.railway.app',
    'https://app.hashnhedge.com',
    'https://hashnhedge.com',
    'https://app-production-374e.up.railway.app',
    'https://app-production-564e.up.railway.app'
];

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
app.use(express.json());

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

// Register
app.post('/auth/register', async (req, res) => {
    const { username, password, referralCode } = req.body;

    try {
        console.log(`[REGISTER] Attempting to register user: ${username}`);

        if (!username || !password) {
            return res.status(400).json({ error: 'Username and password are required' });
        }

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
app.post('/auth/login', async (req, res) => {
    const { username, password } = req.body;

    try {
        console.log(`[LOGIN] Attempting login for user: ${username}`);

        if (!username || !password) {
            return res.status(400).json({ error: 'Username and password are required' });
        }

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
app.patch('/user/tier', authenticateToken, async (req, res) => {
    const { tier } = req.body;

    const validTiers = ['free', 'pro', 'enterprise'];
    if (!tier || !validTiers.includes(tier)) {
        return res.status(400).json({ error: 'Invalid tier. Must be free, pro, or enterprise.' });
    }

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
app.post('/miner/telemetry', authenticateToken, async (req, res) => {
    const { workerName, hashrate, temp, power } = req.body;
    const userId = req.user.id;

    if (!workerName) return res.status(400).json({ error: "Missing workerName" });

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

// Test database connection on startup
prisma.$connect()
    .then(() => {
        console.log('Database connected successfully');
        app.listen(PORT, () => {
            console.log(`Backend API running on port ${PORT}`);
        });
    })
    .catch((e) => {
        console.error('Failed to connect to database:', e.message);
        console.error('Make sure DATABASE_URL is set correctly and the database is running');
        process.exit(1);
    });
