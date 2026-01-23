# Smart Charging System - 4-Mode Implementation Guide

## Overview

This document provides the complete implementation plan for a 4-mode smart charging configuration system that appears BEFORE charging starts, allowing users to set charging targets.

**User Flow:**
```
Login → Select Charger → Select Connector → Configure Charge (NEW) → Live Charging Dashboard
```

---

## Available OCPP Data (Confirmed from Database)

From `connector_meter_value` table, we have access to:

| Measurand | Unit | Usage |
|-----------|------|-------|
| `SoC` | % | Current battery state of charge (0-100%) |
| `Voltage` | V | Battery voltage (58-84.5V) |
| `Current.Import` | A | Real-time charging current |
| `Current.Offered` | A | BMS max current (determines variant) |
| `Power.Active.Import` | W | Real-time power |
| `Energy.Active.Import.Register` | Wh | Cumulative energy delivered |
| `Temperature` | °C | Battery temperature |

---

## Battery Specifications (LOCKED)

### All Variants
- **Cell Configuration:** 23S LFP (3.2V nominal per cell)
- **Nominal Voltage:** 73.6V (23 × 3.2V)
- **Voltage Range:** 58V (min) to 84.5V (max)
- **FULL Charge:** 82V (90% SOC) - BMS stops here
- **Range Formula:** 1 Ah = 2.8 km
- **Pricing:** ₹2.88 per kWh

### Variants (Based on Current.Offered)

| Variant | Current.Offered | Capacity | Max Range |
|---------|----------------|----------|-----------|
| **Classic** | 0-30A | 30 Ah | 84 km |
| **Pro** | 31-60A | 60 Ah | 168 km |
| **Max** | 61-100A | 90 Ah | 252 km |

---

## 4 Charging Modes

### Mode 1: RANGE (Target Kilometers)
User sets: "I want 150 km range"
- Calculate required Ah: `targetAh = targetKm / 2.8`
- Calculate target SOC: `targetSOC = (currentAh + targetAh) / maxCapacityAh × 100`
- Calculate energy: `energykWh = targetAh × 73.6V / 1000`
- Calculate time: `timeMin = (targetAh / chargingCurrent) × 60`
- Calculate cost: `cost = energykWh × 2.88`

### Mode 2: TIME (Target Minutes)
User sets: "Charge for 30 minutes"
- Calculate Ah delivered: `deliveredAh = (chargingCurrent × targetMin) / 60`
- Calculate final SOC: `finalSOC = (currentAh + deliveredAh) / maxCapacityAh × 100`
- Calculate range added: `rangeKm = deliveredAh × 2.8`
- Calculate energy: `energykWh = deliveredAh × 73.6V / 1000`
- Calculate cost: `cost = energykWh × 2.88`

### Mode 3: AMOUNT (Target Rupees)
User sets: "Charge for ₹50"
- Calculate energy: `energykWh = targetRupees / 2.88`
- Calculate Ah: `deliveredAh = (energykWh × 1000) / 73.6`
- Calculate time: `timeMin = (deliveredAh / chargingCurrent) × 60`
- Calculate final SOC: `finalSOC = (currentAh + deliveredAh) / maxCapacityAh × 100`
- Calculate range: `rangeKm = deliveredAh × 2.8`

### Mode 4: FULL (Charge to 82V / 90% SOC)
System calculates automatically:
- Target SOC: 90%
- Calculate Ah needed: `neededAh = (maxCapacityAh × 0.9) - currentAh`
- Calculate time: `timeMin = (neededAh / chargingCurrent) × 60`
- Calculate energy: `energykWh = neededAh × 73.6V / 1000`
- Calculate cost: `cost = energykWh × 2.88`

---

## Implementation Steps

### Step 1: Backend API - Charging Parameters Endpoint

**File:** `/opt/ev-platform/flashCharge-backend/src/routes/chargers.js`

Add new endpoint: `GET /api/chargers/:id/charging-params`

**Returns:**
```json
{
  "variant": "Pro",
  "currentSOC": 45.5,
  "currentAh": 27.3,
  "maxCapacityAh": 60,
  "currentRangeKm": 76.4,
  "maxRangeKm": 168,
  "voltage": 73.8,
  "chargingCurrent": 45.0,
  "pricing": 2.88,
  "nominalVoltage": 73.6
}
```

### Step 2: Frontend - Configuration Page

**File:** `/opt/ev-platform/flashCharge-ui/configure-charge.html`

UI Components:
- Mode selector (4 tabs: RANGE / TIME / AMOUNT / FULL)
- Input slider (dynamic based on mode)
- Real-time prediction card showing:
  - Energy (kWh)
  - Time (minutes)
  - Final SOC (%)
  - Final Range (km)
  - Estimated Cost (₹)
- START CHARGING button

### Step 3: Calculation Engine

**File:** `/opt/ev-platform/flashCharge-ui/js/configure.js`

Functions:
- `calculateFromRange(targetKm, params)`
- `calculateFromTime(targetMin, params)`
- `calculateFromAmount(targetRupees, params)`
- `calculateFull(params)`
- `updatePredictions(mode, value, params)`

### Step 4: Modify Select Charger Flow

**File:** `/opt/ev-platform/flashCharge-ui/select-charger.html`

Change redirect from:
```javascript
window.location.href = `/?charger=${chargerId}&connector=${connectorId}`;
```

To:
```javascript
window.location.href = `/configure-charge.html?charger=${chargerId}&connector=${connectorId}`;
```

### Step 5: Live Charging Dashboard Updates

**File:** `/opt/ev-platform/flashCharge-ui/index.html`

Add real-time cost counter:
- Fetch current energy every 5 seconds
- Calculate: `currentCost = currentEnergy × 2.88 / 1000`
- Display: "Current Cost: ₹XX.XX"

---

## Calculation Formulas (Reference)

### Core Formulas
```javascript
// Ah ↔ Range
rangeKm = Ah × 2.8
Ah = rangeKm / 2.8

// Ah ↔ SOC
SOC = (Ah / maxCapacityAh) × 100
Ah = (SOC × maxCapacityAh) / 100

// Ah ↔ Time
Ah = (chargingCurrent × minutes) / 60
minutes = (Ah / chargingCurrent) × 60

// Ah ↔ Energy
energykWh = (Ah × 73.6) / 1000
Ah = (energykWh × 1000) / 73.6

// Energy ↔ Cost
cost = energykWh × 2.88
energykWh = cost / 2.88
```

---

## Billing Model

### During Configuration (Predictions)
- Show ESTIMATED cost based on calculations
- Display disclaimer: "Estimated cost. Actual billing based on meter reading."

### During Charging (Real-time)
- Update cost every 5 seconds using: `Energy.Active.Import.Register`
- Formula: `currentCost = (currentEnergy - startEnergy) × 2.88 / 1000`

### After Charging (Final Billing)
- Use `energyDelivered` from DataTransfer SessionSummary
- Formula: `finalCost = energyDelivered × 2.88`
- This is legally compliant and audit-safe

---

## UI Mockup (Configure Charge Screen)

```
┌─────────────────────────────────────┐
│  ⚡ Configure Charging               │
│  RIVOT_100A_01 • Connector 1        │
│  NX-100 PRO • 45% SOC • 76 km       │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│ [RANGE] [TIME] [AMOUNT] [FULL]      │ ← Mode Tabs
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│ Target Range: 150 km                │
│ ●━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━○   │ ← Slider
│ 0 km                        168 km  │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│ 📊 Charging Prediction              │
│                                     │
│ Energy:      4.38 kWh               │
│ Time:        ~20 minutes            │
│ Final SOC:   72%                    │
│ Final Range: 150 km                 │
│ Est. Cost:   ₹12.61                 │
│                                     │
│ ⚠️ Estimates only. Actual billing   │
│    based on meter reading.          │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│     🚀 START CHARGING               │
└─────────────────────────────────────┘
```

---

## File Structure

```
/opt/ev-platform/
├── flashCharge-backend/src/routes/
│   └── chargers.js                    ← Add /charging-params endpoint
│
├── flashCharge-ui/
│   ├── configure-charge.html          ← NEW: Configuration screen
│   ├── index.html                     ← UPDATE: Add cost counter
│   ├── select-charger.html            ← UPDATE: Redirect to configure
│   ├── js/
│   │   ├── configure.js               ← NEW: Calculation engine
│   │   └── app.js                     ← UPDATE: Cost tracking
│   └── style.css                      ← UPDATE: Add configure styles
│
└── SMART_CHARGING_IMPLEMENTATION.md   ← This document
```

---

## Implementation Timeline

| Phase | Task | Time |
|-------|------|------|
| **Phase 1** | Backend `/charging-params` endpoint | 1 hour |
| **Phase 2** | `configure-charge.html` UI | 2 hours |
| **Phase 3** | `configure.js` calculation engine | 2 hours |
| **Phase 4** | Update select-charger redirect | 15 min |
| **Phase 5** | Add cost counter to live dashboard | 45 min |
| **Total** | | **6 hours** |

---

## Testing Checklist

- [ ] Backend returns correct battery parameters
- [ ] All 4 modes calculate correctly
- [ ] Slider updates predictions in real-time
- [ ] START button passes to live dashboard
- [ ] Live dashboard shows real-time cost
- [ ] Cost matches energy meter readings
- [ ] Works for all 3 variants (Classic/Pro/Max)
- [ ] Handles edge cases (0% SOC, 90% SOC)

---

## Next Steps

1. **Review this document** - Confirm approach
2. **Implement Phase 1** - Backend endpoint
3. **Implement Phase 2-3** - Frontend UI + calculations
4. **Implement Phase 4-5** - Integration
5. **Test end-to-end** - All modes, all variants
6. **Deploy** - Update PM2 processes

---

**Status:** Ready for implementation  
**Estimated Time:** 6 hours  
**Dependencies:** None (all OCPP data available)
