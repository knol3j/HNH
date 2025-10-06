const { neon } = require('@netlify/neon');
const { PrismaClient } = require('../generated/prisma');

class DatabaseService {
  constructor() {
    this.sql = neon();
    this.prisma = new PrismaClient();
  }

  async connect() {
    try {
      await this.prisma.$connect();
      console.log('✅ Database connected successfully');
      return true;
    } catch (error) {
      console.error('❌ Database connection failed:', error);
      throw error;
    }
  }

  async disconnect() {
    try {
      await this.prisma.$disconnect();
      console.log('🔌 Database disconnected');
    } catch (error) {
      console.error('❌ Database disconnection error:', error);
    }
  }

  // Raw SQL queries using Netlify Neon
  async query(sql, params = []) {
    try {
      return await this.sql(sql, params);
    } catch (error) {
      console.error('❌ Database query error:', error);
      throw error;
    }
  }

  // User operations
  async createUser(userData) {
    return await this.prisma.user.create({
      data: userData
    });
  }

  async getUserByEmail(email) {
    return await this.prisma.user.findUnique({
      where: { email },
      include: {
        miners: true,
        vendorProfile: true
      }
    });
  }

  async getUserById(id) {
    return await this.prisma.user.findUnique({
      where: { id },
      include: {
        miners: true,
        payments: {
          orderBy: { createdAt: 'desc' },
          take: 10
        }
      }
    });
  }

  // Miner operations
  async registerMiner(minerData) {
    return await this.prisma.miner.create({
      data: minerData
    });
  }

  async getMinerByMinerId(minerId) {
    return await this.prisma.miner.findUnique({
      where: { minerId },
      include: {
        user: true,
        statistics: {
          orderBy: { date: 'desc' },
          take: 30
        }
      }
    });
  }

  async updateMinerStatus(minerId, status, hashrate = null) {
    const updateData = {
      status,
      lastSeen: new Date()
    };
    
    if (hashrate !== null) {
      updateData.hashrate = hashrate;
    }

    return await this.prisma.miner.update({
      where: { minerId },
      data: updateData
    });
  }

  async getActiveMiners() {
    return await this.prisma.miner.findMany({
      where: {
        status: {
          in: ['ONLINE', 'MINING']
        }
      },
      include: {
        user: {
          select: { username: true, email: true }
        }
      }
    });
  }

  // Share operations
  async submitShare(shareData) {
    return await this.prisma.share.create({
      data: shareData
    });
  }

  async getSharesForMiner(minerId, limit = 100) {
    return await this.prisma.share.findMany({
      where: { minerId },
      orderBy: { timestamp: 'desc' },
      take: limit
    });
  }

  async getPoolStatistics(timeframe = '24h') {
    const timeAgo = new Date();
    if (timeframe === '24h') {
      timeAgo.setHours(timeAgo.getHours() - 24);
    } else if (timeframe === '7d') {
      timeAgo.setDate(timeAgo.getDate() - 7);
    }

    const stats = await this.prisma.share.groupBy({
      by: ['coin', 'shareType'],
      where: {
        timestamp: {
          gte: timeAgo
        }
      },
      _count: {
        id: true
      },
      _sum: {
        reward: true
      }
    });

    return stats;
  }

  // Coin and Pool operations
  async addCoin(coinData) {
    return await this.prisma.coin.create({
      data: coinData
    });
  }

  async getAllCoins() {
    return await this.prisma.coin.findMany({
      where: { isActive: true },
      include: {
        pools: {
          where: { isActive: true },
          orderBy: { priority: 'desc' }
        }
      }
    });
  }

  async updateCoinProfitability(symbol, profitability, price) {
    return await this.prisma.coin.update({
      where: { symbol },
      data: { 
        profitability,
        price,
        updatedAt: new Date()
      }
    });
  }

  async getMostProfitableCoin() {
    return await this.prisma.coin.findFirst({
      where: { isActive: true },
      orderBy: { profitability: 'desc' },
      include: {
        pools: {
          where: { isActive: true },
          orderBy: { priority: 'desc' },
          take: 1
        }
      }
    });
  }

  // Payment operations
  async createPayment(paymentData) {
    return await this.prisma.payment.create({
      data: paymentData
    });
  }

  async updatePaymentStatus(id, status, txHash = null) {
    const updateData = { status };
    if (txHash) {
      updateData.txHash = txHash;
    }
    if (status === 'COMPLETED') {
      updateData.paidAt = new Date();
    }

    return await this.prisma.payment.update({
      where: { id },
      data: updateData
    });
  }

  async getPendingPayments() {
    return await this.prisma.payment.findMany({
      where: { status: 'PENDING' },
      include: {
        user: {
          select: { username: true, email: true, walletAddr: true }
        }
      }
    });
  }

  // Vendor and Compute marketplace
  async createVendorProfile(vendorData) {
    return await this.prisma.vendorProfile.create({
      data: vendorData
    });
  }

  async createComputeOrder(orderData) {
    return await this.prisma.computeOrder.create({
      data: orderData
    });
  }

  async getAvailableComputeOrders() {
    return await this.prisma.computeOrder.findMany({
      where: { status: 'PENDING' },
      include: {
        vendor: {
          include: {
            user: {
              select: { username: true }
            }
          }
        }
      }
    });
  }

  // Statistics
  async recordMinerStatistics(minerId, statsData) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return await this.prisma.minerStatistics.upsert({
      where: {
        minerId_date: {
          minerId,
          date: today
        }
      },
      update: statsData,
      create: {
        minerId,
        date: today,
        ...statsData
      }
    });
  }

  async getSystemConfig(key) {
    const config = await this.prisma.systemConfig.findUnique({
      where: { key }
    });
    return config?.value;
  }

  async setSystemConfig(key, value, description = null) {
    return await this.prisma.systemConfig.upsert({
      where: { key },
      update: { 
        value, 
        description,
        updatedAt: new Date() 
      },
      create: { 
        key, 
        value, 
        description 
      }
    });
  }

  // Health check
  async healthCheck() {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return { status: 'healthy', timestamp: new Date() };
    } catch (error) {
      return { 
        status: 'unhealthy', 
        error: error.message, 
        timestamp: new Date() 
      };
    }
  }
}

module.exports = new DatabaseService();