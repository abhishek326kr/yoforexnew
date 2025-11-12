#!/bin/bash

# YoForex Hybrid Startup Script (Development Mode)
# Runs Express (port 5000 user-facing) with Next.js internal (port 3000)

echo "🚀 Starting YoForex in Development Mode..."

# Start Next.js dev server on port 3000 (internal only)
echo "⚡ Starting Next.js dev server (port 3000 internal)..."
EXPRESS_URL=http://127.0.0.1:5000 npx next dev -p 3000 &
NEXTJS_PID=$!

# Wait for Next.js to start
sleep 3

# Start Express server on port 5000 (user-facing, proxies to Next.js)
# Express handles API routes directly and proxies page requests to Next.js
echo "📦 Starting Express server (port 5000 user-facing)..."
PORT=5000 NODE_ENV=development NEXT_INTERNAL_URL=http://127.0.0.1:3000 npx tsx server/index.ts &
EXPRESS_PID=$!

echo "✅ Development servers started:"
echo "   - Next.js App: http://localhost:3000 (internal)"
echo "   - Express Proxy: http://localhost:5000 (user-facing)"
echo ""
echo "Press Ctrl+C to stop both servers"

# Trap Ctrl+C to kill both processes
trap "echo '⏹️  Stopping servers...'; kill $EXPRESS_PID $NEXTJS_PID; exit" SIGINT SIGTERM

# Wait for both processes
wait
