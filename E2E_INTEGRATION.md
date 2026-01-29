# flashCharge End-to-End Integration Flow

## 🔄 Complete Flow: UI → Backend → SteVe → Charger

### 1. **User Interface (flashCharge-ui)**
```
User clicks "PAY & START" button
↓
JavaScript sends POST request to backend
```

**Request:**
```javascript
fetch('/api/chargers/RIVOT_100A_01/start', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer <token>'
  },
  body: JSON.stringify({
    connectorId: 1,
    idTag: 'TEST_TAG'
  })
})
```

### 2. **Backend API (flashCharge-backend)**
```
Express.js receives request
↓
Validates authentication & input
↓
Calls SteVe External API
```

**Backend Code:**
```javascript
// /opt/ev-platform/flashCharge-backend/src/routes/chargers.js
const result = await steve.startCharging(chargePointId, connectorId, idTag);
```

**SteVe Service:**
```javascript
// /opt/ev-platform/flashCharge-backend/src/services/steveService.js
async function startCharging(chargePointId, connectorId, idTag) {
  const res = await steveApiClient.post("/api/external/charging/start", {
    chargePointId,
    connectorId,
    idTag,
  });
  return res.data;
}
```

### 3. **SteVe External API (Custom Controller)**
```
Spring Boot receives HTTP request
↓
ExternalChargingController processes request
↓
ChargePointServiceClient creates OCPP task
↓
WebSocket sends RemoteStartTransaction to charger
```

**SteVe Request:**
```http
POST http://localhost:8080/steve/api/external/charging/start
Content-Type: application/json
STEVE-API-KEY: my-secret-api-key

{
  "chargePointId": "RIVOT_100A_01",
  "connectorId": 1,
  "idTag": "TEST_TAG"
}
```

**SteVe Response:**
```json
{
  "status": "START_ACCEPTED",
  "taskId": 5
}
```

### 4. **Physical Charger**
```
Receives OCPP RemoteStartTransaction
↓
Beeps and starts charging ⚡
↓
Sends StatusNotification back to SteVe
↓
Transaction appears in SteVe admin UI
```

## 🛠️ Technical Implementation

### Backend Configuration
- **API Base URL:** `http://localhost:8080/steve`
- **API Key:** `my-secret-api-key` (from .env)
- **Timeout:** 10 seconds
- **Authentication:** JWT tokens for UI requests

### SteVe Configuration
- **External API Path:** `/api/external/charging/*`
- **Security:** API key authentication
- **Protocol:** OCPP 1.6 JSON
- **Database:** MySQL (transactions stored)

### Database Integration
- **Transactions:** Stored in `transaction` table
- **Connector Status:** Updated in `connector_status` table
- **Charger Health:** Tracked via `last_heartbeat_timestamp`

## 🔍 Testing & Verification

### 1. **Direct SteVe API Test**
```bash
curl -X POST http://localhost:8080/steve/api/external/charging/start \
  -H "Content-Type: application/json" \
  -H "STEVE-API-KEY: my-secret-api-key" \
  -d '{"chargePointId":"RIVOT_100A_01","connectorId":1,"idTag":"TEST_TAG"}'
```

### 2. **Backend API Test**
```bash
curl -X POST http://localhost:3000/api/chargers/RIVOT_100A_01/start \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{"connectorId":1,"idTag":"TEST_TAG"}'
```

### 3. **UI Test**
1. Open http://localhost/
2. Login with credentials
3. Select charger RIVOT_100A_01
4. Configure charging (battery %, range, budget, or time)
5. Click "PAY ₹X & START"
6. Verify transaction in SteVe admin

## 📊 Monitoring & Debugging

### Check Services Status
```bash
# Backend
curl http://localhost:3000/health

# SteVe
curl http://localhost:8080/steve/manager/home

# Active transactions
curl http://localhost:3000/api/chargers/RIVOT_100A_01/active
```

### View Logs
```bash
# Backend logs
pm2 logs flashCharge-backend

# SteVe logs (if using PM2)
pm2 logs steve-csms
```

### Database Queries
```sql
-- Check active transactions
SELECT * FROM transaction WHERE stop_timestamp IS NULL;

-- Check connector status
SELECT * FROM connector_status ORDER BY status_timestamp DESC LIMIT 5;

-- Check charger health
SELECT charge_box_id, last_heartbeat_timestamp FROM charge_box;
```

## 🎯 Success Indicators

### ✅ Working Flow
1. **UI Response:** Button states change immediately
2. **Backend Response:** Returns `{"status": "START_ACCEPTED", "taskId": X}`
3. **SteVe Admin:** Transaction appears in transactions list
4. **Charger:** Physical beep and charging starts
5. **Database:** Transaction record created with `stop_timestamp = NULL`

### ❌ Common Issues
1. **Authentication Error:** Check JWT token validity
2. **SteVe API Error:** Verify API key and SteVe service status
3. **No Transaction:** Check charger online status and connector availability
4. **Database Error:** Verify MySQL connection and schema

## 🔐 Security Notes
- API key stored in environment variables
- JWT authentication for UI requests
- HTTPS recommended for production
- Rate limiting implemented on backend
- Input validation on all endpoints

## 🚀 Production Checklist
- [ ] Update API keys and secrets
- [ ] Enable HTTPS/TLS
- [ ] Configure proper CORS origins
- [ ] Set up monitoring and alerting
- [ ] Test with real charger hardware
- [ ] Verify transaction persistence
- [ ] Load test the complete flow

---

**Status:** ✅ End-to-End Integration Working  
**Last Tested:** January 2026  
**Components:** UI ↔ Backend ↔ SteVe ↔ Charger