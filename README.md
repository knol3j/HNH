<div align="center">

# HashNHedge

### Cryptocurrency Mining Platform

![GHBanner](https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6)

---

[![Status](https://img.shields.io/badge/Status-Under%20Development-yellow?style=for-the-badge)](https://github.com)
[![License](https://img.shields.io/badge/License-Proprietary-red?style=for-the-badge)](https://github.com)

**Turn your idle computing power into cryptocurrency**

</div>

---

## What Is HashNHedge?

HashNHedge is a **cryptocurrency mining platform** that allows you to earn crypto by contributing your computer's processing power. The software uses your CPU and/or GPU to mine various cryptocurrencies including Monero (XMR), Ravencoin (RVN), Ethereum Classic (ETC), Ergo (ERG), and Kaspa (KAS).

### How It Works

1. **You install the mining agent** on your computer
2. **The agent runs XMRig** (open-source mining software) to perform mining calculations
3. **Your shares are tracked** and attributed to your account
4. **You earn cryptocurrency** proportional to your contribution

---

## Resource Usage Disclosure

**By using HashNHedge, you acknowledge and consent to the following:**

| Resource | Usage |
|----------|-------|
| **CPU** | Mining algorithms will utilize CPU cores (configurable) |
| **GPU** | Optional GPU mining for supported coins (higher earnings) |
| **Electricity** | Increased power consumption while mining |
| **Network** | Connection to mining pools for share submission |
| **Storage** | Local data storage for configuration and session tracking |

### Platform Fees

| Tier | Fee | Description |
|------|-----|-------------|
| Free | 2% | Standard platform fee on mining rewards |
| Pro | 1% | Reduced fee for subscribers |
| Enterprise | 0.5% | Lowest fee tier |

---

## Features

- **Multi-Coin Mining** — Automatically switch between profitable coins
- **Smart Pool Failover** — Seamless switching if a pool becomes unavailable
- **Real-Time Dashboard** — Monitor hashrate, earnings, and performance
- **Gamification** — Earn XP, unlock achievements, climb leaderboards
- **Referral Program** — Earn bonuses by inviting others
- **Wallet Management** — Configure addresses for multiple cryptocurrencies

---

## Getting Started

### Prerequisites
- Node.js 18+
- Windows, macOS, or Linux
- GPU drivers (optional, for GPU mining)

### Installation

```bash
git clone https://github.com/YOUR_USERNAME/HNH.git
cd HNH
npm install
```

### Configuration

1. Copy `.env.example` to `.env.local`
2. Set your API keys and configuration
3. Configure your wallet addresses in the dashboard

### Running the Platform

```bash
# Start the web dashboard
npm run dev

# Start the mining agent (Windows)
PowerShell -ExecutionPolicy Bypass -File .\agent\setup_miner_windows.ps1
```

---

## Consent & Opt-In

**Important:** By running the HashNHedge mining agent, you explicitly consent to:

- Allowing the software to use your CPU/GPU for cryptocurrency mining
- Network connections to mining pools
- Local storage of mining statistics and configuration
- Platform fee deduction from mining rewards

**You maintain full control:**
- Start and stop mining at any time
- Configure resource limits
- Choose which coins to mine
- Withdraw earnings to your own wallets

---

## Development Status

This project is under **active development**. Current focus areas:

- [ ] Enhanced profitability algorithms
- [ ] Mobile monitoring app
- [ ] Additional cryptocurrency support
- [ ] Advanced analytics dashboard
- [ ] Community governance features

---

## Security

- All mining operations run locally on your machine
- Your private keys never leave your device
- Open-source XMRig core for transparency
- See [SECURITY.md](SECURITY.md) for our security practices

---

## Support

Having issues? Check our documentation or open an issue.

---

<div align="center">

**HashNHedge** — *Mine smarter, earn more*

<sub>This software performs cryptocurrency mining operations. Ensure you understand the resource implications before running.</sub>

</div>
