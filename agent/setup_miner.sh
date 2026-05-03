#!/bin/bash
# setup_miner.sh
# Secure miner setup with SHA256 verification

set -e

BIN_DIR="$(dirname "$0")/bin"
mkdir -p "$BIN_DIR"

# XMRig Release (Linux Static x64)
XMRIG_URL="https://github.com/xmrig/xmrig/releases/download/v6.22.1/xmrig-6.22.1-linux-static-x64.tar.gz"
XMRIG_HASH="df7d249d768b5bf71b6b4399cd1061713c74c5c1fbc98c5ed9dcb4e4323b4b96"
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

# T-Rex Release (GPU - RVN/ETC)
TREX_URL="https://github.com/trexminer/T-Rex/releases/download/0.26.8/t-rex-0.26.8-linux.tar.gz"
TREX_HASH="7e77064a48b4c8cb8d4797f30a41b53efbb8311fc14475b56a8e6879ad1c0569"
TREX_ARCHIVE="trex.tar.gz"

echo "Downloading T-Rex..."
curl -sL -o "$BIN_DIR/$TREX_ARCHIVE" "$TREX_URL"
echo "Verifying T-Rex SHA256 checksum..."
ACTUAL_TREX_HASH=$(sha256sum "$BIN_DIR/$TREX_ARCHIVE" | awk '{print $1}')
if [ "$ACTUAL_TREX_HASH" != "$TREX_HASH" ]; then
    echo "❌ T-Rex SHA256 verification FAILED!"
    rm -f "$BIN_DIR/$TREX_ARCHIVE"
    exit 1
fi
echo "✅ T-Rex Checksum verified"
tar -xzf "$BIN_DIR/$TREX_ARCHIVE" -C "$BIN_DIR" t-rex
rm "$BIN_DIR/$TREX_ARCHIVE"

# lolMiner Release (GPU - ERG/KAS)
LOL_URL="https://github.com/Lolliedieb/lolMiner-releases/releases/download/1.76/lolMiner_v1.76_Lin64.tar.gz"
LOL_HASH="8daaa0d1a2348514682e1060f445246ddbb521dc285ad4d25f419a5455950dcd"
LOL_ARCHIVE="lolminer.tar.gz"

echo "Downloading lolMiner..."
curl -sL -o "$BIN_DIR/$LOL_ARCHIVE" "$LOL_URL"
echo "Verifying lolMiner SHA256 checksum..."
ACTUAL_LOL_HASH=$(sha256sum "$BIN_DIR/$LOL_ARCHIVE" | awk '{print $1}')
if [ "$ACTUAL_LOL_HASH" != "$LOL_HASH" ]; then
    echo "❌ lolMiner SHA256 verification FAILED!"
    rm -f "$BIN_DIR/$LOL_ARCHIVE"
    exit 1
fi
echo "✅ lolMiner Checksum verified"
tar -xzf "$BIN_DIR/$LOL_ARCHIVE" -C "$BIN_DIR" --strip-components=1 "1.76/lolMiner"
rm "$BIN_DIR/$LOL_ARCHIVE"

# Install dependencies
echo "Installing Agent dependencies..."
npm install

echo "✅ XMRig installed to $BIN_DIR/xmrig"
echo "✅ Agent dependencies installed."
echo ""
echo "To start the miner agent:"
echo "  node server.js"
chmod +x "$BIN_DIR/xmrig"
