#!/usr/bin/env node

const { neon } = require('@netlify/neon');
const fs = require('fs').promises;
const path = require('path');

async function seedInitialData() {
  try {
    console.log('🌱 Starting database seeding...');
    
    // Initialize Netlify Neon connection
    const sql = neon();

    // Seed supported cryptocurrencies
    const coins = [
      {
        symbol: 'ETC',
        name: 'Ethereum Classic',
        algorithm: 'Ethash',
        block_time: 13.0,
        block_reward: 3.2,
        is_active: true
      },
      {
        symbol: 'ETHW',
        name: 'EthereumPoW',
        algorithm: 'Ethash',
        block_time: 13.0,
        block_reward: 2.0,
        is_active: true
      },
      {
        symbol: 'RVN',
        name: 'Ravencoin',
        algorithm: 'KawPow',
        block_time: 60.0,
        block_reward: 2500.0,
        is_active: true
      },
      {
        symbol: 'ERGO',
        name: 'Ergo',
        algorithm: 'Autolykos2',
        block_time: 120.0,
        block_reward: 51.0,
        is_active: true
      },
      {
        symbol: 'FIRO',
        name: 'Firo',
        algorithm: 'FiroPOW',
        block_time: 150.0,
        block_reward: 6.25,
        is_active: true
      },
      {
        symbol: 'ALPH',
        name: 'Alephium',
        algorithm: 'Blake3',
        block_time: 64.0,
        block_reward: 1.25,
        is_active: true
      },
      {
        symbol: 'CFX',
        name: 'Conflux',
        algorithm: 'Octopus',
        block_time: 0.5,
        block_reward: 7.0,
        is_active: true
      }
    ];

    console.log('💰 Seeding coins...');
    for (const coin of coins) {
      try {
        await sql`
          INSERT INTO coins (id, symbol, name, algorithm, block_time, block_reward, is_active, updated_at)
          VALUES (gen_random_uuid(), ${coin.symbol}, ${coin.name}, ${coin.algorithm}, ${coin.block_time}, ${coin.block_reward}, ${coin.is_active}, NOW())
          ON CONFLICT (symbol) DO UPDATE SET
            name = EXCLUDED.name,
            algorithm = EXCLUDED.algorithm,
            block_time = EXCLUDED.block_time,
            block_reward = EXCLUDED.block_reward,
            updated_at = NOW()
        `;
        console.log(`  ✓ Added ${coin.symbol} (${coin.name})`);
      } catch (error) {
        console.log(`  ⚠️ Error adding ${coin.symbol}:`, error.message);
      }
    }

    // Seed mining pools
    const pools = [
      // Ethereum Classic pools
      { coin_symbol: 'ETC', name: '2miners', url: 'etc.2miners.com', port: 1010, fee: 1.0, min_payout: 0.1, priority: 10 },
      { coin_symbol: 'ETC', name: 'WoolyPooly', url: 'etc.woolypooly.com', port: 35000, fee: 0.9, min_payout: 0.1, priority: 9 },
      
      // EthereumPoW pools
      { coin_symbol: 'ETHW', name: 'EthProxy', url: 'ethproxy.com', port: 8080, fee: 1.0, min_payout: 0.05, priority: 10 },
      
      // Ravencoin pools
      { coin_symbol: 'RVN', name: '2miners', url: 'rvn.2miners.com', port: 6060, fee: 1.0, min_payout: 10.0, priority: 10 },
      { coin_symbol: 'RVN', name: 'RavenMiner', url: 'stratum.ravenminer.com', port: 4505, fee: 0.75, min_payout: 5.0, priority: 9 },
      
      // Ergo pools
      { coin_symbol: 'ERGO', name: '2miners', url: 'ergo.2miners.com', port: 8888, fee: 1.5, min_payout: 1.0, priority: 10 },
      { coin_symbol: 'ERGO', name: 'HeroMiners', url: 'ergo.herominers.com', port: 1180, fee: 1.0, min_payout: 0.5, priority: 9 },
      
      // Firo pools
      { coin_symbol: 'FIRO', name: '2miners', url: 'firo.2miners.com', port: 8181, fee: 1.0, min_payout: 0.1, priority: 10 },
      { coin_symbol: 'FIRO', name: 'MintPond', url: 'us.firo.mintpond.com', port: 3000, fee: 1.0, min_payout: 0.1, priority: 9 },
      
      // Alephium pools
      { coin_symbol: 'ALPH', name: 'WoolyPooly', url: 'alph.woolypooly.com', port: 3106, fee: 1.0, min_payout: 1.0, priority: 10 },
      { coin_symbol: 'ALPH', name: 'HeroMiners', url: 'alephium.herominers.com', port: 1199, fee: 1.0, min_payout: 0.5, priority: 9 },
      
      // Conflux pools
      { coin_symbol: 'CFX', name: 'NanoPool', url: 'cfx-eu1.nanopool.org', port: 17777, fee: 1.0, min_payout: 0.2, priority: 10 },
      { coin_symbol: 'CFX', name: 'WoolyPooly', url: 'cfx.woolypooly.com', port: 3094, fee: 0.9, min_payout: 0.1, priority: 9 }
    ];

    console.log('🏊 Seeding pools...');
    for (const pool of pools) {
      try {
        await sql`
          INSERT INTO pools (id, coin_id, name, url, port, fee, min_payout, priority, created_at, updated_at)
          SELECT gen_random_uuid(), c.id, ${pool.name}, ${pool.url}, ${pool.port}, ${pool.fee}, ${pool.min_payout}, ${pool.priority}, NOW(), NOW()
          FROM coins c
          WHERE c.symbol = ${pool.coin_symbol}
          ON CONFLICT DO NOTHING
        `;
        console.log(`  ✓ Added ${pool.coin_symbol} pool: ${pool.name}`);
      } catch (error) {
        console.log(`  ⚠️ Error adding pool ${pool.name}:`, error.message);
      }
    }

    // Add system configuration
    const systemConfigs = [
      { key: 'auto_switch_enabled', value: 'true', description: 'Enable automatic coin switching based on profitability' },
      { key: 'switch_threshold', value: '5', description: 'Minimum percentage difference to switch coins' },
      { key: 'stats_update_interval', value: '300', description: 'Statistics update interval in seconds' },
      { key: 'payment_threshold_usd', value: '10', description: 'Minimum payment threshold in USD' },
      { key: 'pool_fee_percentage', value: '1.5', description: 'Pool fee percentage' },
      { key: 'vendor_commission_percentage', value: '15', description: 'Commission for compute marketplace vendors' }
    ];

    console.log('⚙️ Seeding system configuration...');
    for (const config of systemConfigs) {
      try {
        await sql`
          INSERT INTO system_config (id, key, value, description, updated_at)
          VALUES (gen_random_uuid(), ${config.key}, ${config.value}, ${config.description}, NOW())
          ON CONFLICT (key) DO UPDATE SET
            value = EXCLUDED.value,
            description = EXCLUDED.description,
            updated_at = NOW()
        `;
        console.log(`  ✓ Added config: ${config.key}`);
      } catch (error) {
        console.log(`  ⚠️ Error adding config ${config.key}:`, error.message);
      }
    }

    console.log('🎉 Database seeding completed successfully!');
    
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  seedInitialData();
}

module.exports = { seedInitialData };