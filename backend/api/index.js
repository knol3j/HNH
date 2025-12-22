
import express from 'express';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import 'dotenv/config';

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 8080;
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';

// CORS Configuration
const allowedOrigins = [
    'http://localhost:5173',
    'http://localhost:4173',
    'https://hashnhedge-app.up.railway.app',
    'https://app.hashnhedge.com',
    'https://hashnhedge.com'
];

app.use(cors({
    origin: function (origin, callback) {
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin) return callback(null, true);
        if (allowedOrigins.indexOf(origin) === -1) {
            // Optional: for development, you might want to log this
            console.log('Blocked by CORS:', origin);
            // return callback(new Error('The CORS policy for this site does not allow access from the specified Origin.'), false);
            // Default to allowing for now to debug user issue, but warn
            return callback(null, true);
        }
        return callback(null, true);
    },
    credentials: true
}));
app.use(express.json());

// Health check endpoint
app.get(['/health', '/healthck'], async (req, res) => {
    try {
        await prisma.$queryRaw`SELECT 1`;
        res.json({ status: 'ok', database: 'connected' });
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
        if (!!err) return res.sendStatus(403);
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

        const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET);
        console.log(`[REGISTER] Successfully registered user: ${username}`);
        res.json({ token, user: { id: user.id, username: user.username, tier: user.tier, role: user.role } });
    } catch (e) {
        console.error('[REGISTER] Error:', e);
        res.status(500).json({ error: e.message, details: process.env.NODE_ENV === 'development' ? e.stack : undefined });
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

        const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET);
        console.log(`[LOGIN] Successfully logged in user: ${username}`);
        res.json({ token, user: { id: user.id, username: user.username, tier: user.tier, role: user.role } });
    } catch (e) {
        console.error('[LOGIN] Error:', e);
        res.status(500).json({ error: e.message, details: process.env.NODE_ENV === 'development' ? e.stack : undefined });
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

// Telemetry from Agent (Authenticated via User Token or special Agent Key - simplified to Token for now)
app.post('/miner/telemetry', async (req, res) => {
    // In a real app, agents would have their own API keys.
    // We'll trust the payload contains a valid userId for this PoC.
    const { userId, workerName, hashrate, temp, power } = req.body;

    if (!userId) return res.status(400).json({ error: "Missing userId" });

    try {
        // Upsert Worker
        let worker = await prisma.worker.findFirst({
            where: { userId, name: workerName }
        });

        if (!worker) {
            worker = await prisma.worker.create({
                data: { userId, name: workerName, hashrate: parseFloat(hashrate) }
            });
        } else {
            await prisma.worker.update({
                where: { id: worker.id },
                data: { hashrate: parseFloat(hashrate), lastSeen: new Date() }
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
