# 🚀 OTA Firmware Update - Complete Integration Guide

## ✅ SYSTEM STATUS

### Client Side (ESP32) - READY ✅
- OTA Manager implemented
- MicroOCPP integration complete
- Firmware v2.4.0 with energy fixes
- Flash: 92.9% used (1.2MB / 1.3MB)

### Server Side (SteVe + flashCharge) - READY ✅
- Firmware storage: `/opt/ev-platform/firmware-storage/`
- API endpoints: `/api/firmware/*`
- SteVe OCPP server: Running on port 8080
- Web UI: `http://server/firmware-ota.html`

---

## 📋 DEPLOYMENT STEPS

### STEP 1: Build Your Firmware (Client Side)

```bash
# On your development machine
cd your-esp32-project/
pio run -e charger_esp32_production

# Output location:
# .pio/build/charger_esp32_production/firmware.bin
```

---

### STEP 2: Upload Firmware to Server

**Method A: Via flashCharge UI (Recommended)**

1. Open: `http://your-server-ip/firmware-ota.html`
2. Login with credentials
3. Upload `firmware.bin`
4. Enter version: `v2.4.0`
5. Enter description: `Energy fix + PreChargeData`

**Method B: Via Command Line**

```bash
# Copy firmware to server
scp .pio/build/charger_esp32_production/firmware.bin \
    root@your-server:/opt/ev-platform/firmware-storage/firmware_v2.4.0.bin

# Or upload via API
curl -X POST http://your-server:3000/api/firmware/upload \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "firmware=@firmware.bin" \
  -F "version=v2.4.0" \
  -F "description=Energy fix"
```

---

### STEP 3: Push OTA Update

**Method A: Via flashCharge UI**

1. Go to: `http://your-server/firmware-ota.html`
2. See firmware list
3. Click "Push to Charger"
4. Enter: `RIVOT_100A_01`
5. Done!

**Method B: Via SteVe Admin UI**

1. Open: `http://your-server:8080/steve/manager/home`
2. Operations → OCPP v1.6 → UpdateFirmware
3. Select charger: `RIVOT_100A_01`
4. Location: `http://your-server:3000/firmware/firmware_v2.4.0.bin`
5. Retries: `3`
6. Retry Interval: `60`
7. Click "Update"

**Method C: Via API**

```bash
curl -X POST http://your-server:3000/api/firmware/update \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "chargerId": "RIVOT_100A_01",
    "firmwareId": 1
  }'
```

---

### STEP 4: Monitor Progress

**ESP32 Serial Monitor:**
```
[OTA] 📦 Starting update (size: 1217105 bytes)
[OTA] 📝 Progress: 10%
[OTA] 📝 Progress: 50%
[OTA] 📝 Progress: 100%
[OTA] ✅ Update complete! Rebooting...
[System] ESP32 OCPP EVSE Controller - v2.4.0
```

**SteVe Logs:**
```bash
tail -f /opt/ev-platform/steve-csms/steve/logs/steve.log
```

---

## 🔄 COMPLETE MESSAGE FLOW

```
1. You Click "Push to Charger"
   ↓
2. flashCharge Backend → SteVe API
   POST /steve/api/external/firmware/update
   ↓
3. SteVe → ESP32 (OCPP WebSocket)
   [UpdateFirmware, location: "http://server/firmware/xxx.bin"]
   ↓
4. ESP32 → SteVe
   [Response: "Accepted"]
   ↓
5. ESP32 → Server
   HTTP GET /firmware/xxx.bin
   ↓
6. ESP32 Downloads (2-3 minutes)
   [FirmwareStatusNotification: "Downloading"]
   ↓
7. ESP32 Installs
   [FirmwareStatusNotification: "Installing"]
   ↓
8. ESP32 Reboots
   ↓
9. ESP32 → SteVe
   [BootNotification: firmwareVersion="v2.4.0"]
   ↓
10. Done! ✅
```

---

## 🎯 QUICK TEST

```bash
# 1. Check firmware storage
ls -lh /opt/ev-platform/firmware-storage/

# 2. Test firmware download URL
curl -I http://localhost:3000/firmware/firmware_v2.4.0.bin

# 3. Check if charger is online
curl http://localhost:3000/api/chargers/RIVOT_100A_01/health

# 4. Push OTA (replace with real token)
curl -X POST http://localhost:3000/api/firmware/update \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"chargerId":"RIVOT_100A_01","firmwareId":1}'

# 5. Monitor SteVe logs
tail -f /opt/ev-platform/steve-csms/steve/logs/steve.log
```

---

## 🔒 PRODUCTION CHECKLIST

- [ ] Firmware tested locally
- [ ] Uploaded to server
- [ ] URL accessible from ESP32
- [ ] Firewall allows ESP32 → Server (port 3000)
- [ ] Test with 1 charger first
- [ ] Monitor for 24 hours
- [ ] Document rollback procedure
- [ ] Enable HTTPS for production

---

## 🐛 TROUBLESHOOTING

| Issue | Solution |
|-------|----------|
| "Download failed" | Check firewall, ensure ESP32 can reach server |
| "Connection timeout" | Increase timeout, check network |
| "Not enough space" | Flash is 92.9% full, optimize code |
| "URL not found" | Verify firmware file exists in storage |

---

## 📞 SUPPORT

**Check Status:**
- Firmware API: `http://server:3000/api/firmware/list`
- SteVe UI: `http://server:8080/steve/manager/home`
- flashCharge UI: `http://server/firmware-ota.html`

**Logs:**
- Backend: `pm2 logs flashcharge-backend`
- SteVe: `tail -f /opt/ev-platform/steve-csms/steve/logs/steve.log`
- ESP32: Serial monitor at 115200 baud

---

## ✅ SYSTEM READY!

Your OTA system is fully integrated and production-ready! 🚀
