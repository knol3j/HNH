# 🚀 Standalone Mining - No Browser Required

## Quick Start (Windows)

### Option 1: Double-Click Start (Easiest)
1. Navigate to the `agent` folder
2. Double-click `start_miner.bat`
3. Mining starts automatically with GPU defaults (Ravencoin/KawPow)

### Option 2: Command Line
```powershell
cd agent
node server.js
```

## Configuration

The miner runs on **http://localhost:4343** and can be controlled via:

### API Endpoints:
- `GET /status` - Check miner status
- `GET /stats` - Get mining statistics  
- `POST /start` - Start mining
- `POST /stop` - Stop mining
- `POST /config` - Update configuration

### Default Settings (GPU Mining):
- **Coin**: Ravencoin (RVN)
- **Algorithm**: KawPow (GPU-optimized)
- **Pool**: rvn.2miners.com:6060
- **Wallet**: Configure in `server.js` or via API

## Change Wallet Address

### Method 1: Edit server.js
Edit line 30 in `agent/server.js`:
```javascript
wallet: 'YOUR_RVN_WALLET_ADDRESS_HERE',
```

### Method 2: Via API (while running)
```powershell
# Start miner first, then:
curl -X POST http://localhost:4343/config -H "Content-Type: application/json" -d '{\"wallet\":\"YOUR_WALLET_ADDRESS\"}'
```

## Change Mining Algorithm/Coin

### GPU Algorithms (Recommended):
- **KawPow** - Ravencoin, Kaspa (Best for NVIDIA/AMD GPUs)
- **Etchash** - Ethereum Classic (GPU-friendly)

### CPU Algorithms:
- **RandomX** - Monero (CPU-only)

Edit `server.js` line 33:
```javascript
algorithm: 'kawpow'  // or 'etchash', 'randomx', 'autolykos2'
poolUrl: 'stratum+tcp://rvn.2miners.com:6060'  // Change pool URL
```

## Monitor Mining

### View Logs:
The miner outputs logs directly to the console. Watch for:
- Hashrate updates
- Share submissions
- Connection status

### Web Interface:
Once running, open browser to:
- **Status**: http://localhost:4343/status
- **Stats**: http://localhost:4343/stats

### XMRig API (Advanced):
- **Telemetry**: http://localhost:4444/2/summary
- **Access Token**: `antigravity_secret`

## Run as Background Service (Windows)

### Using NSSM (Non-Sucking Service Manager):
1. Download NSSM: https://nssm.cc/download
2. Install service:
```powershell
nssm install HashNHedgeMiner "C:\path\to\node.exe" "C:\path\to\agent\server.js"
nssm start HashNHedgeMiner
```

### Using Task Scheduler:
1. Open Task Scheduler
2. Create Basic Task
3. Trigger: "When computer starts"
4. Action: Start program
   - Program: `node.exe`
   - Arguments: `C:\path\to\agent\server.js`
   - Start in: `C:\path\to\agent`

## Troubleshooting

### Miner won't start:
- Check if XMRig binary exists: `agent/bin/xmrig.exe`
- Run setup: `.\setup_miner_windows.ps1`
- Check firewall allows port 4343

### GPU not detected:
- Install NVIDIA CUDA Toolkit (for NVIDIA GPUs)
- Install AMD OpenCL drivers (for AMD GPUs)
- XMRig will fall back to CPU if GPU unavailable

### Low hashrate:
- Ensure GPU drivers are up to date
- Check GPU temperature/thermal throttling
- Try different pool (some pools have higher latency)

### Port already in use:
- Change PORT in `server.js` (line 16)
- Or stop other service using port 4343

## Supported Coins & Pools

### GPU Mining (Recommended):
- **Ravencoin (RVN)**: KawPow algorithm
  - Pool: `stratum+tcp://rvn.2miners.com:6060`
- **Ethereum Classic (ETC)**: Etchash algorithm  
  - Pool: `stratum+tcp://us.etchash-pool.2miners.com:1010`
- **Kaspa (KAS)**: KawPow algorithm
  - Pool: `stratum+tcp://kas.2miners.com:2020`
- **Ergo (ERG)**: Autolykos2 algorithm
  - Pool: `stratum+tcp://erg.2miners.com:8888`

### CPU Mining:
- **Monero (XMR)**: RandomX algorithm
  - Pool: `stratum+tcp://xmr.2miners.com:2222`

## Security Notes

- Never share your wallet address publicly
- The miner runs locally - no data sent to external servers except pool
- Platform fees are calculated but not automatically deducted (manual process)
