# Production File Structure

## Overview

This document describes the production-ready file structure for the flashCharge EV charging platform.

---

## Backend Structure

```
flashCharge-backend/src/
├── config/
│   └── constants.js              # System constants (battery, pricing, variants)
│
├── middleware/
│   └── auth.js                   # JWT authentication middleware
│
├── routes/
│   ├── auth.js                   # Authentication endpoints
│   ├── chargers.js               # Charger management endpoints
│   └── transactions.js           # Transaction endpoints
│
├── services/
│   ├── db.js                     # Database connection pool
│   ├── steveService.js           # SteVe OCPP API client
│   ├── transactionService.js    # Transaction business logic
│   └── chargingParamsService.js # Charging parameters logic
│
├── utils/
│   └── batteryCalculations.js   # Battery calculation utilities
│
└── server.js                     # Express server entry point
```

### Key Files

#### config/constants.js
- Battery specifications (voltage, SOC, range formula)
- Vehicle variants (Classic, Pro, Max)
- Pricing configuration
- Charging limits

#### utils/batteryCalculations.js
- `getVariantByCurrentOffered()` - Determine vehicle variant
- `calculateCurrentAh()` - SOC to Ah conversion
- `calculateRange()` - Ah to km conversion
- `calculateEnergy()` - Ah to kWh conversion
- `calculateTime()` - Ah to minutes conversion
- `calculateCost()` - Energy to cost conversion

#### services/chargingParamsService.js
- `getChargingParameters()` - Fetch battery state from OCPP database
- Returns: variant, SOC, capacity, range, charging current

---

## Frontend Structure

```
flashCharge-ui/
├── css/
│   └── (future: split style.css into modules)
│
├── js/
│   ├── services/
│   │   └── api.js                # HTTP API client
│   │
│   ├── utils/
│   │   ├── constants.js          # Frontend constants
│   │   ├── calculations.js       # Charging calculations
│   │   └── ui.js                 # UI utilities
│   │
│   ├── app.js                    # Live dashboard (legacy)
│   ├── configure.js              # Configure screen (legacy)
│   └── configure-refactored.js  # Configure screen (modular)
│
├── index.html                    # Live charging dashboard
├── login.html                    # Login page
├── select-charger.html           # Charger selection
├── configure-charge.html         # Charging configuration
└── style.css                     # Global styles
```

### Key Files

#### js/utils/constants.js
- Battery constants (voltage, SOC, range formula)
- Pricing configuration
- Charging modes (RANGE, TIME, AMOUNT, FULL)
- Slider configuration
- API endpoints
- Route paths

#### js/utils/calculations.js
- `calculateFromRange()` - Calculate from target km
- `calculateFromTime()` - Calculate from target minutes
- `calculateFromAmount()` - Calculate from target rupees
- `calculateFull()` - Calculate FULL charge (90% SOC)
- `calculateCurrentCost()` - Real-time cost from energy

#### js/services/api.js
- `login()` - User authentication
- `getChargerList()` - Fetch all chargers
- `getConnectors()` - Fetch connector status
- `getChargingParams()` - Fetch battery parameters
- `startCharging()` - Start charging session
- `stopCharging()` - Stop charging session
- `getSOC()` - Real-time metrics
- `getHealth()` - OCPP connection status

#### js/utils/ui.js
- `showToast()` - Display notifications
- `getUrlParams()` - Parse URL parameters
- `setButtonLoading()` - Button loading states
- `updateGauge()` - Update SOC gauge
- Format functions (cost, time, energy, SOC, range)

---

## Migration Path

### Current (Legacy) Files
- `js/app.js` - Monolithic dashboard script
- `js/configure.js` - Monolithic configure script

### New (Modular) Files
- `js/configure-refactored.js` - Uses modular imports
- `js/services/api.js` - Centralized API calls
- `js/utils/calculations.js` - Reusable calculations
- `js/utils/ui.js` - Reusable UI functions

### Next Steps
1. ✅ Create modular structure
2. ✅ Refactor configure.js → configure-refactored.js
3. ⏳ Refactor app.js → dashboard-refactored.js
4. ⏳ Refactor select-charger.html inline scripts
5. ⏳ Refactor login.html inline scripts
6. ⏳ Split style.css into modules

---

## Benefits of New Structure

### Backend
✅ **Separation of Concerns**
- Routes handle HTTP only
- Services handle business logic
- Utils handle calculations
- Config centralizes constants

✅ **Maintainability**
- Easy to find and fix bugs
- Clear responsibility per file
- Reusable functions

✅ **Testability**
- Each function can be unit tested
- Mock services easily
- Test calculations independently

### Frontend
✅ **Modularity**
- ES6 modules with imports/exports
- Reusable across pages
- No code duplication

✅ **Debugging**
- Clear error stack traces
- Easy to isolate issues
- Consistent error handling

✅ **Scalability**
- Add new features easily
- Extend without breaking existing code
- Clear patterns to follow

---

## Usage Examples

### Backend

```javascript
// routes/chargers.js
const chargingParamsService = require('../services/chargingParamsService');

router.get('/:id/charging-params', async (req, res) => {
  const params = await chargingParamsService.getChargingParameters(req.params.id);
  res.json(params);
});
```

### Frontend

```javascript
// configure-refactored.js
import { calculateFromRange } from './utils/calculations.js';
import { getChargingParams } from './services/api.js';
import { showToast } from './utils/ui.js';

const params = await getChargingParams(chargerId);
const result = calculateFromRange(150, params);
showToast('Calculation complete', 'success');
```

---

## File Naming Conventions

### Backend
- **Config:** `constants.js`, `database.js`
- **Services:** `*Service.js` (e.g., `chargingParamsService.js`)
- **Utils:** `*Calculations.js`, `*Helpers.js`
- **Routes:** `*.js` (e.g., `chargers.js`)

### Frontend
- **Services:** `api.js`, `auth.js`
- **Utils:** `constants.js`, `calculations.js`, `ui.js`
- **Pages:** `*.html` (e.g., `configure-charge.html`)
- **Scripts:** `*-refactored.js` (new), `*.js` (legacy)

---

## Testing Strategy

### Backend Unit Tests (Future)
```
tests/
├── utils/
│   └── batteryCalculations.test.js
├── services/
│   └── chargingParamsService.test.js
└── routes/
    └── chargers.test.js
```

### Frontend Unit Tests (Future)
```
tests/
├── utils/
│   ├── calculations.test.js
│   └── ui.test.js
└── services/
    └── api.test.js
```

---

## Environment Configuration

### Backend (.env)
```
DB_HOST=localhost
DB_USER=steve
DB_PASSWORD=steve
DB_NAME=steve
STEVE_API_URL=http://localhost:8080/steve
STEVE_API_KEY=your-api-key
JWT_SECRET=your-jwt-secret
JWT_EXPIRES_IN=24h
CORS_ORIGINS=http://localhost:8081,https://ocpp.rivotmotors.com
```

### Frontend (constants.js)
```javascript
export const API_ENDPOINTS = {
  BASE: '/api',
  // ... endpoints
};
```

---

## Deployment Checklist

- [ ] All constants moved to config files
- [ ] No hardcoded values in code
- [ ] All calculations use utility functions
- [ ] All API calls use service layer
- [ ] Error handling in all async functions
- [ ] Loading states on all buttons
- [ ] Toast notifications for user feedback
- [ ] URL parameter validation
- [ ] Authentication checks on all pages
- [ ] CORS configured correctly

---

## Performance Optimizations

### Backend
- ✅ Database connection pooling
- ✅ Query result caching (via latest values)
- ✅ Efficient SQL queries with indexes

### Frontend
- ✅ ES6 modules (tree-shaking ready)
- ✅ Minimal dependencies
- ⏳ Code splitting (future)
- ⏳ Service worker (future)

---

## Security Best Practices

### Backend
- ✅ JWT authentication
- ✅ Input validation (express-validator)
- ✅ Rate limiting
- ✅ CORS restrictions
- ✅ Environment variables for secrets
- ✅ SQL injection prevention (parameterized queries)

### Frontend
- ✅ Token stored in localStorage
- ✅ Auto-redirect on auth failure
- ✅ No sensitive data in code
- ✅ HTTPS ready

---

## Monitoring & Logging

### Backend
- ✅ Console logging for errors
- ⏳ Winston logger (future)
- ⏳ Error tracking (Sentry) (future)

### Frontend
- ✅ Console logging for debugging
- ⏳ Error boundary (future)
- ⏳ Analytics (future)

---

**Status:** Production-Ready Structure Implemented  
**Version:** 2.0.0  
**Last Updated:** January 17, 2026
