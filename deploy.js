const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3001;

// Production middleware
app.use(cors());
app.use(express.json());
app.use(express.static('.'));

// Security headers for production
app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    next();
});

// Pre-launch testnet data
let networkData = {
    totalNodes: 12,
    activeGPUs: 28,
    totalTFLOPS: 4.2,
    networkUtilization: 45.8,
    rewardsDistributed: 0,
    uptime: 99.2,
    phase: "testnet",
    tokenLaunched: false
};

let farmData = [
    { id: 1, name: "Dev Team Alpha Node", gpus: 8, location: "Development Lab", status: "online", owner: "0x742d...bEb7", type: "testnet" },
    { id: 2, name: "Partner Beta Node", gpus: 12, location: "Early Partner", status: "online", owner: "0x123a...4567", type: "testnet" },
    { id: 3, name: "Testing Node Gamma", gpus: 4, location: "QA Environment", status: "testing", owner: "0x890b...cdef", type: "testnet" },
    { id: 4, name: "Research Node Delta", gpus: 4, location: "R&D Lab", status: "online", owner: "0x456c...789e", type: "testnet" }
];

let nodeData = [
    { id: "TESTNET-001", status: "active", hashRate: 25, earnings: 0, tasks: 8, type: "development" },
    { id: "TESTNET-002", status: "active", hashRate: 18, earnings: 0, tasks: 5, type: "partner" },
    { id: "TESTNET-003", status: "testing", hashRate: 12, earnings: 0, tasks: 3, type: "qa" },
    { id: "TESTNET-004", status: "active", hashRate: 20, earnings: 0, tasks: 6, type: "research" }
];

// API Routes
app.get('/api/network-stats', (req, res) => {
    networkData.totalNodes = Math.max(8, Math.min(15, networkData.totalNodes + Math.floor((Math.random() - 0.5) * 2)));
    networkData.activeGPUs = Math.max(20, Math.min(35, networkData.activeGPUs + Math.floor((Math.random() - 0.5) * 3)));
    networkData.totalTFLOPS = Math.max(3.0, Math.min(6.0, networkData.totalTFLOPS + (Math.random() - 0.5) * 0.5));
    networkData.networkUtilization = Math.max(30, Math.min(70, networkData.networkUtilization + (Math.random() - 0.5) * 3));
    res.json(networkData);
});

app.get('/api/farms', (req, res) => {
    res.json(farmData);
});

app.post('/api/farms', (req, res) => {
    const { name, location, gpuCount, gpuType } = req.body;
    const newFarm = {
        id: farmData.length + 1,
        name,
        gpus: parseInt(gpuCount),
        location,
        status: "pending",
        gpuType,
        owner: req.body.wallet || "0x000...000",
        type: "testnet"
    };
    farmData.push(newFarm);
    res.json({ success: true, farm: newFarm });
});

app.get('/api/nodes', (req, res) => {
    res.json(nodeData);
});

app.get('/api/revenue-data', (req, res) => {
    const { gpuType, gpuCount, hoursPerDay } = req.query;
    const hashRates = { '4090': 150, '3090': 120, '3080': 100, '3070': 60, '3060ti': 45, 'cpu': 0.5 };
    const powerUsage = { '4090': 450, '3090': 350, '3080': 320, '3070': 220, '3060ti': 200, 'cpu': 100 };

    const electricityCost = 0.12;
    const revenuePerMH = 0.85;
    const revenueShare = 0.70;

    const totalHashRate = hashRates[gpuType] * parseInt(gpuCount);
    const dailyRevenue = totalHashRate * revenuePerMH * (parseInt(hoursPerDay) / 24) * revenueShare;
    const totalPower = (powerUsage[gpuType] * parseInt(gpuCount)) / 1000;
    const dailyElectricity = totalPower * parseInt(hoursPerDay) * electricityCost;
    const dailyProfit = dailyRevenue - dailyElectricity;

    res.json({
        dailyRevenue: dailyRevenue.toFixed(2),
        dailyProfit: dailyProfit.toFixed(2),
        weeklyRevenue: (dailyProfit * 7).toFixed(2),
        monthlyRevenue: (dailyProfit * 30).toFixed(2),
        yearlyRevenue: (dailyProfit * 365).toFixed(2),
        hashRate: totalHashRate,
        powerConsumption: totalPower
    });
});

app.get('/api/token-info', (req, res) => {
    res.json({
        name: "HashNHedge Token",
        symbol: "HNH",
        totalSupply: "1000000000",
        circulatingSupply: "0",
        price: "Not Yet Listed",
        marketCap: "Pre-Launch",
        holders: 0,
        contractAddress: "Not Yet Deployed"
    });
});

app.post('/api/connect-wallet', (req, res) => {
    setTimeout(() => {
        res.json({
            success: true,
            address: "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb7",
            balance: { SOL: "12.45", HNH: "0.00" }
        });
    }, 1500);
});

app.post('/api/deploy-token', (req, res) => {
    const { tokenName, symbol, totalSupply, decimals } = req.body;
    setTimeout(() => {
        res.json({
            success: true,
            tokenAddress: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
            transactionHash: "5J8g7K2HnRp9WqBvX3mN8LtYq4CzDf6AaEe1GgHhJjKk",
            deploymentCost: "0.05",
            tokenName, symbol, totalSupply
        });
    }, 3000);
});

app.get('/api/growth-data', (req, res) => {
    res.json({
        labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
        nodeGrowth: [2, 4, 6, 8, 10, 12],
        computeDistribution: {
            labels: ['Development', 'Testing', 'Research', 'Idle'],
            data: [40, 25, 20, 15]
        }
    });
});

// Serve static files
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('*', (req, res) => {
    const filePath = path.join(__dirname, req.path);
    if (fs.existsSync(filePath)) {
        res.sendFile(filePath);
    } else {
        res.status(404).sendFile(path.join(__dirname, 'index.html'));
    }
});

app.listen(PORT, () => {
    console.log(`🚀 HashNHedge Production Server running on port ${PORT}`);
    console.log(`📊 Ready for deployment at: https://your-domain.com`);
});