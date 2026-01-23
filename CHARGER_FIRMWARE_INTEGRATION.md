# Charger Firmware Integration Guide

## 🎯 What to Add to Your Charger Firmware

Add this code to send pre-charge data when the gun is connected.

---

## 📍 When to Send

**Trigger:** When connector status changes to "Preparing" (gun connected, vehicle detected)

**Frequency:** Send once when gun is first connected, then every 30 seconds while in "Preparing" state

---

## 🔧 Code to Add

### **Option 1: Using libcurl (C/C++)**

```c
#include <curl/curl.h>
#include <stdio.h>
#include <string.h>

// Send pre-charge data to flashCharge backend
void sendPreChargeData(const char* chargerID, float soc, float voltage, 
                       float current, float temperature, int maxCurrent) {
    CURL *curl;
    CURLcode res;
    
    curl = curl_easy_init();
    if(curl) {
        // Build URL
        char url[256];
        snprintf(url, sizeof(url), 
                 "https://ocpp.rivotmotors.com/api/chargers/%s/precharge-data", 
                 chargerID);
        
        // Build JSON payload
        char payload[512];
        snprintf(payload, sizeof(payload),
                 "{\"soc\":%.2f,\"voltage\":%.2f,\"current\":%.2f,\"temperature\":%.1f,\"maxCurrent\":%d}",
                 soc, voltage, current, temperature, maxCurrent);
        
        // Set headers
        struct curl_slist *headers = NULL;
        headers = curl_slist_append(headers, "Content-Type: application/json");
        
        // Configure request
        curl_easy_setopt(curl, CURLOPT_URL, url);
        curl_easy_setopt(curl, CURLOPT_POSTFIELDS, payload);
        curl_easy_setopt(curl, CURLOPT_HTTPHEADER, headers);
        curl_easy_setopt(curl, CURLOPT_TIMEOUT, 5L);  // 5 second timeout
        
        // Execute request
        res = curl_easy_perform(curl);
        
        if(res != CURLE_OK) {
            fprintf(stderr, "PreCharge POST failed: %s\n", curl_easy_strerror(res));
        } else {
            printf("PreCharge data sent: SOC=%.2f%%, Voltage=%.2fV, MaxCurrent=%dA\n", 
                   soc, voltage, maxCurrent);
        }
        
        // Cleanup
        curl_slist_free_all(headers);
        curl_easy_cleanup(curl);
    }
}

// Call this when gun is connected
void onGunConnected() {
    // Read vehicle data from CAN bus
    float soc = readSOCFromCAN();           // Your existing function
    float voltage = readVoltageFromCAN();   // Your existing function
    float current = readCurrentFromCAN();   // Your existing function
    float temperature = readTempFromCAN();  // Your existing function
    int maxCurrent = readMaxCurrentFromCAN(); // Your existing function
    
    // 1. Send to SteVe (OCPP) - Already implemented ✅
    sendOCPPDataTransfer("RivotMotors", "PreChargeData", ...);
    
    // 2. Send to flashCharge backend - NEW ⚠️
    sendPreChargeData("RIVOT_100A_01", soc, voltage, current, temperature, maxCurrent);
}
```

---

### **Option 2: Using ESP32 HTTPClient (Arduino)**

```cpp
#include <HTTPClient.h>
#include <ArduinoJson.h>

void sendPreChargeData(String chargerID, float soc, float voltage, 
                       float current, float temperature, int maxCurrent) {
    HTTPClient http;
    
    // Build URL
    String url = "https://ocpp.rivotmotors.com/api/chargers/" + chargerID + "/precharge-data";
    
    // Build JSON payload
    StaticJsonDocument<256> doc;
    doc["soc"] = soc;
    doc["voltage"] = voltage;
    doc["current"] = current;
    doc["temperature"] = temperature;
    doc["maxCurrent"] = maxCurrent;
    
    String payload;
    serializeJson(doc, payload);
    
    // Send POST request
    http.begin(url);
    http.addHeader("Content-Type", "application/json");
    http.setTimeout(5000);  // 5 second timeout
    
    int httpCode = http.POST(payload);
    
    if (httpCode > 0) {
        Serial.printf("PreCharge data sent: %d\n", httpCode);
        Serial.println(http.getString());
    } else {
        Serial.printf("PreCharge POST failed: %s\n", http.errorToString(httpCode).c_str());
    }
    
    http.end();
}

void onGunConnected() {
    // Read vehicle data
    float soc = readSOCFromCAN();
    float voltage = readVoltageFromCAN();
    float current = readCurrentFromCAN();
    float temperature = readTempFromCAN();
    int maxCurrent = readMaxCurrentFromCAN();
    
    // 1. Send to SteVe (OCPP) - Already working ✅
    sendOCPPDataTransfer("RivotMotors", "PreChargeData", ...);
    
    // 2. Send to flashCharge backend - NEW ⚠️
    sendPreChargeData("RIVOT_100A_01", soc, voltage, current, temperature, maxCurrent);
}
```

---

### **Option 3: Using Python (if using Python firmware)**

```python
import requests
import json

def send_precharge_data(charger_id, soc, voltage, current, temperature, max_current):
    url = f"https://ocpp.rivotmotors.com/api/chargers/{charger_id}/precharge-data"
    
    payload = {
        "soc": soc,
        "voltage": voltage,
        "current": current,
        "temperature": temperature,
        "maxCurrent": max_current
    }
    
    headers = {"Content-Type": "application/json"}
    
    try:
        response = requests.post(url, json=payload, headers=headers, timeout=5)
        if response.status_code == 200:
            print(f"PreCharge data sent: SOC={soc}%, Voltage={voltage}V")
        else:
            print(f"PreCharge POST failed: {response.status_code}")
    except Exception as e:
        print(f"PreCharge POST error: {e}")

def on_gun_connected():
    # Read vehicle data
    soc = read_soc_from_can()
    voltage = read_voltage_from_can()
    current = read_current_from_can()
    temperature = read_temp_from_can()
    max_current = read_max_current_from_can()
    
    # 1. Send to SteVe (OCPP) - Already working ✅
    send_ocpp_data_transfer("RivotMotors", "PreChargeData", ...)
    
    # 2. Send to flashCharge backend - NEW ⚠️
    send_precharge_data("RIVOT_100A_01", soc, voltage, current, temperature, max_current)
```

---

## 📊 Data Format

### **Request:**
```
POST https://ocpp.rivotmotors.com/api/chargers/RIVOT_100A_01/precharge-data
Content-Type: application/json

{
  "soc": 44.07,           // Battery State of Charge (0-100%)
  "voltage": 75.74,       // Battery voltage (V)
  "current": 0,           // Current (A) - usually 0 when not charging
  "temperature": 25.6,    // Battery temperature (°C)
  "maxCurrent": 35        // BMS max current (A) - used to detect vehicle model
}
```

### **Response:**
```json
{
  "success": true,
  "message": "Pre-charge data stored"
}
```

---

## 🔄 When to Send

### **Scenario 1: Gun Just Connected**
```
Status: Available → Preparing
Action: Send pre-charge data immediately
```

### **Scenario 2: Gun Still Connected (Waiting)**
```
Status: Preparing (for 30+ seconds)
Action: Send updated pre-charge data every 30 seconds
```

### **Scenario 3: Charging Started**
```
Status: Preparing → Charging
Action: Stop sending pre-charge data (meter values take over)
```

### **Scenario 4: Gun Disconnected**
```
Status: Preparing → Available
Action: Stop sending pre-charge data
```

---

## 🎯 Integration Points

### **Where to Add Code:**

```c
// In your main state machine
void handleConnectorState() {
    switch(connectorStatus) {
        case AVAILABLE:
            // Gun not connected
            break;
            
        case PREPARING:
            // Gun connected, vehicle detected
            if (justEnteredPreparingState) {
                // Send immediately
                sendPreChargeData(...);
                lastPreChargeSent = millis();
            } else if (millis() - lastPreChargeSent > 30000) {
                // Send every 30 seconds
                sendPreChargeData(...);
                lastPreChargeSent = millis();
            }
            break;
            
        case CHARGING:
            // Charging active - don't send pre-charge data
            break;
    }
}
```

---

## ✅ Testing

### **Test 1: Verify Data is Sent**
```bash
# Check backend logs
pm2 logs flashcharge-backend | grep "PreCharge"

# Should see:
# PreCharge data stored for RIVOT_100A_01: { soc: 44.07, voltage: 75.74, maxCurrent: 35 }
```

### **Test 2: Verify Data is Stored**
```bash
mysql -u steve -psteve steve -e "SELECT * FROM data_transfer ORDER BY received_at DESC LIMIT 1;"
```

### **Test 3: Verify UI Shows Data**
```bash
curl http://localhost:3000/api/chargers/RIVOT_100A_01/soc

# Should return:
# {"soc":44.07,"voltage":"75.7 V","model":"NX-100 PRO","dataSource":"precharge"}
```

---

## 🔍 Troubleshooting

### **Issue: POST request fails**

**Check:**
1. Is URL correct? `https://ocpp.rivotmotors.com/api/chargers/RIVOT_100A_01/precharge-data`
2. Is Content-Type header set? `Content-Type: application/json`
3. Is JSON valid? Use online JSON validator
4. Is network reachable? Try ping/curl from charger

### **Issue: Data not showing in UI**

**Check:**
1. Is connector status "Preparing"?
2. Is data in database? (See Test 2 above)
3. Is data less than 10 minutes old?

---

## 📝 Summary

**What to add:** 1 HTTP POST request when gun is connected

**Where to add:** In your connector state machine (PREPARING state)

**Time to implement:** ~30 minutes

**Dependencies:** HTTP client library (curl, HTTPClient, requests)

**Testing:** Use curl to verify data reaches backend

---

**Status:** Ready for implementation

**Last Updated:** January 23, 2026
