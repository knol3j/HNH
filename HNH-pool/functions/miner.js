// Miner connection and share submission endpoints
const { Connection, PublicKey } = require('@solana/web3.js');
const {
  globalStorage,
  validateInput,
  logSecurityEvent,
  checkRateLimit,
  createResponse,
  distributeHNHTokens
} = require('./utils');

exports.handler = async (event, context) => {
  // Handle OPTIONS request for CORS
  if (event.httpMethod === 'OPTIONS') {
    return createResponse(200, {});
  }

  const path = event.path.replace('/.netlify/functions/miner', '');
  const clientIP = event.headers['x-forwarded-for'] || event.headers['x-real-ip'] || 'unknown';

  // Rate limiting for miners
  if (!checkRateLimit(clientIP, 120, 60000)) { // 120 requests per minute
    globalStorage.securityLogs.rateLimitHits++;
    return createResponse(429, { error: 'Mining rate limit exceeded' });
  }

  try {
    if (path === '/connect' && event.httpMethod === 'POST') {
      return await handleMinerConnect(event);
    } else if (path === '/submit-share' && event.httpMethod === 'POST') {
      return await handleShareSubmission(event);
    } else if (path.startsWith('/') && event.httpMethod === 'GET') {
      return await handleMinerStats(event, path);
    }

    return createResponse(404, { error: 'Endpoint not found' });
  } catch (error) {
    console.error('Miner endpoint error:', error);
    return createResponse(500, { error: 'Internal server error' });
  }
};

async function handleMinerConnect(event) {
  const body = JSON.parse(event.body || '{}');
  const { walletAddress, gpuInfo, hashrate, workerName, capabilities, cpuInfo } = body;

  // Input validation
  if (!walletAddress || !validateInput(walletAddress, 'string', 50)) {
    logSecurityEvent(event, 'INVALID_WALLET', 'Invalid wallet address format');
    return createResponse(400, { error: 'Valid wallet address required' });
  }

  if (workerName && !validateInput(workerName, 'string', 30)) {
    logSecurityEvent(event, 'INVALID_WORKER_NAME', 'Invalid worker name format');
    return createResponse(400, { error: 'Invalid worker name format' });
  }

  if (hashrate && (typeof hashrate !== 'number' || hashrate < 0 || hashrate > 1000000000)) {
    logSecurityEvent(event, 'INVALID_HASHRATE', `Suspicious hashrate: ${hashrate}`);
    return createResponse(400, { error: 'Invalid hashrate value' });
  }

  // Validate Solana wallet address
  try {
    new PublicKey(walletAddress);
  } catch {
    logSecurityEvent(event, 'INVALID_SOLANA_WALLET', walletAddress);
    return createResponse(400, { error: 'Invalid Solana wallet address' });
  }

  // Register miner with marketplace capabilities
  globalStorage.miners.set(walletAddress, {
    walletAddress,
    workerName: workerName || 'unknown',
    gpuInfo: gpuInfo || {},
    cpuInfo: cpuInfo || {},
    hashrate: hashrate || 0,
    shares: 0,
    totalEarnings: 0,
    lastSeen: Date.now(),
    connectedAt: Date.now(),
    isActive: true,
    capabilities: {
      mining: true,
      hashcat: capabilities?.hashcat || false,
      aiTraining: capabilities?.aiTraining || false,
      generalCompute: capabilities?.generalCompute || false,
      ...capabilities
    },
    currentJob: null,
    jobHistory: []
  });

  console.log(`🔗 New miner connected: ${walletAddress} (${workerName || 'unknown'})`);

  return createResponse(200, {
    success: true,
    message: 'Miner connected successfully',
    poolInfo: {
      fee: globalStorage.stats.poolFee,
      algorithm: 'sha256',
      difficulty: '0x0000ffff00000000000000000000000000000000000000000000000000000000',
      token: process.env.HNH_MINT_ADDRESS || 'CB9tPfNgfxsTZpNkVWaohabFqWUCNd5RH6w8bvzZemVd',
      rewardPerShare: 1
    }
  });
}

async function handleShareSubmission(event) {
  const body = JSON.parse(event.body || '{}');
  const { walletAddress, nonce, hash, timestamp } = body;

  // Input validation
  if (!walletAddress || !validateInput(walletAddress, 'string', 50)) {
    logSecurityEvent(event, 'INVALID_SHARE_WALLET', 'Invalid wallet in share submission');
    return createResponse(400, { error: 'Valid wallet address required' });
  }

  if (!hash || typeof hash !== 'string' || !/^[a-f0-9]{64}$/i.test(hash)) {
    logSecurityEvent(event, 'INVALID_HASH', `Invalid hash format: ${hash}`);
    return createResponse(400, { error: 'Invalid hash format' });
  }

  if (!nonce || typeof nonce !== 'number' || nonce < 0 || nonce > 2147483647) {
    logSecurityEvent(event, 'INVALID_NONCE', `Invalid nonce: ${nonce}`);
    return createResponse(400, { error: 'Invalid nonce value' });
  }

  if (!timestamp || typeof timestamp !== 'number' || Math.abs(Date.now() - timestamp) > 300000) {
    logSecurityEvent(event, 'INVALID_TIMESTAMP', `Invalid timestamp: ${timestamp}`);
    return createResponse(400, { error: 'Invalid or stale timestamp' });
  }

  const miner = globalStorage.miners.get(walletAddress);
  if (!miner) {
    logSecurityEvent(event, 'UNREGISTERED_MINER', walletAddress);
    return createResponse(400, { error: 'Miner not registered. Connect first.' });
  }

  // Anti-spam: Check submission rate
  const now = Date.now();
  if (miner.lastShareSubmission && (now - miner.lastShareSubmission) < 1000) {
    logSecurityEvent(event, 'SHARE_SPAM', `Too frequent submissions from ${walletAddress}`);
    return createResponse(429, { error: 'Share submission rate limit exceeded' });
  }
  miner.lastShareSubmission = now;

  // Validate share (simplified - checks if hash starts with enough zeros)
  const isValidShare = hash && hash.startsWith('0000');

  if (isValidShare) {
    miner.shares++;
    miner.lastSeen = Date.now();
    globalStorage.stats.totalShares++;

    // Calculate HNH reward (1 HNH per valid share)
    const hnhReward = 1;
    const hnhRewardRaw = BigInt(hnhReward) * BigInt(10 ** 9);

    try {
      // Distribute HNH tokens (only if deployment is configured)
      if (process.env.HNH_KEYPAIR) {
        await distributeHNHTokens(walletAddress, hnhRewardRaw);
      }

      miner.totalEarnings += hnhReward;
      globalStorage.stats.totalHNHDistributed += hnhReward;

      console.log(`✅ Share accepted from ${walletAddress}, awarded ${hnhReward} HNH`);

      return createResponse(200, {
        success: true,
        message: 'Share accepted',
        hnhReward: hnhReward,
        totalShares: miner.shares,
        totalEarnings: miner.totalEarnings,
        hash: hash
      });
    } catch (error) {
      console.error('Error distributing HNH tokens:', error);
      return createResponse(200, {
        success: true,
        message: 'Share accepted (reward pending)',
        hnhReward: 0,
        totalShares: miner.shares,
        totalEarnings: miner.totalEarnings,
        error: 'Reward distribution failed'
      });
    }
  } else {
    return createResponse(400, {
      error: 'Invalid share - hash does not meet difficulty requirement',
      hash: hash
    });
  }
}

async function handleMinerStats(event, path) {
  const walletAddress = path.substring(1); // Remove leading slash

  if (!validateInput(walletAddress, 'string', 50)) {
    return createResponse(400, { error: 'Invalid wallet address format' });
  }

  const miner = globalStorage.miners.get(walletAddress);
  if (!miner) {
    return createResponse(404, { error: 'Miner not found' });
  }

  return createResponse(200, {
    ...miner,
    poolStats: {
      totalShares: globalStorage.stats.totalShares,
      totalMiners: globalStorage.stats.totalMiners,
      yourSharePercentage: globalStorage.stats.totalShares > 0 ?
        ((miner.shares / globalStorage.stats.totalShares) * 100).toFixed(2) : 0
    }
  });
}