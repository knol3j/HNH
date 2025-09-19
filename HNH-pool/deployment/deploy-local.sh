#!/bin/bash
# HashNHedge Pool Deployment Script for Local Network Hub
echo "🚀 Deploying HashNHedge Pool to Local Network Hub (192.168.254.2)"

# Install dependencies
npm install

# Set environment variables
export NODE_ENV=production
export PORT=3001
export SERVER_ID=local
export SERVER_NAME="Local Network Hub"
export SERVER_IP=192.168.254.2

# Start the pool server
echo "Starting HashNHedge Pool on 192.168.254.2:3001"
node pool_server_file.js
