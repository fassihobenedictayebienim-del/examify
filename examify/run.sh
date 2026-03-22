#!/usr/bin/env bash
# =============================================================================
# Examify — build frontend + start Flask in one command
# Usage:  ./run.sh
# =============================================================================
set -e

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
FRONTEND_DIR="$ROOT_DIR/frontend"
BACKEND_DIR="$ROOT_DIR/backend"

echo ""
echo "🎓  Examify — unified build & run"
echo "=================================="

# ── 1. Build the React frontend ───────────────────────────────────────────────
echo ""
echo "📦  Step 1/3 — Installing frontend dependencies..."
cd "$FRONTEND_DIR"
npm install --silent

echo ""
echo "🔨  Step 2/3 — Building React app..."
npm run build

echo ""
echo "✅  Frontend build complete → frontend/build/"

# ── 2. Activate Python venv if present ───────────────────────────────────────
cd "$BACKEND_DIR"

if [ -d "venv" ]; then
    echo ""
    echo "🐍  Activating virtual environment..."
    # shellcheck disable=SC1091
    source venv/bin/activate
fi

# ── 3. Start Flask ────────────────────────────────────────────────────────────
echo ""
echo "🚀  Step 3/3 — Starting Flask server..."
echo "    App will be available at http://localhost:5000"
echo ""

python app.py
