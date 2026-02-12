# HNH Agent Miner — Quick Start Guide

## Prerequisites

- **Node.js** (v18+) — [Download](https://nodejs.org/)
- **Windows 10/11** (64-bit) or **Linux** (64-bit)
- **AntiVirus Exclusion**: Add the `agent/` folder to your AV exclusion list. Mining software is commonly flagged as a false positive.

---

## Option A: Automated Setup (Recommended)

### Windows

1. Extract this zip to a folder (e.g. `C:\HNH-Agent\`)
2. Right-click `setup_miner_windows.ps1` → **Run with PowerShell**
   - This will download miner binaries, install Node dependencies, and prompt you for wallet addresses
3. Double-click `start_miner.bat` to start mining!

### Linux

1. Extract this zip to a folder
2. Run: `chmod +x setup_miner.sh && ./setup_miner.sh`
3. Run: `node server.js`

---

## Option B: Manual Setup

1. Extract this zip to a folder
2. If you downloaded the **Miner Binaries** package, extract it into the `bin/` subfolder
3. Run `npm install` to install Node dependencies
4. Copy `.env.example` to `.env` and fill in your settings
5. Run `node server.js` or double-click `start_miner.bat`

---

## Configuration

During setup you'll be prompted for:

- **Wallet addresses** for each coin (XMR, RVN, ETC, ERG, KAS)
- **GPU Mining** — enable if you have a dedicated GPU

Your config is saved to `data.json`. Edit it anytime and restart the miner.

---

## Supported Coins & Miners

| Coin | Algorithm | Miner Binary |
|------|-----------|-------------|
| XMR  | RandomX   | xmrig       |
| RVN  | KawPow    | t-rex       |
| ETC  | Etchash   | t-rex       |
| ERG  | Autolykos | lolMiner    |
| KAS  | kHeavyHash| lolMiner    |

---

## Troubleshooting

- **"Miner binary not found"** → Run the setup script, or manually place miners in `bin/`
- **Windows Defender blocks files** → Add an exclusion for the agent folder
- **Port 4343 in use** → Another instance may be running. Kill it first.

## Support

Visit [hashnhedge.com](https://hashnhedge.com) or open a GitHub issue.
