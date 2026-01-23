# Quick Reference - Production Structure

## 📁 File Structure

```
Backend:
  config/constants.js           → Battery specs, pricing, variants
  utils/batteryCalculations.js → Reusable calculation functions
  services/chargingParamsService.js → Business logic
  routes/chargers.js            → HTTP endpoints

Frontend:
  js/utils/constants.js         → Frontend constants
  js/utils/calculations.js      → Charging calculations
  js/utils/ui.js                → UI helpers
  js/services/api.js            → HTTP client
  js/configure-refactored.js    → Modular configure screen
```

## 🔧 Common Tasks

### Add New Battery Constant

**Backend:**
```javascript
// src/config/constants.js
module.exports = {
  BATTERY: {
    NEW_CONSTANT: value
  }
};
```

**Frontend:**
```javascript
// js/utils/constants.js
export const BATTERY = {
  NEW_CONSTANT: value
};
```

### Add New Calculation

**Backend:**
```javascript
// src/utils/batteryCalculations.js
function newCalculation(param) {
  return result;
}
module.exports = { newCalculation };
```

**Frontend:**
```javascript
// js/utils/calculations.js
export function newCalculation(param) {
  return result;
}
```

### Add New API Endpoint

**Backend:**
```javascript
// src/services/newService.js
async function getData() {
  // business logic
}
module.exports = { getData };

// src/routes/chargers.js
const newService = require('../services/newService');
router.get('/new', async (req, res) => {
  const data = await newService.getData();
  res.json(data);
});
```

**Frontend:**
```javascript
// js/services/api.js
export async function getNewData() {
  const response = await fetch('/api/chargers/new');
  return response.json();
}

// Usage in page
import { getNewData } from './services/api.js';
const data = await getNewData();
```

### Add New UI Helper

```javascript
// js/utils/ui.js
export function newHelper(param) {
  // UI logic
}

// Usage
import { newHelper } from './utils/ui.js';
newHelper(value);
```

## 📊 Import Patterns

### Backend (CommonJS)
```javascript
const { BATTERY } = require('./config/constants');
const { calculateRange } = require('./utils/batteryCalculations');
const service = require('./services/chargingParamsService');
```

### Frontend (ES6 Modules)
```javascript
import { BATTERY } from './utils/constants.js';
import { calculateFromRange } from './utils/calculations.js';
import { getChargingParams } from './services/api.js';
import { showToast } from './utils/ui.js';
```

## 🧪 Testing

### Test Backend Endpoint
```bash
curl http://localhost:3000/api/chargers/RIVOT_100A_01/charging-params
```

### Test Frontend
```
http://localhost:8081/configure-charge.html?charger=RIVOT_100A_01&connector=1
```

## 🔄 Restart Services
```bash
pm2 restart flashcharge-backend
pm2 restart flashcharge-ui
pm2 logs flashcharge-backend
```

## 📝 Key Files

| Purpose | Backend | Frontend |
|---------|---------|----------|
| Constants | `config/constants.js` | `js/utils/constants.js` |
| Calculations | `utils/batteryCalculations.js` | `js/utils/calculations.js` |
| API/Service | `services/*.js` | `js/services/api.js` |
| UI Helpers | N/A | `js/utils/ui.js` |
| Routes | `routes/*.js` | N/A |

## 🎯 Best Practices

1. **Constants** → Always use from config files
2. **Calculations** → Always use utility functions
3. **API Calls** → Always use service layer
4. **UI Updates** → Always use UI helpers
5. **Error Handling** → Always use try/catch
6. **Loading States** → Always show user feedback

## 🚀 Deployment

```bash
# Backend
cd /opt/ev-platform/flashCharge-backend
npm install
pm2 restart flashcharge-backend

# Frontend (static files)
# No build needed - served by nginx
```

## 📚 Documentation

- `FILE_STRUCTURE.md` - Complete structure guide
- `IMPLEMENTATION_COMPLETE.md` - 4-mode charging
- `PRODUCTION_REFACTORING.md` - Refactoring details
- `QUICK_REFERENCE.md` - This file

---

**Version:** 2.0.0  
**Status:** Production Ready ✅
