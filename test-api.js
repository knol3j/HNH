#!/usr/bin/env node

// Test the API functions directly
const { handler } = require('./netlify/functions/pool-api.js');

async function testAPI() {
    console.log('🧪 Testing Pool API endpoints...\n');

    try {
        // Test 1: Get supported coins
        console.log('Test 1: Getting supported coins...');
        const coinsResponse = await handler({
            path: '/.netlify/functions/pool-api/coins',
            httpMethod: 'GET',
            headers: {},
            queryStringParameters: null,
            body: null
        });
        
        console.log('Status:', coinsResponse.statusCode);
        if (coinsResponse.statusCode === 200) {
            const data = JSON.parse(coinsResponse.body);
            console.log('✅ Found', data.coins.length, 'supported coins');
            data.coins.forEach(coin => {
                console.log(`  - ${coin.symbol} (${coin.name}): ${coin.pools.length} pools`);
            });
        } else {
            console.log('❌ Error:', coinsResponse.body);
        }

        console.log('\n' + '='.repeat(50) + '\n');

        // Test 2: Get profitability data
        console.log('Test 2: Getting profitability data...');
        const profitResponse = await handler({
            path: '/.netlify/functions/pool-api/profitability',
            httpMethod: 'GET',
            headers: {},
            queryStringParameters: null,
            body: null
        });
        
        console.log('Status:', profitResponse.statusCode);
        if (profitResponse.statusCode === 200) {
            const data = JSON.parse(profitResponse.body);
            console.log('✅ Profitability data retrieved for', data.coins.length, 'coins');
            data.coins.forEach(coin => {
                console.log(`  - ${coin.symbol}: ${coin.profitability} (${coin.algorithm})`);
            });
        } else {
            console.log('❌ Error:', profitResponse.body);
        }

        console.log('\n' + '='.repeat(50) + '\n');

        // Test 3: Get pool statistics
        console.log('Test 3: Getting pool statistics...');
        const statsResponse = await handler({
            path: '/.netlify/functions/pool-api/stats/pool',
            httpMethod: 'GET',
            headers: {},
            queryStringParameters: null,
            body: null
        });
        
        console.log('Status:', statsResponse.statusCode);
        if (statsResponse.statusCode === 200) {
            const data = JSON.parse(statsResponse.body);
            console.log('✅ Pool statistics retrieved:');
            console.log(`  - Total Miners: ${data.totalMiners}`);
            console.log(`  - Total Hashrate: ${data.totalHashrate} MH/s`);
            console.log(`  - Recent Shares: ${data.recentShares}`);
            console.log(`  - Pending Payments: $${data.pendingPayments}`);
        } else {
            console.log('❌ Error:', statsResponse.body);
        }

        console.log('\n' + '='.repeat(50) + '\n');

        // Test 4: Test miner registration
        console.log('Test 4: Testing miner registration...');
        const registerResponse = await handler({
            path: '/.netlify/functions/pool-api/miners/register',
            httpMethod: 'POST',
            headers: { 'Content-Type': 'application/json' },
            queryStringParameters: null,
            body: JSON.stringify({
                email: 'testminer@example.com',
                username: 'testminer1',
                walletAddr: '0x1234567890abcdef1234567890abcdef12345678',
                minerName: 'Test Mining Rig',
                gpuModel: 'RTX 4090',
                gpuCount: 2,
                location: 'Test Location'
            })
        });
        
        console.log('Status:', registerResponse.statusCode);
        if (registerResponse.statusCode === 201) {
            const data = JSON.parse(registerResponse.body);
            console.log('✅ Miner registered successfully:');
            console.log(`  - User: ${data.user.username} (${data.user.email})`);
            console.log(`  - Miner: ${data.miner.name} (${data.miner.minerId})`);
            console.log(`  - Status: ${data.miner.status}`);
        } else {
            console.log('❌ Error:', registerResponse.body);
        }

        console.log('\n🎉 API testing completed!\n');

    } catch (error) {
        console.error('❌ Test failed:', error.message);
        if (error.stack) {
            console.error('\nStack trace:');
            console.error(error.stack);
        }
    }
}

// Run the test
testAPI();