# DataTransfer Storage Investigation - Findings

**Date:** January 21, 2026  
**Status:** ⚠️ IMPORTANT DISCOVERY

---

## 🔍 Investigation Results

### **Finding: SteVe Does NOT Store DataTransfer in Database**

After checking the SteVe database, I found:

✅ **What SteVe HAS:**
- `ocpp_tag` table → For RFID tags (not DataTransfer messages)
- `connector_meter_value` → For MeterValues
- `transaction` → For charging sessions
- `connector_status` → For status updates

❌ **What SteVe DOES NOT HAVE:**
- No `data_transfer` table
- No storage for custom DataTransfer messages
- DataTransfer messages are only LOGGED, not STORED

---

## 📋 What This Means

### **Current Behavior:**

```
Charger sends DataTransfer
    ↓
SteVe receives it
    ↓
SteVe logs it to console/file
    ↓
SteVe responds "Accepted"
    ↓
❌ Data is NOT stored in database
    ↓
❌ Data is LOST after response
```

**From your logs:**
```
[INFO] [Data Transfer] Charge point: RIVOT_100A_01, Vendor Id: RivotMotors
[INFO] [Data Transfer] Message Id: SessionSummary
[INFO] [Data Transfer] Data: {"finalSoc":87.17667389,...}
```

This is **logged** but **not stored** in the database.

---

## 💡 Solutions

We have **3 options** to handle VehicleInfo and SessionSummary:

---

### **Option 1: Modify SteVe to Store DataTransfer** ⭐ BEST

**Pros:**
- ✅ Proper database storage
- ✅ Can query historical data
- ✅ Clean architecture
- ✅ Persistent across restarts

**Cons:**
- ❌ Requires modifying SteVe Java code
- ❌ Need to rebuild SteVe
- ❌ More complex

**Implementation:**
1. Create new table `data_transfer`
2. Modify SteVe's `CentralSystemService16_Service.java`
3. Store DataTransfer messages in database
4. Query from our backend

**Estimated Time:** 4-6 hours

---

### **Option 2: Parse SteVe Logs** 🟡 MEDIUM

**Pros:**
- ✅ No SteVe modification needed
- ✅ Works with current setup
- ✅ Quick to implement

**Cons:**
- ❌ Fragile (log format changes break it)
- ❌ Performance issues with large logs
- ❌ Data lost if logs rotated
- ❌ Not scalable

**Implementation:**
1. Tail SteVe log file
2. Parse DataTransfer messages
3. Store in our own table
4. Query from backend

**Estimated Time:** 2-3 hours

---

### **Option 3: Store in Backend When Received** ⭐ RECOMMENDED

**Pros:**
- ✅ No SteVe modification needed
- ✅ Clean separation of concerns
- ✅ Easy to implement
- ✅ Scalable

**Cons:**
- ❌ Need to intercept OCPP messages
- ❌ Requires WebSocket listener

**Implementation:**
1. Create our own table `vehicle_data_transfer`
2. Listen to SteVe WebSocket (or poll logs)
3. Store VehicleInfo and SessionSummary
4. Query from backend

**Estimated Time:** 3-4 hours

---

## 🎯 Recommended Approach

### **Hybrid Solution: Store in Our Backend**

Since SteVe doesn't store DataTransfer, we'll create our own storage:

#### **Step 1: Create Our Own Table**

```sql
CREATE TABLE vehicle_data_transfer (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  charge_box_id VARCHAR(255) NOT NULL,
  message_id VARCHAR(50) NOT NULL,  -- 'VehicleInfo' or 'SessionSummary'
  data JSON NOT NULL,
  transaction_id INT NULL,
  received_timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  INDEX idx_charge_box (charge_box_id),
  INDEX idx_message_id (message_id),
  INDEX idx_transaction (transaction_id),
  INDEX idx_timestamp (received_timestamp)
);
```

#### **Step 2: Parse SteVe Logs (Simple Approach)**

Create a log parser that runs periodically:

```javascript
// Parse SteVe log file
const logLine = "[INFO] [Data Transfer] Data: {\"finalSoc\":87.17,...}";

// Extract data
const match = logLine.match(/Data: ({.*})/);
if (match) {
  const data = JSON.parse(match[1]);
  
  // Store in our table
  await db.query(`
    INSERT INTO vehicle_data_transfer 
    (charge_box_id, message_id, data)
    VALUES (?, ?, ?)
  `, [chargeBoxId, messageId, JSON.stringify(data)]);
}
```

#### **Step 3: Query from Backend**

```javascript
// Get latest VehicleInfo
router.get("/:id/pre-charge-info", async (req, res) => {
  const [rows] = await db.query(`
    SELECT data, received_timestamp
    FROM vehicle_data_transfer
    WHERE charge_box_id = ?
      AND message_id = 'VehicleInfo'
      AND received_timestamp >= DATE_SUB(NOW(), INTERVAL 5 MINUTE)
    ORDER BY received_timestamp DESC
    LIMIT 1
  `, [req.params.id]);
  
  if (!rows.length) {
    return res.json({ connected: false });
  }
  
  const vehicleInfo = JSON.parse(rows[0].data);
  // ... calculate model, range, etc.
  res.json({ connected: true, vehicleInfo, ... });
});
```

---

## 🚀 Alternative: Use MeterValues as Fallback

Since we can't easily get VehicleInfo from database, we can use **MeterValues** as a workaround:

### **Workaround Logic:**

```javascript
// When status changes to "Preparing"
// Query the LAST MeterValues from previous session

const [rows] = await db.query(`
  SELECT 
    cmv.measurand,
    cmv.value
  FROM connector_meter_value cmv
  JOIN connector c ON c.connector_pk = cmv.connector_pk
  WHERE c.charge_box_id = ?
    AND cmv.measurand IN ('SoC', 'Current.Offered', 'Temperature', 'Voltage')
  ORDER BY cmv.value_timestamp DESC
  LIMIT 10
`, [chargeBoxId]);

// Group by measurand
const latest = {};
rows.forEach(row => {
  if (!latest[row.measurand]) {
    latest[row.measurand] = parseFloat(row.value);
  }
});

// Use as pre-charge info
const preChargeInfo = {
  soc: latest['SoC'] || 0,
  maxCurrent: latest['Current.Offered'] || 2,
  temperature: latest['Temperature'] || 0,
  voltage: latest['Voltage'] || 0
};
```

**Pros:**
- ✅ Works with existing database
- ✅ No log parsing needed
- ✅ No SteVe modification

**Cons:**
- ❌ Data might be stale (from previous session)
- ❌ Not as accurate as VehicleInfo

---

## 📊 Comparison of Solutions

| Solution | Complexity | Accuracy | Scalability | Time |
|----------|-----------|----------|-------------|------|
| **Modify SteVe** | High | Perfect | Excellent | 4-6h |
| **Parse Logs** | Medium | Good | Poor | 2-3h |
| **Own Table + Log Parser** | Medium | Good | Good | 3-4h |
| **Use MeterValues Fallback** | Low | Fair | Excellent | 1-2h |

---

## ✅ My Recommendation

### **Phase 1: Quick Win (Use MeterValues Fallback)**

Implement the MeterValues fallback approach:
- Query last known SoC, Current.Offered, Temperature
- Show as "Last Known" data when status = "Preparing"
- Add disclaimer: "Data from last session"

**Time:** 1-2 hours  
**Benefit:** Works immediately with existing database

---

### **Phase 2: Proper Solution (Own Table + Log Parser)**

Create our own `vehicle_data_transfer` table:
- Parse SteVe logs for DataTransfer messages
- Store VehicleInfo and SessionSummary
- Query from backend

**Time:** 3-4 hours  
**Benefit:** Accurate, real-time data

---

### **Phase 3: Production (Modify SteVe)**

If you need production-grade solution:
- Modify SteVe to store DataTransfer in database
- Rebuild and redeploy SteVe
- Query directly from SteVe database

**Time:** 4-6 hours  
**Benefit:** Clean, scalable, maintainable

---

## 🎯 Next Steps

**What do you want to do?**

1. **Quick Win:** Use MeterValues fallback (1-2h)
   - ✅ Works now
   - ⚠️ Data might be stale

2. **Medium Solution:** Parse logs + own table (3-4h)
   - ✅ Accurate data
   - ⚠️ Requires log parsing

3. **Full Solution:** Modify SteVe (4-6h)
   - ✅ Production-ready
   - ⚠️ Requires Java development

**Please choose which approach you prefer, and I'll implement it!**

---

**Status:** 📋 AWAITING YOUR DECISION

**Last Updated:** January 21, 2026
