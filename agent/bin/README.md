# HashNHedge Miner Scripts

This directory contains standalone mining scripts for each supported cryptocurrency. Each coin has its own unique script optimized for the specific algorithm and miner software.

## Supported Coins and Mining Scripts

### CPU Mining

| Coin             | Script                                   | Algorithm | Miner | Notes           |
| ---------------- | ---------------------------------------- | --------- | ----- | --------------- |
| **XMR (Monero)** | `start_xmr_cpu.bat` / `start_xmr_cpu.sh` | RandomX   | XMRig | CPU-only mining |

### GPU Mining (NVIDIA)

| Coin                       | Script                                   | Algorithm | Miner | Notes            |
| -------------------------- | ---------------------------------------- | --------- | ----- | ---------------- |
| **RVN (Ravencoin)**        | `start_rvn_gpu.bat` / `start_rvn_gpu.sh` | KawPow    | T-Rex | NVIDIA optimized |
| **ETC (Ethereum Classic)** | `start_etc_gpu.bat` / `start_etc_gpu.sh` | Etchash   | T-Rex | NVIDIA optimized |

### GPU Mining (AMD/NVIDIA)

| Coin            | Script                                   | Algorithm  | Miner    | Notes                 |
| --------------- | ---------------------------------------- | ---------- | -------- | --------------------- |
| **ERG (Ergo)**  | `start_erg_gpu.bat` / `start_erg_gpu.sh` | Autolykos2 | lolMiner | Works on AMD & NVIDIA |
| **KAS (Kaspa)** | `start_kas_gpu.bat` / `start_kas_gpu.sh` | kHeavyHash | lolMiner | Works on AMD & NVIDIA |

## Quick Start

### Windows

1. **Install Required Binaries:**

   ```powershell
   cd agent
   .\setup_miners.ps1
   ```

2. **Edit Wallet Addresses:**
   Open the desired script (e.g., `start_xmr_cpu.bat`) in a text editor and replace:

   ```batch
   set WALLET=YOUR_XMR_WALLET_ADDRESS
   ```

3. **Run the Script:**
   Double-click the script file or run from command prompt.

### Linux/macOS

1. **Install Required Binaries:**

   ```bash
   cd agent
   chmod +x setup_miners.ps1
   pwsh setup_miners.ps1  # or use PowerShell Core
   ```

2. **Edit Wallet Addresses:**
   Open the desired script (e.g., `start_xmr_cpu.sh`) in a text editor and replace:

   ```bash
   WALLET="YOUR_XMR_WALLET_ADDRESS"
   ```

3. **Make Executable and Run:**

   ```bash
   chmod +x start_xmr_cpu.sh
   ./start_xmr_cpu.sh
   ```

## Script Details

### XMR (Monero) - CPU Mining

**File:** `start_xmr_cpu.bat` / `start_xmr_cpu.sh`  
**Miner:** XMRig v6.22.2  
**Algorithm:** RandomX (CPU optimized)  
**Default Pool:** `stratum+ssl://pool.supportxmr.com:443`

**Features:**

- CPU-only mining
- HTTP API for monitoring (port 4444)
- Configurable donation level
- Automatic hashrate reporting

### RVN (Ravencoin) - GPU Mining

**File:** `start_rvn_gpu.bat` / `start_rvn_gpu.sh`  
**Miner:** T-Rex v0.26.8  
**Algorithm:** KawPow (GPU - NVIDIA optimized)  
**Default Pool:** `stratum+tcp://stratum.ravenminer.com:3838`

**Features:**

- NVIDIA GPU optimization
- HTTP API for monitoring (port 4067)
- No watchdog (safer for automation)
- Worker ID support

### ETC (Ethereum Classic) - GPU Mining

**File:** `start_etc_gpu.bat` / `start_etc_gpu.sh`  
**Miner:** T-Rex v0.26.8  
**Algorithm:** Etchash (GPU - NVIDIA optimized)  
**Default Pool:** `stratum+tcp://etc.2miners.com:1010`

**Features:**

- NVIDIA GPU optimization
- HTTP API for monitoring (port 4068)
- DAG file handling automatic
- Worker ID support

### ERG (Ergo) - GPU Mining

**File:** `start_erg_gpu.bat` / `start_erg_gpu.sh`  
**Miner:** lolMiner v1.82  
**Algorithm:** Autolykos2 (GPU - AMD/NVIDIA)  
**Default Pool:** `stratum+tcp://de.ergo.herominers.com:11800`

**Features:**

- Works on both AMD and NVIDIA GPUs
- HTTP API for monitoring (port 4069)
- Automatic memory optimization
- Worker ID support

### KAS (Kaspa) - GPU Mining

**File:** `start_kas_gpu.bat` / `start_kas_gpu.sh`  
**Miner:** lolMiner v1.82  
**Algorithm:** kHeavyHash (GPU - AMD/NVIDIA)  
**Default Pool:** `stratum+tcp://kas.2miners.com:2020`

**Features:**

- Works on both AMD and NVIDIA GPUs
- High hashrate potential
- HTTP API for monitoring (port 4070)
- Worker ID support

## Configuration Options

Each script contains the following configurable options:

| Variable   | Description                      | Example                     |
| ---------- | -------------------------------- | --------------------------- |
| `WALLET`   | Your wallet address for the coin | `0x1234...`                 |
| `POOL`     | Stratum pool URL                 | `stratum+tcp://pool:port`   |
| `WORKER`   | Worker identifier                | `hnh_worker`                |
| `PASSWORD` | Pool password (usually x)        | `x`                         |

## API Ports

Each miner exposes an HTTP API for monitoring:

| Coin | Port | URL                     |
| ---- | ---- | ----------------------- |
| XMR  | 4444 | `http://127.0.0.1:4444` |
| RVN  | 4067 | `http://127.0.0.1:4067` |
| ETC  | 4068 | `http://127.0.0.1:4068` |
| ERG  | 4069 | `http://127.0.0.1:4069` |
| KAS  | 4070 | `http://127.0.0.1:4070` |

## Troubleshooting

### Binary Not Found

Make sure you've run `setup_miners.ps1` to download all required miner binaries.

### Antivirus Warnings

Mining software is often flagged by antivirus software. Add an exclusion for the `agent/bin` folder if files are quarantined.

### Pool Connection Issues

- Verify your wallet address is correct
- Check pool status (pools may go offline)
- Ensure firewall allows outbound connections to pool ports

### Low Hashrate

- For GPU miners: Update NVIDIA/AMD drivers
- For CPU miner: Ensure CPU supports RandomX (Intel 2018+, AMD Ryzen 2019+)
- Check temperature and power limits

## File Structure

```text
agent/bin/
├── xmrig.exe              # XMRig binary (CPU miner)
├── t-rex.exe              # T-Rex binary (GPU miner - NVIDIA)
├── lolMiner.exe           # lolMiner binary (GPU miner - AMD/NVIDIA)
├── start_xmr_cpu.bat      # XMR Windows script
├── start_xmr_cpu.sh       # XMR Linux/macOS script
├── start_rvn_gpu.bat      # RVN Windows script
├── start_rvn_gpu.sh       # RVN Linux/macOS script
├── start_etc_gpu.bat      # ETC Windows script
├── start_etc_gpu.sh       # ETC Linux/macOS script
├── start_erg_gpu.bat      # ERG Windows script
├── start_erg_gpu.sh       # ERG Linux/macOS script
├── start_kas_gpu.bat      # KAS Windows script
└── start_kas_gpu.sh       # KAS Linux/macOS script
```

## Using with HashNHedge Agent

The HashNHedge agent can also manage mining through the API. See `agent/server.js` for more information on using the web interface or API to start/stop mining.

## License

This project includes third-party mining software. Each miner has its own license:

- XMRig: GPL v3
- T-Rex: MIT
- lolMiner: GPL v3

See individual miner repositories for full license details.
