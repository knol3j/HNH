
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

app.use(cors());
app.use(express.json());

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
        const existing = await prisma.user.findUnique({ where: { username } });
        if (existing) return res.status(400).json({ error: 'Username taken' });

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
        res.json({ token, user: { id: user.id, username: user.username, tier: user.tier } });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Login
app.post('/auth/login', async (req, res) => {
    const { username, password } = req.body;

    try {
        const user = await prisma.user.findUnique({ where: { username } });
        if (!user) return res.status(400).json({ error: 'User not found' });

        const valid = await bcrypt.compare(password, user.passwordHash);
        if (!valid) return res.status(400).json({ error: 'Invalid password' });

        const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET);
        res.json({ token, user: { id: user.id, username: user.username, tier: user.tier } });
    } catch (e) {
        res.status(500).json({ error: e.message });
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

app.listen(PORT, () => {
    console.log(`Backend API running on port ${PORT}`);
});
