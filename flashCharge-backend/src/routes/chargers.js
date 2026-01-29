const express = require("express");
const router = express.Router();
const { body, param, validationResult } = require('express-validator');
const { authenticateToken, optionalAuth } = require('../middleware/auth');

const steve = require("../services/steveService");
const ocpp = require("../services/ocppService");
const txService = require("../services/transactionService");
const db = require("../services/db");

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

router.get("/list", async (req, res) => {
  try {
    const [rows] = await db.query('SELECT charge_box_id FROM charge_box ORDER BY charge_box_id');
    res.json(rows.map(r => r.charge_box_id));
  } catch (err) {
    console.error("Charger list error:", err.message);
    res.status(500).json({ error: "Failed to fetch chargers" });
  }
});

router.post("/:id/start", authenticateToken, [
  param('id').matches(/^[A-Za-z0-9_]+$/).withMessage('Invalid charger ID'),
  body('connectorId').isInt({ min: 1, max: 10 }).withMessage('Invalid connector ID'),
  body('idTag').isLength({ min: 1, max: 50 }).withMessage('Invalid ID tag'),
  validate
], async (req, res) => {
  try {
    const chargePointId = req.params.id;
    const { connectorId, idTag } = req.body;

    console.log(`Starting charging for ${chargePointId}, connector ${connectorId}, idTag ${idTag}`);

    // Use SteVe external API
    const result = await steve.startCharging(chargePointId, connectorId, idTag);

    console.log('SteVe external API result:', result);
    res.json(result);
  } catch (err) {
    console.error("Start error:", err.message);
    console.error("Start error details:", err.response?.data || err);
    res.status(500).json({ 
      error: err.response?.data?.message || err.message || "Failed to start charging"
    });
  }
});

router.post("/:id/stop", authenticateToken, [
  param('id').matches(/^[A-Za-z0-9_]+$/).withMessage('Invalid charger ID'),
  body('transactionId').optional().isInt({ min: 1 }).withMessage('Invalid transaction ID'),
  validate
], async (req, res) => {
  try {
    const chargePointId = req.params.id;
    let transactionId = req.body?.transactionId;

    console.log(`Stopping charging for ${chargePointId}, transactionId: ${transactionId}`);

    if (!transactionId) {
      const active = await txService.getActiveTransaction(chargePointId);
      if (!active) {
        console.log('No active transaction found for', chargePointId);
        return res.status(400).json({ error: "No active transaction" });
      }
      transactionId = active.transactionId;
      console.log('Found active transaction:', transactionId);
    }

    // Use SteVe external API
    const result = await steve.stopCharging(chargePointId, transactionId);
    console.log('SteVe external API result:', result);
    res.json(result);
  } catch (err) {
    console.error("Stop error:", err.message);
    console.error("Stop error details:", err.response?.data || err);
    res.status(500).json({ 
      error: err.response?.data?.message || err.message || "Failed to stop charging"
    });
  }
});

router.get("/:id/active", [
  param('id').matches(/^[A-Za-z0-9_]+$/).withMessage('Invalid charger ID'),
  validate
], async (req, res) => {
  try {
    const active = await txService.getActiveTransaction(req.params.id);

    if (!active) return res.json({ active: false });

    res.json({
      active: true,
      transactionId: active.transactionId,
      connectorId: active.connectorId,
      startedAt: active.startedAt
    });
  } catch (err) {
    res.status(500).json({ error: "Active fetch failed" });
  }
});

router.get("/:id/connectors", [
  param('id').matches(/^[A-Za-z0-9_]+$/).withMessage('Invalid charger ID'),
  validate
], async (req, res) => {
  const chargeBoxId = req.params.id;

  try {
    const [rows] = await db.query(`
      SELECT
        c.connector_id,
        COALESCE(cs.status, 'Unavailable') AS status
      FROM connector c
      LEFT JOIN connector_status cs
        ON cs.connector_pk = c.connector_pk
        AND cs.status_timestamp = (
          SELECT MAX(cs2.status_timestamp)
          FROM connector_status cs2
          WHERE cs2.connector_pk = c.connector_pk
        )
      WHERE c.charge_box_id = ?
      ORDER BY c.connector_id
    `, [chargeBoxId]);

    res.json(
      rows.map(r => ({
        connectorId: r.connector_id,
        type: "Type-2",
        status: r.status
      }))
    );
  } catch (err) {
    console.error("Connector error:", err.message);
    res.status(500).json({ error: "Failed to fetch connectors" });
  }
});

router.get("/:id/health", [
  param('id').matches(/^[A-Za-z0-9_]+$/).withMessage('Invalid charger ID'),
  validate
], async (req, res) => {
  const chargeBoxId = req.params.id;

  try {
    const [rows] = await db.query(`
      SELECT last_heartbeat_timestamp
      FROM charge_box
      WHERE charge_box_id = ?
    `, [chargeBoxId]);

    if (!rows.length) {
      return res.json({ online: false, lastSeen: null });
    }

    const lastSeen = new Date(rows[0].last_heartbeat_timestamp);
    const online = (Date.now() - lastSeen.getTime()) / 1000 < 60;

    res.json({ online, lastSeen });
  } catch (err) {
    console.error("Health error:", err.message);
    res.status(500).json({ error: "Health check failed" });
  }
});

/* -------------------------------------------------
   DEBUG: Check meter values
-------------------------------------------------- */
router.get("/:id/debug-meters", async (req, res) => {
  const chargeBoxId = req.params.id;

  try {
    const [rows] = await db.query(`
      SELECT 
        cmv.measurand,
        cmv.value,
        cmv.value_timestamp
      FROM connector_meter_value cmv
      JOIN connector c ON c.connector_pk = cmv.connector_pk
      WHERE c.charge_box_id = ?
      ORDER BY cmv.value_timestamp DESC
      LIMIT 20
    `, [chargeBoxId]);

    res.json({ count: rows.length, data: rows });
  } catch (err) {
    console.error("Debug meters error:", err.message);
    res.status(500).json({ error: "Failed to fetch debug data" });
  }
});

/* -------------------------------------------------
   TEST ROUTE
-------------------------------------------------- */
router.get("/:id/test", async (req, res) => {
  res.json({ message: "Test route works", chargeBoxId: req.params.id });
});

/* -------------------------------------------------
   SOC (State of Charge)
-------------------------------------------------- */
router.get("/:id/soc", [
  param('id').matches(/^[A-Za-z0-9_]+$/).withMessage('Invalid charger ID'),
  validate
], async (req, res) => {
  const chargeBoxId = req.params.id;

  try {
    const [statusRows] = await db.query(`
      SELECT cs.status
      FROM connector c
      LEFT JOIN connector_status cs ON cs.connector_pk = c.connector_pk
      WHERE c.charge_box_id = ? AND c.connector_id = 1
      ORDER BY cs.status_timestamp DESC
      LIMIT 1
    `, [chargeBoxId]);
    
    const status = statusRows.length ? statusRows[0].status : 'Available';
    const isCharging = status === 'Charging';
    const isConnected = ['Preparing', 'Finishing'].includes(status);

    // Priority 1: VehicleInfo (DataTransfer) - sent every ~5s, always available
    const [dataTransferRows] = await db.query(`
      SELECT data, received_at
      FROM data_transfer
      WHERE charge_box_id = ?
        AND message_id = 'VehicleInfo'
        AND received_at >= DATE_SUB(NOW(), INTERVAL 10 SECOND)
      ORDER BY received_at DESC
      LIMIT 1
    `, [chargeBoxId]);

    if (dataTransferRows.length > 0) {
      let rawData = dataTransferRows[0].data;
      if (typeof rawData === 'string') {
        rawData = rawData.replace(/&#34;/g, '"').replace(/&quot;/g, '"');
      }
      const vehicleInfo = JSON.parse(rawData);
      const soc = vehicleInfo.soc || 0;
      const model = vehicleInfo.model || "Classic";
      const maxCurrent = vehicleInfo.maxCurrent || 32;
      const temperature = vehicleInfo.temperature ? parseFloat(vehicleInfo.temperature).toFixed(1) : null;
      
      let maxRangeKm = 81;
      if (model === "Pro") maxRangeKm = 162;
      else if (model === "Max") maxRangeKm = 243;
      
      // Calculate range from SOC (unified formula)
      const currentRangeKm = ((soc / 100) * maxRangeKm).toFixed(1);

      // Priority 2: Get real-time measurements from MeterValues (only during charging)
      let voltage = 0, current = 0, power = 0, meterTemp = null;
      
      if (isCharging) {
        const [meterRows] = await db.query(`
          SELECT measurand, value
          FROM connector_meter_value cmv
          JOIN connector c ON c.connector_pk = cmv.connector_pk
          WHERE c.charge_box_id = ?
            AND cmv.measurand IN ('Voltage', 'Current.Import', 'Power.Active.Import', 'Temperature')
            AND cmv.value_timestamp >= DATE_SUB(NOW(), INTERVAL 10 SECOND)
          ORDER BY cmv.value_timestamp DESC
          LIMIT 15
        `, [chargeBoxId]);
        
        for (const row of meterRows) {
          if (row.measurand === 'Voltage' && voltage === 0) voltage = parseFloat(row.value);
          if (row.measurand === 'Current.Import' && current === 0) current = parseFloat(row.value);
          if (row.measurand === 'Power.Active.Import' && power === 0) power = parseFloat(row.value) / 1000;
          if (row.measurand === 'Temperature' && meterTemp === null) meterTemp = parseFloat(row.value);
        }
      }

      const finalTemp = meterTemp !== null ? meterTemp : (temperature ? parseFloat(temperature) : null);
      
      return res.json({ 
        soc: parseFloat(soc.toFixed(2)),
        voltage: voltage > 0 ? `${voltage.toFixed(1)} V` : "--",
        current: current > 0 ? `${current.toFixed(1)} A` : "--",
        power: power > 0 ? `${power.toFixed(2)} kW` : "--",
        energy: "0.00 Wh",
        temperature: finalTemp !== null ? `${finalTemp.toFixed(1)}°C` : "--",
        model,
        currentRangeKm,
        maxRangeKm,
        isCharging,
        dataSource: 'vehicleInfo+meterValues'
      });
    }

    if (!isCharging && !isConnected) {
      return res.json({ 
        soc: 0, 
        voltage: "0.0 V",
        current: "0.0 A",
        power: "0.00 kW",
        energy: "0.00 Wh",
        temperature: "--",
        model: "--",
        currentRangeKm: "--",
        maxRangeKm: "--",
        isCharging: false
      });
    }

    const timeWindow = isConnected ? 'INTERVAL 1 HOUR' : 'INTERVAL 5 MINUTE';
    const [rows] = await db.query(`
      SELECT 
        cmv.measurand,
        cmv.value,
        cmv.value_timestamp
      FROM connector_meter_value cmv
      JOIN connector c ON c.connector_pk = cmv.connector_pk
      WHERE c.charge_box_id = ?
        AND cmv.measurand IN ('SoC', 'Voltage', 'Current.Import', 'Power.Active.Import')
        AND cmv.value_timestamp >= DATE_SUB(NOW(), ${timeWindow})
      ORDER BY cmv.value_timestamp DESC
      LIMIT 10
    `, [chargeBoxId]);

    let soc = null, voltage = null, current = null, power = null;
    
    for (const row of rows) {
      if (row.measurand === 'SoC' && soc === null) soc = parseFloat(row.value);
      if (row.measurand === 'Voltage' && voltage === null) voltage = parseFloat(row.value).toFixed(1);
      if (row.measurand === 'Current.Import' && current === null) current = parseFloat(row.value).toFixed(1);
      if (row.measurand === 'Power.Active.Import' && power === null) power = (parseFloat(row.value) / 1000).toFixed(2);
    }

    let energy = 0;
    if (isCharging) {
      const [txRows] = await db.query(`
        SELECT t.start_timestamp
        FROM transaction t
        JOIN connector c ON c.connector_pk = t.connector_pk
        WHERE c.charge_box_id = ? AND t.stop_timestamp IS NULL
        LIMIT 1
      `, [chargeBoxId]);

      if (txRows.length) {
        const startTime = new Date(txRows[0].start_timestamp);
        const durationHours = (Date.now() - startTime.getTime()) / (1000 * 60 * 60);
        const avgPower = power ? parseFloat(power) : 0;
        energy = (avgPower * durationHours * 1000).toFixed(2);
      }
    }

    const [vehicleRows] = await db.query(`
      SELECT cmv.value as currentOffered
      FROM connector_meter_value cmv
      JOIN connector c ON c.connector_pk = cmv.connector_pk
      WHERE c.charge_box_id = ?
        AND cmv.measurand = 'Current.Offered'
        AND cmv.value_timestamp >= DATE_SUB(NOW(), ${timeWindow})
      ORDER BY cmv.value_timestamp DESC
      LIMIT 1
    `, [chargeBoxId]);

    let model = "NX-100 CLASSIC", maxRangeKm = 84;
    if (vehicleRows.length) {
      const currentOffered = parseFloat(vehicleRows[0].currentOffered);
      if (currentOffered >= 31 && currentOffered <= 60) {
        model = "NX-100 PRO";
        maxRangeKm = 168;
      } else if (currentOffered >= 61) {
        model = "NX-100 MAX";
        maxRangeKm = 252;
      }
    }

    const currentRangeKm = soc ? ((maxRangeKm * soc) / 100).toFixed(1) : "0.0";

    if (isConnected) {
      return res.json({ 
        soc: soc || 0, 
        voltage: voltage ? `${voltage} V` : "0.0 V",
        current: "0.0 A",
        power: "0.00 kW",
        energy: "0.00 Wh",
        temperature: "--",
        model,
        currentRangeKm,
        maxRangeKm,
        isCharging: false
      });
    }

    res.json({ 
      soc: soc || 0, 
      voltage: voltage ? `${voltage} V` : "0.0 V",
      current: current ? `${current} A` : "0.0 A",
      power: power ? `${power} kW` : "0.00 kW",
      energy: `${energy} Wh`,
      temperature: "--",
      model,
      currentRangeKm,
      maxRangeKm,
      isCharging
    });
  } catch (err) {
    console.error("SOC error:", err.message);
    res.status(500).json({ error: "Failed to fetch SOC" });
  }
});

/* -------------------------------------------------
   VEHICLE INFO (Model, Range, Current Ah)
   Status-aware: Returns different data based on connector status
-------------------------------------------------- */
router.get("/:id/vehicle-info", async (req, res) => {
  const chargeBoxId = req.params.id;

  try {
    // First, get current connector status
    const [statusRows] = await db.query(`
      SELECT cs.status, cs.status_timestamp
      FROM connector c
      LEFT JOIN connector_status cs ON cs.connector_pk = c.connector_pk
      WHERE c.charge_box_id = ? AND c.connector_id = 1
      ORDER BY cs.status_timestamp DESC
      LIMIT 1
    `, [chargeBoxId]);

    const currentStatus = statusRows.length ? statusRows[0].status : 'Unknown';
    
    // Get latest meter values for SoC and Current.Offered (BMS_Imax)
    const [rows] = await db.query(`
      SELECT 
        cmv.measurand,
        cmv.value,
        cmv.value_timestamp
      FROM connector_meter_value cmv
      JOIN connector c ON c.connector_pk = cmv.connector_pk
      WHERE c.charge_box_id = ?
        AND cmv.measurand IN ('SoC', 'Current.Offered', 'Temperature', 'Voltage')
        AND cmv.value_timestamp >= DATE_SUB(NOW(), INTERVAL 1 HOUR)
      ORDER BY cmv.value_timestamp DESC
    `, [chargeBoxId]);

    let soc = null;
    let currentOffered = null;
    let temperature = null;
    let voltage = null;
    let dataTimestamp = null;

    // Extract latest values
    for (const row of rows) {
      if (row.measurand === 'SoC' && soc === null) {
        soc = parseFloat(row.value);
        dataTimestamp = row.value_timestamp;
      }
      if (row.measurand === 'Current.Offered' && currentOffered === null) {
        currentOffered = parseFloat(row.value);
      }
      if (row.measurand === 'Temperature' && temperature === null) {
        temperature = parseFloat(row.value);
      }
      if (row.measurand === 'Voltage' && voltage === null) {
        voltage = parseFloat(row.value);
      }
    }

    // Default values if no data
    if (soc === null) soc = 0;
    if (currentOffered === null) currentOffered = 2; // Default to Classic

    // Determine vehicle model and max capacity based on BMS_Imax (Current.Offered)
    let model, maxCapacityAh, maxRangeKm;
    
    if (currentOffered >= 0 && currentOffered <= 30) {
      model = "Classic";
      maxCapacityAh = 30;
      maxRangeKm = 81;
    } else if (currentOffered >= 31 && currentOffered <= 60) {
      model = "Pro";
      maxCapacityAh = 60;
      maxRangeKm = 162;
    } else if (currentOffered >= 61 && currentOffered <= 100) {
      model = "Max";
      maxCapacityAh = 90;
      maxRangeKm = 243;
    } else {
      model = "Classic";
      maxCapacityAh = 30;
      maxRangeKm = 81;
    }

    // Calculate current Ah and range
    const currentAh = (maxCapacityAh * soc) / 100;
    const currentRangeKm = Math.round((soc / 100) * maxRangeKm);

    // Determine data source and freshness
    let dataSource = 'realtime';
    let dataAge = null;
    
    if (dataTimestamp) {
      dataAge = Math.floor((Date.now() - new Date(dataTimestamp).getTime()) / 1000);
      if (currentStatus === 'Preparing' && dataAge > 300) {
        dataSource = 'lastKnown';
      } else if (currentStatus === 'Charging') {
        dataSource = 'realtime';
      } else if (currentStatus === 'Finishing' || currentStatus === 'Available') {
        dataSource = 'lastSession';
      }
    }

    res.json({
      status: currentStatus,
      dataSource,
      dataAge,
      model,
      soc,
      currentAh: Math.round(currentAh * 100) / 100,
      maxCapacityAh,
      currentRangeKm,
      maxRangeKm,
      bmsImax: currentOffered,
      temperature,
      voltage,
      lastUpdated: dataTimestamp
    });
  } catch (err) {
    console.error("Vehicle info error:", err.message);
    res.status(500).json({ error: "Failed to fetch vehicle info" });
  }
});

/* -------------------------------------------------
   CHARGING PARAMETERS (for configuration screen)
-------------------------------------------------- */
const chargingParamsService = require('../services/chargingParamsService');

router.get("/:id/charging-params", [
  param('id').matches(/^[A-Za-z0-9_]+$/).withMessage('Invalid charger ID'),
  validate
], async (req, res) => {
  try {
    const params = await chargingParamsService.getChargingParameters(req.params.id);
    res.json(params);
  } catch (err) {
    console.error("Charging params error:", err.message);
    res.status(500).json({ error: "Failed to fetch charging parameters" });
  }
});

/* -------------------------------------------------
   SINGLE CONNECTOR STATUS
-------------------------------------------------- */
router.get("/:id/connectors/:connectorId", [
  param('id').matches(/^[A-Za-z0-9_]+$/).withMessage('Invalid charger ID'),
  param('connectorId').isInt({ min: 1, max: 10 }).withMessage('Invalid connector ID'),
  validate
], async (req, res) => {
  const chargeBoxId = req.params.id;
  const connectorId = parseInt(req.params.connectorId);

  try {
    const [rows] = await db.query(`
      SELECT
        c.connector_id,
        COALESCE(cs.status, 'Unavailable') AS status
      FROM connector c
      LEFT JOIN connector_status cs
        ON cs.connector_pk = c.connector_pk
        AND cs.status_timestamp = (
          SELECT MAX(cs2.status_timestamp)
          FROM connector_status cs2
          WHERE cs2.connector_pk = c.connector_pk
        )
      WHERE c.charge_box_id = ? AND c.connector_id = ?
    `, [chargeBoxId, connectorId]);

    if (!rows.length) {
      return res.status(404).json({ error: "Connector not found" });
    }

    console.log(`Connector ${connectorId} status: ${rows[0].status}`);
    res.json({
      connectorId: rows[0].connector_id,
      status: rows[0].status
    });
  } catch (err) {
    console.error("Connector status error:", err.message);
    res.status(500).json({ error: "Failed to fetch connector status" });
  }
});

module.exports = router;

