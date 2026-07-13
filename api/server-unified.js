require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { PrismaClient } = require('@prisma/client');

const app = express();
const prisma = new PrismaClient();

// Configuration
const API_PORT = process.env.API_PORT || process.env.PORT || 10000;
const NODE_ENV = process.env.NODE_ENV || 'development';

console.log(`
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║     HashNHedge Unified Backend API                       ║
║     Environment: ${NODE_ENV.padEnd(10)}                           ║
║     Port: ${API_PORT}                                         ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
`);

// ============================================================
// MIDDLEWARE
// ============================================================

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://cdn.tailwindcss.com", "https://cdnjs.cloudflare.com", "https://discordapp.com"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://cdnjs.cloudflare.com"],
      imgSrc: ["'self'", "data:", "https:"],
      fontSrc: ["'self'", "https://cdnjs.cloudflare.com"],
      frameSrc: ["https://discordapp.com"],
      connectSrc: ["'self'", "https://hashnhedge-api.onrender.com", "wss:"],
    },
  },
  crossOriginEmbedderPolicy: false, // Allow embedding for Discord widget
}));

// CORS configuration
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',')
  : NODE_ENV === 'production'
    ? [
        'https://hashnhedge.com',
        'https://www.hashnhedge.com',
        'https://hashnhedge-pool.onrender.com'
      ]
    : ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:8080'];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
      callback(null, true);
    } else {
      console.warn(`[SECURITY] Blocked CORS request from: ${origin}`);
      callback(new Error('Not allowed by CORS policy'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key', 'X-Worker-ID'],
  exposedHeaders: ['X-Total-Count', 'X-RateLimit-Remaining'],
  maxAge: 86400
}));

// Rate limiting
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  skipSuccessfulRequests: true,
});

app.use('/api', apiLimiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static file serving - serve frontend files
const path = require('path');
app.use(express.static(path.join(__dirname, '..')));
app.use('/pages', express.static(path.join(__dirname, '..', 'pages')));
app.use('/assets', express.static(path.join(__dirname, '..', 'assets')));
app.use('/js', express.static(path.join(__dirname, '..', 'js')));
app.use('/css', express.static(path.join(__dirname, '..', 'css')));

// Request logging
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// ============================================================
// IMPORT ROUTES
// ============================================================

const apiRoutes = require('./routes');

// ============================================================
// HEALTH & STATUS ENDPOINTS
// ============================================================

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'HashNHedge Unified API',
    version: '2.0.0',
    services: {
      api: 'operational',
      database: 'connected',
      miningPool: 'operational',
      stratum: 'operational'
    },
    endpoints: {
      health: '/api/health',
      networkStats: '/api/stats/network',
      workers: '/api/workers',
      community: '/api/community/*',
      vendors: '/api/vendor/*',
      mining: '/api/mining/*'
    }
  });
});

// Health check
app.get('/api/health', async (req, res) => {
  try {
    // Test database connection
    await prisma.$queryRaw`SELECT 1`;

    res.json({
      success: true,
      status: 'healthy',
      timestamp: new Date().toISOString(),
      services: {
        api: 'up',
        database: 'connected',
        miningPool: 'up'
      },
      uptime: process.uptime(),
      memory: {
        used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
        unit: 'MB'
      }
    });
  } catch (error) {
    console.error('[ERROR] Health check failed:', error);
    res.status(503).json({
      success: false,
      status: 'unhealthy',
      error: 'Database connection failed'
    });
  }
});

// ============================================================
// NETWORK STATS ENDPOINTS (from server.js)
// ============================================================

// Cache for network stats
let networkDataCache = null;
let lastCacheUpdate = 0;
const CACHE_DURATION = 30000; // 30 seconds

async function getNetworkStats() {
  const now = Date.now();

  if (networkDataCache && (now - lastCacheUpdate) < CACHE_DURATION) {
    return networkDataCache;
  }

  try {
    const activeWorkers = await prisma.worker.count({
      where: {
        status: 'active',
        lastSeen: {
          gte: new Date(Date.now() - 5 * 60 * 1000)
        }
      }
    });

    const workers = await prisma.worker.findMany({
      where: {
        status: 'active',
        lastSeen: {
          gte: new Date(Date.now() - 5 * 60 * 1000)
        }
      },
      select: {
        hardwareInfo: true
      }
    });

    let totalGPUs = 0;
    let totalHashrate = 0;

    workers.forEach(worker => {
      if (worker.hardwareInfo && typeof worker.hardwareInfo === 'object') {
        totalGPUs += worker.hardwareInfo.gpuCount || 0;
        totalHashrate += worker.hardwareInfo.hashrate || 0;
      }
    });

    const poolStats = await prisma.poolStats.findFirst({
      orderBy: { timestamp: 'desc' }
    });

    networkDataCache = {
      totalNodes: activeWorkers,
      activeGPUs: totalGPUs,
      totalHashrate: totalHashrate,
      networkUtilization: poolStats?.networkUtilization || 0,
      rewardsDistributed: poolStats?.poolRevenue || 0,
      uptime: poolStats ? Math.floor((Date.now() - new Date(poolStats.timestamp).getTime()) / 1000) : 0,
      phase: "pre-launch",
      tokenLaunched: false
    };

    lastCacheUpdate = now;
    return networkDataCache;
  } catch (error) {
    console.error('[ERROR] Failed to fetch network stats:', error);
    return {
      totalNodes: 0,
      activeGPUs: 0,
      totalHashrate: 0,
      networkUtilization: 0,
      rewardsDistributed: 0,
      uptime: 0,
      phase: "pre-launch",
      tokenLaunched: false
    };
  }
}

app.get('/api/stats/network', async (req, res) => {
  try {
    const stats = await getNetworkStats();
    res.json(stats);
  } catch (error) {
    console.error('[ERROR] Network stats endpoint failed:', error);
    res.status(500).json({ error: 'Failed to fetch network statistics' });
  }
});

// Pool statistics
app.get('/api/stats/pool', async (req, res) => {
  try {
    const stats = await prisma.poolStats.findFirst({
      orderBy: { timestamp: 'desc' }
    });

    res.json({
      success: true,
      stats: stats || {
        totalWorkers: 0,
        activeWorkers: 0,
        totalHashrate: 0,
        aiJobsCompleted: 0,
        miningJobsCompleted: 0,
        poolRevenue: 0,
        networkUtilization: 0
      }
    });
  } catch (error) {
    console.error('[ERROR] Pool stats failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch pool statistics'
    });
  }
});

// ============================================================
// WALLET & CONFIG ENDPOINTS
// ============================================================

// Wallet configuration endpoint
app.get('/api/config/wallet', (req, res) => {
  const officialWallet = process.env.OFFICIAL_WALLET_ADDRESS || null;

  if (!officialWallet) {
    console.warn('[WARNING] OFFICIAL_WALLET_ADDRESS not configured in environment');
    return res.status(503).json({
      success: false,
      error: 'Wallet configuration unavailable'
    });
  }

  res.json({
    success: true,
    walletAddress: officialWallet,
    network: process.env.SOLANA_NETWORK || 'mainnet-beta'
  });
});

// Connect wallet endpoint
app.post('/api/connect-wallet', authLimiter, async (req, res) => {
  try {
    const { address } = req.body;

    // Validate wallet address format (basic Solana validation)
    if (!address || !/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(address)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid wallet address'
      });
    }

    // In production, verify wallet signature here
    res.json({
      success: true,
      address: address,
      connected: true,
      message: 'Wallet connected successfully'
    });
  } catch (error) {
    console.error('[ERROR] Wallet connection failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to connect wallet'
    });
  }
});

// Network stats alias for backward compatibility
app.get('/api/network-stats', async (req, res) => {
  try {
    const stats = await getNetworkStats();
    res.json(stats);
  } catch (error) {
    console.error('[ERROR] Network stats endpoint failed:', error);
    res.status(500).json({ error: 'Failed to fetch network statistics' });
  }
});

// ============================================================
// API ROUTES
// ============================================================

app.use('/api', apiRoutes);

// ============================================================
// ERROR HANDLING
// ============================================================

// 404 handler - serve index.html for non-API routes
app.use((req, res, next) => {
  // If it's an API route, return JSON error
  if (req.path.startsWith('/api')) {
    return res.status(404).json({
      success: false,
      error: 'API endpoint not found',
      path: req.path
    });
  }

  // For non-API routes, serve index.html (SPA fallback)
  res.sendFile(path.join(__dirname, '..', 'index.html'));
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('[ERROR]', err);

  // CORS errors
  if (err.message === 'Not allowed by CORS policy') {
    return res.status(403).json({
      success: false,
      error: 'CORS policy violation',
      origin: req.get('origin')
    });
  }

  res.status(err.status || 500).json({
    success: false,
    error: err.message || 'Internal server error',
    ...(NODE_ENV === 'development' && { stack: err.stack })
  });
});

// ============================================================
// STRATUM SERVER INTEGRATION
// ============================================================

const StratumWebSocketServer = require('./stratum-websocket');
let stratumServer = null;

// Optional: Hybrid pool orchestrator for AI/Mining job routing
let orchestrator = null;
if (process.env.ENABLE_ORCHESTRATOR === 'true') {
  const JobOrchestrator = require('../hybrid-pool/orchestrator');
  orchestrator = new JobOrchestrator();
  console.log('[ORCHESTRATOR] Enabled AI/Mining job routing');
}

// ============================================================
// START SERVER
// ============================================================

const server = app.listen(API_PORT, '0.0.0.0', () => {
  console.log(`
✅ Server started successfully!

🌐 Listening on: http://0.0.0.0:${API_PORT}
📊 Health check: http://localhost:${API_PORT}/api/health
🔗 API docs: http://localhost:${API_PORT}/

Services:
  ✅ API Server
  ✅ Database (Prisma + PostgreSQL)
  ✅ Mining Pool
  ✅ Network Stats

Environment: ${NODE_ENV}
CORS: ${allowedOrigins.join(', ')}
  `);

  // Initialize Stratum server after HTTP server is ready
  try {
    stratumServer = new StratumWebSocketServer(server, {
      port: process.env.STRATUM_PORT || 3333,
      orchestrator
    });
    console.log(`
⛏️  Stratum Mining Protocol:
  📡 WebSocket: ws://0.0.0.0:${API_PORT}/stratum
  🔌 TCP: 0.0.0.0:${process.env.STRATUM_PORT || 3333}
    `);
  } catch (error) {
    console.error('❌ Failed to start Stratum server:', error.message);
  }
});

// ============================================================
// GRACEFUL SHUTDOWN
// ============================================================

process.on('SIGTERM', async () => {
  console.log('\n[INFO] SIGTERM received, shutting down gracefully...');

  // Close Stratum server
  if (stratumServer) {
    stratumServer.close();
    console.log('[INFO] Stratum server closed');
  }

  server.close(async () => {
    console.log('[INFO] HTTP server closed');

    await prisma.$disconnect();
    console.log('[INFO] Database connection closed');

    console.log('[INFO] Shutdown complete');
    process.exit(0);
  });

  // Force shutdown after 30 seconds
  setTimeout(() => {
    console.error('[ERROR] Forced shutdown after timeout');
    process.exit(1);
  }, 30000);
});

process.on('SIGINT', async () => {
  console.log('\n[INFO] SIGINT received, shutting down...');

  if (stratumServer) {
    stratumServer.close();
  }

  await prisma.$disconnect();
  process.exit(0);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('[FATAL] Uncaught exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('[FATAL] Unhandled rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

module.exports = { app, server, prisma };
