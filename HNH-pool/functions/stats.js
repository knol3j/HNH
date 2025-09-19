// Pool statistics endpoint
const { globalStorage, deployment, createResponse, checkRateLimit } = require('./utils');

exports.handler = async (event, context) => {
  // Handle OPTIONS request for CORS
  if (event.httpMethod === 'OPTIONS') {
    return createResponse(200, {});
  }

  if (event.httpMethod !== 'GET') {
    return createResponse(405, { error: 'Method not allowed' });
  }

  // Rate limiting
  const clientIP = event.headers['x-forwarded-for'] || event.headers['x-real-ip'] || 'unknown';
  if (!checkRateLimit(clientIP, 60, 60000)) { // 60 requests per minute
    return createResponse(429, { error: 'Rate limit exceeded' });
  }

  try {
    const now = Date.now();
    const miners = Array.from(globalStorage.miners.values());
    const activeMiners = miners.filter(
      miner => miner.isActive && (now - miner.lastSeen) < 300000 // 5 minutes
    );

    globalStorage.stats.totalMiners = activeMiners.length;
    globalStorage.stats.totalHashrate = activeMiners.reduce(
      (sum, miner) => sum + (miner.hashrate || 0), 0
    );

    const response = {
      ...globalStorage.stats,
      activeMiners: activeMiners.length,
      allTimeMiners: globalStorage.miners.size,
      tokenAddress: deployment?.mintAddress || 'CB9tPfNgfxsTZpNkVWaohabFqWUCNd5RH6w8bvzZemVd',
      network: 'devnet',
      uptime: process.uptime ? process.uptime() : Math.floor((Date.now() - 1695081600000) / 1000),
      timestamp: new Date().toISOString(),
      miners: activeMiners.map(m => ({
        wallet: m.walletAddress.slice(0, 8) + '...',
        hashrate: m.hashrate || 0,
        shares: m.shares || 0,
        earnings: m.totalEarnings || 0
      }))
    };

    return createResponse(200, response);
  } catch (error) {
    console.error('Stats endpoint error:', error);
    return createResponse(500, { error: 'Internal server error' });
  }
};