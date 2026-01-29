#!/bin/bash

# End-to-End Test: UI → Backend → SteVe External API
echo "🔋 Testing flashCharge End-to-End Flow"
echo "======================================"

# Configuration
BACKEND_URL="http://localhost:3000"
STEVE_URL="http://localhost:8080/steve"
CHARGER_ID="RIVOT_100A_01"
CONNECTOR_ID=1
ID_TAG="TEST_TAG"
API_KEY="my-secret-api-key"

echo "📍 Testing SteVe External API directly..."
START_RESPONSE=$(curl -s -X POST "$STEVE_URL/api/external/charging/start" \
  -H "Content-Type: application/json" \
  -H "STEVE-API-KEY: $API_KEY" \
  -d "{\"chargePointId\":\"$CHARGER_ID\",\"connectorId\":$CONNECTOR_ID,\"idTag\":\"$ID_TAG\"}")

echo "✅ SteVe Response: $START_RESPONSE"

# Extract taskId
TASK_ID=$(echo "$START_RESPONSE" | grep -o '"taskId":[0-9]*' | cut -d':' -f2)
echo "📋 Task ID: $TASK_ID"

echo ""
echo "📍 Testing Backend API (without auth for testing)..."

# Test backend health
BACKEND_HEALTH=$(curl -s "$BACKEND_URL/health" || echo "Backend not responding")
echo "🏥 Backend Health: $BACKEND_HEALTH"

# Test charger list
CHARGER_LIST=$(curl -s "$BACKEND_URL/api/chargers/list" || echo "API error")
echo "📋 Chargers: $CHARGER_LIST"

# Test active transactions
ACTIVE_TX=$(curl -s "$BACKEND_URL/api/chargers/$CHARGER_ID/active" || echo "API error")
echo "⚡ Active Transactions: $ACTIVE_TX"

echo ""
echo "🔗 Manual Testing URLs:"
echo "- Backend API: $BACKEND_URL/api/chargers/list"
echo "- SteVe Admin: $STEVE_URL/manager/home"
echo "- SteVe Transactions: $STEVE_URL/manager/transactions"
echo "- flashCharge UI: http://localhost/"

echo ""
echo "📱 To test the complete UI flow:"
echo "1. Open http://localhost/ in browser"
echo "2. Login with credentials"
echo "3. Select charger: $CHARGER_ID"
echo "4. Configure charging parameters"
echo "5. Click 'PAY & START'"
echo "6. Check SteVe admin for transaction"

echo ""
echo "✅ End-to-End Test Complete!"