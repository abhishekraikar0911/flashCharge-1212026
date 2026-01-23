# Pre-Charge Data Implementation

## ✅ What Was Implemented

Real-time vehicle data display when user connects charging gun to the station (before starting charging).

---

## 🔄 How It Works

### **Flow:**

```
1. User plugs gun into vehicle
   ↓
2. Charger firmware reads vehicle data (SOC, voltage, maxCurrent)
   ↓
3. Charger sends DataTransfer to SteVe (OCPP protocol)
   ↓
4. Charger ALSO sends HTTP POST to flashCharge backend
   POST /api/chargers/RIVOT_100A_01/precharge-data
   {
     "soc": 44.07,
     "voltage": 75.74,
     "current": 0,
     "temperature": 25.6,
     "maxCurrent": 35
   }
   ↓
5. Backend stores in data_transfer table
   ↓
6. UI polls /api/chargers/RIVOT_100A_01/soc every 5 seconds
   ↓
7. Backend checks connector status:
   - If status = "Preparing" → Return pre-charge data
   - If status = "Charging" → Return meter values
   ↓
8. UI displays real-time data immediately
```

---

## 📊 Database Changes

### **New Table:**
```sql
CREATE TABLE data_transfer (
  id INT AUTO_INCREMENT PRIMARY KEY,
  charge_box_id VARCHAR(255) NOT NULL,
  vendor_id VARCHAR(255),
  message_id VARCHAR(255),
  data TEXT,
  received_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_charge_box (charge_box_id),
  INDEX idx_message_id (message_id)
);
```

---

## 🔧 Backend Changes

### **New Endpoint:**
```
POST /api/chargers/:id/precharge-data
```

**Purpose:** Receive pre-charge data from charger firmware

**Request Body:**
```json
{
  "soc": 44.07,
  "voltage": 75.74,
  "current": 0,
  "temperature": 25.6,
  "maxCurrent": 35
}
```

### **Modified Endpoint:**
```
GET /api/chargers/:id/soc
```

**Changes:**
- Now checks for pre-charge data when status = "Preparing"
- Returns pre-charge data if available (within last 10 minutes)
- Falls back to meter values if no pre-charge data

---

## ⚡ Charger Firmware Changes Required

Your charger firmware needs to send data to TWO places:

### **1. SteVe (OCPP DataTransfer) - Already Working ✅**
```json
{
  "vendorId": "RivotMotors",
  "messageId": "PreChargeData",
  "data": "{\"soc\":44.07,\"maxCurrent\":35,\"voltage\":75.74,\"current\":0,\"temperature\":25.6}"
}
```

### **2. flashCharge Backend (HTTP POST) - NEW ⚠️**
```bash
curl -X POST https://ocpp.rivotmotors.com/api/chargers/RIVOT_100A_01/precharge-data \
  -H "Content-Type: application/json" \
  -d '{
    "soc": 44.07,
    "voltage": 75.74,
    "current": 0,
    "temperature": 25.6,
    "maxCurrent": 35
  }'
```

---

## 🎯 User Experience

### **Before (Old Behavior):**
```
1. User plugs gun → UI shows 0%
2. User clicks START → Charging begins
3. After 5-10 seconds → UI shows SOC
```

### **After (New Behavior):**
```
1. User plugs gun → UI shows 44% immediately ✅
2. User sees vehicle model (Classic/Pro/Max) ✅
3. User sees current range ✅
4. User clicks START → Charging begins
5. UI continues showing real-time data ✅
```

---

## 📱 UI Changes

**No UI changes needed!** The existing UI automatically displays pre-charge data because:

1. UI polls `/api/chargers/:id/soc` every 5 seconds
2. Backend now returns pre-charge data when status = "Preparing"
3. UI displays whatever data the backend returns

---

## ✅ Testing

### **Test Pre-Charge Data:**

```bash
# 1. Simulate gun connection (set status to Preparing)
# This happens automatically when you plug the gun

# 2. Send pre-charge data
curl -X POST http://localhost:3000/api/chargers/RIVOT_100A_01/precharge-data \
  -H "Content-Type: application/json" \
  -d '{
    "soc": 44.07,
    "voltage": 75.74,
    "current": 0,
    "temperature": 25.6,
    "maxCurrent": 35
  }'

# 3. Check if data is stored
mysql -u steve -psteve steve -e "SELECT * FROM data_transfer ORDER BY received_at DESC LIMIT 1;"

# 4. Check if UI shows data
curl http://localhost:3000/api/chargers/RIVOT_100A_01/soc
```

---

## 🔍 Troubleshooting

### **Issue: UI still shows 0% after plugging gun**

**Check:**
1. Is connector status "Preparing"?
   ```bash
   curl http://localhost:3000/api/chargers/RIVOT_100A_01/connectors/1
   ```

2. Is pre-charge data in database?
   ```bash
   mysql -u steve -psteve steve -e "SELECT * FROM data_transfer WHERE charge_box_id='RIVOT_100A_01' ORDER BY received_at DESC LIMIT 1;"
   ```

3. Is charger sending POST request?
   ```bash
   pm2 logs flashcharge-backend | grep "PreCharge"
   ```

---

## 📝 Next Steps

### **Required: Update Charger Firmware**

Add this code to your charger firmware (when gun is connected):

```c
// After reading vehicle data via CAN bus
void sendPreChargeData(float soc, float voltage, int maxCurrent) {
    // 1. Send to SteVe (OCPP) - Already implemented ✅
    sendDataTransfer("RivotMotors", "PreChargeData", jsonData);
    
    // 2. Send to flashCharge backend - ADD THIS ⚠️
    char url[256];
    sprintf(url, "https://ocpp.rivotmotors.com/api/chargers/%s/precharge-data", chargerID);
    
    char payload[512];
    sprintf(payload, "{\"soc\":%.2f,\"voltage\":%.2f,\"current\":0,\"temperature\":%.1f,\"maxCurrent\":%d}",
            soc, voltage, temperature, maxCurrent);
    
    httpPost(url, payload);
}
```

---

## ⏱️ Data Freshness

- Pre-charge data is valid for **10 minutes**
- After 10 minutes, backend falls back to meter values
- This prevents showing stale data

---

## 🎉 Benefits

1. ✅ **Instant feedback** - User sees data immediately
2. ✅ **Better UX** - No waiting for charging to start
3. ✅ **Informed decision** - User knows SOC before charging
4. ✅ **Vehicle detection** - Shows correct model (Classic/Pro/Max)
5. ✅ **No UI changes** - Works with existing interface

---

**Status:** ✅ Backend Ready - Waiting for charger firmware update

**Last Updated:** January 23, 2026
