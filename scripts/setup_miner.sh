#!/bin/bash
# setup_miner.sh

# Directory for binaries
BIN_DIR="$(dirname "$0")/bin"
mkdir -p "$BIN_DIR"

# XMRig Release (Linux Static x64)
XMRIG_URL="https://github.com/xmrig/xmrig/releases/download/v6.21.0/xmrig-6.21.0-linux-static-x64.tar.gz"
ARCHIVE_NAME="xmrig.tar.gz"

echo "Downloading XMRig from $XMRIG_URL..."
curl -L -o "$BIN_DIR/$ARCHIVE_NAME" "$XMRIG_URL"

echo "Extracting..."
tar -xzf "$BIN_DIR/$ARCHIVE_NAME" -C "$BIN_DIR" --strip-components=1

# Cleanup
rm "$BIN_DIR/$ARCHIVE_NAME"


# Parse Base URL (Arg 1) or default to production
BASE_URL="${1:-https://app.hashnhedge.com}"
echo "Using Base URL: $BASE_URL"

# Download Agent Code
echo "Downloading Agent Source Code..."
curl -L -o package.json "$BASE_URL/agent-dist/package.json"
curl -L -o server.js "$BASE_URL/agent-dist/server.js"
curl -L -o stratum-proxy.js "$BASE_URL/agent-dist/stratum-proxy.js"

# Install dependencies
echo "Installing Agent dependencies..."
npm install

echo "✅ XMRig installed to $BIN_DIR/xmrig"
echo "✅ Agent dependencies installed."
echo ""
echo "To start the miner agent:"
echo "  node server.js"
chmod +x "$BIN_DIR/xmrig"
