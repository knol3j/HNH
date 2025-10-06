#!/bin/bash

# HashNHedge Smart Miner - Auto-Profit Switcher
# Linux Version

echo "============================================"
echo "   HashNHedge Smart Miner v2.0"
echo "   Intelligent Auto-Profit Switching"
echo "============================================"
echo ""

# Change to script directory
cd "$(dirname "$0")"

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "ERROR: Node.js not found!"
    echo ""
    echo "Please install Node.js:"
    echo "  Ubuntu/Debian: sudo apt update && sudo apt install nodejs npm"
    echo "  CentOS/RHEL:   sudo yum install nodejs npm"
    echo "  Arch Linux:    sudo pacman -S nodejs npm"
    echo "  Or download from: https://nodejs.org"
    echo ""
    read -p "Press enter to exit..."
    exit 1
fi

# Check if t-rex binary exists (Linux version would be different)
if [ ! -f "t-rex" ] && [ ! -f "./t-rex-linux/t-rex" ]; then
    echo "ERROR: T-Rex miner not found!"
    echo ""
    echo "Please download T-Rex miner for Linux:"
    echo "1. Download from: https://github.com/trex-miner/T-Rex/releases"
    echo "2. Extract to this directory or create t-rex-linux/ folder"
    echo "3. Make sure the binary is named 't-rex' and is executable"
    echo ""
    read -p "Press enter to exit..."
    exit 1
fi

echo "[1/3] Checking configuration..."
if [ ! -f "wallets.json" ]; then
    echo "WARNING: wallets.json not found. Using defaults."
fi

echo "[2/3] Opening GUI..."
# Try to open the GUI in default browser
if command -v xdg-open &> /dev/null; then
    xdg-open "miner-gui.html" 2>/dev/null &
elif command -v firefox &> /dev/null; then
    firefox "miner-gui.html" 2>/dev/null &
elif command -v google-chrome &> /dev/null; then
    google-chrome "miner-gui.html" 2>/dev/null &
else
    echo "Please open miner-gui.html in your web browser"
fi

echo "[3/3] Starting auto-switcher..."
echo ""
echo "============================================"
echo "   Auto-Switcher Running"
echo "   GUI: file://$(pwd)/miner-gui.html"
echo "============================================"
echo ""
echo "Press Ctrl+C to stop mining"
echo ""

# Make sure t-rex is executable
if [ -f "t-rex" ]; then
    chmod +x t-rex
elif [ -f "./t-rex-linux/t-rex" ]; then
    chmod +x ./t-rex-linux/t-rex
fi

# Start the auto-switcher
node auto-switcher.js

echo ""
echo "Mining stopped. Press enter to exit..."
read