# Product Requirements Document (PRD)
# flashCharge - EV Charging Management Platform

**Version:** 1.0  
**Date:** January 2025  
**Status:** Production Ready  
**Document Owner:** Product Team

---

## 1. Executive Summary

### 1.1 Product Overview
flashCharge is a comprehensive EV charging management platform that enables electric vehicle owners to charge their vehicles through a frictionless, QR code-based interface. The platform uses **physical gun connection as authentication** - eliminating traditional login requirements. It integrates with OCPP-compliant charging stations and provides real-time monitoring, flexible charging modes, and secure payment processing.

**Key Innovation:** Authentication happens when the user physically connects the charging gun to their vehicle, verified through OCPP protocol. Future versions will automatically identify users via vehicle VIN number.

### 1.2 Business Objectives
- Provide **zero-friction** EV charging experience (scan QR → plug gun → charge)
- Eliminate login/password requirements using physical authentication
- Enable charging station operators to manage multiple chargers
- Support flexible charging modes (Full Charge, Range-based, Amount-based, Time-based)
- Ensure secure, hardware-backed access to charging infrastructure
- Real-time monitoring and control via WebSocket connections
- Future: Automatic user identification via vehicle VIN number

### 1.3 Target Users
- **Primary:** Electric vehicle owners at public charging stations (walk-up users)
- **Secondary:** Fleet vehicle drivers (future: auto-identified via VIN)
- **Tertiary:** Charging station operators and administrators

---

## 2. Product Goals & Success Metrics

### 2.1 Goals
1. **User Experience:** Provide **zero-friction** charging (no login, no app download)
2. **Reliability:** 99.5% uptime for charging operations
3. **Security:** Hardware-backed authentication via physical gun connection
4. **Performance:** <2s page load time, real-time updates within 5s
5. **Scalability:** Support 100+ concurrent charging sessions
6. **Future:** Automatic user identification via VIN (no manual input)

### 2.2 Success Metrics (KPIs)
- **User Adoption:** 80% of users complete charging session within first use
- **Session Success Rate:** >95% successful charge completions
- **Average Session Duration:** Match predicted time ±10%
- **User Satisfaction:** NPS score >70
- **System Uptime:** 99.5% availability
- **API Response Time:** <500ms for 95th percentile

---

## 3. User Personas

### 3.1 Primary Persona: "Walk-up User Raj"
- **Age:** 25-55
- **Occupation:** Any (public charger user)
- **Vehicle:** Any EV (NX-100, Tata Nexon EV, MG ZS EV, etc.)
- **Usage Pattern:** Occasional public charging, 1-2 times/week
- **Pain Points:** 
  - Doesn't want to create accounts/remember passwords
  - Needs quick charging while shopping/eating
  - Wants transparent pricing before charging
  - Prefers simple, intuitive interface
- **Goals:** Scan QR → Plug gun → Pay → Charge (under 2 minutes)

### 3.2 Secondary Persona: "Fleet Driver Priya" (Future VIN Integration)
- **Age:** 28-45
- **Occupation:** Delivery/Taxi Driver
- **Vehicle:** Company-owned EV fleet vehicle
- **Usage Pattern:** Multiple charges per day, different stations
- **Pain Points:**
  - Needs automatic billing to company account
  - No time for manual login/payment
  - Wants charging history auto-tracked
- **Goals:** Plug gun → Auto-identified via VIN → Charge (company pays)

---

## 4. User Flow & Authentication Model

### 4.0 Complete User Journey (No Login Required)

#### Current Implementation: QR + Gun Connection
```
1. User arrives at charging station
2. Scans QR code on charger → Opens: /flashcharge/250822008C06
3. Page loads, shows: "Please connect your vehicle"
4. User plugs charging gun into vehicle
5. Charger detects connection → Status: "Preparing"
6. UI automatically shows charging configuration options
7. User selects charging mode (Full/Range/Amount/Time)
8. User pays and starts charging
9. Real-time monitoring during charging
10. Charging completes → Summary shown
11. User unplugs gun and leaves
```

#### Future Enhancement: VIN-Based Auto-Identification
```
1. User arrives at charging station
2. Scans QR code → Opens charger page
3. User plugs gun into vehicle
4. Vehicle sends VIN via CAN bus to charger
5. Charger sends VIN to backend via OCPP DataTransfer
6. Backend queries vehicle database:
   - Owner name: "Rajesh Kumar"
   - Payment method: UPI/Card on file
   - Charging preferences: 80% SOC default
7. UI shows: "Welcome back, Rajesh!"
8. Pre-filled charging preferences
9. One-click payment (saved method)
10. Charging starts automatically
11. Receipt sent to registered email/phone
```

**Key Benefit:** Zero manual input required - vehicle identifies user automatically.

---

## 5. Functional Requirements

### 5.1 Physical Authentication (Gun Connection)

#### 4.1.1 QR Code Access
- **Priority:** P0 (Critical)
- **Description:** Users access charger by scanning QR code on station
- **URL Format:** `/flashcharge/{CHARGER_ID}`
- **Example:** `https://ocpp.rivotmotors.com/flashcharge/250822008C06`
- **Acceptance Criteria:**
  - No login page required
  - Direct access to charger interface
  - Charger ID extracted from URL path
  - WebSocket connects automatically

#### 4.1.2 Gun Connection as Authentication
- **Priority:** P0 (Critical)
- **Description:** Physical gun connection authenticates the charging session
- **Authentication Flow:**
  1. User scans QR code → Opens charger page
  2. Status = "Available" → Show "Please connect your vehicle"
  3. User plugs gun into vehicle
  4. Charger detects connection → Status = "Preparing"
  5. UI shows charging configuration options
- **Security Model:**
  - Physical presence required (hardware-backed)
  - OCPP status is source of truth
  - No password/login needed
  - Cannot spoof connection status

#### 4.1.3 Future: VIN-Based User Identification
- **Priority:** P2 (Future Enhancement)
- **Description:** Retrieve user details from vehicle VIN number
- **Implementation Plan:**
  - Vehicle sends VIN via CAN bus to charger
  - Charger sends VIN in OCPP DataTransfer message
  - Backend queries vehicle database by VIN
  - Retrieve: Owner name, payment method, preferences
  - Auto-populate user profile without login
- **Benefits:**
  - Zero user input required
  - Automatic billing to vehicle owner
  - Personalized charging preferences
  - Fleet vehicle identification

### 5.2 Charger Access & Connection Detection

#### 4.2.1 Direct Charger Access (No Selection)
- **Priority:** P0 (Critical)
- **Description:** User accesses specific charger via QR code
- **Acceptance Criteria:**
  - QR code contains charger-specific URL
  - No charger selection page needed
  - Direct access to single charger interface
  - Charger ID embedded in URL path

#### 4.2.2 Connection Status Detection
- **Priority:** P0 (Critical)
- **Description:** Detect gun connection via OCPP status
- **Status Mapping:**
  - **Available:** No vehicle connected → Show connection message
  - **Preparing:** Gun connected, vehicle ready → Show charging options
  - **Charging:** Active charging session → Show charging dashboard
  - **SuspendedEV:** Vehicle paused charging → Show waiting message
  - **Unavailable:** Station offline → Show error message
- **Acceptance Criteria:**
  - Real-time status updates via WebSocket
  - UI switches automatically based on status
  - No manual connector selection needed
  - Status is source of truth (cannot be spoofed)

### 5.3 Charging Configuration

#### 4.3.1 Vehicle Information Display
- **Priority:** P0 (Critical)
- **Description:** Show current vehicle battery status
- **Acceptance Criteria:**
  - Display: Model (Classic/Pro/Max), Battery %, Range (km)
  - Data source: VehicleInfo DataTransfer from charger firmware
  - Update frequency: Every 5 seconds via WebSocket
  - Fallback: REST API polling every 30s

#### 4.3.2 Charging Mode Selection
- **Priority:** P0 (Critical)
- **Description:** Four charging modes with different targets
- **Modes:**

**Mode 1: Full Charge**
- Target: 90% SOC (fixed)
- No picker/slider
- Automatically calculates: Range, Time, Energy, Cost
- Use case: Overnight charging, full battery needed

**Mode 2: Range**
- Target: Desired range in km
- Picker: Current range → Max range (step: 2km)
- Calculates: SOC, Time, Energy, Cost
- Use case: "I need 100km range for tomorrow"

**Mode 3: Amount**
- Target: Budget in ₹ (Rupees)
- Picker: ₹1 → Max cost (step: ₹1)
- Calculates: SOC, Range, Time, Energy
- Use case: "I have ₹20 to spend"

**Mode 4: Time**
- Target: Charging duration in minutes
- Picker: 1min → Max time (step: 1min)
- Calculates: SOC, Range, Energy, Cost
- Use case: "I have 30 minutes to charge"

#### 4.3.3 Charging Prediction Summary
- **Priority:** P0 (Critical)
- **Description:** Show predicted charging outcomes
- **Display Fields:**
  - Battery: Current% → Target%
  - Range: Current km → Target km
  - Time: Estimated duration (minutes)
  - Energy: kWh to be delivered
  - Total Cost: ₹ amount (₹15/kWh)
- **Update:** Real-time as user adjusts picker

#### 4.3.4 Payment & Start
- **Priority:** P0 (Critical)
- **Description:** Process payment and initiate charging
- **Flow:**
  1. User clicks "PAY ₹XX & START"
  2. Button shows "⏳ PROCESSING PAYMENT..."
  3. Payment processed (mock for now)
  4. Button shows "⏳ STARTING SESSION..."
  5. API call to start charging
  6. Button shows "⏳ WAITING FOR CURRENT..."
  7. Poll for current flow (max 3 seconds)
  8. Redirect to dashboard when current detected
- **Acceptance Criteria:**
  - Save charging targets to localStorage
  - Include: mode, targetSoc, targetRange, targetAmount, targetTime, startSoc, startRange, paidAmount
  - Handle errors gracefully with toast notifications

### 5.4 Real-Time Charging Dashboard

#### 4.4.1 Live Monitoring
- **Priority:** P0 (Critical)
- **Description:** Real-time display of charging metrics
- **Display Fields:**
  - **SOC Gauge:** Circular gauge showing battery %
  - **Status:** Available, Preparing, Charging, Finishing
  - **Vehicle Info:** Model, Range (current/max), Temperature
  - **Electrical Metrics:**
    - Voltage (V)
    - Current (A)
    - Power (kW)
    - Energy (Wh)
  - **Current Cost:** ₹ amount (₹15/kWh)
- **Data Sources:**
  - VehicleInfo (DataTransfer): Model, Range, SOC, Temperature
  - MeterValues: Voltage, Current, Power (only during charging)
- **Update Frequency:** 
  - WebSocket: Real-time (2-5s)
  - Fallback polling: 30s

#### 4.4.2 Charging Progress Tracking
- **Priority:** P1 (High)
- **Description:** Show progress towards target
- **Display:**
  - **Timer:** Time elapsed / Time remaining
  - **Progress Bar:** % completion towards target
  - **Target Label:** "Battery Target: 80%" or "Range Target: 135km"
- **Behavior:**
  - Only shown when charging targets exist
  - Color changes: Blue → Yellow (70%) → Green (90%)
  - Auto-stop when target reached

#### 4.4.3 Charging Controls
- **Priority:** P0 (Critical)
- **Description:** Start/Stop charging controls
- **Buttons:**
  - **START:** Enabled when status = Available/Preparing
  - **STOP:** Enabled when status = Charging
  - **END SESSION:** Enabled when charging, shows summary on stop
- **Acceptance Criteria:**
  - Buttons disabled during API calls
  - Show loading state: "⏳ STARTING..." / "⏳ STOPPING..."
  - Toast notifications for success/error
  - Auto-refresh status after 2 seconds

#### 4.4.4 Auto-Stop on Target Reached
- **Priority:** P1 (High)
- **Description:** Automatically stop when target achieved
- **Logic:**
  - Check every 10 seconds during charging
  - Compare current value vs target (SOC/Range/Amount/Time)
  - Trigger stop when target reached
  - Show toast: "Target reached! Stopping charging..."
  - Display charging summary after stop

### 5.5 Charging Summary

#### 4.5.1 Session Summary Modal
- **Priority:** P1 (High)
- **Description:** Post-charging summary with details
- **Display Sections:**

**Vehicle Status:**
- Battery: Start% → Final% (+Gain%)
- Range: Start km → Final km (+Gain km)
- Energy Added: X.XX kWh
- Efficiency: XX Wh/km
- Duration: XXh XXm XXs

**Payment Details:**
- You Paid: ₹XX.XX
- Actual Cost: ₹XX.XX (X.XX kWh × ₹15/kWh)
- Refund: ₹XX.XX (if overpaid)

**Actions:**
- "Start New Session" → Redirect to charger selection
- Prevent back navigation (force new session)

---

## 5. Non-Functional Requirements

### 5.1 Performance
- **Page Load Time:** <2 seconds (initial load)
- **API Response Time:** <500ms (95th percentile)
- **WebSocket Latency:** <100ms
- **Database Query Time:** <200ms
- **Real-time Update Frequency:** 2-5 seconds

### 5.2 Security
- **Authentication:** JWT with 24-hour expiry
- **Password Storage:** bcrypt hashing (10 rounds)
- **API Protection:** All charging endpoints require authentication
- **CORS:** Whitelist specific origins only
- **Rate Limiting:** 100 requests/15min per IP
- **Input Validation:** All user inputs validated
- **SQL Injection:** Parameterized queries only
- **XSS Protection:** Input sanitization

### 5.3 Reliability
- **Uptime:** 99.5% availability
- **Error Handling:** Graceful degradation, user-friendly error messages
- **WebSocket Reconnection:** Exponential backoff (1s → 30s max)
- **Fallback Polling:** REST API when WebSocket fails
- **Transaction Integrity:** ACID compliance for charging sessions

### 5.4 Scalability
- **Concurrent Users:** Support 100+ simultaneous charging sessions
- **Database:** Connection pooling (10 connections)
- **WebSocket:** Per-message compression (60-70% reduction)
- **Caching:** 5-second cache for SOC data
- **Load Balancing:** Ready for horizontal scaling

### 5.5 Usability
- **Mobile-First:** Responsive design, optimized for 360px-480px
- **Touch-Friendly:** Large buttons (min 44px), easy scrolling
- **Loading States:** Clear feedback during operations
- **Error Messages:** User-friendly, actionable
- **Accessibility:** WCAG 2.1 Level AA compliance

### 5.6 Compatibility
- **Browsers:** Chrome 90+, Safari 14+, Firefox 88+, Edge 90+
- **Mobile OS:** iOS 14+, Android 10+
- **OCPP Protocol:** OCPP 1.6J compliant
- **Database:** MySQL 8.0+
- **Node.js:** v21 LTS

---

## 6. Technical Architecture

### 6.1 System Components

**Frontend (flashCharge-ui):**
- HTML5, CSS3, Vanilla JavaScript (ES6+)
- WebSocket client for real-time updates
- localStorage for session management
- Nginx web server

**Backend (flashCharge-backend):**
- Node.js 21 LTS, Express.js 5.x
- JWT authentication (jsonwebtoken)
- WebSocket server (ws library)
- MySQL2 connection pool
- Rate limiting (express-rate-limit)
- Input validation (express-validator)

**OCPP Server (SteVe):**
- Java 21, Spring Boot 4.0
- OCPP 1.6J protocol implementation
- External API for charging control
- MySQL database for transactions

**Database (MySQL 8.0):**
- Charger registry
- Transaction history
- Meter values
- User accounts
- DataTransfer messages

### 6.2 Data Flow

**Charging Start Flow:**
1. User selects charger → Configure page
2. User selects mode & target → Predictions calculated
3. User clicks "PAY & START" → Payment processed
4. Backend calls SteVe API → RemoteStartTransaction
5. SteVe sends OCPP command → Charger
6. Charger responds → StatusNotification (Preparing)
7. Current flows → MeterValues sent
8. Frontend polls for current → Redirects to dashboard
9. WebSocket streams real-time data → UI updates

**Real-Time Monitoring Flow:**
1. Charger sends VehicleInfo (DataTransfer) every 5s
2. Charger sends MeterValues every 5s (during charging)
3. Backend stores in database
4. WebSocket broadcasts to connected clients
5. Frontend updates UI in real-time
6. Fallback: REST API polling every 30s

### 6.3 API Endpoints

**Authentication:**
- `POST /api/auth/register` - Create account
- `POST /api/auth/login` - Login, get JWT token
- `GET /api/auth/me` - Get current user info

**Chargers:**
- `GET /api/chargers/list` - List all chargers
- `GET /api/chargers/:id/connectors` - Get connector status
- `GET /api/chargers/:id/soc` - Get battery status
- `GET /api/chargers/:id/health` - Check charger online status
- `POST /api/chargers/:id/start` - Start charging (auth required)
- `POST /api/chargers/:id/stop` - Stop charging (auth required)

**WebSocket:**
- `ws://host/ws?charger=ID&token=JWT` - Real-time updates

---

## 7. User Stories & Acceptance Criteria

### 7.1 Epic: User Onboarding

**US-001: As a new user, I want to register an account**
- **Priority:** P0
- **Acceptance Criteria:**
  - Can register with username, password, email
  - Password is securely hashed
  - Receive JWT token on registration
  - Auto-login after registration

**US-002: As a returning user, I want to login**
- **Priority:** P0
- **Acceptance Criteria:**
  - Login with username/password
  - Receive JWT token valid for 24 hours
  - Redirect to charger selection page
  - Show error for invalid credentials

### 7.2 Epic: Charging Session

**US-003: As a user, I want to select a charging station**
- **Priority:** P0
- **Acceptance Criteria:**
  - See list of available chargers
  - See real-time status of each connector
  - Click available connector to proceed
  - Cannot select unavailable connectors

**US-004: As a user, I want to charge to full battery**
- **Priority:** P0
- **Acceptance Criteria:**
  - Select "Full Charge" mode
  - See prediction: 90% SOC, range, time, cost
  - No picker shown (fixed target)
  - Click "PAY & START" to begin

**US-005: As a user, I want to charge for a specific range**
- **Priority:** P0
- **Acceptance Criteria:**
  - Select "Range" mode
  - Use picker to select target range (km)
  - See updated predictions in real-time
  - Start charging with selected target

**US-006: As a user, I want to charge within my budget**
- **Priority:** P0
- **Acceptance Criteria:**
  - Select "Amount" mode
  - Use picker to select budget (₹)
  - See how much range/SOC I'll get
  - Charging stops when budget reached

**US-007: As a user, I want to charge for a specific time**
- **Priority:** P0
- **Acceptance Criteria:**
  - Select "Time" mode
  - Use picker to select duration (minutes)
  - See predicted SOC/range/cost
  - Charging stops after time elapsed

**US-008: As a user, I want to monitor charging in real-time**
- **Priority:** P0
- **Acceptance Criteria:**
  - See live SOC gauge
  - See voltage, current, power, energy
  - See current cost
  - Updates every 2-5 seconds
  - See progress towards target

**US-009: As a user, I want to stop charging manually**
- **Priority:** P0
- **Acceptance Criteria:**
  - Click "STOP" button during charging
  - Charging stops within 2 seconds
  - See charging summary
  - Get refund if overpaid

**US-010: As a user, I want charging to auto-stop at target**
- **Priority:** P1
- **Acceptance Criteria:**
  - Charging stops when target reached
  - See notification: "Target reached!"
  - See charging summary automatically
  - No manual intervention needed

### 7.3 Epic: Post-Charging

**US-011: As a user, I want to see charging summary**
- **Priority:** P1
- **Acceptance Criteria:**
  - See battery gain (start → end)
  - See range gain
  - See energy added, efficiency
  - See payment details
  - See refund amount (if any)

**US-012: As a user, I want to start a new session**
- **Priority:** P1
- **Acceptance Criteria:**
  - Click "Start New Session" from summary
  - Redirect to charger selection
  - Previous session data cleared
  - Cannot go back to previous session

---

## 8. Battery & Vehicle Specifications

### 8.1 NX-100 Variants

| Variant | Max Current | Capacity | Max Range | Price Segment |
|---------|-------------|----------|-----------|---------------|
| Classic | 30A | 30 Ah | 81 km | Entry-level |
| Pro | 60A | 60 Ah | 162 km | Mid-range |
| Max | 100A | 90 Ah | 243 km | Premium |

### 8.2 Battery Specifications
- **Configuration:** 23S LFP (Lithium Iron Phosphate)
- **Nominal Voltage:** 73.6V
- **Voltage Range:** 58V (min) - 84.5V (max)
- **Full Charge Voltage:** 82V
- **Full Charge SOC:** 90% (recommended)
- **Range per Ah:** 2.8 km/Ah

### 8.3 Charging Specifications
- **Charging Power:** 3.0 kW (max)
- **Charging Current:** Variant-dependent (30A/60A/100A)
- **Charging Efficiency:** ~90%
- **Pricing:** ₹15.00 per kWh

---

## 9. Out of Scope (Future Enhancements)

### 9.1 Phase 2 Features
- Payment gateway integration (Razorpay/Stripe)
- Charging history & analytics
- Multiple payment methods (UPI, cards, wallet)
- Scheduled charging
- Push notifications
- Email receipts

### 9.2 Phase 3 Features
- Mobile apps (iOS/Android)
- Fleet management dashboard
- Admin panel for operators
- Reporting & analytics
- Dynamic pricing
- Loyalty programs
- Referral system

### 9.3 Phase 4 Features
- Multi-language support
- Voice commands
- AI-based charging optimization
- Integration with vehicle telematics
- Carbon footprint tracking
- Social features (share charging status)

---

## 10. Risks & Mitigation

### 10.1 Technical Risks

**Risk 1: WebSocket Connection Failures**
- **Impact:** High - No real-time updates
- **Probability:** Medium
- **Mitigation:** 
  - Exponential backoff reconnection
  - Fallback to REST API polling
  - User notification of connection status

**Risk 2: OCPP Protocol Compatibility**
- **Impact:** High - Charging won't work
- **Probability:** Low
- **Mitigation:**
  - Use SteVe (proven OCPP implementation)
  - Extensive testing with real chargers
  - OCPP 1.6J compliance

**Risk 3: Database Performance**
- **Impact:** Medium - Slow queries
- **Probability:** Medium
- **Mitigation:**
  - Database indexing (data_transfer table)
  - Connection pooling
  - Query optimization
  - Caching layer

### 10.2 Business Risks

**Risk 4: User Adoption**
- **Impact:** High - Low usage
- **Probability:** Medium
- **Mitigation:**
  - Intuitive UI/UX
  - User onboarding flow
  - In-app help/tutorials
  - Customer support

**Risk 5: Payment Failures**
- **Impact:** High - Lost revenue
- **Probability:** Low
- **Mitigation:**
  - Robust payment gateway integration
  - Retry mechanism
  - Manual reconciliation process
  - Refund automation

---

## 11. Success Criteria & Launch Checklist

### 11.1 Launch Readiness Criteria
- [ ] All P0 features implemented and tested
- [ ] Security audit completed
- [ ] Performance benchmarks met
- [ ] User acceptance testing passed
- [ ] Documentation complete
- [ ] Production environment ready
- [ ] Monitoring & alerting configured
- [ ] Backup & disaster recovery plan in place
- [ ] Support team trained

### 11.2 Go-Live Checklist
- [ ] Database migrations executed
- [ ] Environment variables configured
- [ ] SSL certificates installed
- [ ] Load balancer configured
- [ ] Monitoring dashboards active
- [ ] Incident response plan ready
- [ ] Rollback plan documented
- [ ] Stakeholders notified

---

## 12. Appendix

### 12.1 Glossary
- **OCPP:** Open Charge Point Protocol
- **SOC:** State of Charge (battery %)
- **JWT:** JSON Web Token
- **WebSocket:** Full-duplex communication protocol
- **DataTransfer:** Custom OCPP message for vendor-specific data
- **MeterValues:** OCPP message with electrical measurements
- **SteVe:** Open-source OCPP server implementation

### 12.2 References
- OCPP 1.6J Specification: https://openchargealliance.org/
- SteVe Documentation: https://github.com/steve-community/steve
- JWT Best Practices: https://tools.ietf.org/html/rfc7519
- WebSocket Protocol: https://tools.ietf.org/html/rfc6455

### 12.3 Document History
| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | Jan 2025 | Product Team | Initial PRD |

---

**Document Status:** ✅ Approved for Development  
**Next Review Date:** March 2025
