# Pre-Charge Data Integration - SteVe Database Storage

## Overview
Modified SteVe OCPP server to store DataTransfer messages (PreChargeData) directly in the database, eliminating the need for HTTP POST from charger firmware.

## What Changed

### 1. SteVe OCPP Server (Java)
**Modified Files:**
- `/opt/ev-platform/steve-csms/steve/src/main/java/de/rwth/idsg/steve/repository/OcppServerRepository.java`
- `/opt/ev-platform/steve-csms/steve/src/main/java/de/rwth/idsg/steve/repository/impl/OcppServerRepositoryImpl.java`
- `/opt/ev-platform/steve-csms/steve/src/main/java/de/rwth/idsg/steve/service/CentralSystemService16_Service.java`

**Changes:**
- Added `insertDataTransfer()` method to store DataTransfer messages
- Modified `dataTransfer()` handler to call database insert
- SteVe now stores: charge_box_id, vendor_id, message_id, data (JSON), received_at

### 2. flashCharge Backend (Node.js)
**Modified Files:**
- `/opt/ev-platform/flashCharge-backend/src/routes/chargers.js`

**Changes:**
- Removed POST `/api/chargers/:id/precharge-data` endpoint (no longer needed)
- GET `/api/chargers/:id/soc` already reads from `data_transfer` table (no changes needed)

### 3. Database
**Table:** `data_transfer` (already exists)
```sql
CREATE TABLE data_transfer (
  id INT AUTO_INCREMENT PRIMARY KEY,
  charge_box_id VARCHAR(255) NOT NULL,
  vendor_id VARCHAR(255),
  message_id VARCHAR(255),
  data TEXT,
  received_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_charge_box (charge_box_id),
  INDEX idx_message_id (message_id),
  INDEX idx_received_at (received_at)
);
```

## Data Flow (NEW - Simplified)

```
┌─────────────────┐
│ Charger Firmware│
│  (ESP32/C++)    │
└────────┬────────┘
         │
         │ 1. Gun Connected → Status: "Preparing"
         │
         │ 2. OCPP DataTransfer (WebSocket)
         │    vendorId: "RivotMotors"
         │    messageId: "PreChargeData"
         │    data: {"soc":44.07,"voltage":75.74,"maxCurrent":35,...}
         │
         ▼
┌─────────────────┐
│  SteVe OCPP     │
│  (Port 8080)    │──────► MySQL INSERT into data_transfer table
└─────────────────┘        (NEW: Automatic storage)
         │
         │ 3. Backend polls /soc endpoint
         │
         ▼
┌─────────────────┐
│ flashCharge API │
│  (Port 3000)    │──────► SELECT from data_transfer WHERE status='Preparing'
└─────────────────┘
         │
         │ 4. Returns pre-charge data
         │
         ▼
┌─────────────────┐
│  flashCharge UI │
│  (Browser)      │──────► Displays: SOC, Voltage, Model, Range
└─────────────────┘
```

## Benefits

### ✅ Advantages
1. **No HTTP POST needed** - Charger only sends OCPP DataTransfer (already working)
2. **Centralized storage** - All data in one database (SteVe's MySQL)
3. **More reliable** - Uses OCPP protocol (WebSocket) instead of HTTP
4. **Simpler firmware** - No additional HTTP client code needed
5. **Standard OCPP** - Uses official OCPP 1.6 DataTransfer message

### ❌ Previous Approach (Removed)
- Required charger to send HTTP POST to backend
- Needed additional HTTP client in firmware
- Two separate communication channels (OCPP + HTTP)
- More points of failure

## Charger Firmware Requirements

**No changes needed!** Charger already sends DataTransfer via OCPP:

```cpp
// Existing code in charger firmware (already working)
void sendPreChargeData() {
    // OCPP DataTransfer message
    ocpp.sendDataTransfer("RivotMotors", "PreChargeData", 
        "{\"soc\":44.07,\"voltage\":75.74,\"maxCurrent\":35,\"current\":0,\"temperature\":25.6}");
}
```

## Testing

### 1. Check if SteVe is storing data:
```bash
mysql -u steve -psteve steve -e "SELECT * FROM data_transfer ORDER BY received_at DESC LIMIT 5;"
```

### 2. Test backend SOC endpoint:
```bash
curl http://localhost:3000/api/chargers/RIVOT_100A_01/soc
```

Expected response when gun is connected (status: "Preparing"):
```json
{
  "soc": 44.07,
  "voltage": "75.7 V",
  "current": "0.0 A",
  "power": "0.00 kW",
  "energy": "0.00 Wh",
  "model": "NX-100 PRO",
  "currentRangeKm": "74.0",
  "maxRangeKm": "168",
  "isCharging": false,
  "dataSource": "precharge"
}
```

### 3. Check SteVe logs:
```bash
pm2 logs steve-csms --lines 50
```

Look for:
```
[Data Transfer] Charge point: RIVOT_100A_01, Vendor Id: RivotMotors
[Data Transfer] Message Id: PreChargeData
[Data Transfer] Data: {"soc":44.06833649,"maxCurrent":35,...}
Stored DataTransfer from RIVOT_100A_01 with messageId PreChargeData
```

## Deployment Status

### ✅ Completed
- [x] Modified SteVe to store DataTransfer messages
- [x] Rebuilt SteVe WAR file
- [x] Restarted SteVe service (PM2)
- [x] Removed POST endpoint from backend
- [x] Restarted backend service
- [x] Verified database table exists
- [x] Tested with existing data

### 🔄 Next Steps
1. Wait for charger to connect and send PreChargeData
2. Verify data appears in `data_transfer` table
3. Verify UI displays vehicle data when gun is connected
4. Monitor for any errors in SteVe logs

## Rollback Plan

If issues occur, revert to previous version:

```bash
# 1. Stop services
pm2 stop steve-csms flashcharge-backend

# 2. Restore previous SteVe version
cd /opt/ev-platform/steve-csms/steve
git checkout HEAD~1 src/main/java/de/rwth/idsg/steve/

# 3. Rebuild
./mvnw clean package -DskipTests

# 4. Restart
pm2 restart steve-csms flashcharge-backend
```

## Files Modified

```
/opt/ev-platform/
├── steve-csms/steve/
│   └── src/main/java/de/rwth/idsg/steve/
│       ├── repository/
│       │   ├── OcppServerRepository.java          (Added insertDataTransfer method)
│       │   └── impl/
│       │       └── OcppServerRepositoryImpl.java  (Implemented insertDataTransfer)
│       └── service/
│           └── CentralSystemService16_Service.java (Modified dataTransfer handler)
│
└── flashCharge-backend/
    └── src/routes/
        └── chargers.js                             (Removed POST /precharge-data endpoint)
```

## Summary

**Before:** Charger → OCPP DataTransfer → SteVe (logs only) + HTTP POST → Backend → Database  
**After:** Charger → OCPP DataTransfer → SteVe → Database ← Backend reads

**Result:** Simpler, more reliable, uses standard OCPP protocol. No firmware changes needed! ✅
