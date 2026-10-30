#!/usr/bin/env bash
# Always ensure working directory is the script folder
cd "$(dirname "$0")"

echo "========================================================"
echo "               OmniDesk Desktop Launcher"
echo "========================================================"
echo ""

if ! command -v node &> /dev/null; then
    echo "[ERROR] Node.js was not found in your system!"
    echo "Please download and install Node.js from https://nodejs.org"
    exit 1
fi

if [ ! -d "node_modules" ]; then
    echo "[1/2] First time setup: Installing npm dependencies..."
    npm install
fi

echo "[2/2] Starting OmniDesk application..."
npm run dev -- --open
