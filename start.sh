#!/usr/bin/env bash
echo "========================================================"
echo "            Spouštění aplikace OmniDesk"
echo "========================================================"
echo ""

if ! command -v node &> /dev/null; then
    echo "[CHYBA] Node.js nebyl v systému nalezen!"
    echo "Prosím stáhněte si instalátor z https://nodejs.org"
    exit 1
fi

if [ ! -d "node_modules" ]; then
    echo "[1/2] První spuštění: Instaluji potřebné komponenty..."
    npm install
fi

echo "[2/2] Spouštím aplikaci OmniDesk..."
echo "Aplikace se otevírá na http://localhost:3000"

if command -v xdg-open &> /dev/null; then
    (sleep 2 && xdg-open http://localhost:3000) &
elif command -v open &> /dev/null; then
    (sleep 2 && open http://localhost:3000) &
fi

npm run dev
