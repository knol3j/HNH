# HashNHedge AWS Mining Quick Start

Connect your AWS instances to the HashNHedge mining pool and start earning HNH tokens!

## 🎯 Your AWS Instances

- **Instance 1**: `35.160.120.126`
- **Instance 2**: `44.233.151.27`
- **Instance 3**: `34.211.200.85`

## 🚀 Quick Deployment

### Option 1: Automatic Deployment (Recommended)

```bash
# Set your wallet address
export WALLET_ADDRESS="your_solana_wallet_address_here"

# Deploy to all instances at once
chmod +x deploy-aws-miners.sh
./deploy-aws-miners.sh
```

### Option 2: Manual Setup Per Instance

```bash
# Copy setup script to each instance
scp aws-miner-setup.sh ubuntu@35.160.120.126:/tmp/
scp aws-miner-setup.sh ubuntu@44.233.151.27:/tmp/
scp aws-miner-setup.sh ubuntu@34.211.200.85:/tmp/

# SSH to each instance and run setup
ssh ubuntu@35.160.120.126
chmod +x /tmp/aws-miner-setup.sh
WALLET_ADDRESS="your_wallet_here" /tmp/aws-miner-setup.sh
```

## ⚙️ Configuration

Each miner will automatically:

- ✅ **Detect instance info** (ID, type, zone)
- ✅ **Connect to pool** at `https://hashnhedge-pool.onrender.com`
- ✅ **Generate unique worker names** like `aws-i-1234567890abcdef0-t3.medium`
- ✅ **Start mining immediately**
- ✅ **Auto-restart** if the service crashes

## 📊 Monitoring

### Pool Dashboard
- **Live Stats**: https://hashnhedge.com/pool-dashboard.html
- **API Endpoint**: https://hashnhedge-pool.onrender.com/api/stats

### Individual Miners

```bash
# Check miner status
sudo systemctl status hashnhedge-miner

# View live logs
sudo journalctl -f -u hashnhedge-miner

# Restart miner
sudo systemctl restart hashnhedge-miner

# Stop miner
sudo systemctl stop hashnhedge-miner
```

## 💰 Earnings

- **Reward**: 1 HNH token per valid share
- **Payout**: Instant to your Solana wallet
- **Pool Fee**: 3%

## 🛠️ Manual Commands

```bash
# Start mining manually
cd ~/hashnhedge-miner
./start-miner.sh

# Edit configuration
nano ~/hashnhedge-miner/config.json

# Test pool connection
curl https://hashnhedge-pool.onrender.com/api/stats
```

## 🔧 Troubleshooting

### Connection Issues
```bash
# Test internet connectivity
ping hashnhedge-pool.onrender.com

# Check if Node.js is installed
node --version
npm --version
```

### Performance Tuning
```bash
# Check CPU usage
htop

# Adjust miner intensity (in config.json)
{
  "intensity": 50  // Lower = less CPU usage
}
```

### View Configuration
```bash
# Show current miner config
cat ~/hashnhedge-miner/config.json

# Show instance information
curl -s http://169.254.169.254/latest/meta-data/instance-id
curl -s http://169.254.169.254/latest/meta-data/instance-type
```

## 📈 Expected Performance

| Instance Type | Expected Hashrate | Daily HNH Earnings* |
|--------------|------------------|-------------------|
| t3.micro     | ~100 H/s        | 50-100 HNH       |
| t3.small     | ~200 H/s        | 100-200 HNH      |
| t3.medium    | ~400 H/s        | 200-400 HNH      |
| c5.large     | ~800 H/s        | 400-800 HNH      |

*Earnings depend on network difficulty and luck

## ⚡ Quick Commands Reference

```bash
# Deploy everything
WALLET_ADDRESS="your_wallet" ./deploy-aws-miners.sh

# Check all miners
for ip in 35.160.120.126 44.233.151.27 34.211.200.85; do
  echo "=== $ip ==="
  ssh ubuntu@$ip "sudo systemctl status hashnhedge-miner --no-pager"
done

# View pool dashboard
curl -s https://hashnhedge-pool.onrender.com/api/stats | jq
```

Happy mining! 🚀⛏️💰