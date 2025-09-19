# HashNHedge Platform 🚀

> **Decentralized GPU Computing Network with Advanced Security**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-16+-green.svg)](https://nodejs.org/)
[![Solana](https://img.shields.io/badge/Blockchain-Solana-purple.svg)](https://solana.com/)
[![Security](https://img.shields.io/badge/Security-Enhanced-red.svg)](./SECURITY.md)

## 🌟 Overview

HashNHedge is a revolutionary decentralized GPU computing network that enables users to:
- **Mine HNH Tokens** using CPU/GPU resources
- **Earn Rewards** through distributed computing tasks
- **Monitor Security** with real-time threat detection
- **Scale Operations** with federated GPU farms

## 🌍 Live Platform

### Production URLs
- **🌐 Main Website**: https://hashnhedge.com
- **⛏️ Mining Pool**: https://hashnhedge-pool.onrender.com
- **🔒 Security Dashboard**: https://hashnhedge.com/security-dashboard.html
- **📊 Pool Statistics**: https://hashnhedge-pool.onrender.com/api/stats

## ⚡ Quick Start (15 minutes to launch)

### Step 1: Setup (5 minutes)
```bash
# In PowerShell/Command Prompt, navigate to your folder:
cd C:\Users\gnul\hashnhedge

# Install dependencies
npm install
```

### Step 2: Deploy HNH Token (2 minutes)
```bash
# Deploy your token on Solana Devnet
node hnh-token-deploy.js

# You should see:
# ✅ HNH Token Mint Address: [your-token-address]
# 💾 Deployment info saved to hnh-deployment.json
```

### Step 3: Start Mining Pool (1 minute)
```bash
# Start the pool server
node mining-pool-server.js

# You should see:
# 🚀 HashNHedge Mining Pool Server Started!
# 🌐 Server: http://localhost:3001
# 🪙 HNH Token: [your-token-address]
```

### Step 4: Configure & Test Miner (7 minutes)
```bash
# Edit hashnhedge-miner.js file:
# Change line ~190: 
# walletAddress: "YOUR_ACTUAL_SOLANA_WALLET_ADDRESS"

# Start mining (in new terminal window)
node hashnhedge-miner.js

# You should see:
# ✅ Connected to HashNHedge pool successfully!
# ⛏️ Starting HashNHedge mining...
# ✅ Share accepted! HNH reward: 1
```

## 🎯 Success Indicators

✅ **Token Deployed**: `hnh-deployment.json` file created  
✅ **Pool Running**: http://localhost:3001/api/stats shows data  
✅ **Miner Working**: Console shows "Share accepted"  
✅ **HNH Distributed**: Miner earnings increase

## 📊 Monitor Your Pool

**Pool Stats**: http://localhost:3001/api/stats  
**Your Miner**: http://localhost:3001/api/miner/[your-wallet]

## 💰 Revenue Streams (Active Now!)

1. **Pool Fees**: 3% of all mining rewards
2. **HNH Token Value**: Your 1B tokens increase in value as more miners join
3. **White Label**: Sell this system to other mining operations

## 🔥 Next Steps (This Week)

1. **Test Everything**: Make sure all components work smoothly
2. **Get Beta Users**: Invite 5-10 friends to test mine
3. **Document Issues**: Note what works/breaks for improvements
4. **Add to Website**: Link from hashnhedge.com hamburger menu

## 🆘 Troubleshooting

**"Cannot find module"**: Run `npm install` first  
**"Deployment failed"**: Check internet connection, try again  
**"Miner won't connect"**: Make sure pool server is running  
**"Invalid wallet"**: Edit hashnhedge-miner.js with real Solana address

## 🎊 What You Just Built

- ✅ **Your own cryptocurrency** (HNH token on Solana)
- ✅ **Mining pool software** that distributes your tokens
- ✅ **Mining client** that users download
- ✅ **Revenue-generating system** (pool fees + token value)

## 📞 Support

If stuck:
1. Check console error messages
2. Ensure Node.js is installed
3. Verify all files are in C:\Users\gnul\hashnhedge
4. Try restarting everything

---

**You're now running a live cryptocurrency mining pool!** 🎉

This is a real, working system. Start with friends, grow gradually, and scale when ready.