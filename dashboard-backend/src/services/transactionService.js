const db = require("./db");

async function getActiveTransaction(chargeBoxId) {
  const [rows] = await db.execute(
    `
    SELECT
      t.transaction_pk AS transactionId,
      c.connector_id   AS connectorId,
      t.start_timestamp AS startedAt
    FROM transaction t
    JOIN connector c
      ON c.connector_pk = t.connector_pk
    WHERE
      c.charge_box_id = ?
      AND t.stop_timestamp IS NULL
    LIMIT 1
    `,
    [chargeBoxId]
  );

  if (rows.length === 0) {
    return null;
  }

  return rows[0];
}

module.exports = {
  getActiveTransaction,
};

