#!/bin/bash
# HashNHedge Pool Deployment Script for OnRender Secondary
echo "🚀 Deploying HashNHedge Pool to OnRender Secondary (44.233.151.27)"

# Install dependencies
npm install

# Set environment variables
export NODE_ENV=production
export PORT=10000
export SERVER_ID=onrender2
export SERVER_NAME="OnRender Secondary"
export SERVER_IP=44.233.151.27

# Start the pool server
echo "Starting HashNHedge Pool on 44.233.151.27:10000"
node onrender-server.js
