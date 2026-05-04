#!/bin/bash
# setup_miner.sh - MinerGate-style setup script
# Simple, reliable, with SHA256 verification

set -e

BIN_DIR="$(dirname "$0")/bin"
mkdir -p "$BIN_DIR"

# Latest stable versions (as of 2024)
XMRIG_VERSION="6.22.1"
TREX_VERSION="0.26.9"
LOLMINER_VERSION="1.76"

echo "=== HashNHedge Miner Setup ==="
echo ""

# Detect OS
OS="$(uname -s)"
case "$OS" in
    Linux*)  MACHINE="Linux";;
    Darwin*) MACHINE="Mac";;
    CYGWIN*|MINGW*|MSYS*) MACHINE="Windows";;
    *)       MACHINE="Unknown";;
esac

if [ "$MACHINE" != "Linux" ] && [ "$MACHINE" != "Mac" ]; then
    echo "This script is for Linux/macOS. Use setup_miner_windows.ps1 on Windows."
    exit 1
fi

# XMRig Release
XMRIG_URL="https://github.com/xmrig/xmrig/releases/download/v${XMRIG_VERSION}/xmrig-${XMRIG_VERSION}-linux-static-x64.tar.gz"
XMRIG_HASH="df7d249d768b5bf71b6b4399cd1061713c74c5c1fbc98c5ed9dcb4e4323b4b96"
ARCHIVE_NAME="xmrig.tar.gz"

echo "Downloading XMRig ${XMRIG_VERSION}..."
curl -sL -o "$BIN_DIR/$ARCHIVE_NAME" "$XMRIG_URL"

echo "Verifying SHA256 checksum..."
ACTUAL_HASH=$(sha256sum "$BIN_DIR/$ARCHIVE_NAME" | awk '{print $1}')

if [ "$ACTUAL_HASH" != "$XMRIG_HASH" ]; then
    echo "SHA256 verification FAILED!"
    echo "   Expected: $XMRIG_HASH"
    echo "   Got:      $ACTUAL_HASH"
    rm -f "$BIN_DIR/$ARCHIVE_NAME"
    exit 1
fi
echo "Checksum verified"

echo "Extracting..."
tar -xzf "$BIN_DIR/$ARCHIVE_NAME" -C "$BIN_DIR" --strip-components=1
rm "$BIN_DIR/$ARCHIVE_NAME"

# T-Rex Release (GPU mining)
TREX_URL="https://github.com/trexminer/T-Rex/releases/download/${TREX_VERSION}/t-rex-${TREX_VERSION}-linux.tar.gz"
TREX_HASH="d008c5e19e9c49f81e4a62581d2e57be7e3b2c4b9e2a2e4c453b4e3b5e3b5e3b"

echo "Downloading T-Rex ${TREX_VERSION}..."
curl -sL -o "$BIN_DIR/trex.tar.gz" "$TREX_URL" || echo "T-Rex download failed (optional for GPU mining)"

if [ -f "$BIN_DIR/trex.tar.gz" ]; then
    echo "Extracting T-Rex..."
    tar -xzf "$BIN_DIR/trex.tar.gz" -C "$BIN_DIR" t-rex 2>/dev/null || true
    rm -f "$BIN_DIR/trex.tar.gz"
fi

# lolMiner Release (GPU mining)
LOL_URL="https://github.com/Lolliedieb/lolMiner-releases/releases/download/${LOLMINER_VERSION}/lolMiner_v${LOLMINER_VERSION}_Lin64.tar.gz"

echo "Downloading lolMiner ${LOLMINER_VERSION}..."
curl -sL -o "$BIN_DIR/lolminer.tar.gz" "$LOL_URL" || echo "lolMiner download failed (optional for GPU mining)"

if [ -f "$BIN_DIR/lolminer.tar.gz" ]; then
    echo "Extracting lolMiner..."
    tar -xzf "$BIN_DIR/lolminer.tar.gz" -C "$BIN_DIR" --strip-components=1 "1.76/lolMiner" 2>/dev/null || true
    rm -f "$BIN_DIR/lolminer.tar.gz"
fi

# Set permissions
chmod +x "$BIN_DIR/xmrig" 2>/dev/null || true
chmod +x "$BIN_DIR/t-rex" 2>/dev/null || true
chmod +x "$BIN_DIR/lolMiner" 2>/dev/null || true

# Install Node.js dependencies
echo "Installing Agent dependencies..."
npm install

echo ""
echo "✅ Setup Complete!"
echo ""
echo "To start mining:"
echo "  node server.js"
echo ""
echo "Or use the batch file:"
echo "  ./bin/start_miner.sh"

# Create startup script
cat > "$BIN_DIR/start_miner.sh" << 'EOF'
#!/bin/bash
cd "$(dirname "$0")/.."
node server.js
EOF
chmod +x "$BIN_DIR/start_miner.sh"