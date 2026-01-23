# Smart Charging System - Data Flow Diagram

## Complete User Journey

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         USER JOURNEY FLOW                                │
└─────────────────────────────────────────────────────────────────────────┘

Step 1: LOGIN
┌──────────────┐
│ login.html   │  User: rivot / rivot123
│              │  → POST /api/auth/login
│              │  ← JWT token stored in localStorage
└──────┬───────┘
       │
       ▼
Step 2: SELECT CHARGER
┌──────────────┐
│ select-      │  → GET /api/chargers/list
│ charger.html │  ← ["RIVOT_100A_01", "RIVOT_100A_02"]
│              │  
│              │  For each charger:
│              │  → GET /api/chargers/:id/connectors
│              │  ← [{connectorId: 1, status: "Available"}, ...]
│              │
│              │  User clicks: Connector 1
└──────┬───────┘
       │
       ▼
Step 3: CONFIGURE CHARGING (NEW!)
┌──────────────┐
│ configure-   │  → GET /api/chargers/:id/charging-params
│ charge.html  │  ← {
│              │      variant: "Pro",
│              │      currentSOC: 45.5,
│              │      currentAh: 27.3,
│              │      maxCapacityAh: 60,
│              │      currentRangeKm: 76.4,
│              │      chargingCurrent: 45.0,
│              │      voltage: 73.6,
│              │      pricing: 2.88
│              │    }
│              │
│              │  User selects mode: RANGE
│              │  User sets target: 150 km
│              │  
│              │  JavaScript calculates:
│              │  - Energy: 1.95 kWh
│              │  - Time: 35 min
│              │  - Final SOC: 89%
│              │  - Cost: ₹5.60
│              │
│              │  User clicks: START CHARGING
└──────┬───────┘
       │
       ▼
Step 4: START CHARGING
┌──────────────┐
│              │  → POST /api/chargers/:id/start
│              │    {
│              │      connectorId: 1,
│              │      idTag: "TEST_TAG"
│              │    }
│              │  ← { status: "Accepted" }
│              │
│              │  Redirect to: index.html?charger=X&connector=Y
└──────┬───────┘
       │
       ▼
Step 5: LIVE CHARGING DASHBOARD
┌──────────────┐
│ index.html   │  Every 5 seconds:
│              │  → GET /api/chargers/:id/soc
│              │  ← {
│              │      soc: 67.5,
│              │      voltage: 75.2,
│              │      current: 42.3,
│              │      power: 3.18,
│              │      energy: 1234.5,  ← Wh
│              │      isCharging: true
│              │    }
│              │
│              │  Calculate current cost:
│              │  currentCost = (1234.5 / 1000) × 2.88 = ₹3.55
│              │
│              │  Display:
│              │  - SOC: 68%
│              │  - Current: 42.3 A
│              │  - Power: 3.18 kW
│              │  - Current Cost: ₹3.55
│              │  - Target: ₹5.60 (63% complete)
│              │
│              │  User clicks: STOP CHARGING
└──────┬───────┘
       │
       ▼
Step 6: STOP CHARGING
┌──────────────┐
│              │  → POST /api/chargers/:id/stop
│              │  ← { status: "Accepted" }
│              │
│              │  Backend receives DataTransfer SessionSummary:
│              │  {
│              │    finalSoc: 89.2,
│              │    energyDelivered: 1.943,  ← kWh (from meter)
│              │    durationMinutes: 34
│              │  }
│              │
│              │  Final Bill: 1.943 × 2.88 = ₹5.60
└──────────────┘
```

---

## Backend Data Flow

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    BACKEND API ENDPOINTS                                 │
└─────────────────────────────────────────────────────────────────────────┘

Authentication:
POST /api/auth/login
  ├─ Input: { username, password }
  ├─ Verify: bcrypt.compare(password, password_hash)
  ├─ Generate: JWT token (24h expiry)
  └─ Output: { token, user: { id, username, role } }

Charger List:
GET /api/chargers/list
  ├─ Query: SELECT charge_box_id FROM charge_box
  └─ Output: ["RIVOT_100A_01", "RIVOT_100A_02"]

Connector Status:
GET /api/chargers/:id/connectors
  ├─ Query: SELECT connector_id, status FROM connector
  │         JOIN connector_status
  └─ Output: [
      { connectorId: 1, status: "Available" },
      { connectorId: 2, status: "Charging" }
    ]

Charging Parameters (NEW!):
GET /api/chargers/:id/charging-params
  ├─ Query 1: Get latest SoC
  │   SELECT value FROM connector_meter_value
  │   WHERE measurand = 'SoC'
  │   ORDER BY value_timestamp DESC LIMIT 1
  │
  ├─ Query 2: Get Current.Offered (BMS Imax)
  │   SELECT value FROM connector_meter_value
  │   WHERE measurand = 'Current.Offered'
  │   ORDER BY value_timestamp DESC LIMIT 1
  │
  ├─ Query 3: Get Voltage
  │   SELECT value FROM connector_meter_value
  │   WHERE measurand = 'Voltage'
  │   ORDER BY value_timestamp DESC LIMIT 1
  │
  ├─ Determine variant:
  │   if (currentOffered <= 30) → Classic (30 Ah, 84 km)
  │   if (currentOffered <= 60) → Pro (60 Ah, 168 km)
  │   if (currentOffered <= 100) → Max (90 Ah, 252 km)
  │
  ├─ Calculate:
  │   currentAh = (currentSOC × maxCapacityAh) / 100
  │   currentRangeKm = currentAh × 2.8
  │   chargingCurrent = currentOffered (from BMS)
  │
  └─ Output: {
      variant: "Pro",
      currentSOC: 45.5,
      currentAh: 27.3,
      maxCapacityAh: 60,
      currentRangeKm: 76.4,
      maxRangeKm: 168,
      voltage: 73.6,
      chargingCurrent: 45.0,
      pricing: 2.88,
      nominalVoltage: 73.6
    }

Start Charging:
POST /api/chargers/:id/start
  ├─ Auth: Verify JWT token
  ├─ Validate: chargePointId, connectorId, idTag
  ├─ Call SteVe API: POST /steve/api/v1/ocpp/RemoteStartTransaction
  └─ Output: { status: "Accepted" }

Stop Charging:
POST /api/chargers/:id/stop
  ├─ Auth: Verify JWT token
  ├─ Get active transaction ID from database
  ├─ Call SteVe API: POST /steve/api/v1/ocpp/RemoteStopTransaction
  └─ Output: { status: "Accepted" }

Real-time SOC:
GET /api/chargers/:id/soc
  ├─ Query: Get latest meter values
  │   SELECT measurand, value FROM connector_meter_value
  │   WHERE measurand IN ('SoC', 'Voltage', 'Current.Import', 
  │                        'Power.Active.Import', 
  │                        'Energy.Active.Import.Register')
  │   ORDER BY value_timestamp DESC
  │
  ├─ Check charging status:
  │   SELECT status FROM connector_status
  │   WHERE connector_pk = X
  │   ORDER BY status_timestamp DESC LIMIT 1
  │
  ├─ If NOT charging:
  │   current = 0
  │   power = 0
  │
  └─ Output: {
      soc: 67.5,
      voltage: 75.2,
      current: 42.3,  ← 0 if not charging
      power: 3.18,    ← 0 if not charging
      energy: 1234.5,
      model: "NX-100 PRO",
      currentRangeKm: 189.0,
      isCharging: true
    }
```

---

## Frontend Calculation Engine

```
┌─────────────────────────────────────────────────────────────────────────┐
│              CONFIGURE.JS - CALCULATION ENGINE                           │
└─────────────────────────────────────────────────────────────────────────┘

Input: Charging parameters from backend
{
  variant: "Pro",
  currentSOC: 45.5,
  currentAh: 27.3,
  maxCapacityAh: 60,
  currentRangeKm: 76.4,
  chargingCurrent: 45.0,
  voltage: 73.6,
  pricing: 2.88
}

Mode 1: RANGE
┌────────────────────────────────────┐
│ User Input: 150 km                 │
├────────────────────────────────────┤
│ rangeToAdd = 150 - 76.4 = 73.6 km  │
│ ahNeeded = 73.6 / 2.8 = 26.29 Ah   │
│ finalAh = 27.3 + 26.29 = 53.59 Ah  │
│ finalSOC = 53.59 / 60 × 100 = 89%  │
│ energykWh = 26.29 × 73.6 / 1000    │
│           = 1.935 kWh              │
│ timeMin = 26.29 / 45 × 60          │
│         = 35 minutes               │
│ cost = 1.935 × 2.88 = ₹5.57        │
└────────────────────────────────────┘

Mode 2: TIME
┌────────────────────────────────────┐
│ User Input: 30 minutes             │
├────────────────────────────────────┤
│ ahDelivered = 45 × 30 / 60         │
│             = 22.5 Ah              │
│ finalAh = 27.3 + 22.5 = 49.8 Ah    │
│ finalSOC = 49.8 / 60 × 100 = 83%   │
│ rangeAdded = 22.5 × 2.8 = 63 km    │
│ finalRange = 76.4 + 63 = 139.4 km  │
│ energykWh = 22.5 × 73.6 / 1000     │
│           = 1.656 kWh              │
│ cost = 1.656 × 2.88 = ₹4.77        │
└────────────────────────────────────┘

Mode 3: AMOUNT
┌────────────────────────────────────┐
│ User Input: ₹10                    │
├────────────────────────────────────┤
│ energykWh = 10 / 2.88 = 3.472 kWh  │
│ ahDelivered = 3472 / 73.6          │
│             = 47.17 Ah             │
│ finalAh = 27.3 + 47.17 = 74.47 Ah  │
│ BUT: Max 90% = 54 Ah               │
│ CAPPED: finalAh = 54 Ah            │
│ actualAh = 54 - 27.3 = 26.7 Ah     │
│ finalSOC = 90% (FULL)              │
│ rangeAdded = 26.7 × 2.8 = 74.8 km  │
│ finalRange = 76.4 + 74.8 = 151.2km │
│ actualEnergy = 26.7 × 73.6 / 1000  │
│              = 1.965 kWh           │
│ actualCost = 1.965 × 2.88 = ₹5.66  │
│ timeMin = 26.7 / 45 × 60 = 35.6min │
│ ⚠️ Capped at 90% SOC               │
└────────────────────────────────────┘

Mode 4: FULL
┌────────────────────────────────────┐
│ User Input: (automatic)            │
├────────────────────────────────────┤
│ targetAh = 60 × 0.9 = 54 Ah        │
│ ahNeeded = 54 - 27.3 = 26.7 Ah     │
│ finalSOC = 90%                     │
│ rangeAdded = 26.7 × 2.8 = 74.8 km  │
│ finalRange = 76.4 + 74.8 = 151.2km │
│ energykWh = 26.7 × 73.6 / 1000     │
│           = 1.965 kWh              │
│ timeMin = 26.7 / 45 × 60           │
│         = 35.6 minutes             │
│ cost = 1.965 × 2.88 = ₹5.66        │
└────────────────────────────────────┘

Real-time Update (during charging):
┌────────────────────────────────────┐
│ Every 5 seconds:                   │
│ Fetch: GET /api/chargers/:id/soc  │
│ Response: { energy: 1234.5 Wh }   │
│                                    │
│ currentCost = 1234.5 / 1000 × 2.88 │
│             = ₹3.55                │
│                                    │
│ progress = 3.55 / 5.66 × 100       │
│          = 63%                     │
│                                    │
│ Display:                           │
│ "Current Cost: ₹3.55"              │
│ "Target: ₹5.66 (63% complete)"    │
└────────────────────────────────────┘
```

---

## OCPP Message Flow

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    OCPP 1.6J MESSAGE FLOW                                │
└─────────────────────────────────────────────────────────────────────────┘

1. Charger Connects:
   Charger → SteVe: BootNotification
   SteVe → Charger: Accepted

2. Heartbeat (every 30s):
   Charger → SteVe: Heartbeat
   SteVe → Charger: HeartbeatResponse
   SteVe → Database: UPDATE charge_box SET last_heartbeat_timestamp = NOW()

3. User Starts Charging:
   UI → Backend: POST /api/chargers/:id/start
   Backend → SteVe: RemoteStartTransaction
   SteVe → Charger: RemoteStartTransaction.req
   Charger → SteVe: RemoteStartTransaction.conf (Accepted)
   
   Charger → SteVe: StatusNotification (status: "Preparing")
   Charger → SteVe: StartTransaction
   SteVe → Charger: StartTransaction.conf (transactionId: 123)
   Charger → SteVe: StatusNotification (status: "Charging")

4. During Charging (every 60s):
   Charger → SteVe: MeterValues
   {
     transactionId: 123,
     meterValue: [
       { measurand: "SoC", value: "67.5", unit: "Percent" },
       { measurand: "Voltage", value: "75.2", unit: "V" },
       { measurand: "Current.Import", value: "42.3", unit: "A" },
       { measurand: "Power.Active.Import", value: "3182", unit: "W" },
       { measurand: "Energy.Active.Import.Register", value: "1234.5", unit: "Wh" },
       { measurand: "Current.Offered", value: "45.0", unit: "A" },
       { measurand: "Temperature", value: "28.5", unit: "Celsius" }
     ]
   }
   SteVe → Database: INSERT INTO connector_meter_value

5. BMS Detects FULL (82V or 90% SOC):
   Charger → SteVe: StatusNotification (status: "Finishing")
   Charger → SteVe: DataTransfer
   {
     vendorId: "Rivot",
     messageId: "BMS_Status",
     data: "FULL"
   }

6. User Stops Charging:
   UI → Backend: POST /api/chargers/:id/stop
   Backend → SteVe: RemoteStopTransaction
   SteVe → Charger: RemoteStopTransaction.req
   Charger → SteVe: RemoteStopTransaction.conf (Accepted)
   
   Charger → SteVe: StopTransaction
   {
     transactionId: 123,
     meterStop: 1943,  ← Final energy (Wh)
     reason: "Remote"
   }
   
   Charger → SteVe: DataTransfer (SessionSummary)
   {
     vendorId: "Rivot",
     messageId: "SessionSummary",
     data: {
       finalSoc: 89.2,
       energyDelivered: 1.943,  ← kWh (from meter)
       durationMinutes: 34
     }
   }
   
   Charger → SteVe: StatusNotification (status: "Available")

7. Final Billing:
   Backend: finalCost = 1.943 × 2.88 = ₹5.60
   UI: Display "Total Cost: ₹5.60"
```

---

## Database Schema (Relevant Tables)

```sql
-- Charger registry
charge_box
├─ charge_box_id (PK)          "RIVOT_100A_01"
├─ last_heartbeat_timestamp    2026-01-17 10:30:45
└─ ocpp_protocol               "1.6"

-- Connectors
connector
├─ connector_pk (PK)           1
├─ charge_box_id (FK)          "RIVOT_100A_01"
└─ connector_id                1

-- Connector status
connector_status
├─ connector_pk (FK)           1
├─ status                      "Charging"
└─ status_timestamp            2026-01-17 10:30:45

-- Meter values (OCPP data)
connector_meter_value
├─ connector_pk (FK)           1
├─ transaction_pk (FK)         123
├─ measurand                   "SoC"
├─ value                       "67.5"
├─ unit                        "Percent"
└─ value_timestamp             2026-01-17 10:30:45

-- Transactions
transaction
├─ transaction_pk (PK)         123
├─ connector_pk (FK)           1
├─ id_tag                      "TEST_TAG"
├─ start_timestamp             2026-01-17 10:00:00
├─ start_value                 0
├─ stop_timestamp              2026-01-17 10:34:00
└─ stop_value                  1943  ← Final energy (Wh)
```

---

## Summary

**Data Sources:**
- Battery state: `connector_meter_value` (SoC, Voltage, Current.Offered)
- Charging status: `connector_status` (Available, Charging, Finishing)
- Real-time metrics: `connector_meter_value` (Current, Power, Energy)
- Final billing: `transaction.stop_value` or DataTransfer SessionSummary

**Calculation Constants:**
- Nominal voltage: 73.6V (23S LFP)
- Range formula: 1 Ah = 2.8 km
- Pricing: ₹2.88/kWh
- FULL charge: 82V or 90% SOC

**Key Endpoints:**
- `/api/chargers/:id/charging-params` - Get battery state for configuration
- `/api/chargers/:id/start` - Start charging
- `/api/chargers/:id/soc` - Real-time metrics during charging
- `/api/chargers/:id/stop` - Stop charging

**Implementation Time:** 6 hours total
