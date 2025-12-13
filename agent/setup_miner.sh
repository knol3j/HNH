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

echo "✅ XMRig installed to $BIN_DIR/xmrig"
chmod +x "$BIN_DIR/xmrig"
