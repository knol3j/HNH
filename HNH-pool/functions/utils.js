// Shared utilities for Netlify Functions
const { Connection, Keypair, PublicKey, clusterApiUrl } = require('@solana/web3.js');
const { mintTo, getOrCreateAssociatedTokenAccount } = require('@solana/spl-token');

// Global storage (use external DB in production)
let globalStorage = {
  miners: new Map(),
  stats: {
    totalHashrate: 0,
    totalMiners: 0,
    totalShares: 0,
    totalHNHDistributed: 0,
    poolFee: 3
  },
  securityLogs: {
    connections: [],
    suspiciousActivity: [],
    rejectedConnections: 0,
    rateLimitHits: 0,
    securityModeEnabled: false
  }
};

// Load deployment configuration
let deployment = null;
let connection = null;
let mint = null;
let payer = null;

try {
  // In Netlify Functions, we'll use environment variables
  const deploymentData = {
    network: 'devnet',
    mintAddress: process.env.HNH_MINT_ADDRESS || 'CB9tPfNgfxsTZpNkVWaohabFqWUCNd5RH6w8bvzZemVd',
    tokenAccount: process.env.HNH_TOKEN_ACCOUNT || '3F5KrSkD5CxDCRgZQep8XN9ZTU953ntodAGK97HgFtME',
    mintAuthority: process.env.HNH_MINT_AUTHORITY || 'GmVDa5byHFA2oQUbm7JQjRugRqPW8emU6sAzjz2FdnGr',
    decimals: 9,
    totalSupply: '1000000000',
    keypair: process.env.HNH_KEYPAIR ? JSON.parse(process.env.HNH_KEYPAIR) : []
  };

  if (deploymentData.keypair.length > 0) {
    deployment = deploymentData;
    connection = new Connection(clusterApiUrl('devnet'), 'confirmed');
    mint = new PublicKey(deployment.mintAddress);
    payer = Keypair.fromSecretKey(new Uint8Array(deployment.keypair));
    console.log('✅ Loaded HNH token deployment:', deployment.mintAddress);
  }
} catch (error) {
  console.error('❌ Failed to load deployment:', error.message);
}

// Input validation helper
function validateInput(input, type, maxLength = 100) {
  if (typeof input !== type) return false;
  if (type === 'string' && input.length > maxLength) return false;
  if (type === 'string' && !/^[\w\s\-\.@]+$/.test(input)) return false;
  return true;
}

// Security monitoring
function logSecurityEvent(req, eventType, details) {
  const event = {
    timestamp: new Date().toISOString(),
    ip: req.headers['x-forwarded-for'] || req.headers['x-real-ip'] || 'unknown',
    userAgent: req.headers['user-agent'] || 'unknown',
    eventType,
    details
  };

  globalStorage.securityLogs.suspiciousActivity.push(event);
  if (globalStorage.securityLogs.suspiciousActivity.length > 1000) {
    globalStorage.securityLogs.suspiciousActivity = globalStorage.securityLogs.suspiciousActivity.slice(-500);
  }

  console.log(`🚨 Security Event: ${eventType} from ${event.ip} - ${details}`);
}

// Rate limiting helper
const rateLimitMap = new Map();

function checkRateLimit(ip, limit = 100, windowMs = 15 * 60 * 1000) {
  const now = Date.now();
  const userRequests = rateLimitMap.get(ip) || [];

  // Remove old requests outside the window
  const validRequests = userRequests.filter(time => now - time < windowMs);

  if (validRequests.length >= limit) {
    return false; // Rate limit exceeded
  }

  validRequests.push(now);
  rateLimitMap.set(ip, validRequests);
  return true; // Within rate limit
}

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Max-Age': '86400'
};

// Response helper
function createResponse(statusCode, body, additionalHeaders = {}) {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders,
      ...additionalHeaders
    },
    body: JSON.stringify(body)
  };
}

// Authentication helper
function requireAuth(event) {
  const authHeader = event.headers.authorization || event.headers.Authorization;
  const token = authHeader?.replace('Bearer ', '');
  const adminToken = process.env.ADMIN_TOKEN;

  if (!token || token !== adminToken) {
    return false;
  }
  return true;
}

// HNH Token Distribution Function
async function distributeHNHTokens(minerWallet, amount) {
  if (!deployment || !connection || !mint || !payer) {
    throw new Error('HNH token deployment not configured');
  }

  try {
    const minerPublicKey = new PublicKey(minerWallet);

    // Get or create associated token account for miner
    const minerTokenAccount = await getOrCreateAssociatedTokenAccount(
      connection,
      payer,
      mint,
      minerPublicKey
    );

    // Mint HNH tokens to miner
    const signature = await mintTo(
      connection,
      payer,
      mint,
      minerTokenAccount.address,
      payer.publicKey,
      amount
    );

    console.log(`💰 Distributed ${Number(amount) / (10**9)} HNH to ${minerWallet}`);
    console.log(`🔗 Transaction: https://explorer.solana.com/tx/${signature}?cluster=devnet`);

    return signature;
  } catch (error) {
    console.error('Failed to distribute HNH tokens:', error.message);
    throw error;
  }
}

module.exports = {
  globalStorage,
  deployment,
  validateInput,
  logSecurityEvent,
  checkRateLimit,
  corsHeaders,
  createResponse,
  requireAuth,
  distributeHNHTokens
};