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

# Start Next.js on internal port 3000 first (no health check delays)
echo "⚡ Starting Next.js frontend (internal port 3000)..."
npx next start -p 3000 -H 127.0.0.1 &
NEXTJS_PID=$!

# Give Next.js a brief moment to start binding to port
sleep 2

# Verify Next.js process is still running after initial startup
if ! kill -0 $NEXTJS_PID 2>/dev/null; then
  echo "❌ Next.js failed to start - check build logs"
  exit 1
fi
echo "✅ Next.js process started (PID: $NEXTJS_PID)"

# Start Express API server on port 5000 IMMEDIATELY (bind to 0.0.0.0 for Autoscale)
# This ensures port 5000 opens within seconds for Autoscale health checks
# Express will proxy Next.js requests to port 3000
echo "📦 Starting Express API server (port 5000)..."
echo "   Binding to 0.0.0.0:5000 for external access"
echo "   Express will proxy Next.js from port 3000"
node dist/index.js &
EXPRESS_PID=$!

# Give Express a moment to start
sleep 1

# Verify Express is running
if ! kill -0 $EXPRESS_PID 2>/dev/null; then
  echo "❌ Express failed to start"
  kill $NEXTJS_PID 2>/dev/null
  exit 1
fi
echo "✅ Express process started (PID: $EXPRESS_PID)"

echo "✅ Production servers started:"
echo "   - Express API: http://0.0.0.0:5000 (user-facing, proxies Next.js)"
echo "   - Next.js App: http://127.0.0.1:3000 (internal only)"
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
