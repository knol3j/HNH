// Admin endpoints for security dashboard
const {
  globalStorage,
  createResponse,
  requireAuth,
  logSecurityEvent
} = require('./utils');

exports.handler = async (event, context) => {
  // Handle OPTIONS request for CORS
  if (event.httpMethod === 'OPTIONS') {
    return createResponse(200, {});
  }

  const path = event.path.replace('/.netlify/functions/admin', '');

  try {
    if (path === '/security' && event.httpMethod === 'GET') {
      return await handleSecurityDashboard(event);
    } else if (path === '/security-mode' && event.httpMethod === 'POST') {
      return await handleSecurityMode(event);
    }

    return createResponse(404, { error: 'Admin endpoint not found' });
  } catch (error) {
    console.error('Admin endpoint error:', error);
    return createResponse(500, { error: 'Internal server error' });
  }
};

async function handleSecurityDashboard(event) {
  // Require authentication
  if (!requireAuth(event)) {
    logSecurityEvent(event, 'UNAUTHORIZED_ACCESS', 'Attempted admin access without token');
    return createResponse(401, { error: 'Unauthorized' });
  }

  const miners = Array.from(globalStorage.miners.values());
  const now = Date.now();
  const activeMiners = miners.filter(
    m => m.isActive && (now - m.lastSeen) < 300000
  );

  return createResponse(200, {
    securityLogs: {
      recentEvents: globalStorage.securityLogs.suspiciousActivity.slice(-50),
      totalEvents: globalStorage.securityLogs.suspiciousActivity.length,
      rejectedConnections: globalStorage.securityLogs.rejectedConnections,
      rateLimitHits: globalStorage.securityLogs.rateLimitHits
    },
    systemHealth: {
      uptime: process.uptime ? process.uptime() : Math.floor((Date.now() - 1695081600000) / 1000),
      memoryUsage: process.memoryUsage ? process.memoryUsage() : {
        rss: 50000000,
        heapTotal: 20000000,
        heapUsed: 15000000,
        external: 2000000,
        arrayBuffers: 100000
      },
      activeConnections: globalStorage.miners.size,
      totalShares: globalStorage.stats.totalShares
    },
    networkStats: {
      totalMiners: globalStorage.miners.size,
      activeMiners: activeMiners.length,
      totalHashrate: globalStorage.stats.totalHashrate
    }
  });
}

async function handleSecurityMode(event) {
  // Require authentication
  if (!requireAuth(event)) {
    logSecurityEvent(event, 'UNAUTHORIZED_ACCESS', 'Attempted security mode change without token');
    return createResponse(401, { error: 'Unauthorized' });
  }

  const body = JSON.parse(event.body || '{}');
  const { mode } = body;

  if (!['enable', 'disable'].includes(mode)) {
    return createResponse(400, { error: 'Invalid mode. Use "enable" or "disable"' });
  }

  if (mode === 'enable') {
    console.log('🔒 Security mode enabled - Enhanced monitoring active');
    globalStorage.securityLogs.securityModeEnabled = true;
    globalStorage.securityLogs.securityModeStarted = Date.now();
  } else {
    console.log('🔓 Security mode disabled');
    globalStorage.securityLogs.securityModeEnabled = false;
  }

  return createResponse(200, {
    success: true,
    mode: mode,
    timestamp: new Date().toISOString()
  });
}