# Firmware Data Transfer Update - Server Side Changes

## Overview
Updated server-side code to handle new Data Transfer parameters from firmware. The firmware now sends continuous updates every 10 seconds with enhanced vehicle intelligence.

## Firmware Changes (Already Implemented)

### 1. Frequency Improvement
- **Before**: Single snapshot on plug-in event
- **Now**: Continuous updates every 10 seconds
- **Impact**: Live dashboard with real-time data updates

### 2. Enhanced Data Content
**New Parameters Added:**
```json
{
  "soc": 82.76,
  "maxCurrent": 10,
  "voltage": 75.78,
  "current": 0,
  "temperature": 25.60,
  "model": "Classic",    // NEW: Firmware identifies vehicle model
  "range": 67.03         // NEW: Firmware calculates range in km
}
```

### 3. Stability
- All messages now marked as "Accepted"
- No FormationViolation errors
- 100% message acceptance rate

## Server-Side Changes

### Backend Updates (`flashCharge-backend/src/routes/chargers.js`)

#### 1. Updated `/soc` Endpoint
- Now reads `model` and `range` directly from firmware DataTransfer
- Uses firmware-calculated values instead of server-side calculations
- Added temperature support in response

**Changes:**
```javascript
// Before: Server calculated model from maxCurrent
const maxCurrent = preChargeData.maxCurrent || 0;
let model = "NX-100 CLASSIC", maxRangeKm = 84;
if (maxCurrent >= 31 && maxCurrent <= 60) {
  model = "NX-100 PRO";
  maxRangeKm = 168;
}

// After: Use firmware values directly
const model = preChargeData.model || "Classic";
const currentRangeKm = preChargeData.range ? parseFloat(preChargeData.range).toFixed(1) : "0.0";
```

#### 2. Temperature Field Added
- Added `temperature` field to all SOC responses
- Format: `"25.6°C"` or `null` if not available
- Extracted from PreChargeData: `preChargeData.temperature`

### Frontend Updates

#### 1. UI Layout (`flashCharge-ui/index.html`)
Added temperature display to vehicle info section:
```html
<div class="info-item">
  <span class="info-label">Temp:</span>
  <span class="info-value" id="vehicle-temp" style="color: #f59e0b;">--</span>
</div>
```

#### 2. JavaScript (`flashCharge-ui/js/app.js`)
Updated `refreshSOC()` function to display temperature:
```javascript
document.getElementById("vehicle-temp").innerText = data.temperature || "--";
```

#### 3. CSS Improvements (`flashCharge-ui/style.css`)
- Changed vehicle-info from flexbox to CSS Grid (3 columns)
- Better spacing and alignment for 3 items (Model, Range, Temp)
- Responsive font sizes with clamp()
- Improved visual hierarchy

**CSS Changes:**
```css
.vehicle-info {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 6px;
  padding: 6px;
}

.info-label {
  font-size: clamp(8px, 2.2vw, 10px);
  font-weight: 600;
}

.info-value {
  font-size: clamp(10px, 3vw, 12px);
  text-align: center;
  line-height: 1.2;
}
```

## Data Flow Comparison

### Before (Yesterday)
```
Firmware → Server
{
  soc, maxCurrent, voltage, current, temperature
}

Server Logic:
- Calculate model from maxCurrent
- Calculate range from soc and model
- Store in database
```

### After (Today)
```
Firmware → Server
{
  soc, maxCurrent, voltage, current, temperature,
  model: "Classic",  // Firmware calculates
  range: 67.03       // Firmware calculates
}

Server Logic:
- Use firmware values directly
- No server-side calculations needed
- Display temperature in UI
```

## Benefits

### 1. Reduced Server Load
- No need for server-side model detection logic
- No need for range calculations
- Firmware handles all vehicle-specific logic

### 2. Better Accuracy
- Firmware has direct access to BMS data
- More accurate model detection
- Real-time range calculations based on actual battery state

### 3. Live Updates
- Dashboard updates every 10 seconds
- Users see real-time battery changes
- Better user experience during pre-charge phase

### 4. Enhanced Monitoring
- Temperature display for battery health
- Visual feedback with color coding (orange for temp)
- Better organized 3-column layout

## API Response Format

### `/api/chargers/:id/soc` Response
```json
{
  "soc": 82.76,
  "voltage": "75.8 V",
  "current": "0.0 A",
  "power": "0.00 kW",
  "energy": "0.00 Wh",
  "temperature": "25.6°C",
  "model": "Classic",
  "currentRangeKm": "67.0",
  "maxRangeKm": "81",
  "isCharging": false,
  "dataSource": "precharge"
}
```

## Testing Checklist

- [x] Backend reads new `model` field from DataTransfer
- [x] Backend reads new `range` field from DataTransfer
- [x] Backend includes `temperature` in response
- [x] UI displays temperature in vehicle info section
- [x] UI layout properly shows 3 items (Model, Range, Temp)
- [x] Responsive design works on mobile devices
- [x] Temperature shows "--" when not available
- [x] Temperature color coded (orange) for visibility

## Deployment Notes

1. No database schema changes required
2. Backward compatible (handles missing fields gracefully)
3. No breaking changes to existing API contracts
4. Frontend cache bust: `app.js?v=11` (increment version)

## Future Enhancements

1. Add temperature alerts (high/low warnings)
2. Temperature trend graph
3. Historical temperature data logging
4. Battery health score based on temperature patterns
5. Predictive maintenance alerts

## Summary

The firmware has evolved from a "Passive Reporter" to an "Active Monitor" with intelligent vehicle detection and real-time calculations. The server-side changes leverage this new intelligence by using firmware-calculated values directly, reducing server load and improving accuracy. The UI now displays temperature in a well-organized 3-column layout for better user experience.
