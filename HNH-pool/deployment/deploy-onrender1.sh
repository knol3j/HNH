#!/bin/bash
# HashNHedge Pool Deployment Script for OnRender Primary
echo "🚀 Deploying HashNHedge Pool to OnRender Primary (35.160.120.126)"

# Install dependencies
npm install

# Set environment variables
export NODE_ENV=production
export PORT=10000
export SERVER_ID=onrender1
export SERVER_NAME="OnRender Primary"
export SERVER_IP=35.160.120.126

# Start the pool server
echo "Starting HashNHedge Pool on 35.160.120.126:10000"
node onrender-server.js
