#!/bin/bash
# Pornește aplicația Pontaj Digital
# Backend pe port 6001, Frontend pe port 3000

set -e
cd "$(dirname "$0")"
ROOT="$(pwd)"

echo "🚀 Pornesc Pontaj Digital..."
echo ""

# Backend
echo "📦 Pornesc backend (port 6001)..."
(cd "$ROOT/backend" && python3 -m uvicorn main:app --host 0.0.0.0 --port 6001 --reload) &
BACKEND_PID=$!
sleep 3

# Frontend
echo "🎨 Pornesc frontend (port 3000)..."
(cd "$ROOT/frontend" && npm run dev) &
FRONTEND_PID=$!

echo ""
echo "✅ Aplicația pornește!"
echo "📍 Backend:  http://localhost:6001"
echo "📍 Frontend: http://localhost:5173"
echo ""
echo "Apasă Ctrl+C pentru a opri..."

# Wait for both processes
wait $BACKEND_PID $FRONTEND_PID
