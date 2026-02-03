# ✅ File Structure - REORGANIZED

## 📂 BACKEND (`flashCharge-backend/`)

```
flashCharge-backend/
├── src/
│   ├── routes/                    # API Endpoints
│   │   ├── auth.routes.js         # Login, Register
│   │   ├── chargers.routes.js     # Charger operations
│   │   ├── transactions.routes.js # Transaction history
│   │   ├── prepaid.routes.js      # Prepaid charging
│   │   └── firmware.routes.js     # Firmware updates
│   │
│   ├── services/                  # Business Logic
│   │   ├── database.service.js    # MySQL connection
│   │   ├── steve.service.js       # SteVe OCPP API
│   │   ├── ocpp.service.js        # OCPP protocol
│   │   ├── websocket.service.js   # Real-time updates
│   │   ├── charging.service.js    # Charging logic
│   │   ├── transaction.service.js # Transaction logic
│   │   ├── soc.service.js         # SOC calculations
│   │   ├── cache.service.js       # Caching
│   │   └── session.service.js     # Session management
│   │
│   ├── middleware/                # Express Middleware
│   │   └── auth.js                # JWT authentication
│   │
│   ├── config/                    # Configuration
│   │   └── constants.js           # App constants
│   │
│   ├── utils/                     # Helper Functions
│   │   └── batteryCalculations.js # Battery math
│   │
│   └── server.js                  # Main entry point
│
├── .env                           # Environment variables (SECRET!)
├── .gitignore                     # Git ignore
└── package.json                   # Dependencies
```

## 🎨 FRONTEND (`flashCharge-ui/`)

```
flashCharge-ui/
├── pages/                         # HTML Pages
│   ├── auth/
│   │   └── login.html             # Login page
│   ├── chargers/
│   │   └── list.html              # Charger selection
│   └── charging/
│       ├── configure.html         # Charging config
│       └── dashboard.html         # Real-time dashboard
│
├── css/                           # Stylesheets
│   └── pages/
│       ├── login.css              # Login styles
│       ├── chargers.css           # Charger list styles
│       ├── configure.css          # Config page styles
│       ├── dashboard.css          # Dashboard styles
│       └── summary.css            # Summary modal styles
│
├── js/                            # JavaScript
│   ├── pages/
│   │   ├── dashboard.page.js      # Dashboard logic
│   │   └── configure.page.js      # Config logic
│   ├── services/
│   │   ├── api.service.js         # API client
│   │   └── payment.service.js     # Payment logic
│   └── utils/
│       ├── calculations.js        # Battery calculations
│       ├── constants.js           # Constants
│       └── ui.js                  # UI helpers
│
└── nginx.conf                     # Nginx config
```

## 🔑 KEY CHANGES

### Backend
✅ All routes renamed: `*.js` → `*.routes.js`
✅ All services renamed: `*.js` → `*.service.js`
✅ Database service: `db.js` → `database.service.js`
✅ All imports updated automatically

### Frontend
✅ HTML files moved to `pages/` folder
✅ CSS files moved to `css/pages/` folder
✅ JS files moved to `js/pages/` folder
✅ Services renamed: `*.js` → `*.service.js`
✅ All paths updated in HTML files
✅ Test files removed

## 📍 FILE LOCATIONS

### Backend - Where to Find Things
| What | File |
|------|------|
| Start server | `src/server.js` |
| Charger API | `src/routes/chargers.routes.js` |
| SteVe integration | `src/services/steve.service.js` |
| Database queries | `src/services/database.service.js` |
| WebSocket | `src/services/websocket.service.js` |
| Auth logic | `src/middleware/auth.js` |
| Battery math | `src/utils/batteryCalculations.js` |

### Frontend - Where to Find Things
| What | File |
|------|------|
| Login page | `pages/auth/login.html` |
| Charger list | `pages/chargers/list.html` |
| Charging config | `pages/charging/configure.html` |
| Dashboard | `pages/charging/dashboard.html` |
| Dashboard logic | `js/pages/dashboard.page.js` |
| Config logic | `js/pages/configure.page.js` |
| API calls | `js/services/api.service.js` |
| Calculations | `js/utils/calculations.js` |

## 🚀 QUICK START

### Backend
```bash
cd /opt/ev-platform/flashCharge-backend
npm start
# Runs on http://localhost:3000
```

### Frontend
```bash
# Open in browser:
http://localhost/pages/charging/dashboard.html
http://localhost/pages/auth/login.html
http://localhost/pages/chargers/list.html
```

## ✅ VERIFIED WORKING
- ✅ Backend starts successfully
- ✅ All imports resolved
- ✅ API endpoints working
- ✅ File structure clean and organized
- ✅ Easy to understand for new developers

## 📝 NAMING CONVENTIONS

### Backend
- Routes: `name.routes.js`
- Services: `name.service.js`
- Middleware: `name.js`
- Utils: `name.js`

### Frontend
- Pages (HTML): `name.html`
- Page logic (JS): `name.page.js`
- Services: `name.service.js`
- Utils: `name.js`
- Styles: `name.css`

## 🎯 BENEFITS

1. **Clear Structure** - Easy to find files
2. **Consistent Naming** - All files follow same pattern
3. **Organized Folders** - Related files grouped together
4. **No Duplicates** - Test files removed
5. **Easy Onboarding** - New developers understand quickly

---

**Status:** ✅ COMPLETE  
**Backend:** ✅ Working  
**Frontend:** ✅ Organized  
**Ready for:** Production handover
