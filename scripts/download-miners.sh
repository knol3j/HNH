#!/bin/bash
# download-miners.sh - Download miner binaries for Hash'n'Hedge
# Usage: bash download-miners.sh [target-dir]
#
# This script downloads the officially supported miner binaries.
# After download, run: chmod +x bin/*/t-rex bin/*/xmrig bin/*/lolMiner

set -euo pipefail

TARGET_DIR="${1:-./bin}"
mkdir -p "$TARGET_DIR"

echo "=== Hash'n'Hedge Miner Downloader ==="
echo "Target directory: $TARGET_DIR"
echo ""

# Detect platform
ARCH="$(uname -m)"
OS="$(uname -s)"

download_trex() {
    local version="0.27.1"
    if [ "$OS" = "Linux" ]; then
        local url="https://github.com/trexminer/T-Rex/releases/download/$version/t-rex-$version-linux.tar.gz"
        echo "[T-Rex] Downloading $url ..."
        curl -sL "$url" -o /tmp/t-rex.tar.gz
        tar xzf /tmp/t-rex.tar.gz -C "$TARGET_DIR" t-rex 2>/dev/null || \
            tar xzf /tmp/t-rex.tar.gz -C "$TARGET_DIR"
        rm -f /tmp/t-rex.tar.gz
    else
        echo "[T-Rex] Windows: download from https://github.com/trexminer/T-Rex/releases"
    fi
}

download_xmrig() {
    local version="6.22.2"
    if [ "$OS" = "Linux" ] && [ "$ARCH" = "x86_64" ]; then
        local url="https://github.com/xmrig/xmrig/releases/download/v$version/xmrig-$version-linux-static-x64.tar.gz"
        echo "[XMRig] Downloading $url ..."
        curl -sL "$url" -o /tmp/xmrig.tar.gz
        tar xzf /tmp/xmrig.tar.gz -C "$TARGET_DIR" --strip-components=1 xmrig-$version/xmrig 2>/dev/null || \
            tar xzf /tmp/xmrig.tar.gz -C "$TARGET_DIR" xmrig 2>/dev/null || \
            echo "[XMRig] Extracted to $TARGET_DIR — look for xmrig binary"
        rm -f /tmp/xmrig.tar.gz
    else
        echo "[XMRig] Visit https://github.com/xmrig/xmrig/releases for your platform"
    fi
}

download_lolminer() {
    local version="1.84"
    if [ "$OS" = "Linux" ] && [ "$ARCH" = "x86_64" ]; then
        local url="https://github.com/Lolliedieb/lolMiner-releases/releases/download/$version/lolMiner_v${version}_Lin64.tar.gz"
        echo "[lolMiner] Downloading $url ..."
        curl -sL "$url" -o /tmp/lolminer.tar.gz
        tar xzf /tmp/lolminer.tar.gz -C "$TARGET_DIR" --strip-components=1 lolMiner/lolMiner 2>/dev/null || \
            tar xzf /tmp/lolminer.tar.gz -C "$TARGET_DIR"
        rm -f /tmp/lolminer.tar.gz
    else
        echo "[lolMiner] Visit https://github.com/Lolliedieb/lolMiner-releases/releases for your platform"
    fi
}

download_trex
echo ""
download_xmrig
echo ""
download_lolminer
echo ""
echo "=== Done ==="
echo "Binaries downloaded to: $TARGET_DIR"
ls -la "$TARGET_DIR"/t-rex "$TARGET_DIR"/xmrig "$TARGET_DIR"/lolMiner 2>/dev/null || echo "(Some binaries may not exist for this platform)"
