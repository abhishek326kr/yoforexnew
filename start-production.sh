#!/bin/bash

# YoForex Production Startup Script (Autoscale-optimized)
# Runs Express API on port 5000 immediately for fast health checks
# Next.js runs on internal port 3000 (proxied by Express)

echo "🚀 Starting YoForex in Production Mode (Autoscale)..."

# Fail fast if builds don't exist
echo "🔍 Verifying production builds..."

if [ ! -f "dist/index.js" ]; then
  echo "❌ ERROR: Express build missing (dist/index.js not found)"
  echo "   The build phase should have created this file"
  echo "   Please check build logs for errors"
  exit 1
fi

if [ ! -d ".next" ]; then
  echo "❌ ERROR: Next.js build missing (.next directory not found)"
  echo "   The build phase should have created this file"
  echo "   Please check build logs for errors"
  exit 1
fi

# Additional verification for Next.js build integrity
if [ ! -f ".next/BUILD_ID" ]; then
  echo "❌ ERROR: Next.js build appears incomplete (BUILD_ID missing)"
  echo "   The .next directory exists but seems corrupted"
  echo "   Please rebuild the application"
  exit 1
fi

echo "✅ Production builds verified"

# Set environment variables
export EXPRESS_URL=${EXPRESS_URL:-http://127.0.0.1:5000}
export NEXT_PUBLIC_SITE_URL=${NEXT_PUBLIC_SITE_URL:-https://$REPL_SLUG.$REPL_OWNER.repl.co}
export NODE_ENV=production
export NEXTJS_PORT=3000

# Log environment for debugging
echo "📋 Environment Configuration:"
echo "   EXPRESS_URL=$EXPRESS_URL (Express on port 5000)"
echo "   NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL"
echo "   NODE_ENV=$NODE_ENV"
echo "   NEXTJS_PORT=$NEXTJS_PORT (internal)"

# CRITICAL FOR AUTOSCALE: Start Express FIRST to bind port 5000 immediately
# NO delays before startup - Autoscale health checks need fast response
echo "📦 Starting Express API server on port 5000 (PRIORITY)..."
echo "   Binding to 0.0.0.0:5000 for Autoscale health checks"
node dist/index.js &
EXPRESS_PID=$!

# Start Next.js in parallel immediately (no waiting for Express)
echo "⚡ Starting Next.js frontend (internal port 3000)..."
echo "   Express will proxy page requests to Next.js"
npx next start -p 3000 -H 127.0.0.1 &
NEXTJS_PID=$!

# AUTOSCALE OPTIMIZATION: No blocking health check loops
# Port 5000 binds immediately with instant /health endpoint response
# Async initialization continues in background without blocking deployment
echo "✅ Both services started:"
echo "   - Express (PID: $EXPRESS_PID) on port 5000 (immediate /health endpoint)"
echo "   - Next.js (PID: $NEXTJS_PID) on port 3000 (async proxy initialization)"
echo ""
echo "⏳ Background services initializing asynchronously..."
echo "   Check logs for WebSocket, Next.js proxy, and background job status"
echo ""

# Process monitor: If either process dies, kill the other and exit
# This ensures we don't serve 503s if Next.js crashes
{
  while true; do
    sleep 10
    if ! kill -0 $NEXTJS_PID 2>/dev/null; then
      echo "❌ Next.js process died unexpectedly - shutting down"
      kill $EXPRESS_PID 2>/dev/null
      exit 1
    fi
    if ! kill -0 $EXPRESS_PID 2>/dev/null; then
      echo "❌ Express process died unexpectedly - shutting down"
      kill $NEXTJS_PID 2>/dev/null
      exit 1
    fi
  done
} &
MONITOR_PID=$!

echo "🔍 Process monitor started (PID: $MONITOR_PID)"
echo "Press Ctrl+C to stop both servers"

# Trap Ctrl+C to kill all processes
trap "echo '⏹️  Stopping servers...'; kill $EXPRESS_PID $NEXTJS_PID $MONITOR_PID 2>/dev/null; exit" SIGINT SIGTERM

# Wait for both main processes
wait $EXPRESS_PID $NEXTJS_PID
