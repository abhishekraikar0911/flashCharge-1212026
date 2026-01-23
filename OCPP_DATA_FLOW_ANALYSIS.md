# OCPP Data Flow Analysis - VehicleInfo & SessionSummary

**Date:** January 21, 2026  
**Status:** 📋 ANALYSIS ONLY - NO CODE CHANGES YET

---

## 🎯 Overview

Your OCPP client now sends **two custom DataTransfer messages**:

1. **VehicleInfo** - BEFORE charging starts (when gun plugged)
2. **SessionSummary** - AFTER charging stops (session complete)

---

## 📊 Complete Data Flow

### **Phase 1: Gun Plugged (Pre-Charge)**

```
User plugs gun into vehicle
    ↓
StatusNotification: "Preparing"
    ↓
DataTransfer: VehicleInfo ✨ NEW
{
  "vendorId": "RivotMotors",
  "messageId": "VehicleInfo",
  "data": {
    "soc": 87.00,
    "maxCurrent": 2,      // BMS_Imax (for model detection)
    "voltage": 76.38,
    "temperature": 26.6
  }
}
    ↓
SteVe receives and stores
    ↓
Backend should query this
    ↓
UI shows PRE-CHARGE info:
  - Model: Classic (from maxCurrent)
  - Current SOC: 87%
  - Current Range: 70 km
  - Temperature: 26.6°C
  - "Ready to charge"
```

### **Phase 2: Charging Started**

```
User clicks "Start Charging"
    ↓
RemoteStartTransaction
    ↓
StartTransaction (transactionId: 130)
    ↓
StatusNotification: "Charging"
    ↓
MeterValues every 10 seconds
{
  "Energy.Active.Import.Register": "0 Wh",
  "Power.Active.Import": "142 W",
  "SoC": "87.07%",
  "Voltage": "77.15 V",
  "Current.Import": "1.85 A"
}
    ↓
⚠️ IMPORTANT: Stop using VehicleInfo
⚠️ Switch to MeterValues for live data
```

### **Phase 3: Charging Stopped**

```
User clicks "Stop Charging"
    ↓
RemoteStopTransaction
    ↓
DataTransfer: SessionSummary ✨ NEW
{
  "vendorId": "RivotMotors",
  "messageId": "SessionSummary",
  "data": {
    "finalSoc": 87.17667389,
    "energyDelivered": 3.387327194,  // Wh
    "durationMinutes": 1.497583389
  }
}
    ↓
StatusNotification: "Finishing"
    ↓
StopTransaction
    ↓
StatusNotification: "Available"
```

---

## 🗄️ How SteVe Stores DataTransfer

SteVe has a built-in table for DataTransfer messages:

### **Table: `ocpp_tag`** (or `data_transfer`)

```sql
CREATE TABLE ocpp_tag (
  ocpp_tag_pk BIGINT PRIMARY KEY AUTO_INCREMENT,
  charge_box_id VARCHAR(255),
  vendor_id VARCHAR(255),
  message_id VARCHAR(255),
  data TEXT,  -- JSON string
  received_timestamp DATETIME,
  INDEX idx_charge_box (charge_box_id),
  INDEX idx_message_id (message_id)
);
```

**Example rows:**

| ocpp_tag_pk | charge_box_id | vendor_id | message_id | data | received_timestamp |
|-------------|---------------|-----------|------------|------|-------------------|
| 1 | RIVOT_100A_01 | RivotMotors | VehicleInfo | `{"soc":87.00,"maxCurrent":2,...}` | 2026-01-21 09:52:15 |
| 2 | RIVOT_100A_01 | RivotMotors | SessionSummary | `{"finalSoc":87.17,...}` | 2026-01-21 09:53:51 |

---

## 🔄 Data Source Handover (CRITICAL)

### **Before RemoteStart:**
- ✅ Use **VehicleInfo** (DataTransfer)
- ❌ No MeterValues available yet
- ❌ No transaction exists

### **During Charging:**
- ❌ Stop using VehicleInfo
- ✅ Use **MeterValues** (real-time)
- ✅ Transaction active

### **After Charging:**
- ❌ Stop using MeterValues
- ✅ Use **SessionSummary** (DataTransfer)
- ✅ Transaction completed

---

## 🎯 Backend Implementation Plan

### **1. New Endpoint: Pre-Charge Vehicle Info**

```
GET /api/chargers/:id/pre-charge-info
```

**Purpose:** Get vehicle info BEFORE charging starts

**Query Logic:**
```sql
SELECT data, received_timestamp
FROM ocpp_tag
WHERE charge_box_id = 'RIVOT_100A_01'
  AND message_id = 'VehicleInfo'
  AND received_timestamp >= DATE_SUB(NOW(), INTERVAL 5 MINUTE)
ORDER BY received_timestamp DESC
LIMIT 1;
```

**Response:**
```json
{
  "connected": true,
  "status": "Preparing",
  "vehicleInfo": {
    "soc": 87.00,
    "maxCurrent": 2,
    "voltage": 76.38,
    "temperature": 26.6
  },
  "calculated": {
    "model": "Classic",
    "currentRange": 70,
    "maxRange": 81,
    "currentAh": 26.1
  },
  "canCharge": true,
  "lastUpdated": "2026-01-21T09:52:15Z"
}
```

---

### **2. New Endpoint: Session Summary**

```
GET /api/transactions/:id/summary
```

**Purpose:** Get session summary AFTER charging stops

**Query Logic:**
```sql
SELECT ot.data, t.transaction_pk
FROM ocpp_tag ot
JOIN transaction t ON t.charge_box_id = ot.charge_box_id
WHERE t.transaction_pk = 130
  AND ot.message_id = 'SessionSummary'
  AND ot.received_timestamp >= t.start_timestamp
  AND ot.received_timestamp <= COALESCE(t.stop_timestamp, NOW())
ORDER BY ot.received_timestamp DESC
LIMIT 1;
```

**Response:**
```json
{
  "transactionId": 130,
  "summary": {
    "finalSoc": 87.18,
    "energyDelivered": 3.39,
    "durationMinutes": 1.50
  },
  "calculated": {
    "startSoc": 87.00,
    "socGain": 0.18,
    "rangeAdded": 0.5,
    "averagePower": 135.5
  }
}
```

---

### **3. Modified Endpoint: Vehicle Info (During Charging)**

```
GET /api/chargers/:id/vehicle-info
```

**Current behavior:** Uses MeterValues (Current.Offered for model)

**New behavior:** 
- If status = "Preparing" → Use VehicleInfo (DataTransfer)
- If status = "Charging" → Use MeterValues (existing logic)
- If status = "Available" → Return cached/last known

---

## 🎨 UI Implementation Plan

### **Screen 1: Pre-Charge (Gun Plugged)**

```
┌─────────────────────────────────────┐
│  🔌 Vehicle Connected               │
├─────────────────────────────────────┤
│                                     │
│  Model: Classic                     │
│  Current SOC: 87%                   │
│  Current Range: 70 km               │
│  Temperature: 26.6°C                │
│  Voltage: 76.4 V                    │
│                                     │
│  ┌─────────────────────────────┐   │
│  │     SOC Gauge (87%)         │   │
│  │         [●●●●●●●○○○]        │   │
│  └─────────────────────────────┘   │
│                                     │
│  Charge to:                         │
│  ○ 90% (+3%, ~8 km, ~5 min)        │
│  ○ 100% (+13%, ~35 km, ~20 min)    │
│  ● Custom: [90]%                    │
│                                     │
│  ┌─────────────────────────────┐   │
│  │   ⚡ START CHARGING          │   │
│  └─────────────────────────────┘   │
└─────────────────────────────────────┘
```

**Data Source:** `/api/chargers/RIVOT_100A_01/pre-charge-info`

---

### **Screen 2: Charging (Active)**

```
┌─────────────────────────────────────┐
│  ⚡ Charging...                      │
├─────────────────────────────────────┤
│                                     │
│  Model: Classic                     │
│  Current SOC: 87.12%                │
│  Current Range: 70 km               │
│  Power: 142 W                       │
│  Current: 1.85 A                    │
│  Voltage: 77.15 V                   │
│                                     │
│  ┌─────────────────────────────┐   │
│  │     SOC Gauge (87.12%)      │   │
│  │         [●●●●●●●○○○]        │   │
│  └─────────────────────────────┘   │
│                                     │
│  Energy Delivered: 2 Wh             │
│  Duration: 0:00:40                  │
│  Target: 90%                        │
│  Estimated Time: 4:20               │
│                                     │
│  ┌─────────────────────────────┐   │
│  │   ⛔ STOP CHARGING           │   │
│  └─────────────────────────────┘   │
└─────────────────────────────────────┘
```

**Data Source:** `/api/chargers/RIVOT_100A_01/vehicle-info` (MeterValues)

---

### **Screen 3: Session Complete**

```
┌─────────────────────────────────────┐
│  ✅ Charging Complete                │
├─────────────────────────────────────┤
│                                     │
│  Session Summary                    │
│                                     │
│  Started: 87.00%                    │
│  Finished: 87.18%                   │
│  Gained: +0.18%                     │
│                                     │
│  Energy Delivered: 3.39 Wh          │
│  Duration: 1 min 30 sec             │
│  Average Power: 135 W               │
│                                     │
│  Range Added: ~0.5 km               │
│                                     │
│  ┌─────────────────────────────┐   │
│  │   📄 VIEW RECEIPT            │   │
│  └─────────────────────────────┘   │
│  ┌─────────────────────────────┐   │
│  │   🔙 BACK TO HOME            │   │
│  └─────────────────────────────┘   │
└─────────────────────────────────────┘
```

**Data Source:** `/api/transactions/130/summary` (SessionSummary)

---

## 🔍 Database Queries Needed

### **Query 1: Get Latest VehicleInfo**

```sql
SELECT 
  ot.data,
  ot.received_timestamp,
  cs.status
FROM ocpp_tag ot
JOIN charge_box cb ON cb.charge_box_id = ot.charge_box_id
JOIN connector c ON c.charge_box_pk = cb.charge_box_pk
LEFT JOIN connector_status cs ON cs.connector_pk = c.connector_pk
WHERE ot.charge_box_id = ?
  AND ot.message_id = 'VehicleInfo'
  AND ot.received_timestamp >= DATE_SUB(NOW(), INTERVAL 5 MINUTE)
  AND cs.status = 'Preparing'
ORDER BY ot.received_timestamp DESC
LIMIT 1;
```

---

### **Query 2: Get SessionSummary for Transaction**

```sql
SELECT 
  ot.data,
  ot.received_timestamp,
  t.start_timestamp,
  t.stop_timestamp
FROM ocpp_tag ot
JOIN transaction t ON t.charge_box_id = ot.charge_box_id
WHERE t.transaction_pk = ?
  AND ot.message_id = 'SessionSummary'
  AND ot.received_timestamp BETWEEN t.start_timestamp AND COALESCE(t.stop_timestamp, NOW())
ORDER BY ot.received_timestamp DESC
LIMIT 1;
```

---

### **Query 3: Check if VehicleInfo is Fresh**

```sql
SELECT 
  TIMESTAMPDIFF(SECOND, received_timestamp, NOW()) as age_seconds
FROM ocpp_tag
WHERE charge_box_id = ?
  AND message_id = 'VehicleInfo'
ORDER BY received_timestamp DESC
LIMIT 1;
```

**Logic:**
- If `age_seconds < 300` (5 min) → Use VehicleInfo
- Else → Show "Stale data" or "Reconnect vehicle"

---

## ⚠️ Important Considerations

### **1. Data Freshness**

**VehicleInfo** is only valid when:
- Status = "Preparing"
- Received within last 5 minutes
- No active transaction

**If stale:**
- Show "Please reconnect vehicle"
- Disable "Start Charging" button

---

### **2. Data Source Priority**

```
Status: Available
  → No data available
  → Show "Plug in vehicle"

Status: Preparing
  → Use VehicleInfo (DataTransfer)
  → Show pre-charge screen

Status: Charging
  → Use MeterValues
  → Show live charging screen

Status: Finishing
  → Use SessionSummary (DataTransfer)
  → Show completion screen

Status: Available (after charging)
  → Use SessionSummary (cached)
  → Show "Last session" summary
```

---

### **3. Model Detection Logic**

**From VehicleInfo (Pre-Charge):**
```javascript
const maxCurrent = vehicleInfo.maxCurrent; // 2A

if (maxCurrent >= 0 && maxCurrent <= 30) {
  model = "Classic";
  maxCapacityAh = 30;
} else if (maxCurrent >= 31 && maxCurrent <= 60) {
  model = "Pro";
  maxCapacityAh = 60;
} else if (maxCurrent >= 61 && maxCurrent <= 100) {
  model = "Max";
  maxCapacityAh = 90;
}
```

**From MeterValues (During Charging):**
```javascript
// Same logic but using Current.Offered from MeterValues
```

---

## 📊 Comparison: Before vs After

| Feature | BEFORE | AFTER |
|---------|--------|-------|
| **Pre-charge info** | ❌ Not available | ✅ VehicleInfo (DataTransfer) |
| **User sees SOC before charging** | ❌ No | ✅ Yes |
| **User can choose charge level** | ❌ No | ✅ Yes (90%, 100%, custom) |
| **Live charging data** | ✅ MeterValues | ✅ MeterValues (same) |
| **Session summary** | ❌ Manual calculation | ✅ SessionSummary (DataTransfer) |
| **Accurate final SOC** | ❌ Last MeterValue | ✅ finalSoc from summary |
| **Total energy** | ❌ Calculated | ✅ energyDelivered from summary |

---

## 🎯 Implementation Priority

### **Phase 1: Backend (High Priority)**
1. ✅ Check if SteVe stores DataTransfer in `ocpp_tag` table
2. ✅ Create `/api/chargers/:id/pre-charge-info` endpoint
3. ✅ Create `/api/transactions/:id/summary` endpoint
4. ✅ Test with real data

### **Phase 2: UI (Medium Priority)**
1. ✅ Add pre-charge screen
2. ✅ Add charge level selector (90%, 100%, custom)
3. ✅ Add session summary screen
4. ✅ Update polling logic (check status first)

### **Phase 3: Enhancement (Low Priority)**
1. ✅ Add estimated time to charge
2. ✅ Add range gain calculator
3. ✅ Add session history
4. ✅ Add receipt generation

---

## ✅ Next Steps

**Before making ANY code changes:**

1. **Verify SteVe stores DataTransfer:**
   ```sql
   SELECT * FROM ocpp_tag 
   WHERE charge_box_id = 'RIVOT_100A_01' 
   ORDER BY received_timestamp DESC 
   LIMIT 10;
   ```

2. **Check table structure:**
   ```sql
   DESCRIBE ocpp_tag;
   ```

3. **Confirm data format:**
   - Is `data` field JSON string or parsed?
   - Are there separate columns for vendor_id, message_id?

4. **Get your approval on:**
   - UI design (pre-charge screen)
   - Charge level selector (90%, 100%, custom)
   - Session summary display

---

## 📝 Summary

**What Changed:**
- ✅ VehicleInfo sent BEFORE charging (gun plugged)
- ✅ SessionSummary sent AFTER charging (session complete)

**What We Need to Do:**
- ✅ Query VehicleInfo from database (pre-charge)
- ✅ Display vehicle info BEFORE user starts charging
- ✅ Let user choose charge level (90%, 100%, custom)
- ✅ Query SessionSummary from database (post-charge)
- ✅ Display accurate session summary

**What We DON'T Change:**
- ❌ MeterValues logic (during charging) - stays the same
- ❌ Start/Stop charging flow - stays the same
- ❌ SteVe configuration - already handles DataTransfer

---

**Status:** 📋 ANALYSIS COMPLETE - AWAITING YOUR APPROVAL TO PROCEED

**Last Updated:** January 21, 2026
