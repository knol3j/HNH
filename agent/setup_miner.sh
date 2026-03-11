#!/bin/bash
# setup_miner.sh
# Secure miner setup with SHA256 verification

set -e

BIN_DIR="$(dirname "$0")/bin"
mkdir -p "$BIN_DIR"

# XMRig Release (Linux Static x64)
XMRIG_URL="https://github.com/xmrig/xmrig/releases/download/v6.21.0/xmrig-6.21.0-linux-static-x64.tar.gz"
XMRIG_HASH="c5dc12dbb9bb51ea8acf93d6349d5bc7fe5ee11b68d6371c1bbb098e21d0f685"
ARCHIVE_NAME="xmrig.tar.gz"

echo "=== HashNHedge Miner Setup ==="
echo ""

# Download with verification
echo "Downloading XMRig..."
curl -sL -o "$BIN_DIR/$ARCHIVE_NAME" "$XMRIG_URL"

echo "Verifying SHA256 checksum..."
ACTUAL_HASH=$(sha256sum "$BIN_DIR/$ARCHIVE_NAME" | awk '{print $1}')

if [ "$ACTUAL_HASH" != "$XMRIG_HASH" ]; then
    echo "❌ SHA256 verification FAILED!"
    echo "   Expected: $XMRIG_HASH"
    echo "   Got:      $ACTUAL_HASH"
    echo ""
    echo "This could indicate a corrupted download or tampered binary."
    echo "Please check your network and try again."
    rm -f "$BIN_DIR/$ARCHIVE_NAME"
    exit 1
fi

echo "✅ Checksum verified"
echo ""
echo "Extracting..."
tar -xzf "$BIN_DIR/$ARCHIVE_NAME" -C "$BIN_DIR" --strip-components=1

# Cleanup
rm "$BIN_DIR/$ARCHIVE_NAME"


# Install dependencies
echo "Installing Agent dependencies..."
npm install

echo "✅ XMRig installed to $BIN_DIR/xmrig"
echo "✅ Agent dependencies installed."
echo ""
echo "To start the miner agent:"
echo "  node server.js"
chmod +x "$BIN_DIR/xmrig"
