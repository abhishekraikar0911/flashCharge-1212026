#!/bin/bash

echo "🔄 EV Charging Platform - Open Source Restructure"
echo "=================================================="
echo ""
echo "This will restructure the project with clear, descriptive names"
echo "Press Ctrl+C to cancel, or Enter to continue..."
read

cd /opt/ev-platform

# Step 1: Create new directory structure
echo "📁 Creating new directory structure..."

mkdir -p docs/{architecture,api,deployment,development}
mkdir -p scripts

# Step 2: Rename backend
echo "🔧 Restructuring backend..."
if [ -d "flashCharge-backend" ]; then
  cp -r flashCharge-backend ev-charging-backend
  
  cd ev-charging-backend/src
  
  # Rename config files
  [ -f "config/constants.js" ] && mv config/constants.js config/charging-constants.js
  
  # Rename middleware
  [ -f "middleware/auth.js" ] && mv middleware/auth.js middleware/jwt-authentication.js
  
  # Rename routes
  [ -f "routes/auth.js" ] && mv routes/auth.js routes/authentication-routes.js
  [ -f "routes/chargers.js" ] && mv routes/chargers.js routes/charger-management-routes.js
  [ -f "routes/firmware.js" ] && mv routes/firmware.js routes/firmware-ota-routes.js
  [ -f "routes/prepaid.js" ] && mv routes/prepaid.js routes/payment-routes.js
  [ -f "routes/transactions.js" ] && mv routes/transactions.js routes/transaction-routes.js
  
  # Rename services
  [ -f "services/cache.js" ] && mv services/cache.js services/cache-service.js
  [ -f "services/chargingParamsService.js" ] && mv services/chargingParamsService.js services/charging-parameters-service.js
  [ -f "services/db.js" ] && mv services/db.js services/database-connection.js
  [ -f "services/socService.js" ] && mv services/socService.js services/state-of-charge-service.js
  [ -f "services/steveService.js" ] && mv services/steveService.js services/ocpp-steve-integration.js
  [ -f "services/transactionService.js" ] && mv services/transactionService.js services/transaction-service.js
  [ -f "services/websocket.js" ] && mv services/websocket.js services/realtime-websocket-service.js
  
  cd ../..
  echo "   ✅ Backend restructured"
else
  echo "   ⚠️  Backend directory not found"
fi

# Step 3: Rename frontend
echo "🎨 Restructuring frontend..."
if [ -d "flashCharge-ui" ]; then
  cp -r flashCharge-ui ev-charging-dashboard
  
  cd ev-charging-dashboard
  
  # Create new structure
  mkdir -p assets/{js/{services,utils},css}
  mkdir -p pages
  
  # Move and rename JS files
  [ -f "js/services/api.js" ] && mv js/services/api.js assets/js/services/api-client.js
  [ -f "js/services/payment.js" ] && mv js/services/payment.js assets/js/services/payment-gateway.js
  
  [ -f "js/utils/calculations.js" ] && mv js/utils/calculations.js assets/js/utils/battery-calculations.js
  [ -f "js/utils/constants.js" ] && mv js/utils/constants.js assets/js/utils/charging-constants.js
  [ -f "js/utils/ui.js" ] && mv js/utils/ui.js assets/js/utils/ui-helpers.js
  
  [ -f "js/app.js" ] && mv js/app.js assets/js/dashboard-main.js
  [ -f "js/configure-charge.js" ] && mv js/configure-charge.js assets/js/charging-configuration.js
  
  # Move and rename CSS files
  [ -f "style.css" ] && mv style.css assets/css/global-styles.css
  [ -f "configure-charge.css" ] && mv configure-charge.css assets/css/charging-config-styles.css
  [ -f "charging-summary.css" ] && mv charging-summary.css assets/css/charging-summary-styles.css
  
  # Move HTML files to pages
  [ -f "login.html" ] && mv login.html pages/login.html
  [ -f "select-charger.html" ] && mv select-charger.html pages/charger-selection.html
  [ -f "configure-charge.html" ] && mv configure-charge.html pages/charging-configuration.html
  [ -f "firmware-ota.html" ] && mv firmware-ota.html pages/firmware-update.html
  [ -f "websocket-test.html" ] && mv websocket-test.html pages/websocket-test.html
  [ -f "index.html" ] && mv index.html pages/index.html
  
  cd ..
  echo "   ✅ Frontend restructured"
else
  echo "   ⚠️  Frontend directory not found"
fi

# Step 4: Move scripts
echo "📜 Organizing scripts..."
[ -f "optimize-steve.sh" ] && cp optimize-steve.sh scripts/optimize-database.sh
[ -f "test-e2e.sh" ] && cp test-e2e.sh scripts/test-end-to-end.sh

# Step 5: Organize documentation
echo "📚 Organizing documentation..."
mv ARCHITECTURE_WITH_REVIEW.md docs/architecture/SYSTEM_ARCHITECTURE.md 2>/dev/null
mv DATA_FLOW_DIAGRAM.md docs/architecture/DATA_FLOW.md 2>/dev/null
mv OCPP_DATA_FLOW_ANALYSIS.md docs/architecture/OCPP_INTEGRATION.md 2>/dev/null
mv STEVE_INTEGRATION_COMPLETE.md docs/architecture/STEVE_INTEGRATION.md 2>/dev/null

mv WEBSOCKET_REALTIME.md docs/api/WEBSOCKET_API.md 2>/dev/null

mv PRODUCTION_DEPLOYMENT.md docs/deployment/ 2>/dev/null
mv PRODUCTION_READINESS.md docs/deployment/ 2>/dev/null

echo ""
echo "=================================================="
echo "✅ Restructure Complete!"
echo ""
echo "📁 New Structure:"
echo "   /opt/ev-platform/"
echo "   ├── ev-charging-backend/     (renamed from flashCharge-backend)"
echo "   ├── ev-charging-dashboard/   (renamed from flashCharge-ui)"
echo "   ├── steve-csms/              (unchanged - open source)"
echo "   ├── docs/                    (organized documentation)"
echo "   ├── scripts/                 (utility scripts)"
echo "   └── firmware-storage/        (unchanged)"
echo ""
echo "⚠️  IMPORTANT: Update import paths in code files"
echo "⚠️  IMPORTANT: Update PM2 configuration"
echo "⚠️  IMPORTANT: Test all functionality"
echo ""
echo "Next steps:"
echo "1. Review the new structure"
echo "2. Update import/require paths"
echo "3. Update nginx configuration"
echo "4. Restart services"
echo ""
