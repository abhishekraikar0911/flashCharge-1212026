const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { body, validationResult } = require('express-validator');
const db = require('../services/db');
const steve = require('../services/steveService');

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    console.error('Validation errors:', errors.array());
    return res.status(400).json({ 
      success: false,
      error: 'Validation failed', 
      errors: errors.array() 
    });
  }
  next();
};

// Create prepaid session
router.post('/create', authenticateToken, [
  body('chargerId').notEmpty(),
  body('connectorId').isInt({ min: 1, max: 10 }),
  body('amount').isFloat({ min: 0.1, max: 500 }),
  body('maxEnergyWh').isInt({ min: 10 }),
  body('maxDurationSec').isInt({ min: 10 }),
  validate
], async (req, res) => {
  try {
    const { chargerId, connectorId, amount, maxEnergyWh, maxDurationSec } = req.body;
    const userId = req.user.id;

    const [result] = await db.query(`
      INSERT INTO prepaid_sessions 
      (user_id, charger_id, connector_id, prepaid_amount, max_energy_wh, max_duration_sec, status)
      VALUES (?, ?, ?, ?, ?, ?, 'pending')
    `, [userId, chargerId, connectorId, amount, maxEnergyWh, maxDurationSec]);

    res.json({
      success: true,
      sessionId: result.insertId,
      message: 'Prepaid session created. Proceed to payment.'
    });
  } catch (error) {
    console.error('Create prepaid session error:', error);
    res.status(500).json({ error: 'Failed to create session' });
  }
});

// Confirm payment and start charging
router.post('/start', authenticateToken, [
  body('sessionId').isInt(),
  body('paymentId').notEmpty(),
  validate
], async (req, res) => {
  try {
    const { sessionId, paymentId } = req.body;

    const [sessions] = await db.query(
      'SELECT * FROM prepaid_sessions WHERE id = ? AND user_id = ?',
      [sessionId, req.user.id]
    );

    if (!sessions.length) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const session = sessions[0];

    // Update payment info
    await db.query(
      'UPDATE prepaid_sessions SET payment_id = ?, status = "active" WHERE id = ?',
      [paymentId, sessionId]
    );

    // Start charging
    const result = await steve.startCharging(
      session.charger_id,
      session.connector_id,
      `USER_${req.user.id}_SESSION_${sessionId}`
    );

    res.json({
      success: true,
      message: 'Charging started',
      result
    });
  } catch (error) {
    console.error('Start charging error:', error);
    res.status(500).json({ error: 'Failed to start charging' });
  }
});

// Monitor active session
router.get('/monitor/:sessionId', authenticateToken, async (req, res) => {
  try {
    const [sessions] = await db.query(`
      SELECT ps.*, t.transaction_pk
      FROM prepaid_sessions ps
      LEFT JOIN transaction t ON t.id_tag = CONCAT('USER_', ps.user_id, '_SESSION_', ps.id)
        AND t.stop_timestamp IS NULL
      WHERE ps.id = ? AND ps.user_id = ?
    `, [req.params.sessionId, req.user.id]);

    if (!sessions.length) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const session = sessions[0];

    if (!session.transaction_pk) {
      return res.json({ status: 'pending', session });
    }

    // Update transaction_id in prepaid_sessions
    if (!session.transaction_id) {
      await db.query('UPDATE prepaid_sessions SET transaction_id = ? WHERE id = ?', 
        [session.transaction_pk, session.id]);
    }

    // Get current energy
    const [energy] = await db.query(`
      SELECT value as energy
      FROM connector_meter_value
      WHERE transaction_pk = ? AND measurand = 'Energy.Active.Import.Register'
      ORDER BY value_timestamp DESC LIMIT 1
    `, [session.transaction_pk]);

    const currentEnergy = energy.length ? parseFloat(energy[0].energy) : 0;
    const currentCost = (currentEnergy / 1000) * 2.88;
    const percentComplete = (currentEnergy / session.max_energy_wh) * 100;

    // Auto-stop if limit reached
    if (currentEnergy >= session.max_energy_wh) {
      await steve.stopCharging(session.charger_id, session.transaction_pk);
      await db.query('UPDATE prepaid_sessions SET status = "completed" WHERE id = ?', [session.id]);
    }

    res.json({
      status: 'active',
      currentEnergy,
      currentCost,
      percentComplete: Math.min(percentComplete, 100),
      maxEnergy: session.max_energy_wh,
      prepaidAmount: session.prepaid_amount
    });
  } catch (error) {
    console.error('Monitor error:', error);
    res.status(500).json({ error: 'Failed to monitor session' });
  }
});

module.exports = router;
