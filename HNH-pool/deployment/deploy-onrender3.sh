#!/bin/bash
# HashNHedge Pool Deployment Script for OnRender Tertiary
echo "🚀 Deploying HashNHedge Pool to OnRender Tertiary (34.211.200.85)"

# Install dependencies
npm install

# Set environment variables
export NODE_ENV=production
export PORT=10000
export SERVER_ID=onrender3
export SERVER_NAME="OnRender Tertiary"
export SERVER_IP=34.211.200.85

# Start the pool server
echo "Starting HashNHedge Pool on 34.211.200.85:10000"
node onrender-server.js
