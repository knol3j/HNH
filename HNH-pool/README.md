# HashNHedge Pool Backend 🚀

> **Mining Pool Server with Security Dashboard - Ready for Render Deployment**

This is the complete backend service for HashNHedge mining pool, configured for deployment on Render at **https://hashnhedge-pool.onrender.com**

## 🌐 Live Service

- **Website**: https://hashnhedge-pool.onrender.com
- **API**: https://hashnhedge-pool.onrender.com/api
- **Pool Stats**: https://hashnhedge-pool.onrender.com/api/stats
- **Security Dashboard**: https://hashnhedge-pool.onrender.com/security-dashboard.html

## ⚡ Quick Start

### Local Development
```bash
npm install
npm start
```

### Access Points
- **Website**: http://localhost:3001
- **API**: http://localhost:3001/api
- **Security Dashboard**: http://localhost:3001/security-dashboard.html

## 🔧 Configuration

### Environment Variables
```bash
NODE_ENV=production
PORT=10000
ADMIN_TOKEN=your-secure-token
SOLANA_NETWORK=devnet
POOL_FEE=3
REWARD_PER_SHARE=1
```

### Required Files
- `server.js` - Main server file
- `hnh-deployment.json` - HNH token configuration
- `package.json` - Dependencies and scripts

## 🚢 Render Deployment

### Automatic Deployment
1. Connect this repository to Render
2. Deploy from `/HNH-pool` folder
3. Render will automatically:
   - Run `npm install`
   - Start with `npm start`
   - Set environment variables
   - Generate admin token

## 📊 API Endpoints

### Public Endpoints
- `GET /` - Website homepage
- `GET /api` - API information
- `GET /api/stats` - Pool statistics
- `POST /api/miner/connect` - Miner registration
- `POST /api/miner/submit-share` - Share submission

### Admin Endpoints (Requires Auth)
- `GET /api/admin/security` - Security dashboard data
- `POST /api/admin/security-mode` - Toggle security mode

## 🔒 Security Features

### Active Protection
- **Rate Limiting**: 100 req/15min per IP
- **Input Validation**: Comprehensive validation
- **Security Headers**: Helmet.js protection
- **Admin Authentication**: Bearer token required

### Monitoring
- **Real-time Logging**: All security events tracked
- **Threat Detection**: 7 categories of threats
- **Security Dashboard**: Web-based monitoring

## 🌟 Features

### Mining Pool
- **Solana Integration**: HNH token rewards
- **Instant Payouts**: 1 HNH per valid share
- **Pool Statistics**: Real-time metrics

### Web Interface
- **Homepage**: Complete website served at root
- **Mining Interface**: Browser-based mining
- **Security Dashboard**: Admin monitoring

## 📁 File Structure

```
HNH-pool/
├── server.js                 # Main server application
├── package.json             # Dependencies and scripts
├── hnh-deployment.json      # HNH token configuration
├── render.yaml             # Render deployment config
├── index.html              # Homepage
├── start-mining.html       # Mining interface
├── security-dashboard.html  # Security monitoring
└── README.md              # This file
```

## 🧪 Testing

### Health Check
```bash
curl https://hashnhedge-pool.onrender.com/api/stats
```

## 🔑 Admin Access

### Security Dashboard
1. Navigate to `/security-dashboard.html`
2. Enter admin token (check server logs)
3. Monitor security events and system health

## Links
- **Website**: [hashnhedge.com](https://hashnhedge.com)
- **GitHub**: [knol3j/HNH](https://github.com/knol3j/HNH)

## License
Copyright 2024 HashNHedge. All rights reserved.
