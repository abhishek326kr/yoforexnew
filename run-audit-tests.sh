#!/bin/bash
# Comprehensive Business Logic Audit Test Runner

echo "======================================"
echo " YOFOREX BUSINESS LOGIC AUDIT"
echo "======================================"
echo ""

# Check if application is running
echo "Checking application status..."
curl -s http://localhost:3001/api/stats > /dev/null
if [ $? -eq 0 ]; then
  echo "✅ Application is running on port 3001"
else
  echo "❌ Application not running. Starting application..."
  bash start-hybrid.sh &
  sleep 10
fi

echo ""
echo "Running comprehensive test suite..."
echo "======================================"

# Set test environment variables
export NODE_ENV=test
export API_URL=http://localhost:3001
export DATABASE_URL=$DATABASE_URL

# Run tests in sequence to avoid conflicts
echo ""
echo "🔐 1. Authentication & Authorization Tests"
echo "-----------------------------------"
npm test -- tests/logic/auth.test.ts --reporter=verbose 2>&1

echo ""
echo "📝 2. Forum Business Logic Tests"
echo "-----------------------------------"
npm test -- tests/logic/forum.test.ts --reporter=verbose 2>&1

echo ""
echo "💰 3. Coin Transaction Logic Tests"
echo "-----------------------------------"
npm test -- tests/logic/coins.test.ts --reporter=verbose 2>&1

echo ""
echo "🛍️ 4. Marketplace Logic Tests"
echo "-----------------------------------"
npm test -- tests/logic/marketplace.test.ts --reporter=verbose 2>&1

echo ""
echo "💬 5. Messaging System Logic Tests"
echo "-----------------------------------"
npm test -- tests/logic/messaging.test.ts --reporter=verbose 2>&1

echo ""
echo "🔔 6. Notification Logic Tests"
echo "-----------------------------------"
npm test -- tests/logic/notifications.test.ts --reporter=verbose 2>&1

echo ""
echo "🤖 7. Bot Behavior Logic Tests"
echo "-----------------------------------"
npm test -- tests/logic/bots.test.ts --reporter=verbose 2>&1

echo ""
echo "⚙️ 8. Admin Logic Tests"
echo "-----------------------------------"
npm test -- tests/logic/admin.test.ts --reporter=verbose 2>&1

echo ""
echo "======================================"
echo " AUDIT COMPLETE"
echo "======================================"