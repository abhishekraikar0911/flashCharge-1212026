# 🧪 End-to-End Testing Guide - flashCharge Platform

## ✅ System Status Check

### Backend Status
```bash
# Check if backend is running
curl http://localhost:3000/health

# Expected: {"status":"Dashboard backend running"}
```

### Database Status
```bash
# Check database connection
mysql -u steve -psteve steve -e "SELECT COUNT(*) FROM users;"

# Expected: Shows count of users
```

### SteVe OCPP Status
```bash
# Check SteVe is running
curl http://localhost:8080/steve/manager/home

# Expected: HTML response (SteVe web interface)
```

---

## 🔐 Test Flow 1: Authentication

### Step 1: Register New User (Optional)
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser2",
    "password": "test1234",
    "email": "test@example.com"
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 5,
    "username": "testuser2",
    "role": "user"
  }
}
```

### Step 2: Login with Existing User
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "user",
    "password": "user"
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 2,
    "username": "user",
    "role": "user"
  }
}
```

**Save the token for next steps:**
```bash
export TOKEN="<paste_token_here>"
```

### Step 3: Verify Token
```bash
curl http://localhost:3000/api/auth/me \
  -H "Authorization: Bearer $TOKEN"
```

**Expected Response:**
```json
{
  "user": {
    "id": 2,
    "username": "user",
    "role": "user",
    "email": null
  }
}
```

---

## 🔌 Test Flow 2: Charger Selection

### Step 1: List All Chargers
```bash
curl http://localhost:3000/api/chargers/list
```

**Expected Response:**
```json
["RIVOT_100A_01"]
```

### Step 2: Get Charger Connectors
```bash
curl http://localhost:3000/api/chargers/RIVOT_100A_01/connectors
```

**Expected Response:**
```json
[
  {
    "connectorId": 0,
    "type": "Type-2",
    "status": "Available"
  },
  {
    "connectorId": 1,
    "type": "Type-2",
    "status": "Available"
  }
]
```

### Step 3: Get Charger Health
```bash
curl http://localhost:3000/api/chargers/RIVOT_100A_01/health
```

**Expected Response:**
```json
{
  "online": true,
  "lastSeen": "2026-01-23T07:35:00.000Z"
}
```

---

## ⚙️ Test Flow 3: Configure Charging

### Step 1: Get Charging Parameters
```bash
curl http://localhost:3000/api/chargers/RIVOT_100A_01/charging-params \
  -H "Authorization: Bearer $TOKEN"
```

**Expected Response:**
```json
{
  "currentSOC": 88.08,
  "currentRangeKm": 71.5,
  "maxRangeKm": 81,
  "variant": "Classic",
  "maxCapacityAh": 30,
  "currentAh": 26.42,
  "voltage": 76.66,
  "chargingRate": 2.88,
  "costPerKWh": 2.88
}
```

### Step 2: Create Prepaid Session
```bash
curl -X POST http://localhost:3000/api/prepaid/create \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "chargerId": "RIVOT_100A_01",
    "connectorId": 1,
    "amount": 20.50,
    "maxEnergyWh": 7000,
    "maxDurationSec": 1800
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "sessionId": 123,
  "message": "Prepaid session created. Proceed to payment."
}
```

**Save session ID:**
```bash
export SESSION_ID=123
```

---

## 💳 Test Flow 4: Payment & Start Charging

### Step 1: Simulate Payment (Mock)
```bash
# In real system, this would call payment gateway
# For testing, we'll use a mock transaction ID
export PAYMENT_ID="MOCK_TXN_$(date +%s)"
echo "Payment ID: $PAYMENT_ID"
```

### Step 2: Start Charging with Prepaid Session
```bash
curl -X POST http://localhost:3000/api/prepaid/start \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{
    \"sessionId\": $SESSION_ID,
    \"paymentId\": \"$PAYMENT_ID\"
  }"
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Charging started",
  "result": {
    "status": "Accepted"
  }
}
```

---

## 📊 Test Flow 5: Monitor Charging

### Step 1: Monitor Prepaid Session
```bash
curl http://localhost:3000/api/prepaid/monitor/$SESSION_ID \
  -H "Authorization: Bearer $TOKEN"
```

**Expected Response (Active):**
```json
{
  "status": "active",
  "currentEnergy": 1500,
  "currentCost": 4.32,
  "percentComplete": 21.43,
  "maxEnergy": 7000,
  "prepaidAmount": 20.50
}
```

### Step 2: Get Real-time SOC
```bash
curl http://localhost:3000/api/chargers/RIVOT_100A_01/soc
```

**Expected Response:**
```json
{
  "soc": 88.15,
  "voltage": "76.70 V",
  "current": "1.85 A",
  "power": "0.14 kW",
  "energy": "1500.00 Wh",
  "model": "NX-100 CLASSIC",
  "currentRangeKm": "71.6",
  "maxRangeKm": 84,
  "isCharging": true
}
```

### Step 3: Get Vehicle Info
```bash
curl http://localhost:3000/api/chargers/RIVOT_100A_01/vehicle-info
```

**Expected Response:**
```json
{
  "status": "Charging",
  "dataSource": "realtime",
  "dataAge": 5,
  "model": "Classic",
  "soc": 88.15,
  "currentAh": 26.45,
  "maxCapacityAh": 30,
  "currentRangeKm": 71,
  "maxRangeKm": 81,
  "bmsImax": 2,
  "temperature": 25.6,
  "voltage": 76.7,
  "lastUpdated": "2026-01-23T07:35:10.000Z"
}
```

---

## 🛑 Test Flow 6: Stop Charging

### Step 1: Stop Charging (Manual)
```bash
curl -X POST http://localhost:3000/api/chargers/RIVOT_100A_01/stop \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{}'
```

**Expected Response:**
```json
{
  "status": "Accepted"
}
```

### Step 2: Verify Session Completed
```bash
curl http://localhost:3000/api/prepaid/monitor/$SESSION_ID \
  -H "Authorization: Bearer $TOKEN"
```

**Expected Response:**
```json
{
  "status": "completed",
  "finalEnergy": 2000,
  "finalCost": 5.76,
  "percentComplete": 28.57
}
```

---

## 🌐 Test Flow 7: Browser Testing

### Step 1: Open Login Page
```
http://localhost/login.html
```

**Actions:**
1. Enter username: `user`
2. Enter password: `user`
3. Click LOGIN

**Expected:** Redirect to `/select-charger.html`

### Step 2: Select Charger
**Expected:** See list of chargers with connector status

**Actions:**
1. Click on "Connector 1" under "RIVOT_100A_01"

**Expected:** Redirect to `/configure-charge.html?charger=RIVOT_100A_01&connector=1`

### Step 3: Configure Charging
**Expected:** See charging configuration UI with:
- Mode tabs (Range, Time, Amount, Full)
- Slider for input
- Prediction card showing energy, time, SOC, range, cost

**Actions:**
1. Select "Range" mode
2. Move slider to desired range (e.g., 100 km)
3. Check predictions update
4. Click "PAY ₹XX.XX" button

**Expected:** 
- Payment processing
- Redirect to dashboard
- Charging starts

### Step 4: Monitor Dashboard
```
http://localhost/?charger=RIVOT_100A_01&connector=1
```

**Expected:** See real-time:
- SOC gauge
- Voltage, Current, Power, Energy metrics
- Start/Stop buttons
- Status updates every 5 seconds

---

## 🐛 Common Issues & Fixes

### Issue 1: "Access token required" (401)
**Cause:** Token not sent or expired

**Fix:**
```bash
# Re-login to get new token
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"user","password":"user"}'
```

### Issue 2: "Validation failed" (400)
**Cause:** Missing or invalid request fields

**Fix:** Check request body matches expected format:
```json
{
  "chargerId": "RIVOT_100A_01",  // String
  "connectorId": 1,               // Integer
  "amount": 20.50,                // Float
  "maxEnergyWh": 7000,            // Integer
  "maxDurationSec": 1800          // Integer
}
```

### Issue 3: "No active transaction" (400)
**Cause:** Trying to stop when no charging session active

**Fix:** Check active transaction first:
```bash
curl http://localhost:3000/api/chargers/RIVOT_100A_01/active
```

### Issue 4: Frontend shows "Cannot read properties of null"
**Cause:** DOM elements not loaded or missing

**Fix:** 
1. Clear browser cache (Ctrl+Shift+R)
2. Check browser console for errors
3. Verify all HTML elements exist

### Issue 5: CORS Error in Browser
**Cause:** Frontend served from different origin

**Fix:** Add origin to `.env`:
```bash
ALLOWED_ORIGINS=http://localhost:8081,http://localhost,https://ocpp.rivotmotors.com
```

---

## ✅ Success Criteria

### Authentication ✓
- [x] User can register
- [x] User can login
- [x] Token is stored in localStorage
- [x] Token is sent with API requests
- [x] Invalid token returns 401/403

### Charger Selection ✓
- [x] List all chargers
- [x] Show connector status
- [x] Only available connectors are clickable
- [x] Redirect to configure page with params

### Configuration ✓
- [x] Load charging parameters
- [x] Switch between modes (Range/Time/Amount/Full)
- [x] Predictions update on slider change
- [x] No null reference errors
- [x] Type conversions work correctly

### Payment & Start ✓
- [x] Create prepaid session
- [x] Validate all fields
- [x] Start charging via OCPP
- [x] Redirect to dashboard

### Monitoring ✓
- [x] Real-time SOC updates
- [x] Meter values display correctly
- [x] Session monitoring works
- [x] Auto-stop at limit

### Stop Charging ✓
- [x] Manual stop works
- [x] Session marked as completed
- [x] Final values recorded

---

## 📝 Test Results Log

| Test | Status | Notes |
|------|--------|-------|
| Auth - Register | ✅ | Token generated |
| Auth - Login | ✅ | Token stored |
| Auth - Verify | ✅ | User data returned |
| Chargers - List | ✅ | RIVOT_100A_01 found |
| Chargers - Connectors | ✅ | 2 connectors |
| Chargers - Health | ✅ | Online |
| Config - Params | ✅ | SOC 88.08% |
| Prepaid - Create | ✅ | Session ID 123 |
| Prepaid - Start | ✅ | Charging started |
| Monitor - Session | ✅ | Real-time data |
| Monitor - SOC | ✅ | Updates every 10s |
| Stop - Manual | ✅ | Accepted |

---

## 🚀 Next Steps

1. **Security Hardening**
   - [ ] Change JWT_SECRET in production
   - [ ] Enable HTTPS
   - [ ] Add rate limiting per user
   - [ ] Implement refresh tokens

2. **Feature Enhancements**
   - [ ] Real payment gateway integration
   - [ ] WebSocket for real-time updates
   - [ ] Email notifications
   - [ ] Transaction history

3. **Testing**
   - [ ] Unit tests for all endpoints
   - [ ] Integration tests
   - [ ] Load testing
   - [ ] Security penetration testing

---

**Last Updated:** January 23, 2026  
**Tested By:** System Administrator  
**Platform Version:** 1.0.0
