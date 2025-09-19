#!/bin/bash

# HashNHedge Platform Deployment Script
echo "🚀 Starting HashNHedge Platform Deployment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    print_error "Node.js is not installed. Please install Node.js 16+ and try again."
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 16 ]; then
    print_error "Node.js version 16+ required. Current version: $(node --version)"
    exit 1
fi

print_status "Node.js version check passed: $(node --version)"

# Install dependencies
print_info "Installing dependencies..."
npm install

if [ $? -eq 0 ]; then
    print_status "Dependencies installed successfully"
else
    print_error "Failed to install dependencies"
    exit 1
fi

# Check if deployment configuration exists
if [ ! -f "hnh-deployment.json" ]; then
    print_warning "No deployment configuration found. Creating new token deployment..."

    # Deploy HNH token
    print_info "Deploying HNH token to Solana devnet..."
    npm run deploy-token

    if [ $? -eq 0 ]; then
        print_status "HNH token deployed successfully"
    else
        print_error "Failed to deploy HNH token"
        exit 1
    fi
else
    print_status "Using existing HNH token deployment"
fi

# Create production environment file
print_info "Creating production environment configuration..."
cat > .env.production << EOF
NODE_ENV=production
PORT=3001
ADMIN_TOKEN=$(openssl rand -hex 32)
SOLANA_NETWORK=devnet
LOG_LEVEL=info
EOF

print_status "Environment configuration created"

# Build static assets if needed
print_info "Preparing static assets..."
if [ -d "HNH-pool" ]; then
    print_status "Static assets ready in HNH-pool directory"
else
    print_error "HNH-pool directory not found"
    exit 1
fi

# Create systemd service file (Linux only)
if [[ "$OSTYPE" == "linux-gnu"* ]]; then
    print_info "Creating systemd service file..."

    sudo tee /etc/systemd/system/hashnhedge.service > /dev/null << EOF
[Unit]
Description=HashNHedge Mining Pool Server
After=network.target

[Service]
Type=simple
User=$USER
WorkingDirectory=$(pwd)
ExecStart=$(which node) pool_server_file.js
Restart=always
RestartSec=10
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
EOF

    sudo systemctl daemon-reload
    sudo systemctl enable hashnhedge
    print_status "Systemd service created and enabled"
fi

# Create Docker configuration
print_info "Creating Docker configuration..."
cat > Dockerfile << EOF
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy application files
COPY . .

# Create non-root user
RUN addgroup -g 1001 -S nodejs && adduser -S hashnhedge -u 1001

# Change ownership
RUN chown -R hashnhedge:nodejs /app
USER hashnhedge

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3001/api/stats', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"

# Start application
CMD ["npm", "start"]
EOF

cat > docker-compose.yml << EOF
version: '3.8'

services:
  hashnhedge-pool:
    build: .
    ports:
      - "3001:3001"
    environment:
      - NODE_ENV=production
      - PORT=3001
    volumes:
      - ./hnh-deployment.json:/app/hnh-deployment.json:ro
      - ./logs:/app/logs
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3001/api/stats"]
      interval: 30s
      timeout: 10s
      retries: 3

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
      - ./HNH-pool:/usr/share/nginx/html:ro
    depends_on:
      - hashnhedge-pool
    restart: unless-stopped
EOF

print_status "Docker configuration created"

# Create nginx configuration
cat > nginx.conf << EOF
events {
    worker_connections 1024;
}

http {
    include /etc/nginx/mime.types;
    default_type application/octet-stream;

    upstream hashnhedge_pool {
        server hashnhedge-pool:3001;
    }

    server {
        listen 80;
        server_name hashnhedge.com www.hashnhedge.com;

        # Security headers
        add_header X-Frame-Options DENY;
        add_header X-Content-Type-Options nosniff;
        add_header X-XSS-Protection "1; mode=block";

        # Serve static files
        location / {
            root /usr/share/nginx/html;
            index index.html;
            try_files \$uri \$uri/ /index.html;
        }

        # Proxy API requests to pool server
        location /api/ {
            proxy_pass http://hashnhedge_pool;
            proxy_http_version 1.1;
            proxy_set_header Upgrade \$http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host \$host;
            proxy_set_header X-Real-IP \$remote_addr;
            proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto \$scheme;
            proxy_cache_bypass \$http_upgrade;
        }
    }
}
EOF

# Create deployment documentation
print_info "Creating deployment documentation..."
cat > DEPLOYMENT.md << EOF
# HashNHedge Platform Deployment Guide

## Prerequisites
- Node.js 16+
- npm or yarn
- Git
- Docker (optional)

## Quick Start

### 1. Clone and Setup
\`\`\`bash
git clone https://github.com/knol3j/HNH.git
cd HNH
chmod +x deploy.sh
./deploy.sh
\`\`\`

### 2. Start Services
\`\`\`bash
# Start pool server
npm start

# In another terminal, start static server
npm run static
\`\`\`

### 3. Access Platform
- **Main Site**: http://localhost:8080
- **Pool API**: http://localhost:3001
- **Security Dashboard**: http://localhost:8080/security-dashboard.html

## Production Deployment

### Option 1: Docker Compose
\`\`\`bash
docker-compose up -d
\`\`\`

### Option 2: Systemd Service (Linux)
\`\`\`bash
sudo systemctl start hashnhedge
sudo systemctl status hashnhedge
\`\`\`

### Option 3: Manual
\`\`\`bash
NODE_ENV=production npm start
\`\`\`

## Environment Variables
- \`NODE_ENV\`: production/development
- \`PORT\`: Server port (default: 3001)
- \`ADMIN_TOKEN\`: Security dashboard access token
- \`SOLANA_NETWORK\`: devnet/mainnet-beta

## URLs and Endpoints
- **Pool Server**: https://hashnhedge-pool.onrender.com
- **Main Website**: https://hashnhedge.com
- **API Base**: /api/
- **Security Dashboard**: /security-dashboard.html

## Security Configuration
- Admin token automatically generated
- Rate limiting enabled
- Security headers configured
- Input validation active
- Real-time monitoring available

## Monitoring
- Health check: \`GET /api/stats\`
- Security dashboard: Admin token required
- Logs: Console output and file logging
EOF

print_status "Deployment documentation created"

# Display deployment summary
echo ""
echo "🎉 HashNHedge Platform Deployment Complete!"
echo "=================================================="
echo ""
print_info "Files Created:"
echo "  • .env.production - Production environment config"
echo "  • Dockerfile - Docker container configuration"
echo "  • docker-compose.yml - Multi-service orchestration"
echo "  • nginx.conf - Web server configuration"
echo "  • DEPLOYMENT.md - Deployment documentation"
if [[ "$OSTYPE" == "linux-gnu"* ]]; then
echo "  • hashnhedge.service - Systemd service"
fi
echo ""
print_info "Next Steps:"
echo "  1. Review configuration files"
echo "  2. Choose deployment method (Docker/Systemd/Manual)"
echo "  3. Start services: npm start"
echo "  4. Access platform: http://localhost:8080"
echo ""
print_info "Production URLs:"
echo "  • Pool API: https://hashnhedge-pool.onrender.com"
echo "  • Website: https://hashnhedge.com"
echo ""
print_warning "Remember to:"
echo "  • Secure your admin token"
echo "  • Configure SSL certificates for production"
echo "  • Set up monitoring and backups"
echo "  • Review security settings"
echo ""
print_status "Deployment script completed successfully!"