const axios = require("axios");

const STEVE_BASE = "http://localhost:8080/steve/api/external";
const STEVE_API_KEY = "my-secret-api-key";

async function startCharging(chargePointId, connectorId, idTag) {
  const res = await axios.post(
    `${STEVE_BASE}/charging/start`,
    {
      chargePointId,
      connectorId,
      idTag,
    },
    {
      headers: {
        "STEVE-API-KEY": STEVE_API_KEY,
        "Content-Type": "application/json",
      },
    }
  );
  return res.data;
}

async function stopCharging(chargePointId, transactionId) {
  const res = await axios.post(
    `${STEVE_BASE}/charging/stop`,
    {
      chargePointId,
      transactionId,
    },
    {
      headers: {
        "STEVE-API-KEY": STEVE_API_KEY,
        "Content-Type": "application/json",
      },
    }
  );
  return res.data;
}

module.exports = {
  startCharging,
  stopCharging,
};

