# flashCharge - EV Charging Platform

**Version:** 1.0  
**Status:** Production Ready  
**Last Updated:** February 2025

---

## 📋 Quick Overview

flashCharge is an EV charging management platform with:
- **Backend API** (Node.js + Express)
- **Frontend UI** (HTML/CSS/JS)
- **OCPP Server** (SteVe CSMS)
- **Database** (MySQL)

---

## 🚀 Quick Start

### 1. Start Backend
```bash
cd flashCharge-backend
npm install
npm start
# Runs on http://localhost:3000
```

### 2. Start Frontend
```bash
# Open in browser:
http://localhost/pages/charging/dashboard.html
```

### 3. Start SteVe OCPP Server
```bash
cd steve-csms/steve
./mvnw spring-boot:run
# Runs on http://localhost:8080/steve
```

---

## 📂 Project Structure

```
ev-platform/
├── flashCharge-backend/       # Node.js API Server
│   ├── src/
│   │   ├── routes/            # API endpoints (*.routes.js)
│   │   ├── services/          # Business logic (*.service.js)
│   │   ├── middleware/        # Auth, validation
│   │   ├── config/            # Configuration
│   │   ├── utils/             # Helper functions
│   │   └── server.js          # Main entry point
│   ├── .env                   # Environment variables
│   └── package.json           # Dependencies
│
├── flashCharge-ui/            # Frontend Web App
│   ├── pages/                 # HTML pages
│   │   ├── auth/              # Login
│   │   ├── chargers/          # Charger list
│   │   └── charging/          # Dashboard, Config
│   ├── css/pages/             # Stylesheets
│   ├── js/
│   │   ├── pages/             # Page logic (*.page.js)
│   │   ├── services/          # API calls (*.service.js)
│   │   └── utils/             # Helpers
│   └── nginx.conf             # Nginx config
│
├── steve-csms/                # SteVe OCPP Server
│   └── steve/                 # Java Spring Boot app
│
├── firmware-storage/          # Firmware files for OTA
│
├── README.md                  # This file
├── PRD.md                     # Product requirements
├── ARCHITECTURE_WITH_REVIEW.md # System architecture
├── NEW_STRUCTURE.md           # File structure guide
└── ecosystem.config.js        # PM2 config
```

---

## 🔑 Key Files

### Backend
| File | Purpose |
|------|---------|
| `src/server.js` | Main entry point |
| `src/routes/chargers.routes.js` | Charger API endpoints |
| `src/services/steve.service.js` | SteVe OCPP integration |
| `src/services/database.service.js` | MySQL queries |
| `src/services/websocket.service.js` | Real-time updates |
| `src/middleware/auth.js` | JWT authentication |
| `.env` | Environment variables (SECRET!) |

### Frontend
| File | Purpose |
|------|---------|
| `pages/charging/dashboard.html` | Main charging interface |
| `pages/charging/configure.html` | Charging configuration |
| `js/pages/dashboard.page.js` | Dashboard logic |
| `js/services/api.service.js` | API client |
| `js/utils/calculations.js` | Battery calculations |

---

## 🔧 Configuration

### Backend (.env)
```env
# Database
DB_HOST=localhost
DB_PORT=3306
DB_USER=steve
DB_PASSWORD=your_password
DB_NAME=steve

# SteVe OCPP
STEVE_BASE_URL=http://localhost:8080/steve
STEVE_API_KEY=your_api_key

# JWT
JWT_SECRET=your_secret_key
JWT_EXPIRES_IN=24h

# Server
PORT=3000
NODE_ENV=production

# CORS
ALLOWED_ORIGINS=http://localhost:8081,https://ocpp.rivotmotors.com
```

---

## 🛣️ API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login

### Chargers
- `GET /api/chargers` - List all chargers
- `GET /api/chargers/:id/status` - Get charger status
- `GET /api/chargers/:id/vehicle-info` - Get vehicle info
- `POST /api/chargers/start` - Start charging
- `POST /api/chargers/stop` - Stop charging

### Transactions
- `GET /api/transactions` - List transactions
- `GET /api/transactions/:id` - Get transaction details

### Prepaid Charging
- `POST /api/prepaid/configure` - Configure charging targets
- `GET /api/prepaid/status/:chargerId` - Get prepaid status

### Firmware
- `POST /api/firmware/upload` - Upload firmware
- `POST /api/firmware/update` - Trigger OTA update

---

## 🔌 WebSocket Events

### Connect
```javascript
const ws = new WebSocket('ws://localhost:3000/ws');
```

### Subscribe to Charger
```javascript
ws.send(JSON.stringify({
  type: 'subscribe',
  chargerId: 'RIVOT_100A_01'
}));
```

### Events Received
- `status` - Charger status update
- `vehicleInfo` - Vehicle battery info
- `meterValues` - Electrical metrics (V, A, kW, Wh)

---

## 🗄️ Database

**Database:** MySQL (SteVe schema)

### Key Tables
- `charge_box` - Registered chargers
- `connector` - Charger connectors
- `connector_status` - Current status
- `transaction_start` - Active sessions
- `transaction_stop` - Completed sessions
- `data_transfer` - Custom data (VehicleInfo)

---

## 🚀 Deployment

### Using PM2
```bash
pm2 start ecosystem.config.js
pm2 list
pm2 logs
```

### Manual
```bash
# Backend
cd flashCharge-backend && npm start &

# SteVe
cd steve-csms/steve && ./mvnw spring-boot:run &

# Frontend (Nginx)
nginx -c /opt/ev-platform/flashCharge-ui/nginx.conf
```

---

## 🧪 Testing

### Backend Health Check
```bash
curl http://localhost:3000/health
```

### Test API
```bash
curl -X POST http://localhost:3000/api/chargers/start \
  -H "Content-Type: application/json" \
  -d '{"chargerId":"RIVOT_100A_01","connectorId":1}'
```

### Frontend
Open: `http://localhost/pages/charging/dashboard.html`

---

## 📚 Documentation

- **README.md** - This file (quick start)
- **PRD.md** - Product requirements document
- **ARCHITECTURE_WITH_REVIEW.md** - System architecture
- **NEW_STRUCTURE.md** - File structure guide

---

## 🔐 Security

- JWT authentication for API endpoints
- Rate limiting (1000 req/15min)
- CORS whitelist
- Input validation
- Environment variables for secrets
- HTTPS/TLS in production

---

## 🐛 Troubleshooting

### Backend won't start
```bash
# Check if port 3000 is in use
lsof -i :3000
# Check logs
tail -f logs/combined.log
```

### Frontend not loading
```bash
# Check Nginx
nginx -t
# Restart Nginx
nginx -s reload
```

### Database connection failed
```bash
# Check MySQL
systemctl status mysql
# Test connection
mysql -u steve -p steve
```

---

## 👥 Team

**For new developers:**
1. Read this README
2. Read `NEW_STRUCTURE.md` for file organization
3. Read `PRD.md` for product requirements
4. Start coding!

---

## 📝 License

GPL-3.0

---

**Questions?** Check documentation or create an issue.
