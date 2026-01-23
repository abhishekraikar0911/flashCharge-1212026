# Smart Charging Modes - Calculation Examples

## Scenario: NX-100 PRO at 45% SOC

**Current State:**
- Variant: Pro (60 Ah capacity)
- Current SOC: 45%
- Current Ah: 27 Ah
- Current Range: 76 km
- Charging Current: 45A
- Voltage: 73.6V nominal
- Pricing: ₹2.88/kWh

---

## Mode 1: RANGE - "I want 150 km"

**User Input:** 150 km

**Calculations:**
```javascript
targetKm = 150
currentRangeKm = 76

// Step 1: Calculate Ah needed
rangeToAdd = 150 - 76 = 74 km
ahNeeded = 74 / 2.8 = 26.43 Ah

// Step 2: Calculate final SOC
finalAh = 27 + 26.43 = 53.43 Ah
finalSOC = (53.43 / 60) × 100 = 89.05%

// Step 3: Calculate energy
energykWh = (26.43 × 73.6) / 1000 = 1.945 kWh

// Step 4: Calculate time
timeMin = (26.43 / 45) × 60 = 35.24 minutes

// Step 5: Calculate cost
cost = 1.945 × 2.88 = ₹5.60
```

**Display:**
- Energy: 1.95 kWh
- Time: ~35 minutes
- Final SOC: 89%
- Final Range: 150 km
- Est. Cost: ₹5.60

---

## Mode 2: TIME - "Charge for 30 minutes"

**User Input:** 30 minutes

**Calculations:**
```javascript
targetMin = 30
chargingCurrent = 45A

// Step 1: Calculate Ah delivered
ahDelivered = (45 × 30) / 60 = 22.5 Ah

// Step 2: Calculate final SOC
finalAh = 27 + 22.5 = 49.5 Ah
finalSOC = (49.5 / 60) × 100 = 82.5%

// Step 3: Calculate range added
rangeAdded = 22.5 × 2.8 = 63 km
finalRange = 76 + 63 = 139 km

// Step 4: Calculate energy
energykWh = (22.5 × 73.6) / 1000 = 1.656 kWh

// Step 5: Calculate cost
cost = 1.656 × 2.88 = ₹4.77
```

**Display:**
- Energy: 1.66 kWh
- Time: 30 minutes
- Final SOC: 83%
- Final Range: 139 km
- Est. Cost: ₹4.77

---

## Mode 3: AMOUNT - "Charge for ₹10"

**User Input:** ₹10

**Calculations:**
```javascript
targetRupees = 10
pricing = 2.88

// Step 1: Calculate energy
energykWh = 10 / 2.88 = 3.472 kWh

// Step 2: Calculate Ah delivered
ahDelivered = (3.472 × 1000) / 73.6 = 47.17 Ah

// Step 3: Calculate time
timeMin = (47.17 / 45) × 60 = 62.89 minutes

// Step 4: Calculate final SOC
finalAh = 27 + 47.17 = 74.17 Ah
// BUT: Max capacity is 60 Ah, so cap at 54 Ah (90% SOC)
finalAh = 54 Ah (capped)
finalSOC = 90%

// Step 5: Calculate actual range
rangeAdded = (54 - 27) × 2.8 = 75.6 km
finalRange = 76 + 75.6 = 151.6 km

// Recalculate actual cost (capped)
actualAh = 54 - 27 = 27 Ah
actualEnergy = (27 × 73.6) / 1000 = 1.987 kWh
actualCost = 1.987 × 2.88 = ₹5.72
actualTime = (27 / 45) × 60 = 36 minutes
```

**Display (with warning):**
- Energy: 1.99 kWh (capped at 90% SOC)
- Time: ~36 minutes
- Final SOC: 90% (FULL)
- Final Range: 152 km
- Est. Cost: ₹5.72 (less than requested)
- ⚠️ Battery will reach FULL before ₹10

---

## Mode 4: FULL - "Charge to 90% SOC"

**User Input:** (None - automatic)

**Calculations:**
```javascript
targetSOC = 90
maxCapacityAh = 60
currentAh = 27

// Step 1: Calculate Ah needed
targetAh = (90 × 60) / 100 = 54 Ah
ahNeeded = 54 - 27 = 27 Ah

// Step 2: Calculate time
timeMin = (27 / 45) × 60 = 36 minutes

// Step 3: Calculate energy
energykWh = (27 × 73.6) / 1000 = 1.987 kWh

// Step 4: Calculate range added
rangeAdded = 27 × 2.8 = 75.6 km
finalRange = 76 + 75.6 = 151.6 km

// Step 5: Calculate cost
cost = 1.987 × 2.88 = ₹5.72
```

**Display:**
- Energy: 1.99 kWh
- Time: ~36 minutes
- Final SOC: 90% (FULL)
- Final Range: 152 km
- Est. Cost: ₹5.72

---

## Edge Cases

### Case 1: Already at 90% SOC
```javascript
currentSOC = 90
// All modes should show:
// "Battery already FULL. No charging needed."
```

### Case 2: Request exceeds 90% SOC
```javascript
// User requests 200 km (but max is 168 km)
// System should cap at 90% SOC and show warning:
// "⚠️ Target exceeds battery capacity. Charging to FULL (90% SOC)"
```

### Case 3: Very low SOC (10%)
```javascript
currentSOC = 10
currentAh = 6 Ah
currentRange = 17 km

// FULL mode:
ahNeeded = 54 - 6 = 48 Ah
timeMin = (48 / 45) × 60 = 64 minutes
energykWh = (48 × 73.6) / 1000 = 3.533 kWh
cost = 3.533 × 2.88 = ₹10.17
```

---

## Slider Ranges (Per Mode)

### RANGE Mode
- Min: currentRangeKm + 10 km
- Max: maxRangeKm (168 km for Pro)
- Step: 5 km
- Default: currentRangeKm + 50 km

### TIME Mode
- Min: 5 minutes
- Max: 120 minutes
- Step: 5 minutes
- Default: 30 minutes

### AMOUNT Mode
- Min: ₹5
- Max: ₹50
- Step: ₹1
- Default: ₹20

### FULL Mode
- No slider (automatic calculation)

---

## Real-time Updates During Charging

**Every 5 seconds, fetch:**
```javascript
GET /api/chargers/:id/soc

Response:
{
  "energy": 1234.5,  // Wh (Energy.Active.Import.Register)
  "soc": 67.5,
  "voltage": 75.2,
  "current": 42.3,
  "power": 3.18
}

// Calculate current cost:
currentCost = (energy / 1000) × 2.88
// Example: (1234.5 / 1000) × 2.88 = ₹3.55
```

**Display on live dashboard:**
```
Current Cost: ₹3.55
Target: ₹5.60 (RANGE mode, 150 km)
Progress: 63%
```

---

## Final Billing (After Session Ends)

**DataTransfer SessionSummary:**
```json
{
  "finalSoc": 89.2,
  "energyDelivered": 1.943,  // kWh (from meter)
  "durationMinutes": 34
}
```

**Final Bill:**
```javascript
finalCost = 1.943 × 2.88 = ₹5.60
```

**Display:**
```
✅ Charging Complete
Final SOC: 89%
Energy Delivered: 1.94 kWh
Duration: 34 minutes
Total Cost: ₹5.60
```

---

## JavaScript Code Snippets

### Calculate from Range
```javascript
function calculateFromRange(targetKm, params) {
  const { currentRangeKm, currentAh, maxCapacityAh, chargingCurrent } = params;
  
  const rangeToAdd = targetKm - currentRangeKm;
  const ahNeeded = rangeToAdd / 2.8;
  const finalAh = Math.min(currentAh + ahNeeded, maxCapacityAh * 0.9);
  const actualAhNeeded = finalAh - currentAh;
  
  const finalSOC = (finalAh / maxCapacityAh) * 100;
  const energykWh = (actualAhNeeded * 73.6) / 1000;
  const timeMin = (actualAhNeeded / chargingCurrent) * 60;
  const cost = energykWh * 2.88;
  
  return { energykWh, timeMin, finalSOC, finalRange: targetKm, cost };
}
```

### Calculate from Time
```javascript
function calculateFromTime(targetMin, params) {
  const { currentAh, currentRangeKm, maxCapacityAh, chargingCurrent } = params;
  
  const ahDelivered = (chargingCurrent * targetMin) / 60;
  const finalAh = Math.min(currentAh + ahDelivered, maxCapacityAh * 0.9);
  const actualAhDelivered = finalAh - currentAh;
  
  const finalSOC = (finalAh / maxCapacityAh) * 100;
  const rangeAdded = actualAhDelivered * 2.8;
  const finalRange = currentRangeKm + rangeAdded;
  const energykWh = (actualAhDelivered * 73.6) / 1000;
  const cost = energykWh * 2.88;
  
  return { energykWh, timeMin: targetMin, finalSOC, finalRange, cost };
}
```

### Calculate from Amount
```javascript
function calculateFromAmount(targetRupees, params) {
  const { currentAh, currentRangeKm, maxCapacityAh, chargingCurrent } = params;
  
  const energykWh = targetRupees / 2.88;
  const ahDelivered = (energykWh * 1000) / 73.6;
  const finalAh = Math.min(currentAh + ahDelivered, maxCapacityAh * 0.9);
  const actualAhDelivered = finalAh - currentAh;
  
  const finalSOC = (finalAh / maxCapacityAh) * 100;
  const rangeAdded = actualAhDelivered * 2.8;
  const finalRange = currentRangeKm + rangeAdded;
  const actualEnergy = (actualAhDelivered * 73.6) / 1000;
  const actualCost = actualEnergy * 2.88;
  const timeMin = (actualAhDelivered / chargingCurrent) * 60;
  
  const capped = finalAh >= maxCapacityAh * 0.9;
  
  return { energykWh: actualEnergy, timeMin, finalSOC, finalRange, cost: actualCost, capped };
}
```

### Calculate FULL
```javascript
function calculateFull(params) {
  const { currentAh, currentRangeKm, maxCapacityAh, chargingCurrent } = params;
  
  const targetAh = maxCapacityAh * 0.9;
  const ahNeeded = targetAh - currentAh;
  
  if (ahNeeded <= 0) {
    return { alreadyFull: true };
  }
  
  const finalSOC = 90;
  const rangeAdded = ahNeeded * 2.8;
  const finalRange = currentRangeKm + rangeAdded;
  const energykWh = (ahNeeded * 73.6) / 1000;
  const timeMin = (ahNeeded / chargingCurrent) * 60;
  const cost = energykWh * 2.88;
  
  return { energykWh, timeMin, finalSOC, finalRange, cost };
}
```

---

**Ready to implement!** 🚀
