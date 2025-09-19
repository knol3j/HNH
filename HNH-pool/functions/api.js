// Main API endpoint for HashNHedge Pool
const { globalStorage, deployment, createResponse } = require('./utils');

exports.handler = async (event, context) => {
  // Handle OPTIONS request for CORS
  if (event.httpMethod === 'OPTIONS') {
    return createResponse(200, {});
  }

  if (event.httpMethod === 'GET') {
    return createResponse(200, {
      message: 'HashNHedge Mining Pool API',
      version: '1.0.0',
      token: deployment?.mintAddress || 'CB9tPfNgfxsTZpNkVWaohabFqWUCNd5RH6w8bvzZemVd',
      network: 'devnet',
      endpoints: {
        stats: '/api/stats',
        connect: 'POST /api/miner/connect',
        submit: 'POST /api/miner/submit-share',
        security: '/api/admin/security'
      },
      website: 'https://hashnhedge.netlify.app',
      status: 'online',
      timestamp: new Date().toISOString()
    });
  }

  return createResponse(405, { error: 'Method not allowed' });
};