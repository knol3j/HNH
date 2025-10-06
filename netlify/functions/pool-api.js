const { PrismaClient } = require('../../generated/prisma');
const { neon } = require('@netlify/neon');

// Initialize Prisma client and Neon
const prisma = new PrismaClient();
const sql = neon();

// CORS headers
const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Content-Type': 'application/json'
};

// Helper function to handle async operations
const asyncHandler = (fn) => async (event, context) => {
    try {
        return await fn(event, context);
    } catch (error) {
        console.error('API Error:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ 
                error: 'Internal server error', 
                message: error.message 
            })
        };
    }
};

// Main API handler
exports.handler = asyncHandler(async (event, context) => {
    const path = event.path.replace('/.netlify/functions/pool-api', '');
    const method = event.httpMethod;

    // Handle preflight requests
    if (method === 'OPTIONS') {
        return { statusCode: 200, headers, body: '' };
    }

    try {
        const body = event.body ? JSON.parse(event.body) : {};
        const query = event.queryStringParameters || {};

        // ========== MINING POOL ENDPOINTS ==========

        // Get supported coins and pools
        if (path === '/coins' && method === 'GET') {
            const coins = await prisma.coin.findMany({
                where: { isActive: true },
                include: {
                    pools: {
                        where: { isActive: true },
                        orderBy: { priority: 'desc' }
                    }
                },
                orderBy: { symbol: 'asc' }
            });

            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({ coins })
            };
        }

        // Get profitability data
        if (path === '/profitability' && method === 'GET') {
            const coins = await prisma.coin.findMany({
                where: { isActive: true },
                select: {
                    symbol: true,
                    name: true,
                    algorithm: true,
                    price: true,
                    difficulty: true,
                    networkHash: true,
                    profitability: true,
                    blockReward: true,
                    blockTime: true
                },
                orderBy: { profitability: 'desc' }
            });

            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({ coins })
            };
        }

        // Miner registration
        if (path === '/miners/register' && method === 'POST') {
            const { 
                email, username, walletAddr, minerName, 
                gpuModel, gpuCount, location 
            } = body;

            // Create or get user
            let user = await prisma.user.findFirst({
                where: { 
                    OR: [
                        { email },
                        { username },
                        { walletAddr }
                    ]
                }
            });

            if (!user) {
                user = await prisma.user.create({
                    data: {
                        email,
                        username,
                        walletAddr,
                        role: 'MINER'
                    }
                });
            }

            // Create miner
            const miner = await prisma.miner.create({
                data: {
                    userId: user.id,
                    minerId: `miner_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                    name: minerName || `${username}'s Miner`,
                    gpuModel,
                    gpuCount: parseInt(gpuCount) || 1,
                    location,
                    status: 'OFFLINE'
                }
            });

            return {
                statusCode: 201,
                headers,
                body: JSON.stringify({ 
                    success: true, 
                    user: { 
                        id: user.id, 
                        email: user.email, 
                        username: user.username 
                    },
                    miner: {
                        id: miner.id,
                        minerId: miner.minerId,
                        name: miner.name,
                        status: miner.status
                    }
                })
            };
        }

        // Get miner info
        if (path.startsWith('/miners/') && method === 'GET') {
            const minerId = path.split('/')[2];
            
            const miner = await prisma.miner.findUnique({
                where: { minerId },
                include: {
                    user: {
                        select: { username: true, email: true, walletAddr: true }
                    },
                    statistics: {
                        orderBy: { date: 'desc' },
                        take: 30
                    }
                }
            });

            if (!miner) {
                return {
                    statusCode: 404,
                    headers,
                    body: JSON.stringify({ error: 'Miner not found' })
                };
            }

            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({ miner })
            };
        }

        // Update miner status
        if (path.startsWith('/miners/') && path.endsWith('/status') && method === 'PUT') {
            const minerId = path.split('/')[2];
            const { status, hashrate, temperature, currentCoin, currentPool } = body;

            const miner = await prisma.miner.update({
                where: { minerId },
                data: {
                    status,
                    hashrate: parseFloat(hashrate) || undefined,
                    temperature: parseFloat(temperature) || undefined,
                    currentCoin,
                    currentPool,
                    lastSeen: new Date()
                }
            });

            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({ miner })
            };
        }

        // Submit share
        if (path === '/shares/submit' && method === 'POST') {
            const { minerId, coin, poolName, difficulty, shareType, blockHeight, reward } = body;

            const miner = await prisma.miner.findUnique({
                where: { minerId },
                include: { user: true }
            });

            if (!miner) {
                return {
                    statusCode: 404,
                    headers,
                    body: JSON.stringify({ error: 'Miner not found' })
                };
            }

            const share = await prisma.share.create({
                data: {
                    minerId: miner.id,
                    userId: miner.userId,
                    coin,
                    poolName,
                    difficulty: parseFloat(difficulty),
                    shareType,
                    blockHeight: blockHeight ? parseInt(blockHeight) : null,
                    reward: parseFloat(reward) || 0
                }
            });

            return {
                statusCode: 201,
                headers,
                body: JSON.stringify({ share })
            };
        }

        // Get pool statistics
        if (path === '/stats/pool' && method === 'GET') {
            const totalMiners = await prisma.miner.count({
                where: { status: { in: ['ONLINE', 'MINING'] } }
            });

            const totalHashrate = await prisma.miner.aggregate({
                where: { status: { in: ['ONLINE', 'MINING'] } },
                _sum: { hashrate: true }
            });

            const recentShares = await prisma.share.count({
                where: {
                    timestamp: {
                        gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
                    }
                }
            });

            const pendingPayments = await prisma.payment.aggregate({
                where: { status: 'PENDING' },
                _sum: { amount: true }
            });

            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({
                    totalMiners,
                    totalHashrate: totalHashrate._sum.hashrate || 0,
                    recentShares,
                    pendingPayments: pendingPayments._sum.amount || 0
                })
            };
        }

        // ========== COMPUTE MARKETPLACE ENDPOINTS ==========

        // Vendor registration
        if (path === '/vendors/register' && method === 'POST') {
            const { email, username, companyName, description, website, contactEmail } = body;

            let user = await prisma.user.findFirst({
                where: { 
                    OR: [
                        { email },
                        { username }
                    ]
                }
            });

            if (!user) {
                user = await prisma.user.create({
                    data: {
                        email,
                        username,
                        role: 'VENDOR'
                    }
                });
            } else {
                // Update existing user to vendor role
                user = await prisma.user.update({
                    where: { id: user.id },
                    data: { role: 'VENDOR' }
                });
            }

            const vendorProfile = await prisma.vendorProfile.create({
                data: {
                    userId: user.id,
                    companyName,
                    description,
                    website,
                    contactEmail: contactEmail || email
                }
            });

            return {
                statusCode: 201,
                headers,
                body: JSON.stringify({ 
                    success: true, 
                    user,
                    vendor: vendorProfile
                })
            };
        }

        // Create compute order
        if (path === '/compute/orders' && method === 'POST') {
            const { vendorId, title, description, requirements, duration, budget } = body;

            const order = await prisma.computeOrder.create({
                data: {
                    vendorId,
                    title,
                    description,
                    requirements: typeof requirements === 'object' ? requirements : JSON.parse(requirements),
                    duration: parseInt(duration),
                    budget: parseFloat(budget)
                }
            });

            return {
                statusCode: 201,
                headers,
                body: JSON.stringify({ order })
            };
        }

        // Get available compute orders
        if (path === '/compute/orders' && method === 'GET') {
            const orders = await prisma.computeOrder.findMany({
                where: { status: 'PENDING' },
                include: {
                    vendor: {
                        select: {
                            companyName: true,
                            isVerified: true
                        }
                    }
                },
                orderBy: { createdAt: 'desc' }
            });

            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({ orders })
            };
        }

        // ========== LEGACY ENDPOINTS (for compatibility) ==========

        // Network stats (legacy)
        if (path === '/network-stats' && method === 'GET') {
            const stats = await prisma.miner.aggregate({
                _count: { id: true },
                _sum: { hashrate: true, gpuCount: true }
            });

            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({
                    totalNodes: stats._count.id || 0,
                    activeGPUs: stats._sum.gpuCount || 0,
                    totalTFLOPS: (stats._sum.hashrate || 0) / 1000, // Convert to approximate TFLOPS
                    networkUtilization: stats._count.id > 0 ? 85 : 0,
                    rewardsDistributed: 0,
                    uptime: 99.8,
                    phase: "production",
                    tokenLaunched: false
                })
            };
        }

        // Revenue calculator (legacy)
        if (path === '/revenue-data' && method === 'GET') {
            const { gpuType, gpuCount, hoursPerDay } = query;

            const hashRates = { '4090': 150, '3090': 120, '3080': 100, '3070': 60, '3060ti': 45, 'cpu': 0.5 };
            const powerUsage = { '4090': 450, '3090': 350, '3080': 320, '3070': 220, '3060ti': 200, 'cpu': 100 };

            const electricityCost = 0.12;
            const revenuePerMH = 0.85;
            const revenueShare = 0.70;

            const totalHashRate = hashRates[gpuType] * parseInt(gpuCount);
            const dailyRevenue = totalHashRate * revenuePerMH * (parseInt(hoursPerDay) / 24) * revenueShare;
            const totalPower = (powerUsage[gpuType] * parseInt(gpuCount)) / 1000;
            const dailyElectricity = totalPower * parseInt(hoursPerDay) * electricityCost;
            const dailyProfit = dailyRevenue - dailyElectricity;

            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({
                    dailyRevenue: dailyRevenue.toFixed(2),
                    dailyProfit: dailyProfit.toFixed(2),
                    weeklyRevenue: (dailyProfit * 7).toFixed(2),
                    monthlyRevenue: (dailyProfit * 30).toFixed(2),
                    yearlyRevenue: (dailyProfit * 365).toFixed(2),
                    hashRate: totalHashRate,
                    powerConsumption: totalPower
                })
            };
        }

        // Default 404 response
        return {
            statusCode: 404,
            headers,
            body: JSON.stringify({ 
                error: 'Endpoint not found',
                availableEndpoints: [
                    'GET /coins - Get supported coins and pools',
                    'GET /profitability - Get coin profitability data',
                    'POST /miners/register - Register a new miner',
                    'GET /miners/{minerId} - Get miner info',
                    'PUT /miners/{minerId}/status - Update miner status',
                    'POST /shares/submit - Submit mining share',
                    'GET /stats/pool - Get pool statistics',
                    'POST /vendors/register - Register as vendor',
                    'POST /compute/orders - Create compute order',
                    'GET /compute/orders - Get available compute orders'
                ]
            })
        };

    } catch (error) {
        console.error('API Error:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ 
                error: 'Internal server error', 
                message: error.message 
            })
        };
    }
});