const db = require('./db');

/**
 * Direct OCPP transaction management
 * This bypasses SteVe's external API and works directly with the database
 */

async function startTransaction(chargePointId, connectorId, idTag) {
  try {
    console.log(`Starting OCPP transaction: ${chargePointId}, connector ${connectorId}, idTag ${idTag}`);
    
    // Check if charger is online and available
    const [chargerRows] = await db.query(`
      SELECT charge_box_pk, last_heartbeat_timestamp 
      FROM charge_box 
      WHERE charge_box_id = ?
    `, [chargePointId]);
    
    if (!chargerRows.length) {
      throw new Error('Charger not found');
    }
    
    const chargerPk = chargerRows[0].charge_box_pk;
    const lastHeartbeat = new Date(chargerRows[0].last_heartbeat_timestamp);
    const isOnline = (Date.now() - lastHeartbeat.getTime()) < 60000; // 1 minute
    
    if (!isOnline) {
      throw new Error('Charger is offline');
    }
    
    // Check connector status
    const [connectorRows] = await db.query(`
      SELECT c.connector_pk, cs.status
      FROM connector c
      LEFT JOIN connector_status cs ON cs.connector_pk = c.connector_pk
      WHERE c.charge_box_id = ? AND c.connector_id = ?
      ORDER BY cs.status_timestamp DESC
      LIMIT 1
    `, [chargePointId, connectorId]);
    
    if (!connectorRows.length) {
      throw new Error('Connector not found');
    }
    
    const connectorPk = connectorRows[0].connector_pk;
    const currentStatus = connectorRows[0].status;
    
    if (currentStatus !== 'Available' && currentStatus !== 'Preparing') {
      throw new Error(`Connector is ${currentStatus}, cannot start charging`);
    }
    
    // Check for existing active transaction
    const [activeRows] = await db.query(`
      SELECT transaction_pk 
      FROM transaction 
      WHERE connector_pk = ? AND stop_timestamp IS NULL
    `, [connectorPk]);
    
    if (activeRows.length > 0) {
      throw new Error('Transaction already active on this connector');
    }
    
    // Create new transaction
    const [result] = await db.query(`
      INSERT INTO transaction (
        connector_pk, 
        id_tag, 
        start_timestamp, 
        start_value
      ) VALUES (?, ?, NOW(), 0)
    `, [connectorPk, idTag]);
    
    const transactionId = result.insertId;
    
    // Update connector status to Preparing
    await db.query(`
      INSERT INTO connector_status (connector_pk, status, status_timestamp)
      VALUES (?, 'Preparing', NOW())
    `, [connectorPk]);
    
    console.log(`Transaction started: ID ${transactionId}`);
    
    return {
      success: true,
      transactionId,
      message: 'Transaction started successfully'
    };
    
  } catch (error) {
    console.error('Start transaction error:', error.message);
    throw error;
  }
}

async function stopTransaction(chargePointId, transactionId) {
  try {
    console.log(`Stopping OCPP transaction: ${chargePointId}, transaction ${transactionId}`);
    
    // Get transaction details
    const [txRows] = await db.query(`
      SELECT t.transaction_pk, t.connector_pk, c.connector_id, c.charge_box_id
      FROM transaction t
      JOIN connector c ON c.connector_pk = t.connector_pk
      WHERE t.transaction_pk = ? AND c.charge_box_id = ? AND t.stop_timestamp IS NULL
    `, [transactionId, chargePointId]);
    
    if (!txRows.length) {
      throw new Error('Active transaction not found');
    }
    
    const connectorPk = txRows[0].connector_pk;
    
    // Update transaction with stop timestamp
    await db.query(`
      UPDATE transaction 
      SET stop_timestamp = NOW(), stop_value = 0, stop_reason = 'Remote'
      WHERE transaction_pk = ?
    `, [transactionId]);
    
    // Update connector status to Finishing then Available
    await db.query(`
      INSERT INTO connector_status (connector_pk, status, status_timestamp)
      VALUES (?, 'Finishing', NOW())
    `, [connectorPk]);
    
    // Set to Available after a short delay (simulating OCPP flow)
    setTimeout(async () => {
      try {
        await db.query(`
          INSERT INTO connector_status (connector_pk, status, status_timestamp)
          VALUES (?, 'Available', NOW())
        `, [connectorPk]);
        console.log(`Connector ${txRows[0].connector_id} set to Available`);
      } catch (err) {
        console.error('Error setting connector to Available:', err.message);
      }
    }, 2000);
    
    console.log(`Transaction stopped: ID ${transactionId}`);
    
    return {
      success: true,
      transactionId,
      message: 'Transaction stopped successfully'
    };
    
  } catch (error) {
    console.error('Stop transaction error:', error.message);
    throw error;
  }
}

async function getActiveTransaction(chargePointId) {
  try {
    const [rows] = await db.query(`
      SELECT 
        t.transaction_pk AS transactionId,
        c.connector_id AS connectorId,
        t.start_timestamp AS startedAt,
        t.id_tag AS idTag
      FROM transaction t
      JOIN connector c ON c.connector_pk = t.connector_pk
      WHERE c.charge_box_id = ? AND t.stop_timestamp IS NULL
      LIMIT 1
    `, [chargePointId]);
    
    return rows.length > 0 ? rows[0] : null;
  } catch (error) {
    console.error('Get active transaction error:', error.message);
    throw error;
  }
}

module.exports = {
  startTransaction,
  stopTransaction,
  getActiveTransaction
};