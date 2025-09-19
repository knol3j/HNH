# HashNHedge Computing Marketplace API Documentation

## Overview

HashNHedge provides a **dynamic computing marketplace** where GPU/CPU resources can be allocated for various computational tasks including:

- 💰 **Cryptocurrency Mining**
- 🔐 **Hashcat/Password Recovery**
- 🤖 **AI Training & Machine Learning**
- ⚡ **General Computing Tasks**

## 🚀 Quick Start

### For Miners/Workers
1. Deploy the `adaptive-miner-client.js` on your machines
2. Configure capabilities (mining, hashcat, AI training, etc.)
3. Connect to pool and start earning

### For Companies/Clients
1. Get API key from HashNHedge
2. Submit computing jobs via REST API
3. Monitor progress and retrieve results

## 📡 API Endpoints

### External Client API

Base URL: `https://hashnhedge.netlify.app/external-api`

#### Authentication
All requests require an API key in the header:
```
X-API-Key: your_api_key_here
```

#### 1. Submit Computing Job
```
POST /external-api/compute/submit
```

**Request Body:**
```json
{
  "jobType": "hashcat|ai-training|general-compute|data-processing",
  "description": "Job description",
  "requirements": {
    "gpus": 2,
    "cpus": 8,
    "memory": "16GB",
    "storage": "100GB"
  },
  "data": {
    "hashType": "MD5",
    "targetHash": "5d41402abc4b2a76b9719d911017c592",
    "wordlist": "rockyou.txt"
  },
  "priority": "normal|high|urgent",
  "maxDuration": 24,
  "budget": 50.00,
  "webhookUrl": "https://your-site.com/webhook"
}
```

**Response:**
```json
{
  "success": true,
  "jobId": "ext_1695081600000_abc123",
  "estimatedCost": 45.50,
  "status": "queued",
  "queuePosition": 3,
  "estimatedStartTime": "2023-09-19T10:30:00Z"
}
```

#### 2. Check Job Status
```
GET /external-api/compute/status?jobId=ext_1695081600000_abc123
```

**Response:**
```json
{
  "jobId": "ext_1695081600000_abc123",
  "status": "running",
  "progress": 45,
  "assignedWorkers": 3,
  "createdAt": 1695081600000,
  "startedAt": 1695082200000,
  "estimatedCompletion": "2023-09-19T12:00:00Z",
  "cost": 45.50,
  "description": "Hashcat password recovery"
}
```

#### 3. Get Job Results
```
GET /external-api/compute/results?jobId=ext_1695081600000_abc123
```

**Response:**
```json
{
  "jobId": "ext_1695081600000_abc123",
  "status": "completed",
  "results": {
    "found": true,
    "plaintext": "password123",
    "attempts": 847392,
    "executionTime": "00:23:45"
  },
  "completedAt": 1695083700000,
  "totalCost": 42.30,
  "executionTime": 1427000
}
```

#### 4. Check Resource Availability
```
GET /external-api/resources/availability
```

**Response:**
```json
{
  "totalWorkers": 150,
  "resources": {
    "gpus": {
      "total": 300,
      "nvidia": 180,
      "amd": 120,
      "available": 85
    },
    "cpus": {
      "totalCores": 2400,
      "availableCores": 1200
    }
  },
  "capabilities": {
    "hashcat": 120,
    "aiTraining": 80,
    "generalCompute": 150
  },
  "estimatedWaitTime": 15,
  "currentLoad": 0.65
}
```

#### 5. Get Pricing Information
```
GET /external-api/pricing
```

**Response:**
```json
{
  "base": {
    "gpu_hour": 0.50,
    "cpu_hour": 0.10,
    "hashcat_job": 5.00,
    "ai_training_hour": 2.00,
    "data_processing_gb": 0.05
  },
  "enterprise": {
    "gpu_hour": 0.40,
    "cpu_hour": 0.08,
    "volume_discount": 0.20
  },
  "bulk_discounts": [
    { "min_hours": 100, "discount": 0.10 },
    { "min_hours": 500, "discount": 0.20 }
  ],
  "priority_multipliers": {
    "low": 0.80,
    "normal": 1.00,
    "high": 1.50,
    "urgent": 2.00
  }
}
```

#### 6. Cancel Job
```
POST /external-api/compute/cancel
```

**Request Body:**
```json
{
  "jobId": "ext_1695081600000_abc123"
}
```

### Marketplace API (Internal)

Base URL: `https://hashnhedge.netlify.app/marketplace`

#### 1. Get Available Jobs
```
GET /marketplace/jobs
```

#### 2. Create Job
```
POST /marketplace/jobs
```

#### 3. Allocate Resources
```
POST /marketplace/allocate
```

## 💻 Job Types

### 🔐 Hashcat Jobs
Perfect for password recovery, hash cracking, and security testing.

**Example Configuration:**
```json
{
  "jobType": "hashcat",
  "data": {
    "hashType": "MD5",
    "targetHash": "5d41402abc4b2a76b9719d911017c592",
    "wordlist": "rockyou.txt",
    "rules": "best64.rule",
    "mask": "?l?l?l?l?d?d?d?d"
  },
  "requirements": {
    "gpus": 2,
    "cpus": 4
  }
}
```

### 🤖 AI Training Jobs
Machine learning model training with GPU acceleration.

**Example Configuration:**
```json
{
  "jobType": "ai-training",
  "data": {
    "modelType": "CNN",
    "dataset": "CIFAR-10",
    "epochs": 100,
    "batchSize": 32,
    "learningRate": 0.001
  },
  "requirements": {
    "gpus": 4,
    "cpus": 8,
    "memory": "32GB"
  }
}
```

### ⚡ General Computing
Any computational task that can be parallelized.

**Example Configuration:**
```json
{
  "jobType": "general-compute",
  "data": {
    "operation": "monte_carlo_simulation",
    "iterations": 1000000,
    "parameters": {
      "samples": 100000,
      "precision": 0.001
    }
  },
  "requirements": {
    "cpus": 16,
    "memory": "16GB"
  }
}
```

## 🔧 Miner Configuration

### Basic Setup
```javascript
const config = {
  poolUrl: 'https://hashnhedge.netlify.app',
  walletAddress: 'YOUR_SOLANA_WALLET_ADDRESS',
  workerName: 'my_worker_001',
  capabilities: {
    mining: true,
    hashcat: true,
    aiTraining: false,
    generalCompute: true
  }
};

const miner = new AdaptiveMinerClient(config);
miner.start();
```

### Capability Detection
The client automatically detects:
- GPU vendor (NVIDIA/AMD)
- GPU count
- CPU cores
- Available capabilities

## 💰 Pricing Model

### Base Rates
- **GPU Hour**: $0.50
- **CPU Hour**: $0.10
- **Hashcat Job**: $5.00 flat rate
- **AI Training**: $2.00/hour

### Discounts
- **Volume**: 10-30% for bulk hours
- **Priority**: 20% discount for low priority
- **Enterprise**: Up to 20% discount

### Payment
- Credits system for API clients
- HNH token rewards for miners
- Automatic billing and refunds

## 🔐 Security Features

### Rate Limiting
- External API: 100 req/min
- Marketplace: 30 req/min
- Mining: 120 req/min

### Authentication
- API key authentication
- Solana wallet verification
- Bearer token support

### Monitoring
- Real-time security logs
- Suspicious activity detection
- DDoS protection

## 📊 Use Cases

### 1. Password Recovery Services
Companies can submit hash cracking jobs for:
- Forgotten password recovery
- Security auditing
- Penetration testing

### 2. AI/ML Companies
Startups and enterprises can access GPU power for:
- Model training
- Hyperparameter tuning
- Data processing

### 3. Research Institutions
Academic research requiring:
- Scientific simulations
- Data analysis
- Computational experiments

### 4. Cryptocurrency Mining
Automatic fallback to mining when no other jobs are available.

## 🚀 Getting Started

### For Developers
1. Request API key at: https://hashnhedge.netlify.app
2. Review pricing: GET `/external-api/pricing`
3. Check availability: GET `/external-api/resources/availability`
4. Submit test job: POST `/external-api/compute/submit`

### For Miners
1. Download: `adaptive-miner-client.js`
2. Configure wallet and capabilities
3. Run: `node adaptive-miner-client.js`
4. Monitor earnings on dashboard

## 📞 Support

- **Documentation**: https://hashnhedge.netlify.app/docs
- **API Status**: https://hashnhedge.netlify.app/pool-api-status.html
- **Dashboard**: https://hashnhedge.netlify.app/compute-marketplace.html
- **Issues**: https://github.com/knol3j/HNH/issues

---

**HashNHedge** - *Your Computing Power, Monetized*