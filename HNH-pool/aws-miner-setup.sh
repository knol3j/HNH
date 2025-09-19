#!/bin/bash

# HashNHedge AWS Mining Setup Script
# For connecting AWS instances to HashNHedge mining pool

echo "🚀 HashNHedge AWS Mining Setup"
echo "=============================="

# Configuration
POOL_URL="https://hashnhedge-pool.onrender.com"
WALLET_ADDRESS="${WALLET_ADDRESS:-YOUR_SOLANA_WALLET_ADDRESS_HERE}"

# Detect instance information
INSTANCE_ID=$(curl -s http://169.254.169.254/latest/meta-data/instance-id 2>/dev/null || echo "unknown")
INSTANCE_TYPE=$(curl -s http://169.254.169.254/latest/meta-data/instance-type 2>/dev/null || echo "unknown")
AVAILABILITY_ZONE=$(curl -s http://169.254.169.254/latest/meta-data/placement/availability-zone 2>/dev/null || echo "unknown")
LOCAL_IP=$(curl -s http://169.254.169.254/latest/meta-data/local-ipv4 2>/dev/null || echo "unknown")
PUBLIC_IP=$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4 2>/dev/null || echo "unknown")

WORKER_NAME="aws-${INSTANCE_ID}-${INSTANCE_TYPE}"

echo "📍 Instance Info:"
echo "   ID: $INSTANCE_ID"
echo "   Type: $INSTANCE_TYPE"
echo "   Zone: $AVAILABILITY_ZONE"
echo "   Local IP: $LOCAL_IP"
echo "   Public IP: $PUBLIC_IP"
echo "   Worker Name: $WORKER_NAME"
echo ""

# Check if wallet address is set
if [ "$WALLET_ADDRESS" = "YOUR_SOLANA_WALLET_ADDRESS_HERE" ]; then
    echo "❌ ERROR: Please set your wallet address!"
    echo "Usage: WALLET_ADDRESS=your_wallet_here ./aws-miner-setup.sh"
    echo "Or edit this script and replace YOUR_SOLANA_WALLET_ADDRESS_HERE"
    exit 1
fi

# Update system
echo "📦 Updating system packages..."
sudo apt update -qq

# Install Node.js and npm
echo "🔧 Installing Node.js..."
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
    sudo apt-get install -y nodejs
fi

# Install required packages
echo "📥 Installing dependencies..."
npm install axios

# Create miner directory
mkdir -p ~/hashnhedge-miner
cd ~/hashnhedge-miner

# Create configuration file
echo "⚙️ Creating configuration..."
cat > config.json << EOF
{
    "poolUrl": "$POOL_URL",
    "walletAddress": "$WALLET_ADDRESS",
    "workerName": "$WORKER_NAME",
    "cpuThreads": "auto",
    "intensity": 75,
    "instanceInfo": {
        "instanceId": "$INSTANCE_ID",
        "instanceType": "$INSTANCE_TYPE",
        "availabilityZone": "$AVAILABILITY_ZONE",
        "localIp": "$LOCAL_IP",
        "publicIp": "$PUBLIC_IP"
    }
}
EOF

# Create the miner script
echo "⛏️ Creating miner script..."
cat > hashnhedge-miner.js << 'EOF'
const axios = require('axios');
const crypto = require('crypto');
const os = require('os');
const fs = require('fs');

// Load configuration
const config = JSON.parse(fs.readFileSync('config.json', 'utf8'));

let isConnected = false;
let miningStats = {
    shares: 0,
    accepted: 0,
    rejected: 0,
    startTime: Date.now(),
    hashrate: 0
};

// Generate random hash (proof of work simulation)
function generateHash(difficulty = 4) {
    let hash;
    let nonce = 0;
    const start = Date.now();

    do {
        const data = `${config.walletAddress}-${Date.now()}-${nonce}`;
        hash = crypto.createHash('sha256').update(data).digest('hex');
        nonce++;
    } while (!hash.startsWith('0'.repeat(difficulty)));

    const time = Date.now() - start;
    miningStats.hashrate = Math.round(nonce / (time / 1000));

    return { hash, nonce, difficulty, time };
}

// Connect to pool
async function connectToPool() {
    try {
        console.log(`🔗 Connecting to pool: ${config.poolUrl}`);

        const response = await axios.post(`${config.poolUrl}/api/miner/connect`, {
            walletAddress: config.walletAddress,
            workerName: config.workerName,
            cpuThreads: os.cpus().length,
            instanceInfo: config.instanceInfo
        });

        console.log('✅ Connected to pool successfully!');
        console.log(`📊 Pool Stats:`, response.data);
        isConnected = true;

    } catch (error) {
        console.error('❌ Failed to connect to pool:', error.message);
        isConnected = false;
    }
}

// Submit share to pool
async function submitShare(hash, nonce, difficulty) {
    try {
        const response = await axios.post(`${config.poolUrl}/api/miner/submit-share`, {
            walletAddress: config.walletAddress,
            workerName: config.workerName,
            hash: hash,
            nonce: nonce,
            difficulty: difficulty,
            timestamp: Date.now()
        });

        if (response.data.accepted) {
            miningStats.accepted++;
            console.log(`✅ Share accepted! Total: ${miningStats.accepted} | Reward: ${response.data.reward} HNH`);
        } else {
            miningStats.rejected++;
            console.log(`❌ Share rejected. Reason: ${response.data.reason}`);
        }

    } catch (error) {
        console.error('⚠️ Failed to submit share:', error.message);
        miningStats.rejected++;
    }
}

// Display mining stats
function displayStats() {
    const runtime = Math.floor((Date.now() - miningStats.startTime) / 1000);
    const hours = Math.floor(runtime / 3600);
    const minutes = Math.floor((runtime % 3600) / 60);
    const seconds = runtime % 60;

    console.log('\n📊 Mining Statistics:');
    console.log(`⏰ Runtime: ${hours}h ${minutes}m ${seconds}s`);
    console.log(`⛏️ Hashrate: ${miningStats.hashrate} H/s`);
    console.log(`📈 Shares: ${miningStats.shares} | Accepted: ${miningStats.accepted} | Rejected: ${miningStats.rejected}`);
    console.log(`🏆 Success Rate: ${miningStats.shares > 0 ? Math.round((miningStats.accepted / miningStats.shares) * 100) : 0}%`);
    console.log(`💰 Estimated Earnings: ${miningStats.accepted} HNH`);
    console.log('');
}

// Main mining loop
async function startMining() {
    console.log('🚀 Starting HashNHedge miner...');
    console.log(`👷 Worker: ${config.workerName}`);
    console.log(`💼 Wallet: ${config.walletAddress}`);
    console.log(`🖥️ CPUs: ${os.cpus().length}`);
    console.log('');

    await connectToPool();

    if (!isConnected) {
        console.log('❌ Cannot start mining without pool connection');
        process.exit(1);
    }

    // Stats display interval
    setInterval(displayStats, 30000);

    // Mining loop
    while (true) {
        try {
            const result = generateHash(4);
            miningStats.shares++;

            console.log(`⛏️ Found share: ${result.hash.substring(0, 16)}... (nonce: ${result.nonce})`);

            await submitShare(result.hash, result.nonce, result.difficulty);

            // Small delay to prevent overwhelming the server
            await new Promise(resolve => setTimeout(resolve, 1000));

        } catch (error) {
            console.error('💥 Mining error:', error.message);
            await new Promise(resolve => setTimeout(resolve, 5000));
        }
    }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
    console.log('\n⏹️ Shutting down miner...');
    displayStats();
    process.exit(0);
});

// Start mining
startMining();
EOF

# Create start script
echo "🚀 Creating start script..."
cat > start-miner.sh << 'EOF'
#!/bin/bash
echo "🚀 Starting HashNHedge Miner..."
echo "Press Ctrl+C to stop"
echo ""

cd ~/hashnhedge-miner
node hashnhedge-miner.js
EOF

chmod +x start-miner.sh

# Create systemd service for auto-start
echo "🔧 Creating systemd service..."
sudo tee /etc/systemd/system/hashnhedge-miner.service > /dev/null << EOF
[Unit]
Description=HashNHedge Miner
After=network.target

[Service]
Type=simple
User=$USER
WorkingDirectory=/home/$USER/hashnhedge-miner
ExecStart=/usr/bin/node hashnhedge-miner.js
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

# Enable service
sudo systemctl daemon-reload
sudo systemctl enable hashnhedge-miner

echo ""
echo "✅ Setup complete!"
echo ""
echo "🎯 Next steps:"
echo "1. Start mining: ./start-miner.sh"
echo "2. Or use systemd: sudo systemctl start hashnhedge-miner"
echo "3. Check status: sudo systemctl status hashnhedge-miner"
echo "4. View logs: sudo journalctl -f -u hashnhedge-miner"
echo ""
echo "📊 Pool dashboard: https://hashnhedge.com/pool-dashboard.html"
echo "🔧 Configuration file: ~/hashnhedge-miner/config.json"
echo ""
echo "Happy mining! ⛏️"
EOF