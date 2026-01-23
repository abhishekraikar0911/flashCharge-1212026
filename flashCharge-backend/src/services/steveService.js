require('dotenv').config();
const axios = require("axios");

const steveApiClient = axios.create({
  baseURL: process.env.STEVE_API_URL || "http://localhost:8080/steve",
  headers: {
    "STEVE-API-KEY": process.env.STEVE_API_KEY,
    "Content-Type": "application/json",
  },
});

async function startCharging(chargePointId, connectorId, idTag) {
  const res = await steveApiClient.post("/api/external/charging/start", {
    chargePointId,
    connectorId,
    idTag,
  });
  return res.data;
}

async function stopCharging(chargePointId, transactionId) {
  const res = await steveApiClient.post("/api/external/charging/stop", {
    chargePointId,
    transactionId,
  });
  return res.data;
}

module.exports = {
  startCharging,
  stopCharging,
  steveApiClient,
};

