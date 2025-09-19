# HashNHedge Multi-Server Deployment Guide

## 🚀 Deployment Overview

Successfully configured HashNHedge dynamic computing marketplace for multi-server deployment across:

### Server Configuration
- **Local Network**: 192.168.254.2:3001 (Local Network Hub)
- **OnRender Primary**: 35.160.120.126:10000 (OnRender Primary)
- **OnRender Secondary**: 44.233.151.27:10000 (OnRender Secondary)
- **OnRender Tertiary**: 34.211.200.85:10000 (OnRender Tertiary)
- **Load Balancer**: 0.0.0.0:8081 (Manages all servers)

## 📁 Generated Files

### Deployment Scripts
All scripts are ready in `./deployment/` directory:
- `deploy-local.sh` - Local network deployment
- `deploy-onrender1.sh` - OnRender Primary server
- `deploy-onrender2.sh` - OnRender Secondary server
- `deploy-onrender3.sh` - OnRender Tertiary server

### Server Components
- `onrender-server.js` - Standalone OnRender pool server
- `deploy-multiserver.js` - Multi-server load balancer and manager
- `adaptive-miner-client.js` - Dynamic worker client

## 🌐 Deployment Process

### 1. Local Network Deployment
```bash
cd /path/to/hashnhedge-consolidated/HNH-pool
chmod +x deployment/deploy-local.sh
./deployment/deploy-local.sh
```

### 2. OnRender Server Deployment

**For each OnRender server** (35.160.120.126, 44.233.151.27, 34.211.200.85):

1. Upload project files to the server
2. Run the appropriate deployment script:
```bash
# OnRender Primary
chmod +x deployment/deploy-onrender1.sh
./deployment/deploy-onrender1.sh

# OnRender Secondary
chmod +x deployment/deploy-onrender2.sh
./deployment/deploy-onrender2.sh

# OnRender Tertiary
chmod +x deployment/deploy-onrender3.sh
./deployment/deploy-onrender3.sh
```

### 3. Start Load Balancer (Optional)
```bash
node deploy-multiserver.js
```

## 🔧 Configuration Details

### Environment Variables
Each server automatically sets:
- `NODE_ENV=production`
- `PORT` - Server specific port
- `SERVER_ID` - Unique server identifier
- `SERVER_NAME` - Human readable server name
- `SERVER_IP` - Server IP address

### Health Check Endpoints
- Local: `http://192.168.254.2:3001/health`
- OnRender 1: `http://35.160.120.126:10000/health`
- OnRender 2: `http://44.233.151.27:10000/health`
- OnRender 3: `http://34.211.200.85:10000/health`

### API Stats Endpoints
- Local: `http://192.168.254.2:3001/api/stats`
- OnRender 1: `http://35.160.120.126:10000/api/stats`
- OnRender 2: `http://44.233.151.27:10000/api/stats`
- OnRender 3: `http://34.211.200.85:10000/api/stats`

## 🚀 Load Balancer Features

When running `deploy-multiserver.js`:
- **Round-robin** load balancing
- **Health checks** every 30 seconds
- **Automatic failover** to healthy servers
- **Real-time monitoring** at `http://localhost:8081/lb/status`

## 💰 Computing Marketplace Features

Each server supports:
- ⛏️ **Mining operations** (SHA256)
- 🔐 **Hashcat/password recovery**
- 🤖 **AI training jobs**
- ⚡ **General computing tasks**
- 💼 **External API** for enterprise clients

## 📊 Monitoring

### Load Balancer Status
```
GET http://localhost:8081/lb/status
```

### Individual Server Stats
```
GET http://[server-ip]:[port]/api/stats
```

### Health Checks
```
GET http://[server-ip]:[port]/health
```

## 🔐 Security Features

- CORS protection
- Security headers (X-Frame-Options, X-XSS-Protection, etc.)
- API key authentication for external clients
- Rate limiting and DDoS protection
- Input validation and sanitization

## 🌟 Revolutionary Features

### Dynamic Computing Marketplace
- **Variable Output**: GPU/CPU power automatically switches between highest-paying tasks
- **Task Types**: Mining → Hashcat → AI Training → General Computing
- **Enterprise API**: Companies can submit computing jobs via REST API
- **Adaptive Workers**: Miners automatically detect capabilities and switch tasks

### Multi-Server Architecture
- **Load Balancing**: Distributes load across all healthy servers
- **Failover**: Automatic switching to backup servers
- **Scalability**: Easy addition of new servers to the pool
- **Geographic Distribution**: Servers across different locations

## 🎯 Next Steps

1. **Deploy** to all OnRender servers using the generated scripts
2. **Test** health endpoints on all servers
3. **Start** load balancer for unified access
4. **Configure** miners to connect to the load balancer
5. **Monitor** performance and earnings

---

**HashNHedge** - *Your Computing Power, Monetized*

🌐 **Frontend**: https://hashnhedge.netlify.app
📊 **Load Balancer**: http://localhost:8081
🔗 **GitHub**: Repository with all deployment files