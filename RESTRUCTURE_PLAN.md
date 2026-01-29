# Project Restructure Plan - Open Source Ready

## Current Structure → New Structure

### Backend (flashCharge-backend → ev-charging-backend)
```
flashCharge-backend/                    ev-charging-backend/
├── src/                                ├── src/
│   ├── config/                         │   ├── config/
│   │   └── constants.js                │   │   └── charging-constants.js
│   ├── middleware/                     │   ├── middleware/
│   │   └── auth.js                     │   │   └── jwt-authentication.js
│   ├── routes/                         │   ├── routes/
│   │   ├── auth.js                     │   │   ├── authentication-routes.js
│   │   ├── chargers.js                 │   │   ├── charger-management-routes.js
│   │   ├── firmware.js                 │   │   ├── firmware-ota-routes.js
│   │   ├── prepaid.js                  │   │   ├── payment-routes.js
│   │   └── transactions.js             │   │   └── transaction-routes.js
│   ├── services/                       │   ├── services/
│   │   ├── cache.js                    │   │   ├── cache-service.js
│   │   ├── chargingParamsService.js    │   │   ├── charging-parameters-service.js
│   │   ├── db.js                       │   │   ├── database-connection.js
│   │   ├── socService.js               │   │   ├── state-of-charge-service.js
│   │   ├── steveService.js             │   │   ├── ocpp-steve-integration.js
│   │   ├── transactionService.js       │   │   ├── transaction-service.js
│   │   └── websocket.js                │   │   └── realtime-websocket-service.js
│   ├── utils/                          │   ├── utils/
│   │   └── batteryCalculations.js      │   │   └── battery-calculations.js
│   └── server.js                       │   └── server.js
├── package.json                        ├── package.json
└── .env                                └── .env
```

### Frontend (flashCharge-ui → ev-charging-dashboard)
```
flashCharge-ui/                         ev-charging-dashboard/
├── js/                                 ├── assets/
│   ├── services/                       │   ├── js/
│   │   ├── api.js                      │   │   ├── services/
│   │   └── payment.js                  │   │   │   ├── api-client.js
│   ├── utils/                          │   │   │   └── payment-gateway.js
│   │   ├── calculations.js             │   │   ├── utils/
│   │   ├── constants.js                │   │   │   ├── battery-calculations.js
│   │   └── ui.js                       │   │   │   ├── charging-constants.js
│   ├── app.js                          │   │   │   └── ui-helpers.js
│   ├── configure-charge.js             │   │   ├── dashboard-main.js
│   └── configure.js                    │   │   ├── charging-configuration.js
├── css/                                │   │   └── websocket-client.js
├── style.css                           │   └── css/
├── configure-charge.css                │       ├── global-styles.css
├── charging-summary.css                │       ├── charging-config-styles.css
├── index.html                          │       └── charging-summary-styles.css
├── login.html                          ├── pages/
├── select-charger.html                 │   ├── index.html (dashboard)
├── configure-charge.html               │   ├── login.html
├── firmware-ota.html                   │   ├── charger-selection.html
└── websocket-test.html                 │   ├── charging-configuration.html
                                        │   ├── firmware-update.html
                                        │   └── websocket-test.html
                                        └── README.md
```

### Root Documentation
```
Root/
├── docs/                               (NEW - All documentation)
│   ├── architecture/
│   │   ├── SYSTEM_ARCHITECTURE.md
│   │   ├── DATA_FLOW.md
│   │   └── OCPP_INTEGRATION.md
│   ├── api/
│   │   ├── API_REFERENCE.md
│   │   └── WEBSOCKET_API.md
│   ├── deployment/
│   │   ├── INSTALLATION.md
│   │   ├── CONFIGURATION.md
│   │   └── PRODUCTION_DEPLOYMENT.md
│   └── development/
│       ├── CONTRIBUTING.md
│       ├── CODING_STANDARDS.md
│       └── TESTING.md
├── scripts/                            (NEW - Utility scripts)
│   ├── optimize-database.sh
│   ├── test-end-to-end.sh
│   └── setup-environment.sh
├── firmware-storage/                   (Keep as-is)
├── ev-charging-backend/                (Renamed)
├── ev-charging-dashboard/              (Renamed)
├── steve-csms/                         (Keep as-is - open source)
├── .env.example                        (NEW - Template)
├── .gitignore
├── docker-compose.yml                  (NEW - Full stack)
├── LICENSE                             (NEW - Open source license)
└── README.md                           (Updated - Project overview)
```

## File Naming Convention

### Backend Files:
- **Routes:** `{feature}-routes.js` (e.g., `charger-management-routes.js`)
- **Services:** `{feature}-service.js` (e.g., `state-of-charge-service.js`)
- **Middleware:** `{purpose}-middleware.js` (e.g., `jwt-authentication.js`)
- **Utils:** `{purpose}-utils.js` or `{feature}-calculations.js`

### Frontend Files:
- **Pages:** `{page-name}.html` (e.g., `charging-configuration.html`)
- **Scripts:** `{feature}-{type}.js` (e.g., `dashboard-main.js`, `websocket-client.js`)
- **Styles:** `{feature}-styles.css` (e.g., `charging-config-styles.css`)
- **Services:** `{service-name}.js` (e.g., `api-client.js`, `payment-gateway.js`)

### Documentation:
- **Architecture:** `{TOPIC}_ARCHITECTURE.md`
- **Guides:** `{PURPOSE}_GUIDE.md`
- **References:** `{FEATURE}_REFERENCE.md`

## Benefits

1. **Self-Documenting:** File names explain their purpose
2. **Easy Navigation:** Clear hierarchy and grouping
3. **Open Source Ready:** Professional structure
4. **Maintainable:** Easy to find and modify code
5. **Scalable:** Clear patterns for adding features

## Implementation Steps

1. Create new directory structure
2. Copy and rename files
3. Update all import/require paths
4. Update documentation
5. Test all functionality
6. Update deployment scripts
