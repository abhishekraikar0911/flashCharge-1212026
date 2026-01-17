const express = require("express");
const router = express.Router();

const steve = require("../services/steveService");
const txService = require("../services/transactionService");
const db = require("../services/db"); // IMPORTANT

/* -------------------------------------------------
   START CHARGING
-------------------------------------------------- */
router.post("/:id/start", async (req, res) => {
  try {
    const chargePointId = req.params.id;
    const { connectorId, idTag } = req.body;

    const result = await steve.startCharging(
      chargePointId,
      connectorId,
      idTag
    );

    res.json(result);
  } catch (err) {
    console.error("Start error:", err.message);
    res.status(500).json({ error: "Failed to start charging" });
  }
});

/* -------------------------------------------------
   STOP CHARGING
-------------------------------------------------- */
router.post("/:id/stop", async (req, res) => {
  try {
    const chargePointId = req.params.id;
    let transactionId = req.body?.transactionId;

    if (!transactionId) {
      const active = await txService.getActiveTransaction(chargePointId);
      if (!active) {
        return res.status(400).json({ error: "No active transaction" });
      }
      transactionId = active.transactionId;
    }

    const result = await steve.stopCharging(chargePointId, transactionId);
    res.json(result);
  } catch (err) {
    console.error("Stop error:", err.message);
    res.status(500).json({ error: "Failed to stop charging" });
  }
});

/* -------------------------------------------------
   ACTIVE TRANSACTION (ONLY FOR START/STOP LOGIC)
-------------------------------------------------- */
router.get("/:id/active", async (req, res) => {
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

/* -------------------------------------------------
   CONNECTOR STATES (REAL OCPP STATUS)
-------------------------------------------------- */
router.get("/:id/connectors", async (req, res) => {
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

/* -------------------------------------------------
   CHARGER HEALTH (ONLINE / OFFLINE)
-------------------------------------------------- */
router.get("/:id/health", async (req, res) => {
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
   SOC (State of Charge)
-------------------------------------------------- */
router.get("/:id/soc", async (req, res) => {
  const chargeBoxId = req.params.id;

  try {
    const [rows] = await db.query(`
      SELECT cmv.value
      FROM connector_meter_value cmv
      JOIN connector c ON c.connector_pk = cmv.connector_pk
      WHERE c.charge_box_id = ?
        AND cmv.measurand = 'SoC'
      ORDER BY cmv.value_timestamp DESC
      LIMIT 1
    `, [chargeBoxId]);

    const soc = rows.length ? parseFloat(rows[0].value) : null;
    res.json({ soc });
  } catch (err) {
    console.error("SOC error:", err.message);
    res.status(500).json({ error: "Failed to fetch SOC" });
  }
});

/* -------------------------------------------------
   SINGLE CONNECTOR STATUS
-------------------------------------------------- */
router.get("/:id/connectors/:connectorId", async (req, res) => {
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

