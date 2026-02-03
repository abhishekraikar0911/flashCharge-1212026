require('dotenv').config();
const axios = require("axios");

const steveApiClient = axios.create({
  baseURL: process.env.STEVE_API_URL || "http://localhost:8080/steve",
  headers: {
    "STEVE-API-KEY": process.env.STEVE_API_KEY || "my-secret-api-key",
    "Content-Type": "application/json",
  },
  timeout: 10000
});



async function startCharging(chargePointId, connectorId, idTag) {
  try {
    console.log(`SteVe API: Starting charging for ${chargePointId}, connector ${connectorId}, idTag ${idTag}`);
    
    const res = await steveApiClient.post("/api/external/charging/start", {
      chargePointId,
      connectorId,
      idTag,
    });
    
    console.log('SteVe API response:', res.data);
    return res.data;
  } catch (error) {
    console.error('SteVe API start error:', error.response?.data || error.message);
    throw error;
  }
}

async function stopCharging(chargePointId, transactionId) {
  try {
    console.log(`SteVe API: Stopping charging for ${chargePointId}, transaction ${transactionId}`);
    
    const res = await steveApiClient.post("/api/external/charging/stop", {
      chargePointId,
      transactionId,
    });
    
    console.log('SteVe API stop response:', res.data);
    return res.data;
  } catch (error) {
    console.error('SteVe API stop error:', error.response?.data || error.message);
    throw error;
  }
}

async function getConfiguration(chargePointId, keys = []) {
  const res = await steveApiClient.post("/api/external/operations/GetConfiguration", {
    chargePointId,
    keys
  });
  return res.data;
}

async function changeConfiguration(chargePointId, key, value) {
  const res = await steveApiClient.post("/api/external/operations/ChangeConfiguration", {
    chargePointId,
    key,
    value
  });
  return res.data;
}

async function triggerMessage(chargePointId, requestedMessage, connectorId) {
  const res = await steveApiClient.post("/api/external/operations/TriggerMessage", {
    chargePointId,
    requestedMessage,
    connectorId
  });
  return res.data;
}

module.exports = {
  startCharging,
  stopCharging,
  getConfiguration,
  changeConfiguration,
  triggerMessage,
  steveApiClient,
};

